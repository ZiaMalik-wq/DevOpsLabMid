import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { motion, useReducedMotion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Building2,
  CheckCircle2,
  Calendar,
} from "lucide-react";

const MIN_DESCRIPTION_LENGTH = 50;

const CreateJob = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [loading, setLoading] = useState(false);

  const [jobData, setJobData] = useState({
    title: "",
    description: "",
    location: "",
    salary_range: "",
    job_type: "Full-time",
    max_seats: 1,
    deadline: "",
  });

  const [initialSnapshot] = useState(jobData);

  /* ---------------- Helpers ---------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobData((prev) => ({ ...prev, [name]: value }));
  };

  const isDirty = useMemo(
    () => JSON.stringify(jobData) !== JSON.stringify(initialSnapshot),
    [jobData, initialSnapshot]
  );

  const descriptionLength = jobData.description.length;

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const canSubmit =
    isDirty &&
    jobData.title.trim() &&
    jobData.location.trim() &&
    descriptionLength >= MIN_DESCRIPTION_LENGTH &&
    !loading;

  /* ---------------- Submit ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    const toastId = toast.loading("Creating job posting…");

    try {
      const payload = {
        ...jobData,
        deadline: jobData.deadline || null,
      };

      await api.post("/jobs/create", payload);

      toast.success("Job posted successfully!", {
        id: toastId,
        duration: 3000,
      });
      setTimeout(() => navigate("/my-jobs"), 1200);
    } catch (error) {
      const msg =
        error.response?.status === 403
          ? "Only companies can post jobs"
          : error.response?.data?.detail ||
            "Failed to post job. Please try again.";

      toast.error(msg, { id: toastId, duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const sectionAnim = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0 },
  };

  /* ---------------- Render ---------------- */
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4 sm:py-6 px-4">
      <div className="relative max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-2 sm:mb-3">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Post a New Opportunity
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2">
            Create a clear, compelling role to attract top talent
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-2xl sm:rounded-3xl shadow-xl border dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-6"
        >
          {/* Section: Basics */}
          <motion.section
            variants={sectionAnim}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Job Information
            </h2>

            {/* Title */}
            <div>
              <label className="label">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Job Title *
              </label>
              <input
                name="title"
                value={jobData.title}
                onChange={handleChange}
                required
                className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                placeholder="e.g. Senior React Developer"
              />
              {!jobData.title.trim() && (
                <p className="hint dark:text-gray-400">Job title is required</p>
              )}
            </div>

            {/* Type + Salary */}
            <div className="grid md:grid-cols-2 gap-4">
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
                  <option>Full-time</option>
                  <option>Part-time</option>
                  <option>Internship</option>
                  <option>Contract</option>
                </select>
              </div>

              <div>
                <label className="label">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Salary Range
                </label>
                <input
                  name="salary_range"
                  value={jobData.salary_range}
                  onChange={handleChange}
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="e.g. 80k – 120k PKR"
                />
              </div>
            </div>
          </motion.section>

          {/* Section: Logistics */}
          <motion.section
            variants={sectionAnim}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Logistics
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">
                  <MapPin className="w-4 h-4 text-red-600" />
                  Location *
                </label>
                <input
                  name="location"
                  value={jobData.location}
                  onChange={handleChange}
                  required
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Remote, Hybrid, Lahore"
                />
                {!jobData.location.trim() && (
                  <p className="hint dark:text-gray-400">
                    Location is required
                  </p>
                )}
              </div>

              <div>
                <label className="label">
                  <Users className="w-4 h-4 text-orange-600" />
                  Open Positions
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  name="max_seats"
                  value={jobData.max_seats}
                  onChange={handleChange}
                  className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

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
                min={getCurrentDateTime()}
                className="input px-3 py-2.5 dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <p className="hint dark:text-gray-400">
                Optional — leave empty for no deadline
              </p>
            </div>
          </motion.section>

          {/* Section: Description */}
          <motion.section
            variants={sectionAnim}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Job Description
            </h2>

            <textarea
              name="description"
              rows={5}
              value={jobData.description}
              onChange={handleChange}
              className="input px-3 py-2.5 resize-none dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
              placeholder="Describe responsibilities, requirements, and growth opportunities…"
            />

            <div className="flex justify-between text-sm">
              <span
                className={
                  descriptionLength < MIN_DESCRIPTION_LENGTH
                    ? "text-orange-600"
                    : "text-green-600"
                }
              >
                {descriptionLength < MIN_DESCRIPTION_LENGTH
                  ? `Add ${
                      MIN_DESCRIPTION_LENGTH - descriptionLength
                    } more characters`
                  : "✓ Good description length"}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {descriptionLength} chars
              </span>
            </div>
          </motion.section>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-3 flex gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Our AI analyzes this job to match it with the most relevant
              candidates automatically.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/my-jobs")}
              disabled={loading}
              className="btn-secondary py-2.5 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`btn-primary ${
                !canSubmit ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                "Creating job…"
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Post Job
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {!isDirty && (
            <p className="text-xs text-gray-400 text-center">
              Make changes to enable posting
            </p>
          )}
        </form>

        <footer className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <Building2 className="w-4 h-4" />
          Job becomes visible to students immediately after posting
        </footer>
      </div>
    </main>
  );
};

export default CreateJob;
