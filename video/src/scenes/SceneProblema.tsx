import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";

const ITENS = [
  { icon: "⏳", label: "Espera 120 dias" },
  { icon: "🏦", label: "Banco recusa" },
  { icon: "📑", label: "Pede avalista" },
];

export function SceneProblema() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = fadeIn(frame, 0, 15);
  const titleY = slideY(frame, 0, 15, 40, 0);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        padding: 80,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 18,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: COLORS.fgDim,
          marginBottom: 24,
          opacity: titleOpacity,
        }}
      >
        o problema
      </div>

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 88,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: COLORS.fg,
          marginBottom: 80,
          maxWidth: 900,
        }}
      >
        Você vendeu.
        <br />
        Mas o dinheiro <span style={{ color: COLORS.danger }}>demora</span>.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          width: "100%",
          maxWidth: 700,
        }}
      >
        {ITENS.map((it, i) => {
          const start = 25 + i * 20;
          const scale = popIn(frame, start, fps, { damping: 14 });
          const opacity = fadeIn(frame, start, 12);
          return (
            <div
              key={it.label}
              style={{
                transform: `scale(${scale})`,
                opacity,
                background: "white",
                border: `2px solid ${COLORS.border}`,
                borderRadius: 28,
                padding: "28px 36px",
                display: "flex",
                alignItems: "center",
                gap: 28,
                boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
              }}
            >
              <div style={{ fontSize: 64 }}>{it.icon}</div>
              <div
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: COLORS.fg,
                  letterSpacing: "-0.02em",
                }}
              >
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
