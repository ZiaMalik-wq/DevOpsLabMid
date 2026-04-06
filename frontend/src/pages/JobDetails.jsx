import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import {
  MapPin,
  Building,
  Clock,
  DollarSign,
  Briefcase,
  ArrowLeft,
  Users,
  Edit,
  Eye,
  Sparkles,
  CheckCircle,
  Calendar,
  Lock,
  FileText,
  Copy,
  Download,
  X,
  Mail,
  Info,
  GraduationCap,
  ExternalLink,
  Target,
  TrendingUp,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const JobDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);

  // Cover Letter State
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState("professional");

  // Skill Gap Analysis State
  const [showSkillGapModal, setShowSkillGapModal] = useState(false);
  const [skillGapData, setSkillGapData] = useState(null);
  const [skillGapLoading, setSkillGapLoading] = useState(false);

  // Disable body scroll when any modal is open
  useEffect(() => {
    if (showCoverLetterModal || showSkillGapModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCoverLetterModal, showSkillGapModal]);

  useEffect(() => {
    const fetchJobDetails = async () => {
      try {
        // 1. Fetch Job Details
        const response = await api.get(`/jobs/${id}`);
        let jobData = response.data;

        // 2. View Tracking Logic
        try {
          const viewResponse = await api.post(`/jobs/${id}/view`);
          if (viewResponse.data.views !== undefined) {
            jobData = { ...jobData, views_count: viewResponse.data.views };
          }
        } catch (viewError) {
          console.log("View tracking skipped.");
        }

        setJob(jobData);

        // 3. Check if student has already applied
        if (user && (user.role === "student" || user.role === "STUDENT")) {
          try {
            const appsResponse = await api.get("/applications/me");
            const alreadyApplied = appsResponse.data.some(
              (app) => app.job_id === Number(id)
            );
            setHasApplied(alreadyApplied);
          } catch (appErr) {
            console.error("Failed to check application status:", appErr);
          }
        }
      } catch (err) {
        console.error("Error fetching job details:", err);
        setError("Job not found or has been removed.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchJobDetails();
  }, [id, user]);

  const handleApply = async () => {
    if (!user) {
      toast.error("Please login to apply!", { duration: 3000 });
      navigate("/login");
      return;
    }

    const confirmApply = window.confirm(
      `Apply to ${job.title} at ${job.company_name}?`
    );
    if (!confirmApply) return;

    const loadingToast = toast.loading("Submitting application...");

    try {
      await api.post(`/applications/${id}`);

      toast.success("Application submitted successfully!", {
        id: loadingToast,
        duration: 3000,
      });

      // Optional: Redirect to My Applications page
      setTimeout(() => navigate("/my-applications"), 1000);
    } catch (error) {
      console.error("Apply Error:", error);
      const errorMsg = error.response?.data?.detail || "Failed to apply.";
      toast.error(errorMsg, { id: loadingToast, duration: 4000 });
    }
  };

  // Generate Cover Letter
  const handleGenerateCoverLetter = async () => {
    setCoverLetterLoading(true);
    setShowCoverLetterModal(true);
    setCoverLetter(null);

    try {
      const response = await api.post(`/jobs/${id}/cover-letter`, {
        job_id: parseInt(id),
        tone: selectedTone,
      });
      setCoverLetter(response.data);
    } catch (error) {
      console.error("Cover Letter Error:", error);
      const errorMsg =
        error.response?.data?.detail || "Failed to generate cover letter.";
      toast.error(errorMsg, { duration: 4000 });
      setShowCoverLetterModal(false);
    } finally {
      setCoverLetterLoading(false);
    }
  };

  // Copy cover letter to clipboard
  const handleCopyCoverLetter = () => {
    if (coverLetter?.cover_letter) {
      navigator.clipboard.writeText(coverLetter.cover_letter);
      toast.success("Cover letter copied to clipboard!", { duration: 2000 });
    }
  };

  // Download cover letter as text file
  const handleDownloadCoverLetter = () => {
    if (coverLetter?.cover_letter) {
      const blob = new Blob([coverLetter.cover_letter], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cover_Letter_${job?.title?.replace(/\s+/g, "_")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Cover letter downloaded!", { duration: 2000 });
    }
  };

  // Analyze Skill Gap
  const handleAnalyzeSkillGap = async () => {
    setSkillGapLoading(true);
    setShowSkillGapModal(true);
    setSkillGapData(null);

    try {
      const response = await api.get(`/jobs/${id}/skill-gap`);
      setSkillGapData(response.data);
    } catch (error) {
      console.error("Skill Gap Error:", error);
      const errorMsg =
        error.response?.data?.detail || "Failed to analyze skill gap.";
      toast.error(errorMsg, { duration: 4000 });
      setShowSkillGapModal(false);
    } finally {
      setSkillGapLoading(false);
    }
  };

  const isStudent = user?.role === "student" || user?.role === "STUDENT";
  const isCompany = user?.role === "company" || user?.role === "COMPANY";
  const isOwner = isCompany && user?.company_profile?.id === job?.company_id;

  // Logic to check if job is full
  const isFilled = job?.max_seats <= 0;

  // Logic to check if deadline has passed
  const isDeadlinePassed = job?.deadline && new Date(job.deadline) < new Date();

  if (loading)
    return (
      <div className="flex flex-col justify-center items-center h-[80vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 dark:border-blue-900/50 border-t-blue-600 dark:border-t-blue-400"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mt-6 animate-pulse font-medium">
          Loading job details...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Building className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Oops!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={() => navigate("/jobs")}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
        >
          Back to Jobs
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 md:py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition-all duration-200 font-semibold group bg-white dark:bg-gray-800 px-4 py-2 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl hover:shadow-3xl transition-shadow duration-500 overflow-hidden border border-gray-200 dark:border-gray-700/50">
          {/* Header Section */}
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700/60 bg-gradient-to-br from-blue-50/80 via-purple-50/40 to-white dark:from-gray-800/80 dark:via-gray-850/60 dark:to-gray-800/80 backdrop-blur-sm">
            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6">
              <div className="flex-grow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20">
                    <Briefcase className="w-6 h-6 text-white drop-shadow-sm" />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 leading-tight tracking-tight">
                      {job.title}
                    </h1>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border ${
                          job.job_type === "Internship"
                            ? "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50"
                            : "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/50"
                        }`}
                      >
                        {job.job_type}
                      </span>

                      {/* HIGH DEMAND BADGE - Show when max_seats reached but still accepting applications */}
                      {isFilled && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 shadow-sm">
                          <Sparkles className="w-3 h-3" /> High Demand
                        </span>
                      )}

                      {/* DEADLINE PASSED BADGE */}
                      {isDeadlinePassed && !isFilled && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50 shadow-sm">
                          <Calendar className="w-3 h-3" /> Deadline Passed
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm text-gray-600 dark:text-gray-400 ml-0 md:ml-14 mt-2">
                  <span className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-400">
                    <Building className="w-4 h-4" />
                    {job.company_name}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className="flex items-center gap-2 text-gray-500"
                    title="Total Views"
                  >
                    <Eye className="w-4 h-4" />
                    {job.views_count || 0} views
                  </span>
                </div>
              </div>

              {/* DYNAMIC ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3 lg:mt-0 mt-4">
                {/* CASE 1: Owner Company */}
                {isOwner && (
                  <>
                    <button
                      onClick={() => navigate(`/edit-job/${id}`)}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Job
                    </button>
                    <button
                      onClick={() => navigate(`/jobs/${id}/applicants`)}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 dark:hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-300 transform"
                    >
                      <Users className="w-5 h-5" />
                      View Applicants
                    </button>
                  </>
                )}

                {/* CASE 2: Student or Guest */}
                {(isStudent || !user) && (
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-wrap">
                    {/* AI TOOLS FOR STUDENTS */}
                    {isStudent && (
                      <>
                        <button
                          onClick={() => navigate(`/jobs/${id}/interview-prep`)}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-2 border-purple-200 dark:border-purple-800/50 font-bold rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700/60 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-purple-500/20"
                        >
                          <Sparkles className="w-5 h-5" />
                          AI Interview Prep
                        </button>
                        <button
                          onClick={handleGenerateCoverLetter}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-200 dark:border-emerald-800/50 font-bold rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-emerald-500/20"
                        >
                          <FileText className="w-5 h-5" />
                          AI Cover Letter
                        </button>
                        <button
                          onClick={handleAnalyzeSkillGap}
                          className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-2 border-amber-200 dark:border-amber-800/50 font-bold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-amber-500/20"
                        >
                          <TrendingUp className="w-5 h-5" />
                          Skill Gap Analysis
                        </button>
                      </>
                    )}

                    {/* EXISTING LOGIC FOR APPLY BUTTON */}
                    {hasApplied ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-green-100 text-green-700 font-bold rounded-xl border border-green-200 cursor-default"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Applied
                      </button>
                    ) : isDeadlinePassed ? (
                      <button
                        disabled
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-orange-100 text-orange-600 font-bold rounded-xl border border-orange-200 cursor-not-allowed"
                      >
                        <Calendar className="w-5 h-5" />
                        Deadline Passed
                      </button>
                    ) : (
                      <button
                        onClick={handleApply}
                        className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 transform"
                      >
                        <Sparkles className="w-5 h-5" />
                        Apply Now
                      </button>
                    )}
                  </div>
                )}

                {/* CASE 3: Other Company */}
                {isCompany && !isOwner && (
                  <div className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-center cursor-default shadow-sm">
                    View Only
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left Column - Description */}
            <div className="lg:col-span-2 space-y-6">
              <section>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-gradient-to-b from-blue-600 via-purple-600 to-pink-600 rounded-full shadow-sm"></div>
                  Job Description
                </h3>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-base bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-900/20 dark:to-transparent p-5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  {job.description}
                </div>
              </section>

              {/* About the Company Section - Always show */}
              <section className="pt-6 border-t border-gray-200 dark:border-gray-700/60">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  About the Company
                </h3>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50/30 dark:from-blue-900/30 dark:to-purple-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800/50 shadow-sm space-y-3">
                  {/* Company Name */}
                  <div className="flex items-start gap-3">
                    <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Company
                      </span>
                      <p className="font-semibold text-blue-700 dark:text-blue-300">
                        {job.company_name}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Location
                      </span>
                      {job.company_location ? (
                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          {job.company_location}
                        </p>
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Location not provided
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Contact Email
                      </span>
                      {job.company_email ? (
                        <a
                          href={`mailto:${job.company_email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium block"
                        >
                          {job.company_email}
                        </a>
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          Email not provided
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column - Job Overview */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-50/80 via-blue-50/40 to-purple-50/30 dark:from-gray-700/80 dark:via-gray-750 dark:to-gray-800/80 p-6 rounded-2xl border border-gray-200 dark:border-gray-600/60 sticky top-4 shadow-lg hover:shadow-xl transition-shadow duration-300 backdrop-blur-sm">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                  Job Overview
                </h3>
                <div className="space-y-4">
                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <DollarSign className="w-3.5 h-3.5" />
                      Salary Range
                    </label>
                    <p className="flex items-center gap-2 text-gray-900 dark:text-white font-semibold text-lg">
                      {job.salary_range || "Not disclosed"}
                    </p>
                  </div>

                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      Employment Type
                    </label>
                    <p className="text-gray-900 dark:text-white font-semibold text-base">
                      {job.job_type}
                    </p>
                  </div>

                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Users className="w-3.5 h-3.5" />
                      Openings
                    </label>
                    <p
                      className={`font-semibold ${
                        isFilled
                          ? "text-red-600"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {isFilled
                        ? "0 (Filled)"
                        : `${job.max_seats} Position${
                            job.max_seats > 1 ? "s" : ""
                          }`}
                    </p>
                  </div>

                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Application Deadline
                    </label>
                    <p
                      className={`font-semibold text-base ${
                        job.deadline
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {job.deadline
                        ? new Date(job.deadline).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Open until filled"}
                    </p>
                  </div>

                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-xl">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Eye className="w-3.5 h-3.5" />
                      Views
                    </label>
                    <p className="text-gray-900 dark:text-white font-semibold text-base">
                      {job.views_count || 0} view
                      {job.views_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Sidebar Apply CTA */}
                {(isStudent || !user) &&
                  (hasApplied ? (
                    <button
                      disabled
                      className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-bold rounded-xl border border-green-200 dark:border-green-800/50 cursor-default shadow-sm"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Applied
                    </button>
                  ) : isDeadlinePassed ? (
                    <button
                      disabled
                      className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold rounded-xl border border-orange-200 dark:border-orange-800/50 cursor-not-allowed shadow-sm"
                    >
                      <Calendar className="w-5 h-5" />
                      Deadline Passed
                    </button>
                  ) : (
                    <button
                      onClick={handleApply}
                      className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/50 dark:hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 transform"
                    >
                      <Sparkles className="w-5 h-5" />
                      Apply Now
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cover Letter Modal */}
      {showCoverLetterModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 flex-shrink-0">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                      AI Cover Letter Generator
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                      Tailored for {job?.title} at {job?.company_name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCoverLetterModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Tone Selector - Only show before generation */}
              {!coverLetter && !coverLetterLoading && (
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tone:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {["professional", "enthusiastic", "confident"].map(
                      (tone) => (
                        <button
                          key={tone}
                          onClick={() => setSelectedTone(tone)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                            selectedTone === tone
                              ? "bg-emerald-600 text-white shadow-md"
                              : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-emerald-400"
                          }`}
                        >
                          {tone}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              {coverLetterLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-100 dark:border-emerald-900/50 border-t-emerald-600 dark:border-t-emerald-400"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-6 font-medium animate-pulse">
                    Crafting your personalized cover letter...
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    Analyzing job requirements & your profile
                  </p>
                </div>
              ) : coverLetter ? (
                <div className="space-y-6">
                  {/* Key Highlights */}
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/50">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Key Highlights Used
                    </h4>
                    <ul className="space-y-2">
                      {coverLetter.key_highlights?.map((highlight, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400"
                        >
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cover Letter Content */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <div className="prose dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200 text-base leading-relaxed">
                        {coverLetter.cover_letter}
                      </pre>
                    </div>
                  </div>

                  {/* Word Count */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    Word count: {coverLetter.word_count} words
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Click "Generate" to create your personalized cover letter
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end flex-shrink-0">
              {coverLetter ? (
                <>
                  <button
                    onClick={() => {
                      setCoverLetter(null);
                      setCoverLetterLoading(false);
                    }}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handleCopyCoverLetter}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={handleDownloadCoverLetter}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </>
              ) : !coverLetterLoading ? (
                <>
                  <button
                    onClick={() => setShowCoverLetterModal(false)}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateCoverLetter}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Cover Letter
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Skill Gap Analysis Modal */}
      {showSkillGapModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 flex-shrink-0">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white">
                      Skill Gap Analysis
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                      Your personalized learning path for {job?.title}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSkillGapModal(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              {skillGapLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-amber-100 dark:border-amber-900/50 border-t-amber-600 dark:border-t-amber-400"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Target className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-6 font-medium animate-pulse">
                    Analyzing your skills...
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    Comparing your profile with job requirements
                  </p>
                </div>
              ) : skillGapData ? (
                <div className="space-y-6">
                  {/* Match Overview */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {/* Match Percentage */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800/50 text-center">
                      <div className="relative inline-flex items-center justify-center">
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle
                            cx="40"
                            cy="40"
                            r="35"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="40"
                            cy="40"
                            r="35"
                            stroke="currentColor"
                            strokeWidth="6"
                            fill="none"
                            strokeDasharray={`${
                              skillGapData.overall_match_percentage * 2.2
                            } 220`}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </svg>
                        <span className="absolute text-2xl font-bold text-blue-700 dark:text-blue-300">
                          {skillGapData.overall_match_percentage}%
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mt-2">
                        Skill Match
                      </p>
                    </div>

                    {/* Skills Matched */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl p-4 border border-green-200 dark:border-green-800/50 text-center">
                      <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                        {skillGapData.matched_skills?.length || 0}
                      </div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300 mt-1">
                        Skills You Have
                      </p>
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto mt-2" />
                    </div>

                    {/* Learning Time */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50 text-center">
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        {skillGapData.estimated_learning_time}
                      </div>
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mt-1">
                        To Fill Gaps
                      </p>
                      <Clock className="w-5 h-5 text-amber-600 mx-auto mt-2" />
                    </div>
                  </div>

                  {/* Priority Recommendation */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800/50">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Priority Recommendation
                    </h4>
                    <p className="text-purple-700 dark:text-purple-400 text-sm">
                      {skillGapData.priority_recommendation}
                    </p>
                  </div>

                  {/* Matched Skills */}
                  {skillGapData.matched_skills?.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800/50">
                      <h4 className="font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Skills You Already Have
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {skillGapData.matched_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300 text-sm font-medium rounded-full border border-green-200 dark:border-green-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skill Gaps with Learning Paths */}
                  {skillGapData.skill_gaps?.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-lg">
                        <BookOpen className="w-5 h-5 text-amber-600" />
                        Skills to Develop
                      </h4>

                      {skillGapData.skill_gaps.map((gap, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
                        >
                          {/* Skill Header */}
                          <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                                  {gap.skill}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs font-bold rounded-full uppercase ${
                                    gap.importance === "critical"
                                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                                      : gap.importance === "important"
                                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600"
                                  }`}
                                >
                                  {gap.importance}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                                <span className="text-gray-500 dark:text-gray-400">
                                  Current:{" "}
                                  <span
                                    className={`font-medium ${
                                      gap.current_level === "missing"
                                        ? "text-red-600 dark:text-red-400"
                                        : gap.current_level === "basic"
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-blue-600 dark:text-blue-400"
                                    }`}
                                  >
                                    {gap.current_level}
                                  </span>
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  Target:{" "}
                                  <span className="font-medium text-green-600 dark:text-green-400">
                                    {gap.target_level}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Learning Resources */}
                          <div className="p-3 sm:p-4">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                              Recommended Learning Path
                            </p>
                            <div className="space-y-2 sm:space-y-3">
                              {gap.learning_path?.map((resource, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                >
                                  <div
                                    className={`p-2 rounded-lg flex-shrink-0 ${
                                      resource.type === "course"
                                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                                        : resource.type === "tutorial"
                                        ? "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
                                        : resource.type === "documentation"
                                        ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                                        : resource.type === "project"
                                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                                    }`}
                                  >
                                    {resource.type === "course" ? (
                                      <GraduationCap className="w-4 h-4" />
                                    ) : resource.type === "project" ? (
                                      <Briefcase className="w-4 h-4" />
                                    ) : (
                                      <BookOpen className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                                        {resource.name}
                                      </p>
                                      {resource.url && (
                                        <a
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors flex-shrink-0"
                                        >
                                          <ExternalLink className="w-4 h-4" />
                                        </a>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                                      <span className="capitalize px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                        {resource.type}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {resource.estimated_time}
                                      </span>
                                      <span
                                        className={`capitalize px-2 py-0.5 rounded ${
                                          resource.difficulty === "beginner"
                                            ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400"
                                            : resource.difficulty ===
                                              "intermediate"
                                            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                                            : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                                        }`}
                                      >
                                        {resource.difficulty}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Gaps Message */}
                  {skillGapData.skill_gaps?.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Great Match!
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Your skills align well with this position. Consider
                        applying!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Unable to load skill analysis. Please try again.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
              <button
                onClick={() => setShowSkillGapModal(false)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              {skillGapData && (
                <button
                  onClick={() => {
                    setSkillGapData(null);
                    handleAnalyzeSkillGap();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 transition-colors shadow-md hover:shadow-lg"
                >
                  Refresh Analysis
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;
