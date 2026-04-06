import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import JobCard from "../components/JobCard";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import {
  PlusCircle,
  Briefcase,
  TrendingUp,
  Users,
  Eye,
  Edit3,
  Trash2,
  Search,
  Clock, // Required for the status badge
  BarChart2, // For analytics button
} from "lucide-react";

const MY_JOBS_CACHE_TTL_MS = 60_000;
let myJobsCache = {
  userKey: null,
  fetchedAt: 0,
  jobs: null,
};

// Helper to check if cache is valid
const isCacheValid = (userKey) => {
  const now = Date.now();
  return (
    myJobsCache.jobs &&
    myJobsCache.userKey === userKey &&
    now - myJobsCache.fetchedAt < MY_JOBS_CACHE_TTL_MS
  );
};

const MyJobs = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const userKey = user?.id || user?.email || "anonymous";

  // Initialize from cache if valid to prevent flash of empty content
  const [jobs, setJobs] = useState(() => {
    if (isCacheValid(userKey)) {
      return myJobsCache.jobs;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !isCacheValid(userKey));
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(true);
      return;
    }

    // Security Check
    if (user.role !== "company" && user.role !== "COMPANY") {
      navigate("/");
      return;
    }

    // Check cache again in case userKey changed
    if (isCacheValid(userKey)) {
      setJobs(myJobsCache.jobs);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const fetchMyJobs = async () => {
      try {
        const response = await api.get("/jobs/my-jobs", {
          signal: controller.signal,
        });
        const nextJobs = response.data || [];
        setJobs(nextJobs);
        myJobsCache = {
          userKey,
          fetchedAt: Date.now(),
          jobs: nextJobs,
        };
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Error fetching my jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyJobs();

    return () => {
      controller.abort();
    };
  }, [user, userKey, navigate]);

  const handleToggleStatus = async (jobId, currentStatus) => {
    const loadingToast = toast.loading(
      currentStatus ? "Pausing job..." : "Activating job..."
    );

    try {
      const jobToUpdate = jobs.find((j) => j.id === jobId);
      await api.put(`/jobs/${jobId}`, {
        ...jobToUpdate,
        is_active: !currentStatus,
      });

      setJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job.id !== jobId) return job;
          const updated = { ...job, is_active: !currentStatus };
          if (myJobsCache.jobs) {
            myJobsCache = {
              ...myJobsCache,
              jobs: myJobsCache.jobs.map((j) => (j.id === jobId ? updated : j)),
            };
          }
          return updated;
        })
      );

      toast.success(
        `Job ${!currentStatus ? "activated" : "paused"} successfully!`,
        {
          id: loadingToast,
          duration: 3000,
        }
      );
    } catch (err) {
      console.error("Error toggling status:", err);
      const errorMsg =
        err.response?.data?.detail ||
        "Failed to update job status. Please try again.";
      toast.error(errorMsg, {
        id: loadingToast,
        duration: 4000,
      });
    }
  };

  const handleDelete = async (jobId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this job posting? This action cannot be undone."
      )
    )
      return;

    setDeletingId(jobId);
    const loadingToastId = toast.loading("Deleting job...");

    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs((prevJobs) => prevJobs.filter((job) => job.id !== jobId));
      if (myJobsCache.jobs) {
        myJobsCache = {
          ...myJobsCache,
          jobs: myJobsCache.jobs.filter((job) => job.id !== jobId),
        };
      }
      toast.dismiss(loadingToastId);
      toast.success("Job deleted successfully!", { duration: 3000 });
    } catch (err) {
      console.error("Error deleting job:", err);
      toast.dismiss(loadingToastId);
      const errorMsg =
        err?.response?.data?.detail ||
        "Failed to delete job. Please try again.";
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setDeletingId(null);
    }
  };

  // Action handlers
  const handleViewApplicants = (jobId) => {
    navigate(`/jobs/${jobId}/applicants`);
  };

  // Calculate stats
  const activeJobs = (jobs || []).filter((job) => job.is_active).length;
  const totalApplications = (jobs || []).reduce(
    (sum, job) => sum + (job.applications_count || 0),
    0
  );
  const totalViews = (jobs || []).reduce(
    (sum, job) => sum + (job.views_count || 0),
    0
  );
  const recentApplications = (jobs || []).reduce(
    (sum, job) => sum + (job.recent_applications_count || 0),
    0
  );

  // Filter jobs
  const filteredJobs = (jobs || []).filter((job) => {
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && job.is_active) ||
      (filterStatus === "inactive" && !job.is_active);

    const matchesSearch =
      searchQuery === "" ||
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4 sm:py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl shadow-lg">
                <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Company Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  Manage and track your job postings
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/post-job")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl sm:rounded-2xl hover:shadow-2xl hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all duration-300 font-bold text-sm sm:text-base"
            >
              <PlusCircle className="w-5 h-5" />
              Post New Job
            </button>
          </div>

          {/* Quick Stats Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl mb-6 sm:mb-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
                    Quick Overview
                  </h2>
                  <p className="text-blue-100 text-xs sm:text-sm">
                    Your recruitment metrics at a glance
                  </p>
                </div>
                <button
                  onClick={() => navigate("/analytics")}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white/20 border border-white/30 rounded-lg sm:rounded-xl hover:bg-white/30 transition text-xs sm:text-sm font-semibold"
                >
                  <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>View Full Analytics</span>
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      Active Jobs
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-bold text-white">
                      {activeJobs}
                    </div>
                    <div className="text-sm text-white/70">
                      of {jobs?.length || 0} total
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      Applications
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {totalApplications}
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    total received
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Eye className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      Total Views
                    </span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-4xl font-bold text-white">
                        {totalViews}
                      </div>
                      <div className="text-sm text-white/70">impressions</div>
                    </div>
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">
                      Last 7 Days
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-white">
                    {recentApplications}
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    new applications
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 p-5 mb-8 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row gap-4">
            <div className="flex-grow relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your job postings..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent focus:outline-none transition-all placeholder:text-gray-500 dark:placeholder:text-gray-400 shadow-sm"
              />
            </div>

            <div className="flex gap-2 bg-gray-100 dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
              {["all", "active", "inactive"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
                    filterStatus === status
                      ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-md"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
            <p className="text-gray-500 mt-6 animate-pulse font-medium">
              Loading your jobs...
            </p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Briefcase className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {searchQuery || filterStatus !== "all"
                ? "No jobs match your filters"
                : "You haven't posted any jobs yet"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filter settings."
                : "Start attracting top talent by posting your first job opportunity."}
            </p>
            {!searchQuery && filterStatus === "all" && (
              <button
                onClick={() => navigate("/post-job")}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition inline-flex items-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Post Your First Job
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4 text-gray-600 text-sm font-medium">
              Showing {filteredJobs.length}{" "}
              {filteredJobs.length === 1 ? "job" : "jobs"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {filteredJobs.map((job) => (
                // Added h-full to ensure card takes full height of grid row
                <div key={job.id} className="h-full">
                  <JobCard job={job} isActive={job.is_active}>
                    {/* Custom footer content for Company Dashboard */}
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100 dark:border-gray-700/60 mt-2">
                      {/* 1. View Applicants (Primary Action) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card click
                          handleViewApplicants(job.id);
                        }}
                        className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg font-bold hover:shadow-xl hover:shadow-purple-500/30 dark:hover:shadow-purple-500/40 transition-all duration-300 text-sm transform hover:scale-[1.02]"
                      >
                        <Users className="w-4 h-4" />
                        View Applicants ({job.applications_count || 0})
                      </button>

                      {/* 2. Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/jobs/${job.id}/edit`);
                        }}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600/40 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/60 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md dark:hover:shadow-gray-500/10"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>

                      {/* 3. Pause/Activate Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(job.id, job.is_active);
                        }}
                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium border shadow-sm hover:shadow-md ${
                          job.is_active
                            ? "bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/50 dark:hover:shadow-orange-500/20"
                            : "bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60 hover:bg-green-100 dark:hover:bg-green-900/50 dark:hover:shadow-green-500/20"
                        }`}
                      >
                        {job.is_active ? "Pause" : "Activate"}
                      </button>

                      {/* 4. Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(job.id);
                        }}
                        disabled={deletingId === job.id}
                        className="col-span-2 flex items-center justify-center gap-2 px-3 py-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/40 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-all duration-200 text-sm font-medium mt-1 shadow-sm hover:shadow-md dark:hover:shadow-red-500/20"
                      >
                        {deletingId === job.id ? (
                          "Deleting..."
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" /> Delete Job
                          </>
                        )}
                      </button>
                    </div>
                  </JobCard>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MyJobs;
