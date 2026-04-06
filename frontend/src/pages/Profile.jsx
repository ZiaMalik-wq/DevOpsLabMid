import React, { useState, useEffect, useContext, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import {
  User,
  Upload,
  FileText,
  Save,
  CheckCircle,
  Eye,
  Building2,
  MapPin,
  Globe,
  Camera,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const Skeleton = ({ className }) => (
  <div
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
  />
);

const Profile = () => {
  const {
    user,
    loading: authLoading,
    updateProfileImage,
  } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [_resumeLoading, setResumeLoading] = useState(false);
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const profileImageInputRef = useRef(null);

  const [studentData, setStudentData] = useState({
    full_name: "",
    university: "",
    cgpa: "",
    city: "",
    skills: "",
  });

  const [companyData, setCompanyData] = useState({
    company_name: "",
    location: "",
    website: "",
  });

  const [initialStudentData, setInitialStudentData] = useState(null);
  const [initialCompanyData, setInitialCompanyData] = useState(null);

  const [_resumeFile, setResumeFile] = useState(null);
  const [existingResume, setExistingResume] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);

  const roleKey = useMemo(() => {
    if (!user?.role) return "";
    const raw = String(user.role);
    // Handles "COMPANY" as well as "UserRole.COMPANY" or other enum string formats
    return raw.split(".").pop().toLowerCase();
  }, [user?.role]);

  const isStudent = roleKey === "student";
  const isCompany = roleKey === "company";

  const studentDirty = useMemo(
    () => JSON.stringify(studentData) !== JSON.stringify(initialStudentData),
    [studentData, initialStudentData]
  );

  const companyDirty = useMemo(
    () => JSON.stringify(companyData) !== JSON.stringify(initialCompanyData),
    [companyData, initialCompanyData]
  );

  useEffect(() => {
    if (!user) return;

    // Prefill from /auth/me display name so the form isn't blank while profile loads.
    if (isStudent && user.full_name && !studentData.full_name) {
      setStudentData((prev) => ({ ...prev, full_name: user.full_name }));
    }
    if (isCompany && user.full_name && !companyData.company_name) {
      setCompanyData((prev) => ({ ...prev, company_name: user.full_name }));
    }

    const load = async () => {
      setProfileLoading(true);
      try {
        if (isStudent) {
          const res = await api.get("/students/profile");
          const data = {
            ...res.data,
            skills: Array.isArray(res.data.skills)
              ? res.data.skills.join(", ")
              : res.data.skills || "",
          };
          setStudentData(data);
          setInitialStudentData(data);
          setExistingResume(
            res.data.resume_url || res.data.resume_filename || null
          );
          setProfileImageUrl(res.data.profile_image_url || null);

          if (!initialStudentData) setInitialStudentData(data);
        }

        if (isCompany) {
          const res = await api.get("/companies/profile");
          setCompanyData(res.data);
          setInitialCompanyData(res.data);
          setProfileImageUrl(res.data.profile_image_url || null);

          if (!initialCompanyData) setInitialCompanyData(res.data);
        }
      } catch (err) {
        const message = err?.response?.data?.detail || "Failed to load profile";
        toast.error(message, { duration: 4000 });
      } finally {
        setProfileLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isStudent, isCompany]);

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (!user) return null;

  if (profileLoading) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  const handleStudentChange = (e) =>
    setStudentData({ ...studentData, [e.target.name]: e.target.value });

  const handleCompanyChange = (e) =>
    setCompanyData({ ...companyData, [e.target.name]: e.target.value });

  const handleStudentSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const t = toast.loading("Saving profile...");
    try {
      await api.put("/students/profile", {
        ...studentData,
        cgpa: studentData.cgpa ? parseFloat(studentData.cgpa) : null,
      });
      toast.success("Profile updated", { id: t });
      setInitialStudentData(studentData);
    } catch {
      toast.error("Failed to save profile", { id: t });
    } finally {
      setLoading(false);
    }
  };

  const handleCompanySave = async (e) => {
    e.preventDefault();
    setLoading(true);
    const t = toast.loading("Saving company profile...");
    try {
      await api.put("/companies/profile", companyData);
      toast.success("Company profile updated", { id: t });
      setInitialCompanyData(companyData);
    } catch {
      toast.error("Failed to save profile", { id: t });
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Only PDF files allowed", { duration: 3000 });
      return;
    }

    setResumeLoading(true);
    const t = toast.loading("Uploading resume...");
    const data = new FormData();
    data.append("file", file);

    try {
      const res = await api.post("/students/resume", data);
      toast.success("Resume uploaded", { id: t });
      setResumeFile(file);
      setExistingResume(res.data.resume_url);
    } catch {
      toast.error("Upload failed", { id: t });
    } finally {
      setResumeLoading(false);
    }
  };

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images allowed", { duration: 3000 });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB", { duration: 3000 });
      return;
    }

    setProfileImageLoading(true);
    const t = toast.loading("Uploading profile image...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const endpoint = isStudent
        ? "/students/profile-image"
        : "/companies/profile-image";
      const res = await api.post(endpoint, formData);
      toast.success("Profile image updated", { id: t, duration: 2000 });
      setProfileImageUrl(res.data.profile_image_url);
      // Update cached profile image in AuthContext
      updateProfileImage(res.data.profile_image_url);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Upload failed";
      toast.error(msg, { id: t, duration: 3000 });
    } finally {
      setProfileImageLoading(false);
      // Reset input so same file can be selected again
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = "";
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
        {/* Header */}
        <motion.header
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          {/* Profile Image */}
          <div className="relative group">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : isCompany ? (
                <Building2 className="w-10 h-10 text-white" />
              ) : (
                <User className="w-10 h-10 text-white" />
              )}
            </div>
            {/* Upload overlay */}
            <label
              htmlFor="profile-image-upload"
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
            >
              {profileImageLoading ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </label>
            <input
              ref={profileImageInputRef}
              id="profile-image-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleProfileImageUpload}
              className="sr-only"
              disabled={profileImageLoading}
            />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            {/* Editable Name */}
            {isStudent && (
              <input
                name="full_name"
                value={studentData.full_name}
                onChange={handleStudentChange}
                placeholder="Your Name"
                className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors w-full"
              />
            )}
            {isCompany && (
              <input
                name="company_name"
                value={companyData.company_name}
                onChange={handleCompanyChange}
                placeholder="Company Name"
                className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors w-full"
              />
            )}
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
              {isCompany
                ? "What students will see about your company"
                : "Your information used for job matching"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Click on name or image to edit
            </p>
          </div>
        </motion.header>

        {/* ------------------ STUDENT ------------------ */}
        {isStudent && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Profile Form */}
            <motion.form
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              onSubmit={handleStudentSave}
              className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow border dark:border-gray-700 space-y-4 sm:space-y-6"
            >
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                Education & Location
              </h2>

              <input
                name="university"
                value={studentData.university}
                onChange={handleStudentChange}
                placeholder="University"
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />

              <div className="grid md:grid-cols-2 gap-4">
                <input
                  name="city"
                  value={studentData.city}
                  onChange={handleStudentChange}
                  placeholder="City"
                  className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <input
                  name="cgpa"
                  value={studentData.cgpa}
                  onChange={handleStudentChange}
                  placeholder="CGPA"
                  className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Skills
              </h3>

              <input
                name="skills"
                value={studentData.skills}
                onChange={handleStudentChange}
                placeholder="Python, React, SQL"
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />

              <button
                disabled={!studentDirty || loading}
                className="btn-primary disabled:opacity-40"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </motion.form>

            {/* Resume */}
            <motion.section
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow border dark:border-gray-700"
            >
              <h2 className="text-xl font-bold mb-4 dark:text-white">Resume</h2>

              <label
                htmlFor="resume-upload"
                className="block border-2 border-dashed dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 focus-within:ring-2"
              >
                <Upload className="mx-auto w-8 h-8 text-gray-400 dark:text-gray-500" />
                <span className="block mt-2 font-semibold dark:text-gray-200">
                  Upload PDF Resume
                </span>
                <input
                  id="resume-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  className="sr-only"
                />
              </label>

              {existingResume && (
                <a
                  href={existingResume}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center gap-2 text-blue-600"
                >
                  <Eye className="w-4 h-4" />
                  View current resume
                </a>
              )}
            </motion.section>
          </div>
        )}

        {/* ------------------ COMPANY ------------------ */}
        {isCompany && (
          <motion.form
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            onSubmit={handleCompanySave}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow border dark:border-gray-700 space-y-6 max-w-3xl"
          >
            <h2 className="text-xl font-bold dark:text-white">
              Company Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input
                name="location"
                value={companyData.location}
                onChange={handleCompanyChange}
                placeholder="Location"
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
              <input
                name="website"
                value={companyData.website}
                onChange={handleCompanyChange}
                placeholder="Website"
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>

            {/* Preview */}
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border dark:border-blue-700">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">
                Student Preview
              </p>
              <p className="font-bold dark:text-white">
                {companyData.company_name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {companyData.location || "Location not specified"}
              </p>
            </div>

            <button
              disabled={!companyDirty || loading}
              className="btn-primary disabled:opacity-40"
            >
              <Save className="w-5 h-5" />
              Save Company Profile
            </button>
          </motion.form>
        )}
      </div>
    </main>
  );
};

export default Profile;
