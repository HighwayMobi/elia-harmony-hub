import { useState } from "react";
import { User } from "@supabase/supabase-js";
import BottomNav from "./BottomNav";
import HomePage from "./HomePage";
import SettingsPage from "./SettingsPage";

interface AppShellProps {
  user: User;
}

const AppShell = ({ user }: AppShellProps) => {
  const [activeTab, setActiveTab] = useState<"home" | "settings">("home");

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#A799B7' }}
    >
      {activeTab === "home" && <HomePage user={user} />}
      {activeTab === "settings" && <SettingsPage user={user} />}
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default AppShell;
