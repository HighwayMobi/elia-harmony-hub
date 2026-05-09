import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo-elia-balance.svg";

interface HomeScreenProps {
  user: User;
}

const HomeScreen = ({ user }: HomeScreenProps) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
    } else {
      toast.success("Sesión cerrada");
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#FFF6E8' }}
    >
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 py-4"
      >
        <img src={logo} alt="Elia Balance" className="w-24 h-auto" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </motion.header>

      {/* Main content */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="flex-1 flex flex-col items-center justify-center px-6"
      >
        <div className="text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-2xl md:text-3xl font-light text-white mb-4"
          >
            ¡Bienvenido!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-white/70 text-sm mb-8"
          >
            {user.email}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-sm mx-auto"
          >
            <p className="text-white/80 text-center">
              Tu espacio de bienestar está listo. Pronto tendrás acceso a todas las funciones de Elia Balance.
            </p>
          </motion.div>
        </div>
      </motion.main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="py-6 text-center"
      >
        <p className="text-white/40 text-xs">
          © 2024 Elia Balance
        </p>
      </motion.footer>
    </div>
  );
};

export default HomeScreen;