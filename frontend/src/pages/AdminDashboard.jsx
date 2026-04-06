import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import {
  Shield,
  Users,
  Briefcase,
  Trash2,
  Search,
  CheckCircle,
  Building2,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminDashboard = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  const roleKey = useMemo(() => {
    if (!user?.role) return "";
    const raw = String(user.role);
    return raw.split(".").pop().toLowerCase();
  }, [user?.role]);

  const isAdmin = roleKey === "admin";

  useEffect(() => {
    if (authLoading) return;

    // Strict Security Check (after auth bootstrap)
    if (!user || !isAdmin) {
      navigate("/");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // Fetch Stats
        // Assuming prefix is /admin based on context
        const statsRes = await api.get("/admin/stats", {
          signal: controller.signal,
        });
        setStats(statsRes.data);

        // Fetch Users
        const usersRes = await api.get("/admin/users?limit=100", {
          signal: controller.signal,
        });
        setUsers(usersRes.data);
      } catch (error) {
        if (error?.name === "CanceledError" || error?.code === "ERR_CANCELED") {
          return;
        }
        console.error("Admin Fetch Error:", error);
        const message =
          error?.response?.data?.detail || "Failed to load admin data";
        setError(message);
        toast.error(message, { duration: 4000 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [authLoading, user, isAdmin, navigate]);

  const handleDeleteUser = async (userId) => {
    if (
      !window.confirm(
        "Are you sure you want to ban/delete this user? This removes all their data."
      )
    )
      return;

    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success("User deleted successfully", { duration: 3000 });
      // Remove from UI
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Delete Error:", error);
      toast.error(error.response?.data?.detail || "Failed to delete user", {
        duration: 4000,
      });
    }
  };

  // Filter users
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      case "company":
        return "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      default:
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
  };

  if (loading)
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-purple-600" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-72 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm"
              >
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-8 w-14 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-3" />
              </div>
            ))}
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
            <div className="h-4 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-5" />
            <div className="h-48 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-4" />
          </div>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-start gap-4">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-600 to-purple-600 rounded-2xl shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                Admin Portal
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                System overview and user moderation.
              </p>
            </div>
          </div>
        </header>

        {error && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 mb-6">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Failed to load
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {error}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <StatCard
              title="Total Users"
              value={stats.total_users}
              icon={<Users className="w-6 h-6 text-blue-600" />}
              color="bg-blue-50"
            />
            <StatCard
              title="Students"
              value={stats.total_students}
              icon={<GraduationCap className="w-6 h-6 text-green-600" />}
              color="bg-green-50"
            />
            <StatCard
              title="Companies"
              value={stats.total_companies}
              icon={<Building2 className="w-6 h-6 text-purple-600" />}
              color="bg-purple-50"
            />
            <StatCard
              title="Jobs / Apps"
              value={`${stats.total_jobs} / ${stats.total_applications}`}
              icon={<Briefcase className="w-6 h-6 text-orange-600" />}
              color="bg-orange-50"
            />
          </div>
        )}

        {/* User Management */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              User Management
            </h2>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search email or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-2 focus:ring-red-500 focus:outline-none text-sm bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {u.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ID: #{u.id}
                    </p>
                  </div>
                  {u.role.toLowerCase() !== "admin" && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                      title="Ban User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-bold border ${getRoleBadge(
                      u.role
                    )}`}
                  >
                    {u.role}
                  </span>
                  {u.is_active ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-red-500 dark:text-red-400 text-xs">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                    Role
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      #{u.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {u.email}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold border ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="text-red-500 dark:text-red-400 text-xs">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role.toLowerCase() !== "admin" && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Ban User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No users found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

// Helper Component
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
    <div className="min-w-0">
      <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
        {title}
      </p>
      <h3 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
        {value}
      </h3>
    </div>
    <div
      className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${color} dark:bg-opacity-20 flex-shrink-0`}
    >
      {icon}
    </div>
  </div>
);

export default AdminDashboard;
