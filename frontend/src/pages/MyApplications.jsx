import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import {
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Users, // Added Users icon for Interview
} from "lucide-react";

// Cache for applications (60 second TTL)
const MY_APPLICATIONS_CACHE_TTL_MS = 60_000;
let myApplicationsCache = {
  userKey: null,
  fetchedAt: 0,
  applications: null,
};

// Helper to check if cache is valid
const isCacheValid = (userKey) => {
  const now = Date.now();
  return (
    myApplicationsCache.applications &&
    myApplicationsCache.userKey === userKey &&
    now - myApplicationsCache.fetchedAt < MY_APPLICATIONS_CACHE_TTL_MS
  );
};

const MyApplications = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const userKey = user?.id || user?.email || "anonymous";

  // Initialize from cache if valid to prevent flash of empty content
  const [applications, setApplications] = useState(() => {
    if (isCacheValid(userKey)) {
      return myApplicationsCache.applications;
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
      setApplications(myApplicationsCache.applications);
      setLoading(false);
      return;
    }

    const fetchApplications = async () => {
      try {
        const response = await api.get("/applications/me");
        const data = response.data || [];
        setApplications(data);
        myApplicationsCache = {
          userKey,
          fetchedAt: Date.now(),
          applications: data,
        };
      } catch (err) {
        console.error("Error fetching applications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, [user, userKey, navigate]);

  // Helper for Status Styling
  const getStatusBadge = (status) => {
    const s = status.toUpperCase();
    switch (s) {
      case "ACCEPTED":
      case "HIRED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-3 h-3" /> Hired
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      case "INTERVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
            <Users className="w-3 h-3" /> Interview
          </span>
        );
      case "SHORTLISTED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
            <Clock className="w-3 h-3" /> Shortlisted
          </span>
        );
      default: // APPLIED
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            <FileText className="w-3 h-3" /> Applied
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-10 px-4">
      <div className="container mx-auto max-w-5xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Applications
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6 sm:mb-8">
          Track the status of your job applications.
        </p>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No Applications Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              You haven't applied to any jobs yet. Start exploring!
            </p>
            <Link
              to="/jobs"
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition duration-200 flex flex-col gap-4"
              >
                {/* Left: Job Info */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {app.job_title}
                    </h3>
                    <div className="flex">{getStatusBadge(app.status)}</div>
                  </div>

                  <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Building className="w-4 h-4 text-gray-400" />
                      {app.company_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {app.job_location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Applied: {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 w-full mt-2">
                  <Link
                    to={`/jobs/${app.job_id}`}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition text-center text-sm sm:text-base flex-1 sm:flex-initial"
                  >
                    View Job
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
