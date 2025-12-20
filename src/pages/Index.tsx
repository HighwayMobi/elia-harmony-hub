import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#b8a9c9' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 
            className="text-4xl md:text-5xl tracking-[0.35em] font-light"
            style={{ color: '#ffffff' }}
          >
            ELIA
          </h1>
          <div className="w-16 h-px bg-white/60 mx-auto my-3" />
          <h2 
            className="text-lg md:text-xl tracking-[0.45em] font-light"
            style={{ color: '#ffffff' }}
          >
            BALANCE
          </h2>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
