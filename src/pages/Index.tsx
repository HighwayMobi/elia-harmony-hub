import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pointer, ChevronLeft, ChevronRight } from "lucide-react";
import logo from "@/assets/logo-elia-balance.svg";
import LoginScreen from "@/components/LoginScreen";

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const wipedAreaRef = useRef<Set<string>>(new Set());

  // Initialize fog canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Draw fog overlay with gradient matching brand color #A799B7
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "rgba(175, 165, 195, 0.92)");
      gradient.addColorStop(1, "rgba(155, 140, 175, 0.88)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add noise texture for realistic fog
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 25;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Reset wiped area tracking
      wipedAreaRef.current.clear();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Transition to login after reveal animation
  useEffect(() => {
    if (revealed) {
      const timer = setTimeout(() => {
        setShowLogin(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [revealed]);

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || revealed) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    ctx.globalCompositeOperation = "destination-out";
    
    // Create radial gradient for soft edges
    const gradient = ctx.createRadialGradient(
      coords.x, coords.y, 0,
      coords.x, coords.y, 50
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.8)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, 50, 0, Math.PI * 2);
    ctx.fill();

    // Track wiped cells in logo area
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const logoWidth = 280;
    const logoHeight = 140;
    
    // Define logo bounding box
    const logoLeft = centerX - logoWidth / 2;
    const logoRight = centerX + logoWidth / 2;
    const logoTop = centerY - logoHeight / 2;
    const logoBottom = centerY + logoHeight / 2;

    // Check if touch is within logo area
    if (coords.x >= logoLeft && coords.x <= logoRight && 
        coords.y >= logoTop && coords.y <= logoBottom) {
      // Divide logo into grid cells (20x10 grid)
      const cellWidth = logoWidth / 20;
      const cellHeight = logoHeight / 10;
      
      // Mark cells around the touch point as wiped
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const cellX = Math.floor((coords.x - logoLeft + dx * 25) / cellWidth);
          const cellY = Math.floor((coords.y - logoTop + dy * 25) / cellHeight);
          
          if (cellX >= 0 && cellX < 20 && cellY >= 0 && cellY < 10) {
            wipedAreaRef.current.add(`${cellX},${cellY}`);
          }
        }
      }

      // Check if enough of logo is wiped (70% of cells)
      const totalCells = 20 * 10;
      const wipedCells = wipedAreaRef.current.size;
      const wipedPercent = wipedCells / totalCells;

      if (wipedPercent >= 0.7) {
        setRevealed(true);
      }
    }
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (revealed) return;
    setIsDrawing(true);
    draw(e);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#A799B7' }}
    >
      <AnimatePresence mode="wait">
        {!showLogin ? (
          <motion.div
            key="splash"
            className="flex items-center justify-center w-full h-full absolute inset-0"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Logo with zoom animation after reveal */}
            <motion.div 
              className="z-0"
              animate={revealed ? {
                scale: [1, 1.1, 20],
                opacity: [1, 1, 0],
              } : {}}
              transition={{
                duration: 1.2,
                times: [0, 0.3, 1],
                ease: "easeInOut"
              }}
            >
              <motion.img
                src={logo}
                alt="Elia Balance"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="w-64 md:w-80 h-auto"
              />
            </motion.div>

            {/* Fog overlay canvas */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 z-10 touch-none transition-opacity duration-300 ${
                revealed ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
              onMouseDown={handleStart}
              onMouseMove={draw}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={draw}
              onTouchEnd={handleEnd}
            />

            {/* Animated swipe hint icon - hidden immediately on reveal */}
            <AnimatePresence>
              {!revealed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.3 }}
                  className="absolute bottom-20 left-0 right-0 flex items-center justify-center z-30 pointer-events-none"
                >
                  <motion.div
                    animate={{ x: [-15, 15, -15] }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-5 h-5 text-white/50" />
                    <Pointer className="w-8 h-8 text-white/70" />
                    <ChevronRight className="w-5 h-5 text-white/50" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <LoginScreen key="login" />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;