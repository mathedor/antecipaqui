/** Configurações globais do vídeo.
 *  35 segundos a 30fps = 1050 frames. */

export const FPS = 30;
export const SEGUNDOS = 35;
export const DURATION_FRAMES = FPS * SEGUNDOS;

// Vertical-friendly mas que funciona bem no LinkedIn também (1080x1920 reel
// ou 1920x1080 horizontal). Padrão Insta Reel / TikTok / Shorts.
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Paleta da marca Antecipaqui — branco, preto, azul. Cinematográfica e
 *  sofisticada, sem cores chamativas. Accent emerald sutil só pra valor
 *  positivo ("recebe hoje"). */
export const COLORS = {
  // Base — alternância entre cenas claras e escuras
  white: "#ffffff",
  whiteBg: "#fafafc",
  dark: "#0a0e1a", // preto profundo (não puro)
  darkAlt: "#141925",

  // Textos
  fgOnDark: "#ffffff",
  fgOnLight: "#0a0e1a",
  fgMutedOnDark: "rgba(255,255,255,0.7)",
  fgMutedOnLight: "rgba(10,14,26,0.65)",
  fgDimOnDark: "rgba(255,255,255,0.45)",
  fgDimOnLight: "rgba(10,14,26,0.4)",

  // Brand
  accent: "#1c6dd0", // azul Antecipaqui
  accentDark: "#0d4e9e",
  accentLight: "#3b82f6",

  // Highlight sutil de "valor positivo" (recebe / aprovado)
  emerald: "#10b981",

  // Sinal de problema (uso restrito, só na cena 'problema')
  danger: "#dc2626",

  // Borders
  borderOnDark: "rgba(255,255,255,0.1)",
  borderOnLight: "rgba(10,14,26,0.08)",

  // Aliases compat (cenas legadas)
  bg: "#ffffff",
  bgAlt: "#fafafc",
  fg: "#0a0e1a",
  fgMuted: "rgba(10,14,26,0.65)",
  fgDim: "rgba(10,14,26,0.4)",
  border: "rgba(10,14,26,0.08)",
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
