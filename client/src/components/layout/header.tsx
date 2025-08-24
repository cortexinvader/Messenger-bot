import { useLocation } from "wouter";

const pageTitles: Record<string, string> = {
  "/": "Dashboard Overview",
  "/authentication": "Authentication Settings",
  "/groups": "Group Management",
  "/commands": "Command Management",
  "/ai-config": "AI Configuration",
};

export default function Header() {
  const [location] = useLocation();
  const title = pageTitles[location] || "Dashboard";

  return (
    <header className="bg-surface border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <i className="fas fa-bell"></i>
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <i className="fas fa-cog"></i>
          </button>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
