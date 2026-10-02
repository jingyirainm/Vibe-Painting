
/**
 * Dreamy Sound Service using Web Audio API
 * Synthesizes minimal, ethereal sounds for the interactive experience.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private enabled: boolean = false;
  private masterGain: GainNode | null = null;

  init() {
    if (this.audioCtx) return;
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 0.7; 
    this.masterGain.connect(this.audioCtx.destination);

    console.log('Audio Context initialized');
  }

  setEnabled(val: boolean) {
    if (val && !this.audioCtx) this.init();
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
    this.enabled = val;
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, volume: number = 0.1) {
    if (!this.enabled || !this.audioCtx || !this.masterGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.audioCtx.currentTime + duration);
  }

  // Blink - High pitch, short "twinkle"
  playBlink() {
    this.createOscillator('sine', 1200 + Math.random() * 400, 0.4, 0.1);
    setTimeout(() => this.createOscillator('sine', 1500 + Math.random() * 500, 0.3, 0.05), 50);
  }

  // Blow - Low frequency noise/breath
  playBlow() {
    if (!this.enabled || !this.audioCtx || !this.masterGain) return;

    const bufferSize = this.audioCtx.sampleRate * 0.5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.5);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  // Move - Resonant sweep for mixing
  playFlow() {
    const freq = 100 + Math.random() * 100;
    this.createOscillator('triangle', freq, 0.8, 0.05);
  }

  // Click - Short technical "click"
  playClick() {
    if (!this.enabled || !this.audioCtx || !this.masterGain) return;
    
    // Quick noise burst for mechanical click
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(2000, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }
}

export const soundService = new SoundService();
