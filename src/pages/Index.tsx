import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pointer, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/logo-elia-balance.svg";
import fogTexture from "@/assets/fog-texture.png";
import LoginScreen from "@/components/LoginScreen";
import AppShell from "@/components/app/AppShell";




const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogAnimRef = useRef<number>(0);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const wipedAreaRef = useRef<Set<string>>(new Set());
  

  // Check auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Reset states when user logs out
  useEffect(() => {
    if (!user && !loading) {
      setRevealed(false);
      setShowLogin(false);
      setCanvasInitialized(false);
      wipedAreaRef.current = new Set();
    }
  }, [user, loading]);

  // Initialize fog canvas - only once when not logged in
  useEffect(() => {
    // Skip if already initialized or user is logged in
    if (canvasInitialized || user || loading) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;


    const initCanvas = () => {
      const parent = canvas.parentElement;
      const w = Math.max(
        window.innerWidth,
        parent?.clientWidth ?? 0,
        document.documentElement.clientWidth
      );
      const h = Math.max(
        window.innerHeight,
        parent?.clientHeight ?? 0,
        document.documentElement.clientHeight
      );
      canvas.width = w;
      canvas.height = h;

      // First fill with purple frosted glass base
      ctx.fillStyle = 'rgba(167, 153, 183, 0.92)';
      ctx.fillRect(0, 0, w, h);

      // Add subtle condensation noise
      for (let i = 0; i < 8; i++) {
        const cx = Math.random() * w;
        const cy = Math.random() * h;
        const r = 100 + Math.random() * 200;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(200, 190, 215, ${0.15 + Math.random() * 0.1})`);
        grad.addColorStop(1, 'rgba(200, 190, 215, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Add tiny condensation droplets
      for (let i = 0; i < 200; i++) {
        const dx = Math.random() * w;
        const dy = Math.random() * h;
        const dr = 1 + Math.random() * 2.5;
        ctx.beginPath();
        ctx.arc(dx, dy, dr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 215, 230, ${0.1 + Math.random() * 0.15})`;
        ctx.fill();
      }

      // Load fog texture as transparent overlay for realism
      const img = new Image();
      img.onload = () => {
        const imgRatio = img.width / img.height;
        const canvasRatio = w / h;
        let drawW, drawH, offsetX, offsetY;
        
        if (canvasRatio > imgRatio) {
          drawW = w;
          drawH = w / imgRatio;
          offsetX = 0;
          offsetY = (h - drawH) / 2;
        } else {
          drawH = h;
          drawW = h * imgRatio;
          offsetX = (w - drawW) / 2;
          offsetY = 0;
        }
        
        // Draw texture with low opacity as overlay
        ctx.globalAlpha = 0.25;
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
        
        setCanvasInitialized(true);
      };
      img.src = fogTexture;
    };

    initCanvas();

    const handleResize = () => {
      if (!revealed) {
        initCanvas();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [user, loading, canvasInitialized, revealed]);

  // Animated fog shimmer overlay
  useEffect(() => {
    if (user || loading || revealed) {
      if (fogAnimRef.current) cancelAnimationFrame(fogAnimRef.current);
      return;
    }

    const fogCanvas = fogCanvasRef.current;
    if (!fogCanvas) return;

    const ctx = fogCanvas.getContext("2d");
    if (!ctx) return;

    fogCanvas.width = window.innerWidth;
    fogCanvas.height = window.innerHeight;

    let time = 0;

    const animate = () => {
      time += 0.008;
      ctx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);

      // Draw several soft, slowly moving fog patches
      for (let i = 0; i < 5; i++) {
        const phase = i * 1.3;
        const cx = fogCanvas.width * (0.2 + 0.15 * i) + Math.sin(time * 0.7 + phase) * 40;
        const cy = fogCanvas.height * (0.15 + 0.18 * i) + Math.cos(time * 0.5 + phase) * 30;
        const radius = 180 + Math.sin(time * 0.9 + phase) * 40;
        const alpha = 0.04 + Math.sin(time * 0.6 + phase) * 0.02;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(200, 190, 215, ${alpha})`);
        grad.addColorStop(1, "rgba(200, 190, 215, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
      }

      // Global subtle pulse
      const pulseAlpha = 0.02 + Math.sin(time * 0.4) * 0.015;
      ctx.fillStyle = `rgba(175, 165, 195, ${pulseAlpha})`;
      ctx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

      fogAnimRef.current = requestAnimationFrame(animate);
    };

    fogAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (fogAnimRef.current) cancelAnimationFrame(fogAnimRef.current);
    };
  }, [user, loading, revealed]);

  // Transition to login after reveal animation
  useEffect(() => {
    if (revealed && !user) {
      const timer = setTimeout(() => {
        setShowLogin(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [revealed, user]);

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
    const logoWidth = 320;
    const logoHeight = 180;
    
    // Define logo bounding box (generous)
    const logoLeft = centerX - logoWidth / 2;
    const logoRight = centerX + logoWidth / 2;
    const logoTop = centerY - logoHeight / 2;
    const logoBottom = centerY + logoHeight / 2;

    // Check if touch is within or near logo area
    if (coords.x >= logoLeft - 30 && coords.x <= logoRight + 30 && 
        coords.y >= logoTop - 30 && coords.y <= logoBottom + 30) {
      // Divide logo into grid cells (10x6 grid for easier coverage)
      const cellWidth = logoWidth / 10;
      const cellHeight = logoHeight / 6;
      
      // Mark cells around the touch point as wiped
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          const cellX = Math.floor((coords.x - logoLeft + dx * 20) / cellWidth);
          const cellY = Math.floor((coords.y - logoTop + dy * 20) / cellHeight);
          
          if (cellX >= 0 && cellX < 10 && cellY >= 0 && cellY < 6) {
            wipedAreaRef.current.add(`${cellX},${cellY}`);
          }
        }
      }

      // Check if enough of logo is wiped (50% of cells)
      const totalCells = 10 * 6;
      const wipedCells = wipedAreaRef.current.size;
      const wipedPercent = wipedCells / totalCells;

      if (wipedPercent >= 0.5) {
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

  // Show loading state
  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#A799B7' }}
      >
        <motion.img
          src={logo}
          alt="Elia Balance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-48 h-auto"
        />
      </div>
    );
  }

  // Show app if user is logged in
  if (user) {
    return <AppShell user={user} />;
  }

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
            {/* Logo UNDER fog - slightly visible through condensation */}
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

            {/* Fog overlay canvas - slightly transparent to show logo beneath */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 z-10 touch-none transition-opacity duration-300 ${
                revealed ? "opacity-0 pointer-events-none" : "opacity-90"
              }`}
              style={{ filter: "none" }}
              onMouseDown={handleStart}
              onMouseMove={draw}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={draw}
              onTouchEnd={handleEnd}
            />

            {/* Animated fog shimmer layer */}
            <canvas
              ref={fogCanvasRef}
              className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${
                revealed ? "opacity-0" : "opacity-100"
              }`}
            />

            {/* Swipe hint below center */}
            <AnimatePresence>
              {!revealed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.5, duration: 0.3 }}
                  className="absolute z-30 pointer-events-none"
                  style={{ top: '58%' }}
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