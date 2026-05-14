/** Configurações globais do vídeo.
 *  35 segundos a 30fps = 1050 frames. */

export const FPS = 30;
export const SEGUNDOS = 35;
export const DURATION_FRAMES = FPS * SEGUNDOS;

// Vertical-friendly mas que funciona bem no LinkedIn também (1080x1920 reel
// ou 1920x1080 horizontal). Padrão Insta Reel / TikTok / Shorts.
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Paleta bold disruptiva — alto contraste, pra parar o scroll.
 *  Preto profundo + branco puro + 2 cores neon agressivas. */
export const COLORS = {
  // Base
  bg: "#050505", // preto quase puro
  bgAlt: "#0f0f0f",
  fg: "#ffffff",
  fgMuted: "rgba(255,255,255,0.65)",
  fgDim: "rgba(255,255,255,0.4)",
  border: "rgba(255,255,255,0.12)",
  // Neon accents
  neonYellow: "#eaff00", // amarelo elétrico tipo TikTok
  neonMagenta: "#ff0080", // pink choque
  neonCyan: "#00fff0", // ciano elétrico (raro, usar com cuidado)
  // Tom da marca preservado mas intensificado
  accent: "#3b82f6", // azul vibrante
  accentDark: "#1e40af",
  // Status
  emerald: "#00ff88",
  danger: "#ff3355",
};

/** Timing de cada cena (em frames, 30 fps).
 *  Total = 1050 frames = 35s exato. */
export const SCENES = {
  hero: { start: 0, duration: 120 }, // 0-4s
  problema: { start: 120, duration: 150 }, // 4-9s
  solucao: { start: 270, duration: 150 }, // 9-14s
  mobile: { start: 420, duration: 180 }, // 14-20s
  calculadora: { start: 600, duration: 150 }, // 20-25s
  desktop: { start: 750, duration: 150 }, // 25-30s
  cta: { start: 900, duration: 150 }, // 30-35s
} as const;

export type SceneKey = keyof typeof SCENES;
