import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Logo = () => {
  const { isDarkMode } = useTheme();
  
  return (
    <Link
      to="/"
      className="flex items-center gap-2 font-bold text-lg hover:opacity-90 transition-opacity"
    >
      <img 
        src={isDarkMode ? "/dark_logo.svg" : "/logo.svg"} 
        alt="CampusCareerAI logo" 
        className="h-8 w-8 transition-all duration-200" 
      />
      <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-cyan-400 dark:to-purple-400 bg-clip-text text-transparent">
        CampusCareerAI
      </span>
    </Link>
  );
};

export default Logo;
