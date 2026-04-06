import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import RecommendationCard from "../components/RecommendationCard";
import { Sparkles, ArrowRight } from "lucide-react";

const RecommendedJobs = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Redirect if not student
    if (user && user.role !== "student" && user.role !== "STUDENT") {
      navigate("/jobs"); // Redirect companies to normal job board
      return;
    }

    const fetchRecommendations = async () => {
      try {
        // 2. Fetch from the specific recommendation endpoint
        // Assuming endpoint is /jobs/recommendations based on typical FastAPI structure
        // CHECK WITH MEMBER 1: Is it "/jobs/recommendations" or just "/recommendations"?
        const response = await api.get("/jobs/recommendations");
        setRecommendations(response.data);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
        setError(
          "Could not generate recommendations. Make sure your profile skills are updated."
        );
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchRecommendations();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-10 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-8 sm:mb-10 text-white shadow-lg">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                <span className="font-bold tracking-wide uppercase text-xs sm:text-sm text-blue-100">
                  AI Powered
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Top Picks for {user?.full_name || "You"}
              </h1>
              <p className="text-sm sm:text-base text-blue-100 max-w-xl">
                We analyzed your resume and skills against our database. Here
                are the jobs where you have the highest chance of success.
              </p>
            </div>

            <Link
              to="/profile"
              className="w-full sm:w-auto text-center px-6 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg hover:bg-white/30 transition text-sm font-semibold"
            >
              Update Profile / CV
            </Link>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">
              Analyzing matches...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <h3 className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-2">
              No recommendations yet.
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <Link
              to="/profile"
              className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Go to Profile to add Skills & CV
            </Link>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <h3 className="text-xl text-gray-500 dark:text-gray-400 font-medium">
              We couldn't find strong matches right now.
            </h3>
            <p className="text-gray-400 mt-2">
              Try adding more details to your profile skills.
            </p>
            <Link
              to="/jobs"
              className="mt-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Browse all jobs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((job) => (
              <RecommendationCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedJobs;
