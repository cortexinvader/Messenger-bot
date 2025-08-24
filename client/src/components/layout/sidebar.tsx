import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: "fas fa-tachometer-alt" },
  { name: "Authentication", href: "/authentication", icon: "fas fa-key" },
  { name: "Group Management", href: "/groups", icon: "fas fa-users" },
  { name: "Commands", href: "/commands", icon: "fas fa-terminal" },
  { name: "AI Configuration", href: "/ai-config", icon: "fas fa-brain" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-surface shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo and Title */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fab fa-facebook-f text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Nexus FCA</h1>
            <p className="text-xs text-gray-500">Bot Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <i className={`${item.icon} w-5`}></i>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bot Status */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">Bot Status</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-secondary rounded-full"></div>
            <span className="text-sm font-medium text-secondary">Online</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          <div>Uptime: <span>2h 34m</span></div>
          <div>Groups: <span>12 active</span></div>
        </div>
      </div>
    </div>
  );
}
