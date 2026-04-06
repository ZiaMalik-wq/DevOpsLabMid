import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import {
  Sparkles,
  Briefcase,
  Search,
  Upload,
  ArrowRight,
  LayoutDashboard,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const Home = () => {
  const { user } = useContext(AuthContext);
  const reduceMotion = useReducedMotion();

  const isCompany = user?.role?.toLowerCase() === "company";
  const isStudent = user?.role?.toLowerCase() === "student";

  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-64 -left-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-20 text-center">
          {/* Badge */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-8"
          >
            <Sparkles className="w-4 h-4" />
            AI-matched jobs, not keyword spam
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.1, duration: 0.45 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tight leading-tight"
          >
            Find Your Dream{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Career
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="text-lg sm:text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-6 leading-relaxed"
          >
            Upload your resume, get AI-matched jobs, and apply with confidence.
          </motion.p>

          {/* How it works */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-10">
            Upload resume → Get matched → Apply smarter
          </p>

          {/* CTAs */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto"
          >
            {isStudent && (
              <>
                <Link
                  to="/recommendations"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  AI Recommendations
                </Link>
                <Link
                  to="/jobs"
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Browse Jobs
                </Link>
              </>
            )}

            {isCompany && (
              <>
                <Link
                  to="/post-job"
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-5 h-5" />
                  Post New Job
                </Link>
                <Link
                  to="/my-jobs"
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </Link>
              </>
            )}

            {!user && (
              <>
                <Link
                  to="/register"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/jobs"
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-600 rounded-2xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Browse Jobs
                </Link>
              </>
            )}
          </motion.div>

          {/* Trust */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              10,000+ Students
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              500+ Companies
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              95% Match Rate
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Why Choose CampusCareer?
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Built to help you find better opportunities, faster.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Upload,
              title: "Resume Parsing",
              desc: "AI extracts your skills and experience accurately from your resume.",
              bgColor: "bg-blue-600",
            },
            {
              icon: Sparkles,
              title: "Semantic Matching",
              desc: "Understand meaning, not keywords, for better job matches.",
              bgColor: "bg-purple-600",
            },
            {
              icon: Zap,
              title: "Smart Search",
              desc: "Search naturally and get instant, relevant results.",
              bgColor: "bg-green-600",
            },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur p-8 rounded-3xl shadow-lg border dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${f.bgColor} flex items-center justify-center mb-6 text-white`}
              >
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                {f.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;
