import { useContext } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Menu,
  X,
  Shield,
  LayoutDashboard,
  Briefcase,
  Wand2,
  Bookmark,
  FileText,
  Home,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import Logo from "./Logo";
import DesktopNav from "./DesktopNav";
import MobileNav from "./MobileNav";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import { useNavbarState } from "./useNavbarState";

const Navbar = () => {
  const { user, logout, loading, profileImageUrl } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const navbar = useNavbarState(location);

  const isCompany = user?.role?.toLowerCase() === "company";
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";

  const navLinks = user
    ? isAdmin
      ? [{ to: "/admin", label: "Admin Panel", icon: "Shield" }]
      : isCompany
      ? [
          { to: "/my-jobs", label: "Dashboard", icon: "LayoutDashboard" },
          { to: "/jobs", label: "Jobs", icon: "Briefcase" },
        ]
      : [
          { to: "/jobs", label: "Jobs", icon: "Briefcase" },
          { to: "/recommendations", label: "AI Picks", icon: "Wand2" },
          { to: "/saved-jobs", label: "Saved", icon: "Bookmark" },
          { to: "/my-applications", label: "Applications", icon: "FileText" },
        ]
    : [
        { to: "/", label: "Home", icon: "Home" },
        { to: "/jobs", label: "Jobs", icon: "Briefcase" },
      ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto h-16 px-4 flex justify-between items-center">
        <Logo />

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user && !isAdmin && <NotificationBell />}
          <DesktopNav
            user={user}
            loading={loading}
            isCompany={isCompany}
            isAdmin={isAdmin}
            navLinks={navLinks}
            navbar={navbar}
            onLogout={handleLogout}
            profileImageUrl={profileImageUrl}
          />
        </div>

        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          {user && !isAdmin && <NotificationBell />}
          {user && !isAdmin && (
            <Link
              to="/profile"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0"
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.full_name || user.name || "U")[0].toUpperCase()
              )}
            </Link>
          )}
          <button
            className="p-2 dark:text-gray-300"
            onClick={() => navbar.setMobileOpen(!navbar.mobileOpen)}
          >
            {navbar.mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <MobileNav
        user={user}
        isAdmin={isAdmin}
        isCompany={isCompany}
        navLinks={navLinks}
        open={navbar.mobileOpen}
        setOpen={navbar.setMobileOpen}
        onLogout={handleLogout}
        profileImageUrl={profileImageUrl}
      />
    </nav>
  );
};

export default Navbar;
