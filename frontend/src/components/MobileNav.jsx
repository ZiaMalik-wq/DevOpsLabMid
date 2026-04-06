import NavLinks from "./NavLinks";
import { Link } from "react-router-dom";
import {
  LogOut,
  LogIn,
  UserPlus,
  PlusCircle,
  User,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useFocusTrap from "./useFocusTrap";
import { useRef } from "react";

const MobileNav = ({
  user,
  isAdmin,
  isCompany,
  navLinks,
  open,
  setOpen,
  onLogout,
  profileImageUrl,
}) => {
  const menuRef = useRef(null);
  useFocusTrap(open, menuRef);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          <motion.div
            ref={menuRef}
            role="dialog"
            aria-modal="true"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-16 left-0 right-0 bg-white dark:bg-gray-800 z-50 shadow-lg border-b dark:border-gray-700"
          >
            <NavLinks links={navLinks} mobile onClick={() => setOpen(false)} />

            {isCompany && (
              <Link
                to="/post-job"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 mx-4 my-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-center hover:shadow-lg transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Post Job
              </Link>
            )}

            {user && !isAdmin && (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
                <Link
                  to="/analytics"
                  className="flex items-center gap-2 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  onClick={() => setOpen(false)}
                >
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Link>
              </>
            )}

            {user ? (
              <button
                onClick={onLogout}
                className="w-full px-4 py-3 text-red-600 dark:text-red-400 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 mx-4 my-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center rounded-lg hover:shadow-lg transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Register
                </Link>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileNav;
