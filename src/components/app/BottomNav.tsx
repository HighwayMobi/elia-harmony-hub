import { Home, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageProvider";

interface BottomNavProps {
  activeTab: "home" | "tracking" | "settings";
  onTabChange: (tab: "home" | "tracking" | "settings") => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const { language } = useLanguage();
  const tabs = [
    { id: "home" as const, icon: Home, label: language === "en" ? "Home" : "Inicio" },
    { id: "tracking" as const, icon: Activity, label: language === "en" ? "Tracking" : "Seguimiento" },
    { id: "settings" as const, icon: Settings, label: language === "en" ? "Settings" : "Configuración" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#A799B7] backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {tabs.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-label={label}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-colors",
              activeTab === id
                ? "text-[#F5E6D3]"
                : "text-[#F5E6D3]/50 hover:text-[#F5E6D3]/80"
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
