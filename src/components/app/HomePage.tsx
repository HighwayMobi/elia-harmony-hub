import { motion } from "framer-motion";
import { User } from "@supabase/supabase-js";
import logo from "@/assets/logo-elia-balance.svg";

interface HomePageProps {
  user: User;
}

const HomePage = ({ user }: HomePageProps) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-center">
        <img src={logo} alt="Elia Balance" className="w-20 h-auto opacity-80" />
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 px-6 pb-24"
      >
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-light text-white mb-2">
            ¡Hola!
          </h1>
          <p className="text-white/60 text-sm mb-8">
            Bienvenido a tu espacio de bienestar
          </p>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <p className="text-white/80 text-center text-sm">
              Pronto tendrás acceso a todas las funciones de Elia Balance.
            </p>
          </div>
        </div>
      </motion.main>
    </div>
  );
};

export default HomePage;
