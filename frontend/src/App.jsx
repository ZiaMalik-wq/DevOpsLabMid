import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateJob from "./pages/CreateJob";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import MyJobs from "./pages/Myjobs";
import EditJob from "./pages/EditJob";
import Profile from "./pages/Profile";
import RecommendedJobs from "./pages/RecommendedJobs";
import MyApplications from "./pages/MyApplications";
import JobApplicants from "./pages/JobApplicants";
import InterviewPrep from "./pages/InterviewPrep";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminDashboard from "./pages/AdminDashboard";
import SavedJobs from "./pages/SavedJobs";
import { Toaster } from "react-hot-toast";
import { Analytics } from "@vercel/analytics/react";

// Loading screen component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 dark:text-gray-400 text-sm">Loading...</p>
    </div>
  </div>
);

// Main app content - only renders after auth is checked
const AppContent = () => {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Toaster position="top-center" reverseOrder={false} />
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/post-job" element={<CreateJob />} />
        <Route path="/jobs/:id" element={<JobDetails />} />
        <Route path="/my-jobs" element={<MyJobs />} />
        <Route path="/jobs/:id/edit" element={<EditJob />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/recommendations" element={<RecommendedJobs />} />
        <Route path="/saved-jobs" element={<SavedJobs />} />
        <Route path="/my-applications" element={<MyApplications />} />
        <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
        <Route path="/jobs/:id/interview-prep" element={<InterviewPrep />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>

      {/* Vercel Analytics */}
      <Analytics />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
