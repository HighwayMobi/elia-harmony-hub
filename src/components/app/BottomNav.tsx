import { Home, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  activeTab: "home" | "tracking" | "settings";
  onTabChange: (tab: "home" | "tracking" | "settings") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "home" as const, icon: Home, label: "Home" },
    { id: "tracking" as const, icon: Activity, label: "Tracking" },
    { id: "settings" as const, icon: Settings, label: "Settings" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#F5E6D3] backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              activeTab === id
                ? "text-white"
                : "text-white/50 hover:text-white/80"
            )}
          >
            <Icon className="w-6 h-6" />
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
