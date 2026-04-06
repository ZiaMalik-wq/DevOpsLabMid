import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import JobCard from "../components/JobCard";
import { Bookmark, ArrowRight, Loader2 } from "lucide-react";

// Cache for saved jobs (60 second TTL)
const SAVED_JOBS_CACHE_TTL_MS = 60_000;
let savedJobsCache = {
  userKey: null,
  fetchedAt: 0,
  jobs: null,
};

// Helper to check if cache is valid
const isCacheValid = (userKey) => {
  const now = Date.now();
  return (
    savedJobsCache.jobs &&
    savedJobsCache.userKey === userKey &&
    now - savedJobsCache.fetchedAt < SAVED_JOBS_CACHE_TTL_MS
  );
};

// Export function to invalidate cache when user saves/unsaves a job
export const invalidateSavedJobsCache = () => {
  savedJobsCache = { userKey: null, fetchedAt: 0, jobs: null };
};

const SavedJobs = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const userKey = user?.id || user?.email || "anonymous";

  // Initialize from cache if valid to prevent flash of empty content
  const [jobs, setJobs] = useState(() => {
    if (isCacheValid(userKey)) {
      return savedJobsCache.jobs;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => !isCacheValid(userKey));

  useEffect(() => {
    // Security Check
    if (user && user.role !== "student" && user.role !== "STUDENT") {
      navigate("/");
      return;
    }

    if (!user) {
      setLoading(true);
      return;
    }

    // Check cache again in case userKey changed
    if (isCacheValid(userKey)) {
      setJobs(savedJobsCache.jobs);
      setLoading(false);
      return;
    }

    const fetchSavedJobs = async () => {
      try {
        const response = await api.get("/jobs/saved");
        const data = response.data || [];
        setJobs(data);
        savedJobsCache = {
          userKey,
          fetchedAt: Date.now(),
          jobs: data,
        };
      } catch (err) {
        console.error("Error fetching saved jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSavedJobs();
  }, [user, userKey, navigate]);

  // Callback to remove job from list immediately when unsaved
  const handleRemoveFromList = (jobId) => {
    setJobs((prevJobs) => {
      const updatedJobs = prevJobs.filter((job) => job.id !== jobId);
      // Update cache as well
      if (savedJobsCache.jobs) {
        savedJobsCache = {
          ...savedJobsCache,
          jobs: updatedJobs,
        };
      }
      return updatedJobs;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Bookmark className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 fill-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Saved Jobs
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              Opportunities you have bookmarked for later.
            </p>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 sm:p-16 text-center">
            <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 sm:w-10 h-8 sm:h-10 text-gray-300 dark:text-gray-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              No saved jobs yet
            </h3>
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2 mb-6">
              Browse jobs and click the bookmark icon to save them here.
            </p>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm sm:text-base"
            >
              Browse Jobs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            {jobs.map((job) => (
              <div key={job.id} className="h-full">
                <JobCard
                  job={job}
                  onUnsave={handleRemoveFromList} // Pass callback to remove from UI
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobs;
