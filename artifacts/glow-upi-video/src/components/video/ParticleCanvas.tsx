import { useEffect, useRef } from 'react';

type ParticleState = 'random' | 'text' | 'rain' | 'flow';

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  char?: string;
  life: number;
  maxLife: number;
}

interface ParticleCanvasProps {
  currentScene: number;
}

export function ParticleCanvas({ currentScene }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const colors = ['#c4a46a', '#d4b882', '#a38550'];
    const moneyChars = ['$', '€', '£', '₢', '¢'];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    window.addEventListener('resize', resize);
    resize();

    // Generate target points for text "Glow Upi"
    const getTextPoints = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return [];

      tCtx.fillStyle = 'white';
      tCtx.textBaseline = 'middle';
      tCtx.textAlign = 'center';
      
      // Calculate responsive font size
      const fontSize = Math.min(canvas.width * 0.15, 200);
      tCtx.font = `${fontSize}px "DM Serif Display"`;
      
      tCtx.fillText('Glow Upi', canvas.width / 2, canvas.height / 2);
      
      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const points = [];
      
      // Sample pixels to create points (step size determines density)
      const step = Math.max(Math.floor(canvas.width / 400), 3);
      
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 128) {
            points.push({ x, y });
          }
        }
      }
      
      return points;
    };

    let textPoints: {x: number, y: number}[] = [];
    
    // Initialize particles
    const initParticles = () => {
      textPoints = getTextPoints();
      const numParticles = Math.max(textPoints.length, 1000);
      
      particles = Array.from({ length: numParticles }).map((_, i) => {
        const tp = textPoints[i % textPoints.length];
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          originX: Math.random() * canvas.width,
          originY: Math.random() * canvas.height,
          targetX: tp ? tp.x : canvas.width / 2,
          targetY: tp ? tp.y : canvas.height / 2,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 2 + 1,
          char: Math.random() > 0.5 ? moneyChars[Math.floor(Math.random() * moneyChars.length)] : undefined,
          life: Math.random() * 100,
          maxLife: 100 + Math.random() * 100
        };
      });
    };
    
    // Wait a brief moment for fonts to load before initializing text points
    document.fonts.ready.then(() => {
      initParticles();
    });

    let time = 0;
    let sceneState: ParticleState = 'random';
    let transitionProgress = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Determine state based on currentScene
      // Scene 0: 0-4s random drift, 4-8s coalesce to text
      // Scene 1: 0-2s dissolve, 2-8s rain
      // Scene 2: flow to silhouette
      
      const prevProgress = transitionProgress;
      
      if (currentScene === 0) {
        // Coalesce after a delay
        if (time > 3 && time < 8) {
          sceneState = 'text';
          transitionProgress = Math.min(1, (time - 3) / 3); // 3 seconds to assemble
        } else if (time <= 3) {
          sceneState = 'random';
          transitionProgress = 0;
        }
      } else if (currentScene === 1) {
        sceneState = 'rain';
        transitionProgress = Math.min(1, transitionProgress + 0.02);
      } else if (currentScene === 2) {
        sceneState = 'flow';
        transitionProgress = Math.min(1, transitionProgress + 0.02);
      }

      // Draw and update particles
      particles.forEach(p => {
        if (sceneState === 'random') {
          // Drifting slowly
          p.x += p.vx * 0.5;
          p.y += p.vy * 0.5;
          
          // Wrap around
          if (p.x < 0) p.x = canvas.width;
          if (p.x > canvas.width) p.x = 0;
          if (p.y < 0) p.y = canvas.height;
          if (p.y > canvas.height) p.y = 0;
          
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          
        } else if (sceneState === 'text') {
          // Interpolate towards targetX, targetY
          const ease = 1 - Math.pow(1 - transitionProgress, 3); // cubic ease out
          
          // Add some noise based on time
          const noiseX = Math.sin(time * 2 + p.targetY) * 2 * (1 - ease);
          const noiseY = Math.cos(time * 2 + p.targetX) * 2 * (1 - ease);
          
          p.x = p.x + (p.targetX - p.x) * 0.05 * ease + noiseX;
          p.y = p.y + (p.targetY - p.y) * 0.05 * ease + noiseY;
          
          ctx.globalAlpha = Math.min(1, ease + 0.2);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - ease * 0.3), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.globalAlpha = 1;
          
          // Sparkles when locked
          if (ease > 0.9 && Math.random() > 0.99) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
          }
          
        } else if (sceneState === 'rain') {
          // Fall down like rain/coins
          p.vy += 0.05; // Gravity
          if (p.vy > 5) p.vy = 5; // Terminal velocity
          
          // Slight horizontal drift
          p.x += Math.sin(time + p.life) * 0.5;
          p.y += p.vy;
          
          // Reset at top if off bottom
          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
            p.vy = Math.random() * 2;
          }
          
          if (p.char && Math.random() > 0.3) {
            ctx.font = `${p.size * 4}px Inter`;
            ctx.fillStyle = p.color;
            ctx.fillText(p.char, p.x, p.y);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
          
        } else if (sceneState === 'flow') {
          // Flow towards the silhouette on the right side
          const targetFlowX = canvas.width * 0.8;
          const targetFlowY = canvas.height * 0.5;
          
          const dx = targetFlowX - p.x;
          const dy = targetFlowY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 50) {
            p.vx += (dx / dist) * 0.2;
            p.vy += (dy / dist) * 0.2;
            
            // Add swirl
            p.vx += (dy / dist) * 0.1 * Math.sin(time * 3);
            p.vy -= (dx / dist) * 0.1 * Math.cos(time * 3);
            
            // Friction
            p.vx *= 0.95;
            p.vy *= 0.95;
          } else {
            // Reset at left edge when they reach the silhouette
            p.x = -50;
            p.y = Math.random() * canvas.height;
            p.vx = Math.random() * 5 + 2;
            p.vy = (Math.random() - 0.5) * 2;
          }
          
          p.x += p.vx;
          p.y += p.vy;
          
          if (p.char && Math.random() > 0.5) {
            ctx.font = `${p.size * 4}px Inter`;
            ctx.fillStyle = p.color;
            ctx.fillText(p.char, p.x, p.y);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
        }
      });
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentScene]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}
