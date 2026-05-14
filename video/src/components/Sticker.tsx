import { useCurrentFrame, useVideoConfig } from "remotion";
import { popIn, fadeIn } from "../anim";
import { COLORS } from "../constants";

export type StickerVariant = "yellow" | "white" | "accent" | "dark" | "success";

type StickerProps = {
  /** Texto curto (use 1-4 palavras pra impacto). */
  text: string;
  /** Quando aparece (em frames da cena). */
  appearAt?: number;
  /** Posição na tela. */
  position?:
    | "top-left"
    | "top-right"
    | "top-center"
    | "middle-left"
    | "middle-right"
    | "bottom-left"
    | "bottom-right"
    | "bottom-center";
  /** Rotação em graus (default leve aleatório). */
  rotate?: number;
  /** Cor — yellow é mais punch (use 1x), accent é marca, white é discreto. */
  variant?: StickerVariant;
  /** Tamanho relativo da fonte. */
  size?: "sm" | "md" | "lg";
  /** Margin extra da borda (default 100px). */
  inset?: number;
  /** Emoji opcional na frente. */
  emoji?: string;
};

const PALETTE: Record<
  StickerVariant,
  { bg: string; fg: string; border?: string }
> = {
  yellow: { bg: "#FFE600", fg: "#0a0e1a" }, // amarelo papel adesivo
  white: { bg: "#ffffff", fg: COLORS.fgOnLight, border: "rgba(10,14,26,0.1)" },
  accent: { bg: COLORS.accent, fg: "#ffffff" },
  dark: { bg: COLORS.dark, fg: "#ffffff" },
  success: { bg: COLORS.emerald, fg: "#ffffff" },
};

const SIZES: Record<"sm" | "md" | "lg", { font: number; padding: string; radius: number }> = {
  sm: { font: 26, padding: "12px 22px", radius: 12 },
  md: { font: 34, padding: "16px 28px", radius: 16 },
  lg: { font: 46, padding: "22px 36px", radius: 22 },
};

function getPosition(
  position: NonNullable<StickerProps["position"]>,
  inset: number,
): React.CSSProperties {
  const map: Record<typeof position, React.CSSProperties> = {
    "top-left": { top: inset, left: inset },
    "top-right": { top: inset, right: inset },
    "top-center": { top: inset, left: "50%", transform: "translateX(-50%)" },
    "middle-left": { top: "50%", left: inset, transform: "translateY(-50%)" },
    "middle-right": { top: "50%", right: inset, transform: "translateY(-50%)" },
    "bottom-left": { bottom: inset, left: inset },
    "bottom-right": { bottom: inset, right: inset },
    "bottom-center": {
      bottom: inset,
      left: "50%",
      transform: "translateX(-50%)",
    },
  };
  return map[position];
}

export function Sticker({
  text,
  appearAt = 0,
  position = "top-right",
  rotate,
  variant = "yellow",
  size = "md",
  inset = 90,
  emoji,
}: StickerProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = popIn(frame, appearAt, fps, {
    damping: 10,
    stiffness: 220,
  });
  const op = fadeIn(frame, appearAt, 8);

  const palette = PALETTE[variant];
  const sizeStyles = SIZES[size];
  const tilt = rotate ?? randomTilt(text);
  const positionStyle = getPosition(position, inset);

  // Combina transform da posição (translateY/X) com scale e rotate.
  const baseTransform =
    typeof positionStyle.transform === "string" ? positionStyle.transform : "";
  const combinedTransform = `${baseTransform} scale(${scale}) rotate(${tilt}deg)`;

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyle,
        transform: combinedTransform,
        transformOrigin: "center center",
        opacity: op,
        background: palette.bg,
        color: palette.fg,
        padding: sizeStyles.padding,
        borderRadius: sizeStyles.radius,
        fontSize: sizeStyles.font,
        fontWeight: 800,
        letterSpacing: "-0.01em",
        lineHeight: 1.1,
        boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
        border: palette.border ? `1px solid ${palette.border}` : undefined,
        whiteSpace: "nowrap",
        zIndex: 10,
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      {emoji && <span>{emoji}</span>}
      <span>{text}</span>
    </div>
  );
}

/** Tilt determinístico baseado no texto pra não ter dois stickers idênticos. */
function randomTilt(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const norm = (h % 1000) / 1000; // 0..1
  return -8 + norm * 16; // -8° a +8°
}
