import { useEffect, useRef } from 'react';

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
  const sceneRef = useRef(currentScene);
  const sceneStartTimeRef = useRef(0);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const textPointsRef = useRef<{ x: number; y: number }[]>([]);
  const initializedRef = useRef(false);
  const globalTimeRef = useRef(0);

  sceneRef.current = currentScene;

  useEffect(() => {
    sceneStartTimeRef.current = globalTimeRef.current;
  }, [currentScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const colors = ['#c4a46a', '#d4b882', '#a38550'];
    const moneyChars = ['$', '€', '£', '₢', '¢'];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      generateTextPoints();
    };

    const generateTextPoints = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tCtx = tempCanvas.getContext('2d');
      if (!tCtx) return;

      tCtx.fillStyle = 'white';
      tCtx.textBaseline = 'middle';
      tCtx.textAlign = 'center';
      const fontSize = Math.min(canvas.width * 0.1, 80);
      tCtx.font = `${fontSize}px "DM Serif Display"`;
      tCtx.fillText('Glow Upi', canvas.width / 2, canvas.height * 0.45);

      const imgData = tCtx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const points: { x: number; y: number }[] = [];
      const step = Math.max(Math.floor(canvas.width / 200), 3);

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 128) {
            points.push({ x, y });
          }
        }
      }
      textPointsRef.current = points;

      if (!initializedRef.current && points.length > 0) {
        initParticles();
        initializedRef.current = true;
      } else if (initializedRef.current) {
        particlesRef.current.forEach((p, i) => {
          const tp = points[i % points.length];
          if (tp) {
            p.targetX = tp.x;
            p.targetY = tp.y;
          }
        });
      }
    };

    const initParticles = () => {
      const points = textPointsRef.current;
      const numParticles = Math.max(points.length, 600);

      particlesRef.current = Array.from({ length: numParticles }).map((_, i) => {
        const tp = points[i % points.length];
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
          size: Math.random() * 1.5 + 0.5,
          char: Math.random() > 0.5 ? moneyChars[Math.floor(Math.random() * moneyChars.length)] : undefined,
          life: Math.random() * 100,
          maxLife: 100 + Math.random() * 100,
        };
      });
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement!);
    resize();

    document.fonts.ready.then(() => {
      generateTextPoints();
    });

    const render = () => {
      globalTimeRef.current += 0.016;
      const time = globalTimeRef.current;
      const sceneTime = time - sceneStartTimeRef.current;
      const scene = sceneRef.current;
      const particles = particlesRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        if (scene === 0) {
          if (sceneTime < 3) {
            p.x += p.vx * 0.5;
            p.y += p.vy * 0.5;
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          } else {
            const progress = Math.min(1, (sceneTime - 3) / 3);
            const ease = 1 - Math.pow(1 - progress, 3);
            const noiseX = Math.sin(time * 2 + p.targetY) * 2 * (1 - ease);
            const noiseY = Math.cos(time * 2 + p.targetX) * 2 * (1 - ease);

            p.x = p.x + (p.targetX - p.x) * 0.05 * Math.max(ease, 0.01) + noiseX;
            p.y = p.y + (p.targetY - p.y) * 0.05 * Math.max(ease, 0.01) + noiseY;

            ctx.globalAlpha = Math.min(1, ease + 0.2);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - ease * 0.3), 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.globalAlpha = 1;

            if (ease > 0.9 && Math.random() > 0.99) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fill();
            }
          }
        } else if (scene === 1) {
          p.vy += 0.03;
          if (p.vy > 3) p.vy = 3;
          p.x += Math.sin(time + p.life) * 0.3;
          p.y += p.vy;

          if (p.y > canvas.height) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
            p.vy = Math.random() * 1.5;
          }

          ctx.globalAlpha = 0.35;
          if (p.char && Math.random() > 0.5) {
            ctx.font = `${p.size * 3}px Inter`;
            ctx.fillStyle = p.color;
            ctx.fillText(p.char, p.x, p.y);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else if (scene === 2) {
          const targetFlowX = canvas.width * 0.85;
          const targetFlowY = canvas.height * 0.5;

          const dx = targetFlowX - p.x;
          const dy = targetFlowY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 50) {
            p.vx += (dx / dist) * 0.15;
            p.vy += (dy / dist) * 0.15;
            p.vx += (dy / dist) * 0.08 * Math.sin(time * 3);
            p.vy -= (dx / dist) * 0.08 * Math.cos(time * 3);
            p.vx *= 0.95;
            p.vy *= 0.95;
          } else {
            p.x = -50;
            p.y = Math.random() * canvas.height;
            p.vx = Math.random() * 4 + 1.5;
            p.vy = (Math.random() - 0.5) * 1.5;
          }

          p.x += p.vx;
          p.y += p.vy;

          ctx.globalAlpha = 0.3;
          if (p.char && Math.random() > 0.6) {
            ctx.font = `${p.size * 3}px Inter`;
            ctx.fillStyle = p.color;
            ctx.fillText(p.char, p.x, p.y);
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}
