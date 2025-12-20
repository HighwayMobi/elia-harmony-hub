import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-4"
        >
          <h1 className="text-5xl md:text-6xl font-light tracking-wider text-white">
            Elia
          </h1>
          <h2 className="text-4xl md:text-5xl font-extralight tracking-[0.3em] text-white/90 mt-1">
            Balance
          </h2>
        </motion.div>
        
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="w-24 h-0.5 bg-white/40 mx-auto rounded-full"
        />
      </motion.div>
    </div>
  );
};

export default Index;
