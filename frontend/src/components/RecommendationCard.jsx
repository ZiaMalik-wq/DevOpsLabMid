import React from "react";
import { Link } from "react-router-dom";
import {
  Building,
  MapPin,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
} from "lucide-react";

const RecommendationCard = ({ job }) => {
  // Determine color based on score with more vibrant colors
  const getScoreColor = (score) => {
    if (score >= 80)
      return {
        badge:
          "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200",
        border: "border-green-100",
        glow: "hover:shadow-green-100",
      };
    if (score >= 60)
      return {
        badge:
          "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200",
        border: "border-blue-100",
        glow: "hover:shadow-blue-100",
      };
    return {
      badge:
        "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-200",
      border: "border-orange-100",
      glow: "hover:shadow-orange-100",
    };
  };

  const scoreStyle = getScoreColor(job.match_score);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-md border-2 ${scoreStyle.border} dark:border-gray-700 p-6 hover:shadow-xl ${scoreStyle.glow} transition-all duration-300 relative overflow-hidden group`}
    >
      {/* Gradient Background Accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-blue-50/30 dark:from-purple-900/10 dark:to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Enhanced AI Match Badge */}
      <div className="relative">
        <div
          className={`absolute -top-6 -right-6 p-4 rounded-bl-3xl ${scoreStyle.badge} transform transition-transform duration-300 group-hover:scale-105`}
        >
          <div className="flex flex-col items-center leading-tight">
            <TrendingUp className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-xl font-bold">{job.match_score}%</span>
            <span className="text-[9px] uppercase font-semibold tracking-wide opacity-90">
              Match
            </span>
          </div>
        </div>
      </div>

      <div className="relative pr-20">
        {/* Job Title with Text Wrap */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-2 break-words">
          {job.title}
        </h3>

        {/* Company Info */}
        <div className="space-y-1.5">
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-sm flex items-center gap-2">
            <Building className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="truncate">{job.company_name}</span>
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span className="truncate">
              {job.company_location || job.location}
            </span>
          </p>
        </div>
      </div>

      {/* Enhanced AI Reason Section */}
      <div className="mt-5 relative">
        <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
          <div className="flex gap-2.5 items-start">
            <div className="mt-0.5 p-1.5 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
              <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-sm text-purple-900 dark:text-purple-300 leading-relaxed">
              <span className="font-semibold">Why this matches: </span>
              <span className="italic">{job.why}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Skills Breakdown */}
      <div className="mt-5 space-y-3 relative">
        {/* Matching Skills */}
        {job.matching_skills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
              Your Skills Match
            </p>
            <div className="flex flex-wrap gap-2">
              {job.matching_skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-lg font-semibold border border-green-200 dark:border-green-800 shadow-sm hover:shadow-md hover:bg-green-100 dark:hover:bg-green-900/40 transition-all"
                >
                  <CheckCircle className="w-3 h-3" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing Skills */}
        {job.missing_skills.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              Skills to Learn
            </p>
            <div className="flex flex-wrap gap-2">
              {job.missing_skills.slice(0, 4).map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-lg font-medium border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all"
                >
                  <XCircle className="w-3 h-3" />
                  {skill}
                </span>
              ))}
              {job.missing_skills.length > 4 && (
                <span className="inline-flex items-center px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  +{job.missing_skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced CTA Button */}
      <Link
        to={`/jobs/${job.id}`}
        className="relative mt-6 w-full block text-center bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-700 dark:to-gray-600 text-white font-bold py-3 rounded-xl hover:from-black hover:to-gray-900 dark:hover:from-gray-600 dark:hover:to-gray-500 shadow-lg hover:shadow-xl transition-all duration-300 group/btn overflow-hidden"
      >
        <span className="relative z-10">View Job Details</span>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
      </Link>
    </div>
  );
};

export default RecommendationCard;
