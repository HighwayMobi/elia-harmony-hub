import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pointer, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import logo from "@/assets/logo-elia-balance.svg";
import LoginScreen from "@/components/LoginScreen";
import AppShell from "@/components/app/AppShell";

interface AnimDrop {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobbleAmp: number;
  wobbleFreq: number;
  phase: number;
}

const WIPE_RADIUS = 50;

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const wipedAreaRef = useRef<Set<string>>(new Set());
  const wipedCirclesRef = useRef<{ x: number; y: number }[]>([]);
  const animDropsRef = useRef<AnimDrop[]>([]);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const startWipeSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      
      // Create noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Bandpass filter for squeaky glass sound
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 3200;
      bandpass.Q.value = 2.5;

      // High shelf for brightness
      const highShelf = ctx.createBiquadFilter();
      highShelf.type = "highshelf";
      highShelf.frequency.value = 4000;
      highShelf.gain.value = 6;

      // LFO for squeaky modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 8 + Math.random() * 6;
      lfoGain.gain.value = 800;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();

      // Master gain
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);

      source.connect(bandpass);
      bandpass.connect(highShelf);
      highShelf.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      noiseSourceRef.current = source;
      gainNodeRef.current = gain;
    } catch {
      // Audio not supported
    }
  }, []);

  const stopWipeSound = useCallback(() => {
    try {
      if (gainNodeRef.current && audioCtxRef.current) {
        const ctx = audioCtxRef.current;
        gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        const src = noiseSourceRef.current;
        setTimeout(() => {
          try { src?.stop(); } catch {}
        }, 200);
      }
      noiseSourceRef.current = null;
      gainNodeRef.current = null;
    } catch {}
  }, []);

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

    const drawDroplet = (x: number, y: number, radius: number) => {
      if (!ctx) return;
      
      // Shadow under droplet
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x + radius * 0.15, y + radius * 0.2, radius * 0.95, radius * 0.85, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 90, 120, ${0.25 * Math.min(1, radius / 8)})`;
      ctx.filter = `blur(${Math.max(1, radius * 0.3)}px)`;
      ctx.fill();
      ctx.restore();

      // Droplet body with lens distortion
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      const bodyGrad = ctx.createRadialGradient(
        x - radius * 0.35, y - radius * 0.35, 0,
        x, y, radius
      );
      bodyGrad.addColorStop(0, `rgba(210, 215, 230, ${0.08 + Math.random() * 0.06})`);
      bodyGrad.addColorStop(0.4, `rgba(195, 200, 220, ${0.12 + Math.random() * 0.05})`);
      bodyGrad.addColorStop(0.75, `rgba(175, 180, 205, 0.18)`);
      bodyGrad.addColorStop(1, `rgba(150, 155, 185, 0.25)`);
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      ctx.restore();

      // Edge ring (meniscus)
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140, 135, 165, ${0.2 + Math.random() * 0.1})`;
      ctx.lineWidth = Math.max(0.5, radius * 0.08);
      ctx.stroke();
      ctx.restore();

      // Primary highlight (top-left)
      ctx.save();
      ctx.beginPath();
      const hlX = x - radius * 0.3;
      const hlY = y - radius * 0.3;
      const hlR = radius * (0.25 + Math.random() * 0.1);
      const hlGrad = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, hlR);
      hlGrad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
      hlGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.4)");
      hlGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = hlGrad;
      ctx.arc(hlX, hlY, hlR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Secondary caustic highlight
      if (radius > 4) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + radius * 0.2, y + radius * 0.25, radius * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.2})`;
        ctx.fill();
        ctx.restore();
      }

      // Bottom refraction glow
      if (radius > 6) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y + radius * 0.4, radius * 0.5, radius * 0.15, 0, 0, Math.PI * 2);
        const refGrad = ctx.createRadialGradient(x, y + radius * 0.4, 0, x, y + radius * 0.4, radius * 0.5);
        refGrad.addColorStop(0, "rgba(230, 235, 245, 0.15)");
        refGrad.addColorStop(1, "rgba(230, 235, 245, 0)");
        ctx.fillStyle = refGrad;
        ctx.fill();
        ctx.restore();
      }
    };

    const initCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Glass base
      const baseGrad = ctx.createLinearGradient(0, 0, canvas.width * 0.3, canvas.height);
      baseGrad.addColorStop(0, "rgba(175, 165, 195, 0.92)");
      baseGrad.addColorStop(0.5, "rgba(170, 162, 190, 0.90)");
      baseGrad.addColorStop(1, "rgba(165, 155, 185, 0.88)");
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Fine glass noise
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);

      // Micro-droplets (condensation mist)
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = 0.5 + Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210, 215, 230, ${0.15 + Math.random() * 0.15})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.3})`;
        ctx.fill();
      }

      // Medium droplets
      for (let i = 0; i < 60; i++) {
        drawDroplet(Math.random() * canvas.width, Math.random() * canvas.height, 3 + Math.random() * 7);
      }

      // Large droplets
      for (let i = 0; i < 20; i++) {
        drawDroplet(Math.random() * canvas.width, Math.random() * canvas.height, 8 + Math.random() * 16);
      }

      // Water streaks
      for (let i = 0; i < 6; i++) {
        let cx = Math.random() * canvas.width;
        let cy = Math.random() * canvas.height * 0.3;
        const segments = 5 + Math.floor(Math.random() * 8);
        const trailWidth = 2 + Math.random() * 3;
        
        for (let s = 0; s < segments; s++) {
          const nx = cx + (Math.random() - 0.5) * 8;
          const ny = cy + 10 + Math.random() * 20;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.strokeStyle = `rgba(195, 200, 218, ${0.2 + Math.random() * 0.1})`;
          ctx.lineWidth = trailWidth * (1 - s / segments * 0.5);
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.restore();
          if (Math.random() > 0.4) {
            drawDroplet(nx + (Math.random() - 0.5) * 4, ny, 1.5 + Math.random() * 3);
          }
          cx = nx;
          cy = ny;
        }
        drawDroplet(cx, cy, 3 + Math.random() * 5);
      }
      
      setCanvasInitialized(true);
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

  // Animated dripping droplets on separate canvas
  useEffect(() => {
    if (user || loading || revealed) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Initialize animated drops
    const createDrop = (): AnimDrop => ({
      x: Math.random() * w,
      y: -10 - Math.random() * h * 0.3,
      size: 3 + Math.random() * 10,
      speed: 0.3 + Math.random() * 0.8,
      wobbleAmp: (Math.random() - 0.5) * 0.4,
      wobbleFreq: 0.005 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
    });

    animDropsRef.current = Array.from({ length: 15 }, createDrop);
    // Stagger initial positions
    animDropsRef.current.forEach((d, i) => {
      d.y = -10 - i * (h / 15) * Math.random();
    });

    const isInWipedArea = (x: number, y: number): boolean => {
      const circles = wipedCirclesRef.current;
      for (let i = 0; i < circles.length; i++) {
        const dx = x - circles[i].x;
        const dy = y - circles[i].y;
        if (dx * dx + dy * dy < WIPE_RADIUS * WIPE_RADIUS) return true;
      }
      return false;
    };

    const drawAnimDroplet = (ctx: CanvasRenderingContext2D, d: AnimDrop) => {
      const { x, y, size } = d;
      
      // Shadow
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x + size * 0.1, y + size * 0.15, size * 0.9, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(100, 90, 120, ${0.2 * Math.min(1, size / 8)})`;
      ctx.filter = `blur(${Math.max(1, size * 0.25)}px)`;
      ctx.fill();
      ctx.restore();

      // Body
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.45, size * 0.6, 0, 0, Math.PI * 2);
      const bg = ctx.createRadialGradient(x - size * 0.15, y - size * 0.2, 0, x, y, size * 0.6);
      bg.addColorStop(0, "rgba(215, 220, 235, 0.12)");
      bg.addColorStop(0.5, "rgba(195, 200, 220, 0.18)");
      bg.addColorStop(1, "rgba(160, 165, 190, 0.25)");
      ctx.fillStyle = bg;
      ctx.fill();
      // Edge
      ctx.strokeStyle = "rgba(140, 135, 165, 0.2)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();

      // Highlight
      ctx.save();
      ctx.beginPath();
      const hlX = x - size * 0.12;
      const hlY = y - size * 0.2;
      ctx.arc(hlX, hlY, size * 0.15, 0, Math.PI * 2);
      const hlg = ctx.createRadialGradient(hlX, hlY, 0, hlX, hlY, size * 0.15);
      hlg.addColorStop(0, "rgba(255,255,255,0.8)");
      hlg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hlg;
      ctx.fill();
      ctx.restore();

      // Trail above droplet
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, y - size * 0.6);
      ctx.lineTo(x, y - size * 0.6 - size * 2);
      ctx.strokeStyle = `rgba(200, 210, 225, 0.15)`;
      ctx.lineWidth = size * 0.3;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
    };

    let lastTime = 0;
    const animate = (time: number) => {
      const dropsCanvas = dropsCanvasRef.current;
      if (!dropsCanvas) return;
      const dCtx = dropsCanvas.getContext("2d");
      if (!dCtx) return;

      if (dropsCanvas.width !== w || dropsCanvas.height !== h) {
        dropsCanvas.width = w;
        dropsCanvas.height = h;
      }

      const dt = lastTime ? (time - lastTime) / 16 : 1;
      lastTime = time;

      dCtx.clearRect(0, 0, w, h);

      animDropsRef.current.forEach((d) => {
        d.y += d.speed * dt;
        d.x += Math.sin(d.y * d.wobbleFreq + d.phase) * d.wobbleAmp * dt;

        // Reset when off screen
        if (d.y > h + 20) {
          d.x = Math.random() * w;
          d.y = -10 - Math.random() * 30;
          d.size = 3 + Math.random() * 10;
          d.speed = 0.3 + Math.random() * 0.8;
        }

        // Only draw if NOT in wiped area
        if (!isInWipedArea(d.x, d.y)) {
          drawAnimDroplet(dCtx, d);
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
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

    // Track wiped position for animated drops
    wipedCirclesRef.current.push({ x: coords.x, y: coords.y });

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
    startWipeSound();
    draw(e);
  };

  const handleEnd = () => {
    setIsDrawing(false);
    stopWipeSound();
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

            {/* Animated dripping droplets canvas */}
            <canvas
              ref={dropsCanvasRef}
              className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${
                revealed ? "opacity-0" : "opacity-100"
              }`}
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