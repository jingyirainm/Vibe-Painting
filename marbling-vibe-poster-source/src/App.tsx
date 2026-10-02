
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Download, RefreshCcw, Heart, MapPin, User, Send, Sparkles, X, Check, Volume2, VolumeX, Home, RotateCcw } from 'lucide-react';
import MarblingCanvas, { MarblingCanvasHandle } from './components/MarblingCanvas';
import AmbientBackground from './components/AmbientBackground';
import GlitchImages from './components/GlitchImages';
import { useMediaPipe } from './hooks/useMediaPipe';
import { PALETTES, MoodType, Palette, UI_COLORS, POSTER_FONTS } from './constants';
import { toPng } from 'html-to-image';
import { soundService } from './services/soundService';

export default function App() {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [thinkingOf, setThinkingOf] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [mood, setMood] = useState<MoodType>('dreamy');
  const [isStarted, setIsStarted] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPosterGenerated, setIsPosterGenerated] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isViewingPainting, setIsViewingPainting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formattedDateTime, setFormattedDateTime] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const [posterFont, setPosterFont] = useState('font-serif');
  const [posterColor, setPosterColor] = useState('currentColor');
  const [posterFontSize, setPosterFontSize] = useState(1);
  
  const [config, setConfig] = useState({
    dropSize: 1.0,
    bgMode: 'light' as 'light' | 'dark',
    numberSize: 26,
    mode: 'Star' as 'Star' | 'Number'
  });
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<MarblingCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMediaPipeLoading, setIsMediaPipeLoading] = useState(true);

  const lastFingerPos = useRef<{ x: number, y: number } | null>(null);
  const mouthOpenRef = useRef(false);
  const isBlinkingRef = useRef(false);
  const blinkSequenceRef = useRef(0);
  const colorIndex = useRef(0);

  const currentTheme = UI_COLORS[config.bgMode];

  useEffect(() => {
    soundService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        let w = winW;
        let h = winH;
        
        if (winW / winH > 0.75) {
          w = winH * 0.75;
        } else {
          h = winW / 0.75;
        }
        setDimensions({ width: w, height: h });
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      setFormattedDateTime(new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentPalette = PALETTES[mood];

  const getNextColor = () => {
    const colors = currentPalette.colors;
    const color = colors[colorIndex.current % colors.length];
    colorIndex.current++;
    return color;
  };

  const setupCamera = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      // Try with ideal constraints first
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Failed with ideal constraints, trying simple video: true", e);
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraError(null);
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      const name = err.name || '';
      const msg = err.message || '';
      
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || msg.toLowerCase().includes('denied')) {
        setCameraError("Camera access denied. Please click the camera icon in your browser address bar and choose 'Always allow', then refresh the page. (权限被拒绝：请在浏览器地址栏检查并允许访问摄像头。)");
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError("No camera found. Please check your hardware connection. (未发现摄像头设备)");
      } else {
        setCameraError("Unable to access camera. It might be in use by another app or permissions are missing. (无法访问摄像头：请检查占用或权限设置)");
      }
    }
  }, []);

  useEffect(() => {
    if (isStarted) {
      setupCamera();
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isStarted, setupCamera]);

  useEffect(() => {
    if (isStarted && canvasRef.current && dimensions.width > 0) {
      setTimeout(() => {
        canvasRef.current?.addDrop(dimensions.width * 0.4, dimensions.height * 0.3, dimensions.width * 0.3, getNextColor());
        canvasRef.current?.addDrop(dimensions.width * 0.6, dimensions.height * 0.6, dimensions.width * 0.25, getNextColor());
      }, 500);
    }
  }, [isStarted, dimensions.width]);

  const handleMediaPipeResults = useCallback((faceResults: any, handResults: any) => {
    if (!canvasRef.current || isPosterGenerated || isFinished) return;

    if (faceResults && faceResults.faceBlendshapes?.length > 0) {
      const jawOpen = faceResults.faceBlendshapes[0].categories.find((c: any) => c.categoryName === 'jawOpen')?.score || 0;
      const landmarks = faceResults.faceLandmarks[0];
      const mouthY = landmarks[13].y; 
      const mouthX = 1 - landmarks[13].x; 

      if (jawOpen > 0.30 && !mouthOpenRef.current) {
        mouthOpenRef.current = true;
        soundService.playBlow();
        const r = dimensions.width * (0.04 + Math.random() * 0.08) * config.dropSize;
        const x = mouthX * dimensions.width;
        const y = mouthY * dimensions.height;
        
        const dropCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < dropCount; i++) {
            canvasRef.current.addDrop(
                x + (Math.random() - 0.5) * 40, 
                y + (Math.random() - 0.5) * 40, 
                r * (0.6 + Math.random() * 0.5), 
                getNextColor()
            );
        }
      } else if (jawOpen < 0.15) {
        mouthOpenRef.current = false;
      }

      const eyeLBlink = faceResults.faceBlendshapes[0].categories.find((c: any) => c.categoryName === 'eyeBlinkLeft')?.score || 0;
      const eyeRBlink = faceResults.faceBlendshapes[0].categories.find((c: any) => c.categoryName === 'eyeBlinkRight')?.score || 0;
      
      const isCurrentlyBlinking = eyeLBlink > 0.5 || eyeRBlink > 0.5;
      
      const currentConfig = configRef.current;
      
      if (isCurrentlyBlinking && !isBlinkingRef.current) {
        const eyeL = landmarks[159];
        const eyeR = landmarks[386];
        soundService.playBlink();
        
        if (currentConfig.mode === 'Star') {
          if (eyeL) canvasRef.current?.spawnStars((1 - eyeL.x) * dimensions.width, eyeL.y * dimensions.height);
          if (eyeR) canvasRef.current?.spawnStars((1 - eyeR.x) * dimensions.width, eyeR.y * dimensions.height);
        } else {
          // Number Mode: Ensure spawning with latest config
          if (eyeL || eyeR) {
            const targetEye = eyeL || eyeR;
            const x = (1 - targetEye.x) * dimensions.width;
            const y = targetEye.y * dimensions.height;
            const num = blinkSequenceRef.current;
            blinkSequenceRef.current = (blinkSequenceRef.current + 1) % 10;
            canvasRef.current?.addFloatingNumber(x, y, `(${num})`, currentConfig.numberSize);
          }
        }
      }
      isBlinkingRef.current = isCurrentlyBlinking;
    }

    if (handResults && handResults.landmarks?.length > 0) {
      const indexFinger = handResults.landmarks[0][8]; 
      const x = (1 - indexFinger.x) * dimensions.width;
      const y = indexFinger.y * dimensions.height;

      if (lastFingerPos.current) {
        const dx = x - lastFingerPos.current.x;
        const dy = y - lastFingerPos.current.y;
        if (Math.sqrt(dx*dx + dy*dy) > 1.5) {
          if (Math.random() < 0.3) soundService.playFlow();
          canvasRef.current.nudgeNumbers(x, y, dx, dy);
          canvasRef.current.applyTine(lastFingerPos.current, { x, y }, 18, 50);
        }
      }
      lastFingerPos.current = { x, y };
    } else {
      lastFingerPos.current = null;
    }
  }, [dimensions, config, isPosterGenerated, isMediaPipeLoading, mood]);

  useMediaPipe(videoRef.current, handleMediaPipeResults, () => setIsMediaPipeLoading(false));

  const startApp = () => {
    if (!name) return;
    setIsStarted(true);
  };

  const generatePoster = () => setIsPosterGenerated(true);

  const restartToLanding = () => {
    setIsStarted(false);
    setIsPosterGenerated(false);
    setSetupStep(0);
    if (canvasRef.current) canvasRef.current.reset(currentPalette.background);
  };

  const repaintCanvas = () => {
    if (canvasRef.current) canvasRef.current.reset(currentPalette.background);
  };

  const downloadPoster = useCallback(async () => {
    if (!containerRef.current || generating) return;
    try {
      soundService.playClick();
      setGenerating(true);
      const container = containerRef.current;
      const video = videoRef.current;
      
      // 1. Ensure fonts are ready
      await document.fonts.ready;

      let tempImg: HTMLImageElement | null = null;

      // 2. Capture Video Frame ("Freeze" snapshot)
      if (video && video.readyState >= 2) {
        try {
          const captureCanvas = document.createElement('canvas');
          // Scale down capture slightly for performance if needed, but keeping original aspect
          captureCanvas.width = video.videoWidth || 640;
          captureCanvas.height = video.videoHeight || 480;
          const ctx = captureCanvas.getContext('2d');
          
          if (ctx) {
            ctx.translate(captureCanvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
            
            const dataUrl = captureCanvas.toDataURL('image/png');
            tempImg = document.createElement('img');
            tempImg.src = dataUrl;
            
            tempImg.className = video.className;
            tempImg.style.position = 'absolute';
            tempImg.style.inset = '0';
            tempImg.style.width = '100%';
            tempImg.style.height = '100%';
            tempImg.style.objectFit = 'cover';
            tempImg.style.zIndex = '10';
            
            video.parentElement?.appendChild(tempImg);
            video.style.visibility = 'hidden';
            
            // Wait for snapshot image to be ready
            await new Promise((resolve) => {
              if (tempImg!.complete) resolve(null);
              else {
                tempImg!.onload = () => resolve(null);
                tempImg!.onerror = () => resolve(null);
              }
            });
          }
        } catch (captureErr) {
          console.warn("Snapshot failed, continuing without freeze frame", captureErr);
        }
      }

      // Stability delay
      await new Promise(r => setTimeout(r, 200));

      // 4. Execute "Screenshot" with optimized params
      const dataUrl = await toPng(container, {
        cacheBust: true,
        pixelRatio: 2, // 2 is enough for high-res while keeping file size/memory safe
        backgroundColor: currentPalette.background,
        filter: (node: any) => {
          // Exclude video but keep the placeholder image we injected
          return node.tagName !== 'VIDEO';
        },
      });

      // 5. Cleanup
      if (video) video.style.visibility = 'visible';
      if (tempImg) tempImg.remove();

      // 6. Final Download
      const link = document.createElement('a');
      const safeName = name.trim() || 'VIBEPAINTING';
      link.download = `Vibepainting_${safeName}.png`;
      link.href = dataUrl;
      link.click();
      
      setGenerating(false);
    } catch (err) {
      console.error("Critical download error:", err);
      // Clean up on error
      if (videoRef.current) videoRef.current.style.visibility = 'visible';
      setGenerating(false);
    }
  }, [name, generating, currentPalette.background]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger if Space is pressed AND not typing in an input
      if (e.code === 'Space') {
        const activeElement = document.activeElement;
        const isInput = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || (activeElement as HTMLElement).isContentEditable);
        
        if (!isInput && isStarted) {
          e.preventDefault();
          downloadPoster();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [downloadPoster, isStarted]);

  return (
    <div className={`fixed inset-0 font-serif italic overflow-hidden select-none flex flex-col items-center justify-center transition-colors duration-1000`} style={{ backgroundColor: currentTheme.background, color: currentTheme.text }}>
      <GlitchImages />
      <div className="grain-overlay" />

      {/* Global Bottom UI - Screen Corners */}
      {isStarted && (
        <>
          {/* Gesture Instructions (Bottom Left) */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: (isFinished || isViewingPainting) ? 0 : 0.65, x: 0 }} 
            className={`fixed bottom-10 left-10 z-[40] flex flex-col gap-2 font-serif text-[22px] sm:text-[26px] tracking-[0.05em] leading-tight select-none lowercase pointer-events-none ${(isFinished || isViewingPainting) ? 'pointer-events-none' : 'pointer-events-none'}`}
          >
            <div className="group flex gap-3">blow <span className="opacity-40">→</span> add color</div>
            <div className="group flex gap-3">blink <span className="opacity-40">→</span> add figure</div>
            <div className="group flex gap-3">finger <span className="opacity-40">→</span> blend</div>
          </motion.div>

          {/* Finish & Save Button (Bottom Right) */}
          <motion.button 
            initial={{ opacity: 0, x: 20, scale: 0.95 }} 
            animate={{ opacity: (isFinished || isViewingPainting) ? 0 : 1, x: 0, scale: 1 }}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.25)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsFinished(true)}
            className={`fixed bottom-10 right-10 z-[40] px-8 py-3 rounded-full border border-black/10 text-[18px] sm:text-[20px] tracking-[0.1em] lowercase font-serif transition-all duration-300 backdrop-blur-sm ${(isFinished || isViewingPainting) ? 'pointer-events-none' : 'pointer-events-auto'}`}
            style={{ 
              backgroundColor: "rgba(255,255,255,0.15)",
              borderColor: "rgba(0,0,0,0.05)",
              color: currentTheme.text
            }}
          >
            finish & save
          </motion.button>
        </>
      )}
      
      <motion.div initial={{ opacity: 1, y: -20 }} animate={{ opacity: isViewingPainting ? 0 : 1, y: 0 }} className="absolute top-12 left-12 z-30">
        <h2 className="text-4xl font-light tracking-tighter opacity-90">Vibe Painting</h2>
      </motion.div>

      {/* Left side controls - Navigation */}
      <AnimatePresence>
        {isStarted && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: isViewingPainting ? 0 : 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-12 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-30"
          >
            <button onClick={restartToLanding} className="group flex flex-col items-center gap-2 transition-all opacity-40 hover:opacity-100">
              <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:bg-current group-hover:text-current-inverse transition-all">
                <Home size={16} />
              </div>
              <span className="text-[9px] uppercase tracking-widest">Restart</span>
            </button>

            <button onClick={repaintCanvas} className="group flex flex-col items-center gap-2 transition-all opacity-40 hover:opacity-100">
              <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:bg-current group-hover:text-current-inverse transition-all">
                <RotateCcw size={16} />
              </div>
              <span className="text-[9px] uppercase tracking-widest">Repaint</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        animate={{ opacity: isViewingPainting ? 0 : 1 }}
        className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-30"
      >
        <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="group flex flex-col items-center gap-2 transition-all opacity-40 hover:opacity-100">
          <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:bg-current group-hover:text-current-inverse transition-all">
            <Sparkles size={16} />
          </div>
          <span className="text-[9px] uppercase tracking-widest">Settings</span>
        </button>

        <button onClick={() => setSoundEnabled(!soundEnabled)} className="group flex flex-col items-center gap-2 transition-all opacity-40 hover:opacity-100">
          <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:bg-current group-hover:text-current-inverse transition-all">
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </div>
          <span className="text-[9px] uppercase tracking-widest">{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
        </button>

        {isPosterGenerated && (
          <>
            <button onClick={() => canvasRef.current?.reset(currentPalette.background)} className="group flex flex-col items-center gap-2 transition-all opacity-40 hover:opacity-100">
              <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:bg-current group-hover:text-current-inverse transition-all">
                <RefreshCcw size={16} />
              </div>
              <span className="text-[9px] uppercase tracking-widest">Restore</span>
            </button>
            <button onClick={() => { setIsStarted(false); setIsPosterGenerated(false); setIsFinished(false); }} className="group flex flex-col items-center gap-2 transition-all opacity-40 hover:opacity-100">
              <div className="w-10 h-10 rounded-full border border-current flex items-center justify-center group-hover:bg-current group-hover:text-current-inverse transition-all">
                <X size={16} />
              </div>
              <span className="text-[9px] uppercase tracking-widest">Restart</span>
            </button>
          </>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {!isStarted && (
          <motion.div 
            key="onboarding-overlay"
            initial={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-hidden"
          >
            <AmbientBackground mood={mood} bgMode={config.bgMode} />
            <GlitchImages />
            
            {/* Technical Metadata Corner Overlays */}
            <div className={`absolute inset-0 pointer-events-none p-10 font-mono text-[9px] uppercase tracking-[0.2em] opacity-30 flex flex-col justify-between transition-opacity duration-500 ${isViewingPainting ? 'opacity-0' : 'opacity-30'}`}>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                    Rec: {new Date().toLocaleTimeString('en-GB', { hour12: false })}
                  </div>
                  <div>Created by Rainmelon Studio</div>
                </div>
                <div>16-F20 [  ]</div>
              </div>
              <div className="flex justify-between items-end">
                <div>Phase: 01_ONBOARDING</div>
                <div>Coord: {Math.floor(dimensions.width)},{Math.floor(dimensions.height)}</div>
              </div>
            </div>

            <div className="max-w-md w-full space-y-16 relative z-10">
              {/* Step Indicators - Only show for setup steps 1-6 */}
              {setupStep > 0 && (
                <div className="flex gap-1 justify-center mb-16">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div 
                      key={step} 
                      className={`h-[1px] transition-all duration-1000 ${setupStep === step ? 'w-12 bg-[#2D2D2D]' : 'w-6 bg-[#2D2D2D]/10'}`}
                    />
                  ))}
                </div>
              )}

              <div className={setupStep === 0 ? "min-h-[340px] flex flex-col items-center justify-center" : "min-h-[340px] flex flex-col justify-center"}>
                <AnimatePresence mode="wait">
                  {setupStep === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center space-y-12 cursor-pointer pb-20"
                      onClick={() => {
                        setSetupStep(1);
                        if (soundEnabled) {
                          soundService.init();
                        }
                      }}
                    >
                      <motion.h1 
                        initial={{ letterSpacing: '0.2em', opacity: 0 }}
                        animate={{ letterSpacing: '0.5em', opacity: 1 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="text-6xl font-light tracking-[0.5em] uppercase text-black/80"
                      >
                        Vibe Painting
                      </motion.h1>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        transition={{ delay: 1.5, duration: 1 }}
                        className="text-[11px] tracking-[0.6em] uppercase font-serif"
                      >
                        Click to start experiment
                      </motion.div>
                    </motion.div>
                  )}

                  {setupStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <span className="text-[12px] uppercase tracking-[0.4em] opacity-30 font-serif">Input_01</span>
                        <h2 className="text-3xl font-light tracking-tight opacity-60">Input Your Name</h2>
                      </div>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="NAME" 
                          autoFocus
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="w-full bg-transparent border-b border-black/5 p-4 focus:border-black/20 outline-none transition-all placeholder:opacity-10 text-xl tracking-[0.3em] uppercase font-serif text-black/80" 
                        />
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <span className="text-[12px] uppercase tracking-[0.4em] opacity-30 font-serif">Input_02</span>
                        <h2 className="text-3xl font-light tracking-tight opacity-60">Input Location</h2>
                      </div>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="CITY / SPACE" 
                          autoFocus
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
                          className="w-full bg-transparent border-b border-black/5 p-4 focus:border-black/20 outline-none transition-all placeholder:opacity-10 text-xl tracking-[0.3em] uppercase font-serif text-black/80" 
                        />
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <span className="text-[12px] uppercase tracking-[0.4em] opacity-30 font-serif">Input_03</span>
                          <h2 className="text-3xl font-light tracking-tight opacity-60">Mental Subject _</h2>
                        </div>
                        <p className="text-[22px] leading-relaxed opacity-80 font-serif tracking-wider whitespace-pre-line lowercase">
                          {`What is the first thought appear in your mind?\n\nMaybe a sentence\na color\nor a place you want to go\n....\nJust follow your direct instinct and enter it`}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <input 
                          type="text" 
                          placeholder="A WORD / A DREAM" 
                          autoFocus
                          value={thinkingOf} 
                          onChange={(e) => setThinkingOf(e.target.value)} 
                          className="w-full bg-transparent border-b border-black/5 p-4 focus:border-black/20 outline-none transition-all placeholder:opacity-10 text-xl tracking-[0.3em] uppercase font-serif text-black/80" 
                        />
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 4 && (
                    <motion.div 
                      key="step4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <span className="text-[12px] uppercase tracking-[0.4em] opacity-30 font-serif">Input_04</span>
                        <h2 className="text-3xl font-light tracking-tight opacity-60">Frequency Selection _</h2>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.keys(PALETTES) as MoodType[]).map((m) => (
                          <button 
                            key={m} 
                            onClick={() => setMood(m)} 
                            className={`py-5 px-1 text-[12px] uppercase tracking-[0.2em] font-serif transition-all border ${mood === m ? 'border-black/40 text-black/80 bg-white/40' : 'border-black/5 text-black/20 hover:border-black/20'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 5 && (
                    <motion.div 
                      key="step5"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <span className="text-[12px] uppercase tracking-[0.4em] opacity-30 font-serif">Input_05</span>
                        <h2 className="text-3xl font-light tracking-tight opacity-60">Interactive Protocol _</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {['Star', 'Number'].map((m) => (
                          <button 
                            key={m} 
                            onClick={() => setConfig(prev => ({ ...prev, mode: m as any }))} 
                            className={`py-6 px-1 text-[12px] uppercase tracking-[0.3em] font-serif transition-all border ${config.mode === m ? 'border-black/40 text-black/80 bg-white/40' : 'border-black/5 text-black/20 hover:border-black/20'}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {setupStep === 6 && (
                    <motion.div 
                      key="step6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-1">
                        <span className="text-[12px] uppercase tracking-[0.4em] opacity-30 font-serif">Input_06</span>
                        <h2 className="text-3xl font-light tracking-tight opacity-60">Instruction_ Manual _</h2>
                      </div>
                      
                      <div className="space-y-5 py-2">
                        <div className="flex flex-col gap-1 border-l-2 border-black/5 pl-4 py-1">
                           <div className="text-[18px] font-bold tracking-widest text-black/90 lowercase">Blow 🫧</div>
                           <div className="text-[15px] opacity-60 font-serif tracking-wide lowercase">→ Colors will appear on the screen</div>
                        </div>
                        
                        <div className="flex flex-col gap-1 border-l-2 border-black/5 pl-4 py-1">
                           <div className="text-[18px] font-bold tracking-widest text-black/90 lowercase">Blink 👀</div>
                           <div className="text-[15px] opacity-60 font-serif tracking-wide lowercase">→ Stars or numbers will be generated</div>
                        </div>

                        <div className="flex flex-col gap-1 border-l-2 border-black/5 pl-4 py-1">
                           <div className="text-[18px] font-bold tracking-widest text-black/90 lowercase">Move your fingers 🪄</div>
                           <div className="text-[15px] opacity-60 font-serif tracking-wide lowercase">→ Stir and blend the colors</div>
                        </div>

                        <div className="flex flex-col gap-1 border-l-2 border-black/5 pl-4 py-1">
                           <div className="text-[18px] font-bold tracking-widest text-black/90 lowercase">Press the spacebar 📷</div>
                           <div className="text-[15px] opacity-60 font-serif tracking-wide lowercase">→ Download the current poster</div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col gap-4">
                {setupStep > 0 && (
                  <motion.button 
                    whileHover={{ opacity: 1 }} 
                    whileTap={{ scale: 0.99 }} 
                    onClick={() => {
                      if (soundEnabled) {
                        soundService.init();
                        soundService.playClick();
                      }
                      if (setupStep < 6) {
                        setSetupStep(s => s + 1);
                      } else {
                        startApp();
                      }
                    }} 
                    disabled={(setupStep === 1 && !name) || (setupStep === 2 && !location) || (setupStep === 3 && !thinkingOf)} 
                    className="w-full bg-white/20 border border-black/10 py-7 flex items-center justify-center font-serif uppercase text-[14px] tracking-[0.5em] text-black/40 hover:text-black/70 hover:border-black/30 disabled:opacity-5 transition-all backdrop-blur-sm"
                  >
                    {setupStep === 6 ? 'Initiate experiment' : 'Proceed next'}
                  </motion.button>
                )}
                
                {setupStep > 0 && (
                  <button 
                    onClick={() => setSetupStep(s => s - 1)}
                    className="text-[12px] uppercase tracking-[0.4em] opacity-20 hover:opacity-50 transition-all font-serif"
                  >
                    {setupStep === 1 ? '/ Return to bridge' : '/ Return previous'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main ref={containerRef} className={`relative z-10 shadow-2xl flex flex-col justify-between overflow-hidden ${isViewingPainting ? 'pointer-events-none' : 'pointer-events-auto'}`} style={{ width: dimensions.width || '100%', height: dimensions.height || '100%', backgroundColor: currentPalette.background }}>
        {dimensions.width > 0 && (
          <div className="absolute inset-0 z-0">
            <MarblingCanvas 
              ref={canvasRef} 
              width={dimensions.width} 
              height={dimensions.height} 
              bgColor={currentPalette.background} 
              bgMode={config.bgMode} 
              fontFamily={POSTER_FONTS.find(f => f.id === posterFont)?.family || '"Inter", sans-serif'}
            />
          </div>
        )}

        <div className={`absolute inset-[4%] pointer-events-none z-20 flex flex-col justify-between ${posterFont} font-normal not-italic`} style={{ color: posterColor === 'currentColor' ? currentTheme.text : posterColor }}>
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1 max-w-[80%]" style={{ fontSize: `${posterFontSize * 100}%` }}>
            <div className="text-[15px] sm:text-[18px] opacity-50 tracking-[0.15em] leading-relaxed font-normal not-italic">
              I am thinking ({thinkingOf || '...'}) at ({location || '...'}) on ({formattedDateTime})
            </div>
          </motion.div>
          
          <div className="flex justify-between items-end relative w-full mb-12">
            {/* Existing layout space container */}
          </div>

          <div className="flex justify-between items-end relative w-full">
            <div className="camera-box w-[22vw] max-w-[180px] min-w-[110px] aspect-[3/4] overflow-hidden relative pointer-events-auto shadow-2xl transition-all duration-700" style={{ border: `1px solid ${currentPalette.colors[0]}66`, background: `${currentTheme.background}EE`, }}>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover grayscale brightness-125 contrast-110 opacity-70 mix-blend-multiply" />
                <div className="absolute inset-0 pointer-events-none opacity-[0.35]" 
                    style={{ 
                      backgroundImage: `radial-gradient(circle, ${config.bgMode === 'dark' ? '#fff' : '#000'} 0.2px, transparent 0.2px)`,
                      backgroundSize: '1px 1px'
                    }} 
                />
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center backdrop-blur-md">
                    <Camera size={20} className="text-white/20 mb-3" />
                    <p className="text-[8px] text-white/60 leading-relaxed font-mono uppercase tracking-[0.1em] mb-4">{cameraError}</p>
                    <button onClick={(e) => { e.preventDefault(); setupCamera(); }} className="px-3 py-1.5 bg-white text-black text-[9px] font-bold uppercase tracking-widest">Retry</button>
                  </div>
                )}
                {isMediaPipeLoading && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm"><div className="w-4 h-4 border-2 border-current/20 border-t-current rounded-full animate-spin"></div></div>
                )}
            </div>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="pointer-events-none flex flex-col items-end">
              <div className="opacity-60 -rotate-2 text-right leading-[0.6] whitespace-nowrap origin-bottom-right font-normal not-italic" style={{ fontSize: `calc(${posterFontSize} * min(7.33vh, 6vw))` }}>{name}</div>
              <div className="text-[7px] sm:text-[9px] uppercase tracking-[0.4em] font-mono opacity-20 mt-6 mr-1">Created by Rainmelon Studio</div>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {isFinished && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: isViewingPainting ? 0 : 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 z-[60] flex items-center justify-center backdrop-blur-[2px] ${isViewingPainting ? 'pointer-events-none' : 'pointer-events-auto'}`}
              style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
            >
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isViewingPainting ? 0 : 1, y: isViewingPainting ? 20 : 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center gap-8"
              >
                  <p className="font-serif italic text-white/80 text-xl tracking-widest lowercase">Your creation is ready</p>
                  <div className="flex flex-wrap justify-center gap-4 max-w-2xl px-6">
                    <button 
                      onClick={downloadPoster}
                      className="px-8 py-3 rounded-full border border-white/20 bg-white/10 text-white text-[11px] tracking-[0.3em] uppercase hover:bg-white/20 transition-all font-mono"
                    >
                      Export Poster
                    </button>
                    <button 
                      onClick={() => setIsViewingPainting(true)}
                      className="px-8 py-3 rounded-full border border-white/30 bg-white/20 text-white text-[11px] tracking-[0.3em] uppercase hover:bg-white/40 transition-all font-mono shadow-lg"
                    >
                      View Your Painting
                    </button>
                    <button 
                      onClick={() => setIsFinished(false)}
                      className="px-8 py-3 rounded-full border border-white/10 text-white/60 text-[11px] tracking-[0.2em] uppercase hover:text-white hover:border-white/20 transition-all font-mono"
                    >
                      Continue Painting
                    </button>
                    <button 
                      onClick={() => {
                        setIsStarted(false);
                        setIsPosterGenerated(false);
                        setIsFinished(false);
                        setIsViewingPainting(false);
                      }}
                      className="px-8 py-3 rounded-full border border-white/5 text-white/40 text-[11px] tracking-[0.2em] uppercase hover:text-red-300/60 hover:border-red-300/20 transition-all font-mono"
                    >
                      Back to Start
                    </button>
                  </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className={`absolute right-32 top-1/2 -translate-y-1/2 z-50 w-72 backdrop-blur-3xl p-8 pointer-events-auto border border-black/5 shadow-2xl transition-colors`} style={{ backgroundColor: `${currentTheme.background}BB`, color: currentTheme.text }}>
              <div className="space-y-10">
                <div className="flex justify-between items-center mb-6">
                   <span className="text-[10px] font-bold tracking-widest opacity-40 uppercase">Control Center</span>
                   <button onClick={() => setIsSettingsOpen(false)}><X size={14} className="opacity-40" /></button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] tracking-widest opacity-60 uppercase"><span>Drop Pressure</span><span>{config.dropSize.toFixed(1)}x</span></div>
                  <input type="range" min="0.5" max="2.5" step="0.1" value={config.dropSize} onChange={(e) => setConfig({ ...config, dropSize: parseFloat(e.target.value) })} className="w-full accent-current" />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] tracking-widest opacity-60 uppercase"><span>Tracking Size</span><span>{config.numberSize}px</span></div>
                  <input type="range" min="14" max="52" step="1" value={config.numberSize} onChange={(e) => setConfig({ ...config, numberSize: parseInt(e.target.value) })} className="w-full accent-current" />
                </div>

                <div className="space-y-4">
                   <span className="text-[10px] tracking-widest opacity-60 uppercase">Interactions Mode</span>
                   <div className="flex gap-1">
                     {['Star', 'Number'].map(m => (
                       <button key={m} onClick={() => setConfig({ ...config, mode: m as any })} className={`flex-1 py-3 text-[9px] border ${config.mode === m ? 'bg-current text-current-inverse border-current' : 'border-current/10 opacity-30 hover:opacity-100'}`}>{m.toUpperCase()}</button>
                     ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <span className="text-[10px] tracking-widest opacity-60 uppercase">Canvas Mood</span>
                   <div className="flex gap-1">
                     <button onClick={() => setConfig({ ...config, bgMode: 'light' })} className={`flex-1 py-3 text-[9px] border ${config.bgMode === 'light' ? 'bg-current text-current-inverse border-current' : 'border-current/10 opacity-30 hover:opacity-100'}`}>SOLAR</button>
                     <button onClick={() => setConfig({ ...config, bgMode: 'dark' })} className={`flex-1 py-3 text-[9px] border ${config.bgMode === 'dark' ? 'bg-current text-current-inverse border-current' : 'border-current/10 opacity-30 hover:opacity-100'}`}>LUNAR</button>
                   </div>
                </div>

                <div className="pt-6 border-t border-current/10 space-y-6">
                  <span className="text-[10px] font-bold tracking-widest opacity-40 uppercase">Poster Appearance</span>
                  
                  <div className="space-y-3">
                    <span className="text-[10px] tracking-widest opacity-60 uppercase block">Font Family</span>
                    <div className="h-40 overflow-y-auto pr-2 custom-scrollbar grid grid-cols-2 gap-1 border border-current/5 p-1 rounded-sm">
                      {POSTER_FONTS.map(f => (
                        <button key={f.id} onClick={() => setPosterFont(f.id)} className={`py-1.5 text-[8px] border transition-all ${posterFont === f.id ? 'bg-current text-current-inverse border-current' : 'border-current/10 opacity-30 hover:opacity-80'}`}>{f.name}</button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] tracking-widest opacity-60 uppercase block">Text Color</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        value={posterColor === 'currentColor' ? currentTheme.text : posterColor} 
                        onChange={(e) => setPosterColor(e.target.value)} 
                        className="w-10 h-10 border-0 p-0 bg-transparent cursor-pointer rounded-lg overflow-hidden flex-shrink-0"
                      />
                      <button 
                        onClick={() => setPosterColor('currentColor')} 
                        className={`text-[9px] px-2 py-1 border rounded-sm transition-all ${posterColor === 'currentColor' ? 'bg-current text-current-inverse' : 'border-current/20 opacity-60'}`}
                      >
                        Reset to Theme
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] tracking-widest opacity-60 uppercase"><span>Relative Scale</span><span>{(posterFontSize * 100).toFixed(0)}%</span></div>
                    <input type="range" min="0.5" max="2" step="0.05" value={posterFontSize} onChange={(e) => setPosterFontSize(parseFloat(e.target.value))} className="w-full accent-current" />
                  </div>
                </div>

                <div className="pt-4 border-t border-current/10 space-y-4">
                  <button onClick={() => setIsAboutOpen(!isAboutOpen)} className="w-full text-left text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 flex justify-between items-center">About Project</button>
                  {isAboutOpen && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[10px] leading-relaxed opacity-40">通过身体交互，实时生成情绪海报。每一次呼吸都在画布上留下数字与色彩的痕迹。</motion.p>}
                </div>

                <button onClick={() => { canvasRef.current?.reset(currentPalette.background); setIsSettingsOpen(false); }} className="w-full mt-4 py-4 border border-current/20 text-[10px] items-center flex justify-center gap-3 hover:bg-current hover:text-current-inverse transition-colors uppercase tracking-[0.2em]"><RefreshCcw size={10} /> Clean Canvas</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Dedicated Viewing Mode Layer - OUTSIDE MAIN, FIXED TO VIEWPORT */}
      <AnimatePresence>
        {isViewingPainting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] pointer-events-none"
          >
            {/* Back Button - High priority interactable */}
            <motion.button 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(0,0,0,0.85)" }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsViewingPainting(false);
              }}
              className="fixed bottom-12 right-12 pointer-events-auto flex items-center gap-3 text-white transition-all text-[13px] uppercase tracking-[0.3em] font-serif italic bg-black/80 px-10 py-5 rounded-full backdrop-blur-3xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.6)] z-[1001]"
            >
              <X size={18} /> Back
            </motion.button>

            {/* Instruction Tip */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ 
                  times: [0, 0.1, 0.9, 1],
                  duration: 5,
                  delay: 0.5
                }}
                className="z-[1001]"
              >
                <div className="bg-black/60 px-14 py-7 rounded-full backdrop-blur-xl border border-white/20 shadow-2xl">
                  <p className="text-white font-serif italic text-[20px] sm:text-[26px] tracking-[0.25em] lowercase text-center">
                    use your phone to take a picture of this moment
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        video { transform: scaleX(-1); }
        input[type='range'] { -webkit-appearance: none; height: 1px; background: rgba(0,0,0,0.1); outline: none; }
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 8px; height: 8px; border-radius: 50%; background: currentColor; cursor: pointer; border: 1px solid white; }
        .text-current-inverse { color: ${config.bgMode === 'dark' ? '#000' : '#fff'}; }
      `}</style>
    </div>

  );
}
