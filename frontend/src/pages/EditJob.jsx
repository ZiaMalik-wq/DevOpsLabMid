import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  Calendar,
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Clock,
} from "lucide-react";

const EditJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  useContext(AuthContext);

  const reduceMotion = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: reduceMotion ? 0 : 0.35, ease: "easeOut" },
    },
  };
  const stagger = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reduceMotion ? 0 : 0.06 },
    },
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Updated State to include deadline
  const [jobData, setJobData] = useState({
    title: "",
    description: "",
    location: "",
    salary_range: "",
    job_type: "Full-time",
    max_seats: 1,
    is_active: true,
    deadline: "",
  });

  // 2. Fetch Existing Data
  useEffect(() => {
    const fetchJob = async () => {
      try {
        const response = await api.get(`/jobs/${id}`);
        const data = response.data;

        // Helper: The datetime-local input needs format "YYYY-MM-DDTHH:mm"
        // Backend usually returns "2025-12-01T12:00:00" (with seconds)
        // We slice the string to remove seconds for the input to recognize it
        let formattedDeadline = "";
        if (data.deadline) {
          formattedDeadline = data.deadline.slice(0, 16);
        }

        setJobData({
          title: data.title,
          description: data.description,
          location: data.location,
          salary_range: data.salary_range || "",
          job_type: data.job_type,
          max_seats: data.max_seats || 1,
          is_active: data.is_active,
          deadline: formattedDeadline,
        });
      } catch (err) {
        console.error("Error fetching job:", err);
        toast.error("Could not load job details.", { duration: 4000 });
        navigate("/my-jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, navigate]);

  const handleChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setJobData({ ...jobData, [e.target.name]: value });
  };

  // 3. Submit Updates
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Prepare payload: Convert empty deadline string to null
      const payload = { ...jobData };
      if (!payload.deadline) {
        payload.deadline = null;
      }

      await api.put(`/jobs/${id}`, payload);

      toast.success("Job updated successfully!", { duration: 3000 });

      setTimeout(() => {
        navigate(`/jobs/${id}`);
      }, 1000);
    } catch (error) {
      console.error("Update Error:", error);
      const errorMsg = error.response?.data?.detail || "Failed to update job.";
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <motion.div
        className="flex justify-center items-center min-h-[60vh]"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </motion.div>
    );

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 px-4"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      <div className="max-w-4xl mx-auto">
        <motion.header variants={fadeUp} className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-3">
            <Briefcase className="w-6 sm:w-7 h-6 sm:h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Edit Job
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            Update details to keep your listing accurate
          </p>
        </motion.header>

        <motion.div
          variants={fadeUp}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl shadow-xl border dark:border-gray-700 p-4 sm:p-5 md:p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-4 mb-5 border-b border-gray-100 dark:border-gray-700">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {jobData.title || "Untitled job"}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Edit the fields below and save
              </p>
            </div>

            <div className="flex items-center gap-3 justify-start sm:justify-end">
              <label className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={jobData.is_active}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  Active
                </span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Job Title */}
            <div>
              <label className="label">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Job Title
              </label>
              <input
                type="text"
                name="title"
                value={jobData.title}
                onChange={handleChange}
                required
                className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>

            {/* Job Type & Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Job Type
                </label>
                <select
                  name="job_type"
                  value={jobData.job_type}
                  onChange={handleChange}
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div>
                <label className="label">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Salary Range
                </label>
                <input
                  type="text"
                  name="salary_range"
                  value={jobData.salary_range}
                  onChange={handleChange}
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            {/* Location & Seats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <MapPin className="w-4 h-4 text-red-600" />
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={jobData.location}
                  onChange={handleChange}
                  required
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="label">
                  <Users className="w-4 h-4 text-orange-600" />
                  Open Positions
                </label>
                <input
                  type="number"
                  name="max_seats"
                  value={jobData.max_seats}
                  onChange={handleChange}
                  min="1"
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            {/* Deadline & Active Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              {/* Deadline Field */}
              <div>
                <label className="label">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  Application Deadline
                </label>
                <input
                  type="datetime-local"
                  name="deadline"
                  value={jobData.deadline}
                  onChange={handleChange}
                  className="input px-3 py-2.5 text-gray-700 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3">
                Toggle “Active” to hide/show this job listing.
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="label">Job Description</label>
              <textarea
                name="description"
                value={jobData.description}
                onChange={handleChange}
                required
                rows={5}
                className="input px-3 py-2.5 resize-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
              ></textarea>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary py-2.5 w-full sm:w-auto dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`btn-primary w-full sm:w-auto ${
                  saving ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.main>
  );
};

export default EditJob;
