import { useState } from "react";
import { User } from "@supabase/supabase-js";
import BottomNav from "./BottomNav";
import HomePage from "./HomePage";
import TrackingPage from "./TrackingPage";
import SettingsPage from "./SettingsPage";

interface AppShellProps {
  user: User;
}

const AppShell = ({ user }: AppShellProps) => {
  const [activeTab, setActiveTab] = useState<"home" | "tracking" | "settings">("home");

  const noiseSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>`;

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{ backgroundColor: '#F5E6D3' }}
    >
      {/* Noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 mix-blend-overlay opacity-40"
        style={{
          backgroundImage: `url("${noiseSvg}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '160px 160px',
        }}
      />
      <div className="relative z-10 flex flex-col flex-1">
        {activeTab === "home" && <HomePage user={user} />}
        {activeTab === "tracking" && <TrackingPage user={user} />}
        {activeTab === "settings" && <SettingsPage user={user} />}

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default AppShell;
