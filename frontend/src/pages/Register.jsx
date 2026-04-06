import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  User,
  Building2,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /* ---------------- Password Strength ---------------- */
  const getPasswordStrength = (password) => {
    const rules = {
      length: password.length >= 8,
      case: /[a-z]/.test(password) && /[A-Z]/.test(password),
      number: /\d/.test(password),
      symbol: /[^a-zA-Z0-9]/.test(password),
    };

    const score = Object.values(rules).filter(Boolean).length;

    const map = {
      0: { label: "", color: "" },
      1: { label: "Weak", color: "bg-red-500" },
      2: { label: "Fair", color: "bg-orange-500" },
      3: { label: "Good", color: "bg-yellow-500" },
      4: { label: "Strong", color: "bg-green-600" },
    };

    return { ...map[score], score, rules };
  };

  const strength = getPasswordStrength(formData.password);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/register", formData);
      toast.success("Account created successfully!", {
        icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
        duration: 3000,
      });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Registration failed. Try again.",
        {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          duration: 4000,
        }
      );
      setLoading(false);
    }
  };

  /* ---------------- Motion Variants ---------------- */
  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg mb-4 p-2">
            <img
              src="/dark_logo.svg"
              alt="CampusCareer Logo"
              width={48}
              height={48}
              loading="eager"
              decoding="async"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Join CampusCareer
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Step <strong>1 of 2</strong> — Choose role & create account
          </p>
        </motion.div>

        {/* Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-3xl shadow-2xl border dark:border-gray-700 p-8">
          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              I'm joining as
            </label>

            <div
              role="radiogroup"
              aria-label="Select role"
              className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-700 p-2 rounded-2xl"
            >
              {[
                { key: "student", label: "Student", icon: User },
                { key: "company", label: "Company", icon: Building2 },
              ].map(({ key, label, icon: Icon }) => (
                <motion.button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={formData.role === key}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setFormData((f) => ({ ...f, role: key }))}
                  className={`p-4 rounded-xl border-2 transition focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    formData.role === key
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-600"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                  }`}
                >
                  <Icon
                    className={`mx-auto mb-2 ${
                      formData.role === key ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                  <p className="text-sm font-semibold dark:text-gray-200">
                    {label}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {formData.role === "company" ? "Company Name" : "Full Name"}
              </label>
              <div className="relative mt-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder={
                    formData.role === "company"
                      ? "Acme Technologies"
                      : "John Doe"
                  }
                  className="w-full pl-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  required
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={
                    formData.role === "company"
                      ? "hr@company.com"
                      : "student@university.edu"
                  }
                  className="w-full pl-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                  className="absolute right-4 top-1/2 -translate-y-1/2 dark:text-gray-400"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {/* Password rules */}
              {formData.password && (
                <div className="mt-2 text-xs space-y-1">
                  {Object.entries({
                    "8+ characters": strength.rules.length,
                    "Upper & lowercase": strength.rules.case,
                    Number: strength.rules.number,
                    Symbol: strength.rules.symbol,
                  }).map(([label, ok]) => (
                    <p
                      key={label}
                      className={`flex items-center gap-1 ${
                        ok
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-400"
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" /> {label}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.03 } : {}}
              whileTap={!loading ? { scale: 0.97 } : {}}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                loading
                  ? "bg-gray-400 dark:bg-gray-600"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl"
              }`}
            >
              {loading ? "Creating Account…" : "Create Account"}
              <ArrowRight />
            </motion.button>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              By registering, you agree to our Terms & Privacy Policy
            </p>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
