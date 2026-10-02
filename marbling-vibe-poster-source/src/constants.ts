
export type MoodType = 'dreamy' | 'calm' | 'soft' | 'fresh' | 'warm' | 'cool';

// 统一配色系统 (Independent Color System)
export const UI_COLORS = {
  light: {
    background: '#e9e9e9',
    text: '#111111',
    textSecondary: 'rgba(17, 17, 17, 0.6)',
    accent: '#111111',
    number: 'rgba(17, 17, 17, 0.85)',
  },
  dark: {
    background: '#121212',
    text: '#F5F5F5',
    textSecondary: 'rgba(245, 245, 245, 0.4)',
    accent: '#FFFFFF',
    number: 'rgba(255, 255, 255, 0.95)',
  }
};

export interface Palette {
  background: string;
  colors: string[];
  slogans: string[];
}

export const PALETTES: Record<MoodType, Palette> = {
  dreamy: {
    background: '#FDF5F7',
    colors: ['#D4B5D8', '#B5C7D3', '#E8D2E1', '#EBCDC3'], // Fixed indices for stability
    slogans: ['Dancing in the clouds of mind', 'Where dreams and light meet', 'Slow waves of subconscious']
  },
  calm: {
    background: '#F5F7F4',
    colors: ['#BBCAC0', '#D8D9D0', '#A9B5AF', '#E1E4D8'],
    slogans: ['Quiet heart, silent sea', 'Finding rhythm in stillness', 'Breath becomes a gentle tide']
  },
  soft: {
    background: '#FFF9F5',
    colors: ['#EBCDC3', '#DCC8C8', '#F2E2D2', '#D3C5BB'],
    slogans: ['Gentle as a morning touch', 'Softness is a quiet power', 'A whisper in the watercolor']
  },
  fresh: {
    background: '#F5FAF8',
    colors: ['#C3DBC5', '#AEC9B4', '#D4EBD1', '#BDD9C8'],
    slogans: ['Morning dew on glass', 'New light, new frequency', 'Resonating with the green tide']
  },
  warm: {
    background: '#FEF9F2',
    colors: ['#ECC9A9', '#DAAD9A', '#EFC8C2', '#D4B39A'],
    slogans: ['Warmth is a memory of home', 'Glow that lingers within', 'Inner sun rising slowly']
  },
  cool: {
    background: '#F2F7FF',
    colors: ['#B5C7D3', '#9EB3C3', '#D2DFE8', '#A9B8C5'],
    slogans: ['Blue silence of the peaks', 'Crystal thoughts drifting', 'Deep cool currents of self']
  }
};

export const POSTER_FONTS = [
  { id: 'font-sans', name: 'Inter', family: '"Inter", sans-serif' },
  { id: 'font-serif', name: 'Cormorant', family: '"Cormorant", serif' },
  { id: 'font-mono', name: 'JetBrains', family: '"JetBrains Mono", monospace' },
  { id: 'font-display', name: 'Grotesk', family: '"Space Grotesk", sans-serif' },
  { id: 'font-cursive', name: 'Vibes', family: '"Great Vibes", cursive' },
  { id: 'font-playfair', name: 'Playfair', family: '"Playfair Display", serif' },
  { id: 'font-outfit', name: 'Outfit', family: '"Outfit", sans-serif' },
  { id: 'font-bebas', name: 'Bebas', family: '"Bebas Neue", sans-serif' },
  { id: 'font-baskerville', name: 'Libre', family: '"Libre Baskerville", serif' },
  { id: 'font-montserrat', name: 'Montserrat', family: '"Montserrat", sans-serif' },
  { id: 'font-robotomono', name: 'Roboto', family: '"Roboto Mono", monospace' },
  { id: 'font-cinzel', name: 'Cinzel', family: '"Cinzel", serif' },
  { id: 'font-lora', name: 'Lora', family: '"Lora", serif' },
  { id: 'font-opensans', name: 'Open Sans', family: '"Open Sans", sans-serif' },
  { id: 'font-raleway', name: 'Raleway', family: '"Raleway", sans-serif' },
  { id: 'font-poppins', name: 'Poppins', family: '"Poppins", sans-serif' },
  { id: 'font-dancing', name: 'Dancing', family: '"Dancing Script", cursive' },
  { id: 'font-oswald', name: 'Oswald', family: '"Oswald", sans-serif' },
  { id: 'font-abril', name: 'Abril', family: '"Abril Fatface", serif' },
  { id: 'font-unifraktur', name: 'Fraktur', family: '"UnifrakturMaguntia", cursive' },
  { id: 'font-syne', name: 'Syne', family: '"Syne", sans-serif' },
  { id: 'font-archivo', name: 'Archivo', family: '"Archivo Black", sans-serif' },
  { id: 'font-quicksand', name: 'Quicksand', family: '"Quicksand", sans-serif' },
  { id: 'font-worksans', name: 'Work Sans', family: '"Work Sans", sans-serif' },
  { id: 'font-firacode', name: 'Fira Code', family: '"Fira Code", monospace' },
  { id: 'font-spacemono', name: 'Space Mono', family: '"Space Mono", monospace' },
  { id: 'font-inconsolata', name: 'Inconsol', family: '"Inconsolata", monospace' },
  { id: 'font-nanum', name: 'Nanum', family: '"Nanum Myeongjo", serif' },
  { id: 'font-zilla', name: 'Zilla Slab', family: '"Zilla Slab", serif' },
  { id: 'font-arvo', name: 'Arvo', family: '"Arvo", serif' },
  { id: 'font-oldstd', name: 'Old Std', family: '"Old Standard TT", serif' },
  { id: 'font-exo', name: 'Exo 2', family: '"Exo 2", sans-serif' },
  { id: 'font-mada', name: 'Mada', family: '"Mada", sans-serif' },
  { id: 'font-ubuntumono', name: 'Ubuntu Mono', family: '"Ubuntu Mono", monospace' },
  { id: 'font-gloria', name: 'Gloria', family: '"Gloria Hallelujah", cursive' },
  { id: 'font-pacifico', name: 'Pacifico', family: '"Pacifico", cursive' },
  { id: 'font-comfortaa', name: 'Comfortaa', family: '"Comfortaa", sans-serif' },
  { id: 'font-marker', name: 'Marker', family: '"Permanent Marker", cursive' },
  { id: 'font-special', name: 'Special', family: '"Special Elite", cursive' },
  { id: 'font-alegreya', name: 'Alegreya', family: '"Alegreya", serif' },
  { id: 'font-bodoni', name: 'Bodoni', family: '"Bodoni Moda", serif' },
  { id: 'font-amiri', name: 'Amiri', family: '"Amiri", serif' },
  { id: 'font-crimson', name: 'Crimson', family: '"Crimson Pro", serif' },
  { id: 'font-ibmplex', name: 'IBM Plex', family: '"IBM Plex Sans", sans-serif' },
  { id: 'font-rubik', name: 'Rubik', family: '"Rubik", sans-serif' },
  { id: 'font-josefin', name: 'Josefin', family: '"Josefin Sans", sans-serif' },
  { id: 'font-montalt', name: 'Mont Alt', family: '"Montserrat Alternates", sans-serif' },
  { id: 'font-righteous', name: 'Righteous', family: '"Righteous", sans-serif' },
  { id: 'font-monoton', name: 'Monoton', family: '"Monoton", cursive' },
  { id: 'font-bangers', name: 'Bangers', family: '"Bangers", cursive' },
];
