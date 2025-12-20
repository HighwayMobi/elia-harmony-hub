import { useState } from "react";
import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LogOut, User as UserIcon, Mail, Activity } from "lucide-react";
import { toast } from "sonner";
import { usePlatform } from "@/hooks/use-platform";

interface SettingsPageProps {
  user: User;
}

const SettingsPage = ({ user }: SettingsPageProps) => {
  const { isIOS, isAndroid, isWeb } = usePlatform();
  const [googleFitEnabled, setGoogleFitEnabled] = useState(false);
  const [appleHealthEnabled, setAppleHealthEnabled] = useState(false);
  
  // Show Google Fit on Android or Web, Apple Health on iOS or Web
  const showGoogleFit = isAndroid || isWeb;
  const showAppleHealth = isIOS || isWeb;

  const handleGoogleFitToggle = (enabled: boolean) => {
    setGoogleFitEnabled(enabled);
    if (enabled) {
      toast.success("Google Fit подключен");
    } else {
      toast.info("Google Fit отключен");
    }
  };

  const handleAppleHealthToggle = (enabled: boolean) => {
    setAppleHealthEnabled(enabled);
    if (enabled) {
      toast.success("Apple Health подключен");
    } else {
      toast.info("Apple Health отключен");
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Ошибка при выходе");
    } else {
      toast.success("Вы вышли из аккаунта");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 px-6 py-6 pb-24"
    >
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-light text-white mb-6">
          Configuración
        </h1>

        {/* Profile section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
          <h2 className="text-white/90 font-medium mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            Perfil
          </h2>
          
          <div className="flex items-center gap-3 text-white/70">
            <Mail className="w-4 h-4" />
            <span className="text-sm">{user.email}</span>
          </div>
        </div>

        {/* Health integrations section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-4">
          <h2 className="text-white/90 font-medium mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Подсчет шагов
          </h2>
          
          <div className="space-y-4">
            {showGoogleFit && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white/90 text-sm font-medium">Google Fit</span>
                  <span className="text-white/50 text-xs">Синхронизация шагов с Android</span>
                </div>
                <Switch
                  checked={googleFitEnabled}
                  onCheckedChange={handleGoogleFitToggle}
                />
              </div>
            )}
            
            {showAppleHealth && (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white/90 text-sm font-medium">Apple Health</span>
                  <span className="text-white/50 text-xs">Синхронизация шагов с iPhone</span>
                </div>
                <Switch
                  checked={appleHealthEnabled}
                  onCheckedChange={handleAppleHealthToggle}
                />
              </div>
            )}
          </div>
        </div>

        {/* Logout button */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full bg-white/10 hover:bg-white/20 text-white border-0 h-14 rounded-2xl"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
