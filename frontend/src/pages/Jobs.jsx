import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
} from "react";
import api from "../services/api";
import JobCard from "../components/JobCard";
import { AuthContext } from "../context/AuthContext";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Search,
  Sparkles,
  Database,
  Layers,
  X,
  SlidersHorizontal,
} from "lucide-react";
import axios from "axios";

const JOBS_CACHE_TTL_MS = 60_000;
const jobsCache = new Map();

function getJobsCacheKey({ query, mode }) {
  const token = localStorage.getItem("token") || "anon";
  const q = (query || "").trim().toLowerCase();
  return `${token}::${mode}::${q}`;
}

const JobSkeleton = () => (
  <div
    aria-hidden="true"
    className="h-full min-h-[16rem] rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse border border-gray-200 dark:border-gray-600"
  />
);

const COLOR_VARIANTS = {
  purple: "bg-purple-600 text-white border-purple-600",
  blue: "bg-blue-600 text-white border-blue-600",
  green: "bg-green-600 text-white border-green-600",
  white: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
};

const SEARCH_MODES = {
  hybrid: {
    icon: Layers,
    label: "Hybrid Search",
    description: "AI understanding + exact keyword matching",
    badge: "Recommended",
    color: "purple",
  },
  semantic: {
    icon: Sparkles,
    label: "AI Semantic",
    description: "Natural language understanding",
    badge: "Smart",
    color: "blue",
  },
  sql: {
    icon: Database,
    label: "Keyword Match",
    description: "Exact text matching",
    badge: "Classic",
    color: "green",
  },
};

const Jobs = () => {
  const reduceMotion = useReducedMotion();
  const abortRef = useRef(null);
  const { user } = useContext(AuthContext);

  const [jobs, setJobs] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("hybrid");
  const [showFilters, setShowFilters] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);

  // Filter states
  const [filterLocation, setFilterLocation] = useState("");
  const [filterJobType, setFilterJobType] = useState("");

  const fetchJobs = useCallback(
    async (query, mode, isInitial = false, filters = {}) => {
      // Include user ID in cache key to prevent showing cached jobs from different user types
      const userIdentifier = user?.id || user?.email || "guest";
      const cacheKey =
        getJobsCacheKey({ query, mode }) +
        JSON.stringify(filters) +
        `::${userIdentifier}`;
      const cached = jobsCache.get(cacheKey);
      const now = Date.now();
      const cacheIsValid =
        cached &&
        now - cached.fetchedAt < JOBS_CACHE_TTL_MS &&
        Array.isArray(cached.jobs);

      if (cacheIsValid) {
        setJobs(cached.jobs);
        setError(null);
        setInitialLoading(false);
        setSearchLoading(false);
        return;
      }

      // Cancel previous request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      if (isInitial) setInitialLoading(true);
      else setSearchLoading(true);

      setError(null);

      try {
        let endpoint = "/jobs/";
        let params = {};

        if (query && query.trim()) {
          params.q = query;
          endpoint =
            mode === "semantic"
              ? "/jobs/semantic"
              : mode === "sql"
              ? "/jobs/search"
              : "/jobs/hybrid";
        }

        // Add filters to params
        if (filters.location) params.location = filters.location;
        if (filters.job_type) params.job_type = filters.job_type;

        const res = await api.get(endpoint, {
          params,
          signal: controller.signal,
        });

        let nextJobs = Array.isArray(res.data) ? res.data : [];

        // Filter out company's own jobs if user is a company
        if (user && (user.role === "company" || user.role === "COMPANY")) {
          // Use the company_profile_id from the user object
          const companyId = user.company_profile_id;

          if (companyId) {
            nextJobs = nextJobs.filter((job) => job.company_id !== companyId);
          }
        }

        setJobs(nextJobs);
        jobsCache.set(cacheKey, { fetchedAt: Date.now(), jobs: nextJobs });
      } catch (err) {
        if (axios.isCancel(err) || err.code === "ERR_CANCELED") {
          console.log("Request canceled");
        } else {
          console.error("Fetch error:", err);
          setError("Failed to load jobs. Please check your connection.");
          user;
        }
      } finally {
        if (!controller.signal.aborted) {
          setInitialLoading(false);
          setSearchLoading(false);
        }
      }
    },
    [user]
  );

  // Initial Load
  useEffect(() => {
    fetchJobs("", "hybrid", true);
    return () => abortRef.current?.abort();
  }, [fetchJobs]);

  // When Mode changes, re-search with CURRENT query
  useEffect(() => {
    if (!initialLoading) {
      const filters = {
        location: filterLocation,
        job_type: filterJobType,
      };
      fetchJobs(searchQuery, searchMode, false, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  // Auto-apply filters when they change
  useEffect(() => {
    if (!initialLoading) {
      const filters = {
        location: filterLocation,
        job_type: filterJobType,
      };
      fetchJobs(searchQuery, searchMode, false, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLocation, filterJobType]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const filters = {
      location: filterLocation,
      job_type: filterJobType,
    };
    fetchJobs(searchQuery, searchMode, false, filters);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    const filters = {
      location: filterLocation,
      job_type: filterJobType,
    };
    fetchJobs("", searchMode, false, filters);
  };

  const handleClearFilters = () => {
    setFilterLocation("");
    setFilterJobType("");
    fetchJobs(searchQuery, searchMode, false, {});
  };

  const itemAnim = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Discover Opportunities
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {jobs.length} positions available
          </p>
        </header>

        {/* Search Form */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 mb-8 space-y-4 relative overflow-hidden"
        >
          {/* Decorative gradient overlay in dark mode */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 pointer-events-none" />

          <div className="relative">
            <Search
              aria-hidden="true"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-400 w-5 h-5"
            />
            <input
              id="job-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-12 py-4 border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400 text-base shadow-sm"
              placeholder="Search jobs, skills, companies..."
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>

          {/* Search Modes */}
          <div
            role="radiogroup"
            className="relative flex flex-col sm:flex-row flex-wrap gap-2"
          >
            {Object.entries(SEARCH_MODES).map(([key, m]) => {
              const Icon = m.icon;
              const active = searchMode === key;
              const btnClass = active
                ? COLOR_VARIANTS[m.color]
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700";

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSearchMode(key)}
                  className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl border-2 font-semibold transition-all duration-200 ${btnClass} flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base min-w-[150px]`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Mode Info */}
          {showModeInfo && (
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600">
              <span className="font-semibold text-gray-900 dark:text-white">
                Info:{" "}
              </span>
              {SEARCH_MODES[searchMode].description}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <button
              type="button"
              onClick={() => setShowModeInfo((s) => !s)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showModeInfo ? "Hide info" : "Show info"}
            </button>
          </div>

          {showFilters && (
            <div className="border dark:border-gray-600 rounded-xl p-4 bg-gray-50 dark:bg-gray-700 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Filter */}
                <div>
                  <label
                    htmlFor="filter-location"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Location
                  </label>
                  <input
                    id="filter-location"
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="e.g., New York, Remote"
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                {/* Job Type Filter */}
                <div>
                  <label
                    htmlFor="filter-job-type"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Job Type
                  </label>
                  <select
                    id="filter-job-type"
                    value={filterJobType}
                    onChange={(e) => setFilterJobType(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">All Types</option>
                    <option value="Internship">Internship</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>

              {/* Filter Actions */}
              {(filterLocation || filterJobType) && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={searchLoading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {searchLoading ? "Searching..." : "Search Jobs"}
          </button>
        </form>

        {/* Results Section */}
        {initialLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <JobSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {error}
            </h3>
            <button
              onClick={handleSearchSubmit}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              No jobs found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Try adjusting your search terms or filters.
            </p>
          </div>
        ) : (
          <motion.div
            key={`${searchMode}-${searchQuery}-${jobs.length}`}
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                variants={itemAnim}
                className="h-full flex flex-col"
              >
                <JobCard job={job} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
};

export default Jobs;
