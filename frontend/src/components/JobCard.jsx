import React, { useState, useContext } from "react";
import {
  MapPin,
  Building,
  Clock,
  DollarSign,
  Calendar,
  Bookmark,
  ArrowRight,
  Briefcase,
  CheckCircle,
  Clock as ClockIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

const JobCard = ({ job, children, isActive }) => {
  const { user } = useContext(AuthContext);
  const [isSaved, setIsSaved] = useState(job.is_saved || false);
  const [loadingSave, setLoadingSave] = useState(false);

  const isStudent = user?.role?.toLowerCase() === "student";

  const handleToggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Please login to save jobs", { duration: 3000 });
      return;
    }

    const prev = isSaved;
    setIsSaved(!prev);
    setLoadingSave(true);

    try {
      prev
        ? await api.delete(`/jobs/${job.id}/save`)
        : await api.post(`/jobs/${job.id}/save`);
      if (!prev) toast.success("Job saved!", { duration: 2000 });
      else toast.success("Job removed from saved", { duration: 2000 });
    } catch {
      setIsSaved(prev);
      toast.error("Failed to update bookmark", { duration: 3000 });
    } finally {
      setLoadingSave(false);
    }
  };

  const isDeadlineSoon =
    job.deadline &&
    new Date(job.deadline) - new Date() < 7 * 24 * 60 * 60 * 1000 &&
    new Date(job.deadline) > new Date();

  return (
    <div className="group bg-white dark:bg-gradient-to-br dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 hover:border-blue-100 dark:hover:border-blue-800/50 transition-all duration-300 flex flex-col h-full overflow-hidden relative backdrop-blur-sm">
      {/* Top accent bar with enhanced gradient */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {/* Company badge */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/40 dark:via-purple-900/30 dark:to-pink-900/20 flex items-center justify-center shadow-sm dark:shadow-blue-500/10">
                <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                {job.company_name || "Hidden Company"}
              </span>
            </div>

            {/* Job title (Fixed height to prevent jumping) */}
            <h3
              className="text-lg font-bold text-gray-900 dark:text-gray-50 line-clamp-2 h-14 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors drop-shadow-sm"
              title={job.title}
            >
              {job.title}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Bookmark Button */}
            {isStudent && (
              <button
                onClick={handleToggleSave}
                disabled={loadingSave}
                className={`p-2.5 rounded-xl transition-all duration-200 shrink-0 ${
                  isSaved
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shadow-md dark:shadow-blue-500/20"
                    : "bg-gray-50 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md dark:hover:shadow-blue-500/10"
                }`}
              >
                <Bookmark
                  className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`}
                />
              </button>
            )}

            {/* Status Badge */}
            {isActive !== undefined && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border shadow-sm ${
                  isActive
                    ? "bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/60 dark:shadow-green-500/20"
                    : "bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600/60 dark:shadow-gray-500/10"
                }`}
              >
                {isActive ? (
                  <>
                    <CheckCircle className="w-3 h-3" /> Active
                  </>
                ) : (
                  <>
                    <ClockIcon className="w-3 h-3" /> Paused
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Info tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600/40 shadow-sm">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate max-w-[100px]">
              {job.location || "Remote"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg border border-green-200 dark:border-green-800/40 shadow-sm dark:shadow-green-500/10">
            <DollarSign className="w-3.5 h-3.5" />
            {job.salary_range || "Competitive"}
          </span>
        </div>

        {/* 
           FIX APPLIED HERE: 
           1. min-h-[4.5rem] ensures consistent height (approx 3 lines).
           2. line-clamp-3 ensures text cuts off cleanly with "..."
        */}
        <div className="flex-1 mb-4 min-h-[4.5rem]">
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {job.description || "No description available"}
          </p>
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 mt-auto">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(job.created_at).toLocaleDateString()}
          </span>
          {job.deadline && (
            <span
              className={`flex items-center gap-1 ${
                isDeadlineSoon
                  ? "text-orange-500 dark:text-orange-400 font-medium"
                  : ""
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {isDeadlineSoon
                ? "Closing soon"
                : new Date(job.deadline).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Footer CTA */}
        {children ? (
          children
        ) : (
          <Link
            to={`/jobs/${job.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/80 dark:via-gray-650 dark:to-gray-600/80 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-gray-700 dark:text-gray-200 hover:text-white font-semibold rounded-xl transition-all duration-300 group/btn shadow-sm hover:shadow-lg dark:hover:shadow-blue-500/20 border border-gray-200 dark:border-gray-600/40"
          >
            <Briefcase className="w-4 h-4" />
            View Details
            <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all duration-300" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default JobCard;
