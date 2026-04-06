import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import {
  Sparkles,
  Brain,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Target,
  ChevronDown,
  User,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const InterviewPrep = () => {
  const { id } = useParams(); // Job ID
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [prepData, setPrepData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State to track which answers are expanded (by index)
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    // 1. Security Check
    if (user && user.role !== "student" && user.role !== "STUDENT") {
      navigate(`/jobs/${id}`);
      return;
    }

    const generatePrep = async () => {
      try {
        console.log(" Sending request to AI...");
        const response = await api.post(`/jobs/${id}/interview-prep`);

        console.log(" AI Response received:", response.data); // CHECK THIS IN CONSOLE

        if (!response.data) {
          throw new Error("Empty response from server");
        }

        setPrepData(response.data);
      } catch (err) {
        console.error("❌ AI Generation Error:", err);
        const msg =
          err.response?.data?.detail || "Failed to generate interview prep.";
        setError(msg);
        toast.error(msg, { duration: 4000 });
      } finally {
        setLoading(false);
      }
    };

    if (user) generatePrep();
  }, [id, user, navigate]);

  const toggleAnswer = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Helper for Difficulty Badge
  const getDifficultyColor = (level) => {
    switch (level?.toLowerCase()) {
      case "easy":
        return "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      case "hard":
        return "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
    }
  };

  // --- LOADING STATE (AI Thinking) ---
  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col justify-center items-center p-4">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-200 dark:bg-purple-900/30 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl">
            <Brain className="w-16 h-16 text-purple-600 animate-bounce" />
          </div>
        </div>
        <h2 className="mt-8 text-2xl font-bold text-gray-800 dark:text-white">
          AI is analyzing your resume...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
          We are comparing your skills against the job description to find your
          gaps and generate custom questions.
        </p>
        <div className="mt-6 flex gap-2">
          <span
            className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          ></span>
          <span
            className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></span>
          <span
            className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          ></span>
        </div>
      </div>
    );

  // --- ERROR STATE ---
  if (error)
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full w-fit mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Analysis Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">{error}</p>
          <button
            onClick={() => navigate(`/jobs/${id}`)}
            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
          >
            Back to Job
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-10 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* HEADER */}
        <button
          onClick={() => navigate(`/jobs/${id}`)}
          className="flex items-center text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-4 sm:mb-6 transition font-medium text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Job Details
        </button>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Interview Prep Plan
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              AI-generated questions based on your skill gaps.
            </p>
          </div>
        </div>

        {/* 1. RESUME FEEDBACK SECTION */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-lg mb-8 sm:mb-10">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold mb-2">
                Resume Feedback
              </h3>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed font-medium">
                "{prepData?.resume_feedback}"
              </p>
            </div>
          </div>
        </div>

        {/* 2. TECHNICAL QUESTIONS */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
            Technical & Skill Gap Questions
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {prepData?.technical_questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                {/* Question Header (Clickable) */}
                <div
                  onClick={() => toggleAnswer(idx)}
                  className="p-4 sm:p-5 flex justify-between items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div className="flex-1 pr-4">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-white">
                      {q.question}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getDifficultyColor(
                        q.difficulty
                      )}`}
                    >
                      {q.difficulty}
                    </span>
                    {expandedIndex === idx ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Answer Key (Accordion) */}
                {expandedIndex === idx && (
                  <div className="px-5 pb-5 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="mt-3 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-100 dark:border-purple-800">
                      <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Key Talking Points
                      </h4>
                      <ul className="space-y-2">
                        {/* Split the semicolon separated string into bullets */}
                        {q.expected_answer_key_points
                          .split(";")
                          .map((point, i) => (
                            <li
                              key={i}
                              className="text-gray-700 dark:text-gray-300 text-sm flex items-start gap-2"
                            >
                              <span className="mt-1.5 w-1.5 h-1.5 bg-purple-400 rounded-full flex-shrink-0"></span>
                              {point.trim()}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 3. BEHAVIORAL QUESTIONS */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />{" "}
            {/* Reusing User Icon logic or import it */}
            Behavioral Questions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prepData?.behavioral_questions.map((q, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full"
              >
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  {q.question}
                </h3>

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                    <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="italic">{q.tip}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
