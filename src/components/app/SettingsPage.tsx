import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Mail } from "lucide-react";
import { toast } from "sonner";

interface SettingsPageProps {
  user: User;
}

const SettingsPage = ({ user }: SettingsPageProps) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
    } else {
      toast.success("Sesión cerrada");
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
