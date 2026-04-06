import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import {
  ArrowLeft,
  User,
  Mail,
  GraduationCap,
  Calendar,
  FileText,
  ChevronDown,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const JobApplicants = () => {
  const { id } = useParams(); // Job ID
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [applicants, setApplicants] = useState([]);
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);

  // Track which specific applicant is being updated
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    // Wait for user to be loaded from AuthContext
    if (!user) return;

    // Redirect non-company users
    if (user.role?.toLowerCase() !== "company") {
      navigate("/");
      return;
    }

    const fetchData = async () => {
      try {
        const jobRes = await api.get(`/jobs/${id}`);
        setJobTitle(jobRes.data.title);

        const appRes = await api.get(`/applications/job/${id}`);
        console.log("Applicants data:", appRes.data);
        setApplicants(appRes.data);
      } catch (error) {
        console.error("Error fetching applicants:", error);
        if (error.response?.status === 403) {
          toast.error("You are not authorized to view these applicants.", {
            duration: 4000,
          });
          navigate("/my-jobs");
        } else {
          toast.error("Failed to load applicants.", { duration: 4000 });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, navigate]);

  const handleStatusChange = async (applicationId, newStatus) => {
    // Prevent multiple clicks
    if (updatingId === applicationId) return;

    setUpdatingId(applicationId);
    const toastId = toast.loading("Updating status...");

    try {
      // 1. Call Backend
      await api.patch(`/applications/${applicationId}/status`, {
        status: newStatus,
      });

      // 2. Update Local State
      setApplicants((prev) =>
        prev.map((app) =>
          app.application_id === applicationId
            ? { ...app, status: newStatus }
            : app
        )
      );

      toast.success(`Marked as ${newStatus}`, { id: toastId, duration: 3000 });
    } catch (error) {
      console.error("Status Update Error:", error);
      const errorMsg =
        error.response?.data?.detail || "Failed to update status.";
      toast.error(errorMsg, { id: toastId, duration: 4000 });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "hired":
        return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      case "rejected":
        return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      case "shortlisted":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "interview":
        return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate(`/my-jobs`)}
            className="flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </button>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Applicants
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                Viewing candidates for{" "}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {jobTitle}
                </span>
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 px-3 sm:px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300">
              Total: {applicants.length}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        {applicants.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 sm:p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              No applicants yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Wait for students to discover your job posting.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Mobile: Card View */}
            <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {applicants.map((applicant) => (
                <div
                  key={applicant.application_id}
                  className="p-4 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {applicant.profile_image_url ? (
                      <img
                        src={applicant.profile_image_url}
                        alt={applicant.full_name}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {(applicant.full_name || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-white truncate">
                        {applicant.full_name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3" />
                        {applicant.email}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Education:
                      </span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {applicant.university || "Not provided"}
                      </p>
                      {applicant.cgpa && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          CGPA: {applicant.cgpa}
                        </p>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400 block mb-1">
                        Skills:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {applicant.skills ? (
                          applicant.skills
                            .split(",")
                            .slice(0, 3)
                            .map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                              >
                                {skill.trim()}
                              </span>
                            ))
                        ) : (
                          <span className="text-xs text-gray-400">
                            No skills listed
                          </span>
                        )}
                        {applicant.skills &&
                          applicant.skills.split(",").length > 3 && (
                            <span className="text-xs text-gray-500 px-2">
                              +{applicant.skills.split(",").length - 3} more
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={applicant.status}
                      onChange={(e) =>
                        handleStatusChange(
                          applicant.application_id,
                          e.target.value
                        )
                      }
                      disabled={updatingId === applicant.application_id}
                      className={`flex-1 min-w-[120px] px-3 py-1.5 text-sm font-semibold rounded-lg border-2 transition ${getStatusColor(
                        applicant.status
                      )}`}
                    >
                      <option value="applied">Applied</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="interview">Interview</option>
                      <option value="hired">Hired</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    {applicant.resume_url && (
                      <a
                        href={applicant.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Education
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                      Resume
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {applicants.map((applicant) => (
                    <tr
                      key={applicant.application_id}
                      className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition"
                    >
                      {/* Name & Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {applicant.profile_image_url ? (
                            <img
                              src={applicant.profile_image_url}
                              alt={applicant.full_name}
                              className="w-10 h-10 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                              {applicant.full_name?.charAt(0) || "?"}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {applicant.full_name}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Mail className="w-3 h-3" />
                              {applicant.email}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Applied:{" "}
                              {new Date(
                                applicant.applied_at
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Education */}
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1">
                            <GraduationCap className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            {applicant.university || "N/A"}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                            CGPA:{" "}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {applicant.cgpa || "N/A"}
                            </span>
                          </p>
                        </div>
                      </td>

                      {/* Skills */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {applicant.skills ? (
                            applicant.skills
                              .split(",")
                              .slice(0, 3)
                              .map((skill, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600"
                                >
                                  {skill.trim()}
                                </span>
                              ))
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              No skills
                            </span>
                          )}
                        </div>
                      </td>

                      {/* --- STATUS DROPDOWN --- */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="relative w-fit">
                            <select
                              value={applicant.status}
                              disabled={updatingId === applicant.application_id}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(
                                  applicant.application_id,
                                  e.target.value
                                );
                              }}
                              className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors uppercase
                                ${getStatusColor(applicant.status)}
                                ${
                                  updatingId === applicant.application_id
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              `}
                            >
                              <option
                                value="applied"
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                Applied
                              </option>
                              <option
                                value="shortlisted"
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                Shortlisted
                              </option>
                              <option
                                value="interview"
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                Interview
                              </option>
                              <option
                                value="hired"
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                Hired
                              </option>
                              <option
                                value="rejected"
                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              >
                                Rejected
                              </option>
                            </select>

                            {/* Chevron or Spinner */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              {updatingId === applicant.application_id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-gray-600" />
                              ) : (
                                <ChevronDown
                                  className={`w-3 h-3 ${
                                    applicant.status?.toLowerCase() ===
                                      "hired" ||
                                    applicant.status?.toLowerCase() ===
                                      "rejected"
                                      ? "opacity-70"
                                      : "text-blue-600"
                                  }`}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Resume Action */}
                      <td className="px-6 py-4 text-right">
                        {applicant.resume_url ? (
                          <a
                            href={applicant.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                          >
                            <FileText className="w-4 h-4" />
                            View CV
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            No CV
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobApplicants;
