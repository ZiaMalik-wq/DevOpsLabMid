import { User, LogOut, ChevronDown, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import useFocusTrap from "./useFocusTrap";

const ProfileMenu = ({
  user,
  isAdmin,
  open,
  setOpen,
  onLogout,
  dropdownRef,
  profileImageUrl,
}) => {
  useFocusTrap(open, dropdownRef);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt="Profile"
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            (user.full_name || user.name || "U")[0].toUpperCase()
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform dark:text-gray-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-50"
          >
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <p className="text-sm font-semibold truncate dark:text-white">
                {user.full_name || user.name || user.email}
              </p>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400">
                {user.role}
              </p>
            </div>

            {!isAdmin && (
              <>
                <Link
                  to="/profile"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  to="/analytics"
                  role="menuitem"
                  className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
                  onClick={() => setOpen(false)}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Link>
              </>
            )}

            <button
              onClick={onLogout}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileMenu;
