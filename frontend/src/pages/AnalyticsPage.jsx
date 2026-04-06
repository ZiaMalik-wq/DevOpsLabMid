import React, { useState, useEffect, useContext } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  Users,
  Eye,
  Briefcase,
  FileText,
  Activity,
  BarChart2,
} from "lucide-react";

const AnalyticsPage = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reduceMotion = useReducedMotion();
  const fadeUp = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0 },
  };
  const stagger = {
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } },
  };

  const isCompany = user?.role === "company" || user?.role === "COMPANY";

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError(null);
        const endpoint = isCompany
          ? "/analytics/company"
          : "/analytics/student";
        const response = await api.get(endpoint);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setError("Failed to load analytics. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAnalytics();
  }, [user, isCompany]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600" />
            <div className="space-y-2">
              <div className="h-5 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm"
              >
                <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              No analytics available
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {error || "Please refresh and try again."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const commonGridProps = {
    stroke: "#e5e7eb",
    strokeDasharray: "3 3",
  };

  const commonAxisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fill: "#6b7280", fontSize: 12 },
  };

  const tooltipProps = {
    cursor: { fill: "rgba(15, 23, 42, 0.04)" },
    contentStyle: {
      backgroundColor: "rgba(255, 255, 255, 0.92)",
      border: "1px solid rgba(229, 231, 235, 1)",
      borderRadius: 14,
      boxShadow: "0 10px 30px rgba(2, 6, 23, 0.12)",
      padding: "10px 12px",
    },
    labelStyle: { color: "#111827", fontWeight: 600 },
    itemStyle: { color: "#111827" },
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 px-4">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <motion.header variants={fadeUp} className="mb-6">
          <div className="flex items-start gap-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg">
              <BarChart2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                {isCompany ? "Recruitment Analytics" : "My Career Insights"}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {isCompany
                  ? "Track job performance and your candidate pipeline."
                  : "Visualize your application progress and market trends."}
              </p>
            </div>
          </div>
        </motion.header>

        {/* --- COMPANY DASHBOARD --- */}
        {isCompany ? (
          <>
            {/* 1. Stats Grid */}
            <motion.div
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
            >
              <motion.div variants={fadeUp}>
                <StatCard
                  title="Active Jobs"
                  value={data.total_active_jobs}
                  icon={<Briefcase className="w-6 h-6 text-blue-600" />}
                  color="bg-blue-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard
                  title="Total Views"
                  value={data.total_views}
                  icon={<Eye className="w-6 h-6 text-purple-600" />}
                  color="bg-purple-50"
                />
              </motion.div>
              <motion.div variants={fadeUp}>
                <StatCard
                  title="Total Applications"
                  value={data.total_applications}
                  icon={<Users className="w-6 h-6 text-green-600" />}
                  color="bg-green-50"
                />
              </motion.div>
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* 2. Hiring Funnel Chart */}
              <motion.div variants={fadeUp}>
                <ChartCard title="Hiring Funnel">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={data.hiring_funnel}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid {...commonGridProps} horizontal={false} />
                      <XAxis type="number" {...commonAxisProps} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        width={80}
                        tick={{
                          fill: "#374151",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        {...tooltipProps}
                        cursor={{ fill: "rgba(15, 23, 42, 0.03)" }}
                      />
                      <Bar
                        dataKey="value"
                        radius={[0, 10, 10, 0]}
                        barSize={28}
                        background={{
                          fill: "rgba(59, 130, 246, 0.08)",
                          radius: 10,
                        }}
                      >
                        {data.hiring_funnel.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || "#3b82f6"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </motion.div>

              {/* 3. Applicant Skills Cloud */}
              <motion.div variants={fadeUp}>
                <ChartCard title="Top Applicant Skills">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.applicant_skills}>
                      <CartesianGrid {...commonGridProps} vertical={false} />
                      <XAxis
                        dataKey="label"
                        {...commonAxisProps}
                        height={60}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis {...commonAxisProps} />
                      <Tooltip {...tooltipProps} />
                      <Bar
                        dataKey="value"
                        fill="#6366F1"
                        radius={[10, 10, 0, 0]}
                        barSize={34}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Frequency of skills in applicant resumes
                  </p>
                </ChartCard>
              </motion.div>
            </motion.div>
          </>
        ) : (
          /* --- STUDENT DASHBOARD --- */
          <>
            {/* 1. Stats Grid */}
            <motion.div
              variants={stagger}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
            >
              <motion.div variants={fadeUp}>
                <StatCard
                  title="Total Applications"
                  value={data.total_applications}
                  icon={<FileText className="w-6 h-6 text-blue-600" />}
                  color="bg-blue-50"
                />
              </motion.div>
              <motion.div variants={fadeUp} className="h-full">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-lg flex items-center justify-between h-full">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold opacity-90">
                      Market Insight
                    </h3>
                    <p className="text-xs sm:text-sm opacity-80 mt-1">
                      {data.market_trends[0]?.label || "Tech"} is currently the
                      most demanded skill.
                    </p>
                  </div>
                  <Activity className="w-8 sm:w-10 h-8 sm:h-10 opacity-80 flex-shrink-0" />
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              variants={stagger}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* 2. Application Status Pie Chart */}
              <motion.div variants={fadeUp}>
                <ChartCard title="Application Status">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.application_status}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="label" // <--- FIXED: Added this line
                          stroke="rgba(255, 255, 255, 0.9)"
                          strokeWidth={2}
                        >
                          {data.application_status.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip {...tooltipProps} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 12, color: "#374151" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </motion.div>

              {/* 3. Market Trends Bar Chart */}
              <motion.div variants={fadeUp}>
                <ChartCard title="Trending Skills (Market Demand)">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.market_trends}>
                      <CartesianGrid {...commonGridProps} vertical={false} />
                      <XAxis
                        dataKey="label"
                        {...commonAxisProps}
                        height={60}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis {...commonAxisProps} />
                      <Tooltip {...tooltipProps} />
                      <Bar
                        dataKey="value"
                        fill="#10B981"
                        radius={[10, 10, 0, 0]}
                        barSize={34}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    Keywords found in active job descriptions
                  </p>
                </ChartCard>
              </motion.div>
            </motion.div>
          </>
        )}
      </motion.div>
    </main>
  );
};

// --- Sub-components for cleaner code ---

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all flex items-center justify-between group relative overflow-hidden">
    {/* Decorative gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

    <div className="min-w-0 relative z-10">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {title}
      </p>
      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </h3>
    </div>
    <div
      className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${color} dark:opacity-90 relative z-10 flex-shrink-0`}
    >
      {icon}
    </div>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 relative overflow-hidden group">
    {/* Decorative gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

    <div className="relative z-10">
      <div className="flex items-center justify-between gap-4 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        {children}
      </div>
    </div>
  </div>
);

// Colors for Pie Chart
const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

export default AnalyticsPage;
