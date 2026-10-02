
import React, { useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { UI_COLORS } from '../constants';

/**
 * Ebru Marbling Logic
 * Based on geometric displacements of polygonal shapes.
 */

interface Point {
  x: number;
  y: number;
}

interface Drop {
  points: Point[];
  color: string;
  center: Point;
  radius: number;
}

export interface MarblingCanvasHandle {
  addDrop: (x: number, y: number, r: number, color: string) => void;
  applyTine: (p1: Point, p2: Point, z: number, mu: number) => void;
  reset: (bgColor: string) => void;
  getCanvas: () => HTMLCanvasElement | null;
  addFloatingNumber: (x: number, y: number, text: string, size: number) => void;
  nudgeNumbers: (x: number, y: number, dx: number, dy: number) => void;
  setBlinking: (blinking: boolean) => void;
  spawnStars: (x: number, y: number) => void;
}

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phase: number;
  life: number; // 0 to 1
}

interface FloatingNumber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  text: string;
  size: number;
}

interface Props {
  width: number;
  height: number;
  bgColor: string;
  bgMode: 'light' | 'dark';
  fontFamily?: string;
}

const NR_POINTS = 120;

const MarblingCanvas = forwardRef<MarblingCanvasHandle, Props>(({ width, height, bgColor, bgMode, fontFamily = '"Open Sans", sans-serif' }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<Drop[]>([]);
  const floatingNumbersRef = useRef<FloatingNumber[]>([]);
  const starsRef = useRef<Star[]>([]);
  const isBlinkingRef = useRef(false);
  const requestRef = useRef<number>();

  // Use a ref to store DpRatio to avoid re-renders if it changes (rare)
  const dpr = window.devicePixelRatio || 1;

  // Initialize canvas with proper scale for Retina
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set display size (css pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Normalize coordinate system to use CSS pixels
    ctx.scale(dpr, dpr);
  }, [width, height, dpr]);

  const update = () => {
    // 1. Update Floating Numbers
    floatingNumbersRef.current.forEach(fn => {
      fn.vx *= 0.97;
      fn.vy *= 0.97;
      fn.x += fn.vx;
      fn.y += fn.vy;

      if (fn.x < 0) { fn.x = 0; fn.vx *= -0.5; }
      if (fn.x > width) { fn.x = width; fn.vx *= -0.5; }
      if (fn.y < 0) { fn.y = 0; fn.vy *= -0.5; }
      if (fn.y > height) { fn.y = height; fn.vy *= -0.5; }
    });

    // 1.1 Update Stars
    starsRef.current.forEach(star => {
      star.vx *= 0.98;
      star.vy *= 0.98;
      star.x += star.vx;
      star.y += star.vy;
      star.life -= 0.005;
      
      if (star.x < 0 || star.x > width) star.vx *= -1;
      if (star.y < 0 || star.y > height) star.vy *= -1;
    });
    starsRef.current = starsRef.current.filter(s => s.life > 0);
    if (starsRef.current.length > 20) {
      starsRef.current = starsRef.current.slice(-20);
    }

    // 2. Graphic Recovery
    dropsRef.current.forEach(drop => {
      const len = drop.points.length;
      if (len < 3) return;
      
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
          x: p.x + (smX - p.x) * 0.015 + (targetX - p.x) * 0.003,
          y: p.y + (smY - p.y) * 0.015 + (targetY - p.y) * 0.003
        };
      });
      drop.points = newPoints;
    });

    render();
    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [width, height]);
  
  useImperativeHandle(ref, () => ({
    setBlinking: (blinking: boolean) => {
      isBlinkingRef.current = blinking;
    },
    addDrop: (x: number, y: number, r: number, color: string) => {
      const displace = (target: Point, cx: number, cy: number, cr: number) => {
        const dx = target.x - cx;
        const dy = target.y - cy;
        const d2 = dx*dx + dy*dy;
        if (d2 === 0) return;
        const scale = Math.sqrt(1 + (cr*cr)/d2);
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
      dropsRef.current.push({ points, color, center: { x, y }, radius: r });
    },
    applyTine: (p1: Point, p2: Point, z: number, mu: number) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const d_line = Math.sqrt(dx*dx + dy*dy);
      if (d_line < 0.5) return;
      const ux = dx / d_line;
      const uy = dy / d_line;

      const applyDisplacement = (p: Point) => {
        const v1x = p.x - p1.x;
        const v1y = p.y - p1.y;
        const proj = Math.max(0, Math.min(d_line, v1x * ux + v1y * uy));
        const closestX = p1.x + proj * ux;
        const closestY = p1.y + proj * uy;
        
        const distToLine = Math.sqrt((p.x - closestX)**2 + (p.y - closestY)**2);
        const shift = z * Math.pow(2, -distToLine / mu);
        
        p.x += ux * shift;
        p.y += uy * shift;
      };

      dropsRef.current.forEach(drop => {
        drop.points.forEach(applyDisplacement);
        applyDisplacement(drop.center);
      });
    },
    addFloatingNumber: (x: number, y: number, text: string, size: number) => {
      const angle = Math.random() * Math.PI * 2;
      const popSpeed = 2.0 + Math.random() * 2.0;
      const vx = Math.cos(angle) * popSpeed;
      const vy = Math.sin(angle) * popSpeed;
      
      floatingNumbersRef.current.push({ x, y, vx, vy, text, size: size });
      if (floatingNumbersRef.current.length > 10) {
        floatingNumbersRef.current.shift();
      }
    },
    nudgeNumbers: (x: number, y: number, fdx: number, fdy: number) => {
      const interactionRadius = 150;
      floatingNumbersRef.current.forEach(fn => {
        const dx = fn.x - x;
        const dy = fn.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < interactionRadius) {
          const power = Math.pow((interactionRadius - dist) / interactionRadius, 1.5);
          fn.vx += (dx / Math.max(1, dist)) * power * 3 + (fdx * 0.4 * power);
          fn.vy += (dy / Math.max(1, dist)) * power * 3 + (fdy * 0.4 * power);
        }
      });
      starsRef.current.forEach(star => {
        const dx = star.x - x;
        const dy = star.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 120) {
          const power = (120 - dist) / 120;
          star.vx += (dx / Math.max(1, dist)) * power * 1.5 + (fdx * 0.2 * power);
          star.vy += (dy / Math.max(1, dist)) * power * 1.5 + (fdy * 0.2 * power);
        }
      });
    },
    spawnStars: (x: number, y: number) => {
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2;
        starsRef.current.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 15 + Math.random() * 15,
            opacity: 0.6 + Math.random() * 0.4,
            phase: Math.random() * Math.PI * 2,
            life: 1.0
        });
      }
    },
    reset: (newBg: string) => {
      dropsRef.current = [];
      floatingNumbersRef.current = [];
      starsRef.current = [];
    },
    getCanvas: () => canvasRef.current
  }));

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Force scale to stay consistent before any draw
    
    const theme = UI_COLORS[bgMode];
    ctx.fillStyle = bgMode === 'dark' ? theme.background : bgColor;
    ctx.fillRect(0, 0, width, height);

    // 3. Render watercolor drops
    ctx.save();
    ctx.filter = 'blur(20px)';
    
    dropsRef.current.forEach(drop => {
      ctx.beginPath();
      ctx.moveTo(drop.points[0].x, drop.points[0].y);
      for (let i = 1; i < drop.points.length; i++) {
        ctx.lineTo(drop.points[i].x, drop.points[i].y);
      }
      ctx.closePath();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = drop.color;
      ctx.fill();
      
      ctx.save();
      ctx.filter = 'blur(40px)';
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    // 4. Secondary more defined layer
    ctx.save();
    ctx.filter = 'blur(8px)';
    ctx.globalAlpha = 0.5;
    dropsRef.current.forEach(drop => {
        ctx.beginPath();
        ctx.moveTo(drop.points[0].x, drop.points[0].y);
        for (let i = 1; i < drop.points.length; i++) {
          ctx.lineTo(drop.points[i].x, drop.points[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = drop.color;
        ctx.fill();
    });
    ctx.restore();
    
    // 5. Draw Floating Numbers (Top Priority for clarity)
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = theme.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    floatingNumbersRef.current.forEach(fn => {
      // Ensure vertical and sharp text
      ctx.font = `300 ${fn.size}px ${fontFamily}`;
      ctx.fillText(fn.text, fn.x, fn.y);
    });
    ctx.restore();

    const time = Date.now() / 1000;
    ctx.save();
    starsRef.current.forEach(star => {
        const flicker = Math.sin(time * 12 + star.phase) * 0.3;
        let opacity = Math.max(0, (star.opacity + flicker) * star.life);
        let size = star.size;
        const blurX = star.vx * 3;
        const blurY = star.vy * 3;
        const horizLen = size + Math.abs(blurX);
        const vertLen = size + Math.abs(blurY);
        const coreSize = size * 0.15;

        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.shadowBlur = size * 0.4;
        ctx.shadowColor = `rgba(255, 255, 255, ${opacity * 0.5})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, -vertLen);
        ctx.quadraticCurveTo(coreSize, -coreSize, horizLen, 0);
        ctx.quadraticCurveTo(coreSize, coreSize, 0, vertLen);
        ctx.quadraticCurveTo(-coreSize, coreSize, -horizLen, 0);
        ctx.quadraticCurveTo(-coreSize, -coreSize, 0, -vertLen);
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();

    // 7. Grain Texture
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = 'overlay';
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#FFF' : '#000';
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
    }
    ctx.restore();
  };

  return (
    <canvas 
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
});

export default MarblingCanvas;
