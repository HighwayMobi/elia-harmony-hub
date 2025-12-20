import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to full screen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Draw fog overlay
      ctx.fillStyle = "rgba(184, 169, 201, 0.85)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add noise texture for realistic fog
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 30;
        data[i] = Math.min(255, Math.max(0, data[i] + noise));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
      }
      
      ctx.putImageData(imageData, 0, 0);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

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
    if (!isDrawing) return;
    
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

    // Check how much has been revealed
    checkRevealProgress(ctx, canvas);
  };

  const checkRevealProgress = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let transparentPixels = 0;
    
    // Sample every 100th pixel for performance
    for (let i = 3; i < data.length; i += 400) {
      if (data[i] < 128) transparentPixels++;
    }
    
    const totalSampled = data.length / 400;
    const revealedPercent = transparentPixels / totalSampled;
    
    if (revealedPercent > 0.4 && !revealed) {
      setRevealed(true);
    }
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(true);
    draw(e);
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: '#b8a9c9' }}
    >
      {/* Clear content underneath */}
      <div className="text-center z-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
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
      </div>

      {/* Fog overlay canvas */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 z-10 touch-none transition-opacity duration-1000 ${
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

      {/* Hint text */}
      {!revealed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-20 left-0 right-0 text-center text-white/70 text-sm z-20 pointer-events-none"
        >
          Проведите пальцем, чтобы протереть стекло
        </motion.p>
      )}
    </div>
  );
};

export default Index;