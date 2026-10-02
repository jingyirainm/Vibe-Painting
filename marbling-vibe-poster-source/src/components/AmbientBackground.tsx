
import React, { useRef, useEffect } from 'react';
import { MoodType, PALETTES, UI_COLORS } from '../constants';

interface Point {
  x: number;
  y: number;
}

interface Drop {
  points: Point[];
  color: string;
  center: Point;
  radius: number;
  currentRadius: number;
}

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
  life: number;
}

interface FloatingNumber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  size: number;
}

interface AmbientBackgroundProps {
  mood: MoodType;
  bgMode: 'light' | 'dark';
}

const NR_POINTS = 80;

const AmbientBackground: React.FC<AmbientBackgroundProps> = ({ mood, bgMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<Drop[]>([]);
  const starsRef = useRef<Star[]>([]);
  const numbersRef = useRef<FloatingNumber[]>([]);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const nextDropTimeRef = useRef<number>(0);
  const nextTineTimeRef = useRef<number>(0);
  
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  const currentPalette = PALETTES[mood];
  const theme = UI_COLORS[bgMode];

  const addDrop = (width: number, height: number, x: number, y: number, r: number, color: string) => {
    const displace = (target: Point, cx: number, cy: number, cr: number) => {
      const dx = target.x - cx;
      const dy = target.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 === 0) return;
      const scale = Math.sqrt(1 + (cr * cr) / d2);
      target.x = cx + dx * scale;
      target.y = cy + dy * scale;
    };

    dropsRef.current.forEach(drop => {
      displace(drop.center, x, y, r);
      drop.points.forEach(p => displace(p, x, y, r));
    });

    const points: Point[] = [];
    for (let i = 0; i < NR_POINTS; i++) {
        const angle = (i / NR_POINTS) * Math.PI * 2;
        points.push({
            x: x + Math.cos(angle) * r,
            y: y + Math.sin(angle) * r
        });
    }
    dropsRef.current.push({ points, color, center: { x, y }, radius: r, currentRadius: r * 0.1 });
    if (dropsRef.current.length > 15) dropsRef.current.shift();
  };

  const applyTine = (p1: Point, p2: Point, z: number, mu: number) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d_line = Math.sqrt(dx * dx + dy * dy);
    if (d_line < 0.5) return;
    const ux = dx / d_line;
    const uy = dy / d_line;

    const applyDisplacement = (p: Point) => {
      const v1x = p.x - p1.x;
      const v1y = p.y - p1.y;
      const proj = Math.max(0, Math.min(d_line, v1x * ux + v1y * uy));
      const closestX = p1.x + proj * ux;
      const closestY = p1.y + proj * uy;
      const distToLine = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);
      const shift = z * Math.pow(2, -distToLine / mu);
      p.x += ux * shift;
      p.y += uy * shift;
    };

    dropsRef.current.forEach(drop => {
      drop.points.forEach(applyDisplacement);
      applyDisplacement(drop.center);
    });
  };

  const spawnStar = (width: number, height: number) => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.2 + Math.random() * 0.5;
    starsRef.current.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 10 + Math.random() * 20,
      opacity: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      life: 0.8 + Math.random() * 0.2
    });
  };

  const spawnNumber = (width: number, height: number) => {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.3;
    numbersRef.current.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      text: `(${Math.floor(Math.random() * 10)})`,
      size: 14 + Math.random() * 12
    });
  };

  const update = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // 1. Logic updates
    if (time > nextDropTimeRef.current) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const r = width * (0.05 + Math.random() * 0.15);
        const color = currentPalette.colors[Math.floor(Math.random() * currentPalette.colors.length)];
        addDrop(width, height, x, y, r, color);
        nextDropTimeRef.current = time + 3000 + Math.random() * 4000;
        
        if (Math.random() > 0.5) spawnStar(width, height);
        if (Math.random() > 0.7) spawnNumber(width, height);
    }

    if (time > nextTineTimeRef.current) {
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const angle = Math.random() * Math.PI * 2;
        const len = width * 0.4;
        const x2 = x1 + Math.cos(angle) * len;
        const y2 = y1 + Math.sin(angle) * len;
        applyTine({ x: x1, y: y1 }, { x: x2, y: y2 }, 40 + Math.random() * 60, 40 + Math.random() * 40);
        nextTineTimeRef.current = time + 1500 + Math.random() * 2000;
    }

    // Update particles
    starsRef.current.forEach(s => {
        s.x += s.vx; s.y += s.vy; s.life -= 0.001;
        if (s.x < 0 || s.x > width) s.vx *= -1;
        if (s.y < 0 || s.y > height) s.vy *= -1;
    });
    starsRef.current = starsRef.current.filter(s => s.life > 0);

    numbersRef.current.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
    });
    if (numbersRef.current.length > 5) numbersRef.current.shift();

    // Recover shapes slightly and animate expansion
    dropsRef.current.forEach(drop => {
        if (drop.currentRadius < drop.radius) {
            const dr = (drop.radius - drop.currentRadius) * 0.02;
            const oldR = drop.currentRadius;
            drop.currentRadius += dr;
            const scale = drop.currentRadius / oldR;
            drop.points.forEach(p => {
                p.x = drop.center.x + (p.x - drop.center.x) * scale;
                p.y = drop.center.y + (p.y - drop.center.y) * scale;
            });
        }

        const len = drop.points.length;
        const newPoints = drop.points.map((p, i) => {
            const prev = drop.points[(i - 1 + len) % len];
            const next = drop.points[(i + 1) % len];
            const smX = (prev.x + next.x) / 2;
            const smY = (prev.y + next.y) / 2;
            const dx = p.x - drop.center.x;
            const dy = p.y - drop.center.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const ratio = dist === 0 ? 1 : drop.radius / dist;
            const targetX = drop.center.x + dx * ratio;
            const targetY = drop.center.y + dy * ratio;
            return {
                x: p.x + (smX - p.x) * 0.005 + (targetX - p.x) * 0.001,
                y: p.y + (smY - p.y) * 0.005 + (targetY - p.y) * 0.001
            };
        });
        drop.points = newPoints;
    });

    render(width, height);
    requestRef.current = requestAnimationFrame(update);
  };

  const render = (width: number, height: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgMode === 'dark' ? theme.background : currentPalette.background;
    ctx.fillRect(0, 0, width, height);

    // Render drops - Sharp edges, layers of transparency
    ctx.save();
    dropsRef.current.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.points[0].x, drop.points[0].y);
        for (let i = 1; i < drop.points.length; i++) ctx.lineTo(drop.points[i].x, drop.points[i].y);
        ctx.closePath();
        
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = drop.color;
        ctx.fill();
        
        // Second pass slightly offset for "vibration" or depth
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.translate(5, 5);
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();

    // Render numbers
    ctx.save();
    ctx.fillStyle = theme.text;
    ctx.globalAlpha = 0.15;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    numbersRef.current.forEach(n => {
        ctx.font = `300 ${n.size}px serif`;
        ctx.fillText(n.text, n.x, n.y);
    });
    ctx.restore();

    // Render stars
    const timeSec = Date.now() / 1000;
    starsRef.current.forEach(star => {
        const flicker = Math.sin(timeSec * 3 + star.phase) * 0.5 + 0.5;
        const opacity = star.opacity * star.life * flicker;
        const size = star.size;
        const coreSize = size * 0.1;
        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.fillStyle = bgMode === 'dark' ? `rgba(255,255,255,${opacity})` : `rgba(0,0,0,${opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.quadraticCurveTo(coreSize, -coreSize, size, 0);
        ctx.quadraticCurveTo(coreSize, coreSize, 0, size);
        ctx.quadraticCurveTo(-coreSize, coreSize, -size, 0);
        ctx.quadraticCurveTo(-coreSize, -coreSize, 0, -size);
        ctx.fill();
        ctx.restore();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Initial content - increased density for landing screen
    const w = window.innerWidth;
    const h = window.innerHeight;
    for(let i=0; i<6; i++) {
        setTimeout(() => {
            addDrop(w, h, Math.random()*w, Math.random()*h, w * (0.08 + Math.random() * 0.12), currentPalette.colors[i % currentPalette.colors.length]);
            spawnStar(w, h);
            if (i % 2 === 0) spawnNumber(w, h);
        }, i * 200);
    }

    requestRef.current = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mood, bgMode]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-screen h-screen z-0" 
      style={{ pointerEvents: 'none' }}
    />
  );
};

export default AmbientBackground;
