import { memo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  Briefcase,
  Wand2,
  Bookmark,
  FileText,
  Home,
} from "lucide-react";

const iconMap = {
  Shield,
  LayoutDashboard,
  Briefcase,
  Wand2,
  Bookmark,
  FileText,
  Home,
};

const NavLinks = memo(({ links, mobile = false, onClick }) => {
  const location = useLocation();
  const isActive = (path) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  return links.map(({ to, label, icon }) => {
    const Icon = icon ? iconMap[icon] : null;
    return (
      <Link
        key={to}
        to={to}
        onClick={onClick}
        className={`
          ${mobile ? "block px-4 py-3" : "px-3 py-2"}
          rounded-lg text-sm font-medium transition-all flex items-center gap-2
          ${
            isActive(to)
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-semibold"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }
        `}
      >
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </Link>
    );
  });
});

NavLinks.displayName = "NavLinks";

export default NavLinks;
