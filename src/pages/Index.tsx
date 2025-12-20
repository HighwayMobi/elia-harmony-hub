import { motion } from "framer-motion";
import eliaLogo from "@/assets/elia-balance-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#b8a9c9]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <motion.img
          src={eliaLogo}
          alt="Elia Balance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-48 md:w-64 h-auto"
        />
      </motion.div>
    </div>
  );
};

export default Index;
