import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Droplet {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropletsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const dropletsRef = useRef<Droplet[]>([]);
  const animationRef = useRef<number>();

  // Initialize fog canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Draw fog overlay with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "rgba(200, 185, 215, 0.9)");
      gradient.addColorStop(1, "rgba(170, 155, 190, 0.85)");
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
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Initialize droplets canvas and animation
  useEffect(() => {
    const canvas = dropletsCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Create initial droplets
    const createDroplet = (): Droplet => ({
      id: Math.random(),
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 100,
      size: 3 + Math.random() * 8,
      speed: 0.3 + Math.random() * 0.7,
      opacity: 0.3 + Math.random() * 0.4,
    });

    // Initialize with some droplets
    for (let i = 0; i < 30; i++) {
      const droplet = createDroplet();
      droplet.y = Math.random() * window.innerHeight;
      dropletsRef.current.push(droplet);
    }

    // Animation loop
    const animate = () => {
      if (revealed) {
        cancelAnimationFrame(animationRef.current!);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      dropletsRef.current.forEach((droplet, index) => {
        // Update position
        droplet.y += droplet.speed;

        // Reset droplet if it goes off screen
        if (droplet.y > canvas.height + 20) {
          dropletsRef.current[index] = createDroplet();
          return;
        }

        // Draw droplet
        ctx.save();
        
        // Main droplet body
        const gradient = ctx.createRadialGradient(
          droplet.x - droplet.size * 0.3,
          droplet.y - droplet.size * 0.3,
          0,
          droplet.x,
          droplet.y,
          droplet.size
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${droplet.opacity * 0.8})`);
        gradient.addColorStop(0.5, `rgba(220, 210, 230, ${droplet.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(180, 170, 195, ${droplet.opacity * 0.2})`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        
        // Draw teardrop shape
        ctx.moveTo(droplet.x, droplet.y - droplet.size * 1.5);
        ctx.bezierCurveTo(
          droplet.x + droplet.size * 0.8, droplet.y - droplet.size * 0.5,
          droplet.x + droplet.size, droplet.y + droplet.size * 0.5,
          droplet.x, droplet.y + droplet.size
        );
        ctx.bezierCurveTo(
          droplet.x - droplet.size, droplet.y + droplet.size * 0.5,
          droplet.x - droplet.size * 0.8, droplet.y - droplet.size * 0.5,
          droplet.x, droplet.y - droplet.size * 1.5
        );
        ctx.fill();

        // Add highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${droplet.opacity * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(
          droplet.x - droplet.size * 0.25,
          droplet.y - droplet.size * 0.3,
          droplet.size * 0.25,
          droplet.size * 0.35,
          -0.5,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Draw trail
        const trailGradient = ctx.createLinearGradient(
          droplet.x,
          droplet.y - droplet.size * 2,
          droplet.x,
          droplet.y - droplet.size * 8
        );
        trailGradient.addColorStop(0, `rgba(200, 190, 210, ${droplet.opacity * 0.3})`);
        trailGradient.addColorStop(1, "rgba(200, 190, 210, 0)");
        
        ctx.strokeStyle = trailGradient;
        ctx.lineWidth = droplet.size * 0.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(droplet.x, droplet.y - droplet.size * 1.5);
        ctx.lineTo(droplet.x + (Math.random() - 0.5) * 2, droplet.y - droplet.size * 6);
        ctx.stroke();

        ctx.restore();
      });

      // Occasionally add new droplets
      if (Math.random() < 0.02 && dropletsRef.current.length < 50) {
        dropletsRef.current.push(createDroplet());
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
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

    // Also clear droplets in that area
    const dropletsCanvas = dropletsCanvasRef.current;
    const dropletsCtx = dropletsCanvas?.getContext("2d");
    if (dropletsCtx && dropletsCanvas) {
      // Remove droplets near the touch point
      dropletsRef.current = dropletsRef.current.filter(droplet => {
        const dx = droplet.x - coords.x;
        const dy = droplet.y - coords.y;
        return Math.sqrt(dx * dx + dy * dy) > 60;
      });
    }

    checkRevealProgress(ctx, canvas);
  };

  const checkRevealProgress = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let transparentPixels = 0;
    
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

      {/* Water droplets canvas */}
      <canvas
        ref={dropletsCanvasRef}
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-1000 ${
          revealed ? "opacity-0" : "opacity-100"
        }`}
      />

      {/* Hint text */}
      {!revealed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="absolute bottom-20 left-0 right-0 text-center text-white/70 text-sm z-30 pointer-events-none"
        >
          Проведите пальцем, чтобы протереть стекло
        </motion.p>
      )}
    </div>
  );
};

export default Index;