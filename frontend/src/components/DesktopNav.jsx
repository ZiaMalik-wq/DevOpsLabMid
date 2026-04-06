import NavLinks from "./NavLinks";
import ProfileMenu from "./ProfileMenu";
import { Link } from "react-router-dom";
import { LogIn, UserPlus, PlusCircle } from "lucide-react";

const DesktopNav = ({
  user,
  loading,
  isCompany,
  isAdmin,
  navLinks,
  navbar,
  onLogout,
  profileImageUrl,
}) => {
  return (
    <div className="hidden md:flex items-center gap-1">
      {/* Always show nav links - they handle guest vs user state */}
      <NavLinks links={navLinks} />

      {/* Show Post Job button for companies */}
      {!loading && isCompany && (
        <Link
          to="/post-job"
          className="ml-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Post Job
        </Link>
      )}

      {/* Show Login/Register for guests (when not loading and no user) */}
      {!loading && !user && (
        <>
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Register
          </Link>
        </>
      )}

      {/* Show profile menu for logged in users */}
      {!loading && user && (
        <ProfileMenu
          user={user}
          isAdmin={isAdmin}
          open={navbar.profileOpen}
          setOpen={navbar.setProfileOpen}
          dropdownRef={navbar.dropdownRef}
          onLogout={onLogout}
          profileImageUrl={profileImageUrl}
        />
      )}
    </div>
  );
};

export default DesktopNav;
