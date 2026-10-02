
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Download, X } from 'lucide-react';

const IMAGES = ['/hand.jpg', '/PG-1.jpg'];

const GlitchImages: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [glitchStyle, setGlitchStyle] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % IMAGES.length);
    }, 1200); 

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const triggerGlitch = () => {
      if (Math.random() > 0.4) {
        setGlitch(true);
        setGlitchStyle({
          clipPath: `inset(${Math.random() * 90}% 0 ${Math.random() * 10}% 0)`,
          transform: `translateX(${Math.random() * 30 - 15}px) scaleY(${1 + Math.random() * 0.2})`,
          filter: `brightness(${1.2 + Math.random() * 0.8}) contrast(1.5) hue-rotate(${Math.random() * 360}deg) saturate(2)`,
        });

        setTimeout(() => {
          setGlitch(false);
        }, 50 + Math.random() * 150);
      }
      setTimeout(triggerGlitch, 300 + Math.random() * 800);
    };

    triggerGlitch();
  }, []);

  const startRecording = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordingProgress(0);

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load images
    const loadedImages = await Promise.all(IMAGES.map(src => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.src = src;
      });
    }));

    const stream = canvas.captureStream(30); // 30 FPS
    
    // Attempt to use MP4 if supported (common in Safari), otherwise fallback to webm but save as mp4
    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp9';
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      // Use the actual mimeType for the blob
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glitch-background-${Date.now()}.mp4`;
      a.click();
      setIsRecording(false);
    };

    recorder.start();

    // Rendering loop for recording
    let startTime = Date.now();
    const duration = 8000; // 8 seconds of recording
    let currentIdx = 0;
    let nextSwitch = startTime + 1200;

    const render = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      
      if (elapsed >= duration) {
        recorder.stop();
        return;
      }

      setRecordingProgress((elapsed / duration) * 100);

      if (now >= nextSwitch) {
        currentIdx = (currentIdx + 1) % loadedImages.length;
        nextSwitch = now + 1200;
      }

      const img = loadedImages[currentIdx];
      
      // Draw background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw aspect-fill image
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height) * 1.1;
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.save();
      ctx.filter = `brightness(1.1) saturate(1.25)`;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();

      // Draw glitch layer (rarely)
      if (Math.random() > 0.8) {
        ctx.save();
        const clipX = 0;
        const clipY = Math.random() * canvas.height * 0.9;
        const clipW = canvas.width;
        const clipH = Math.random() * canvas.height * 0.1;
        
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();
        
        const offsetX = Math.random() * 40 - 20;
        ctx.filter = `brightness(${1.5 + Math.random()}) contrast(1.5) hue-rotate(${Math.random() * 360}deg) saturate(2)`;
        ctx.drawImage(img, x + offsetX, y, w, h);
        ctx.restore();
      }

      // Draw scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let i = 0; i < canvas.height; i += 4) {
        ctx.fillRect(0, i, canvas.width, 2);
      }

      requestAnimationFrame(render);
    };

    render();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden w-screen h-screen">
      {/* Base Imagery with Faster Crossfade/Strobe */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ 
            opacity: [0, 0.7, 0.4, 0.65], // 加入闪烁序列
            scale: 1.1,
          }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ 
            duration: 0.4, // 极速切换
            times: [0, 0.2, 0.5, 1],
            ease: "linear" 
          }}
          className="absolute inset-0"
        >
          <img
            src={IMAGES[index]}
            alt=""
            className="w-full h-full object-cover brightness-110 contrast-100 saturate-125 bg-[#F0F0F0]/10"
            onError={(e) => {
                (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23cccccc' fill-opacity='0.1'/%3E%3C/svg%3E`;
            }}
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Glitch Layer */}
      {glitch && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-10 mix-blend-screen"
          style={glitchStyle}
        >
            <img
                src={IMAGES[index]}
                alt=""
                className="w-full h-full object-cover saturate-200"
                referrerPolicy="no-referrer"
            />
        </motion.div>
      )}

      {/* Color Tint Layer */}
      <div className="absolute inset-0 z-[5] opacity-20 mix-blend-soft-light pointer-events-none bg-gradient-to-tr from-blue-500/20 via-purple-500/10 to-orange-500/20" />

      {/* Scanlines / Noise Overlay */}
      <div className="absolute inset-0 z-20 opacity-[0.05] pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px]" />
      
      {/* Fixed Noise Overlay as background hint */}
      <div className="absolute inset-0 z-[2] opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-multiply" />

      {/* Exporter Button (Visible but subtle) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <button 
          onClick={startRecording}
          disabled={isRecording}
          className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all duration-500 ${
            isRecording 
            ? 'bg-red-500/20 border-red-500/50 text-red-200' 
            : 'bg-white/10 border-white/20 text-white/40 hover:text-white hover:bg-white/20'
          } text-[10px] uppercase tracking-[0.3em] font-mono`}
        >
          {isRecording ? (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording {Math.round(recordingProgress)}%
            </>
          ) : (
            <>
              <Video size={14} />
              Export Glitch Video (8s)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GlitchImages;
