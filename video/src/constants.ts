/** Configurações globais do vídeo.
 *  35 segundos a 30fps = 1050 frames. */

export const FPS = 30;
export const SEGUNDOS = 35;
export const DURATION_FRAMES = FPS * SEGUNDOS;

// Vertical-friendly mas que funciona bem no LinkedIn também (1080x1920 reel
// ou 1920x1080 horizontal). Padrão Insta Reel / TikTok / Shorts.
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Paleta da marca. */
export const COLORS = {
  accent: "#1c6dd0",
  accentDark: "#0d4e9e",
  accentLight: "#60a5fa",
  emerald: "#10b981",
  yellow: "#facc15",
  fg: "#0f172a",
  fgMuted: "#475569",
  fgDim: "#94a3b8",
  bg: "#f8fafc",
  bgCard: "#ffffff",
  border: "#e2e8f0",
  danger: "#ef4444",
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
