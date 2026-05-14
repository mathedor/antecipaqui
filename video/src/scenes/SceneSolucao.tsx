import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, popIn } from "../anim";

const PASSOS = [
  { n: "1", title: "Cadastra", desc: "5 minutos no celular" },
  { n: "2", title: "Aprovamos", desc: "em 24 horas" },
  { n: "3", title: "Cai na conta", desc: "PIX em 1 dia útil" },
];

export function SceneSolucao() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = fadeIn(frame, 0, 15);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.accent} 0%, ${COLORS.accentDark} 100%)`,
        color: "white",
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
          opacity: titleOpacity * 0.8,
          marginBottom: 24,
        }}
      >
        a solução
      </div>

      <div
        style={{
          opacity: titleOpacity,
          fontSize: 96,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          marginBottom: 80,
          maxWidth: 900,
        }}
      >
        A gente paga.
        <br />
        Em <span style={{ color: COLORS.yellow }}>3 passos</span>.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
          width: "100%",
          maxWidth: 700,
        }}
      >
        {PASSOS.map((p, i) => {
          const start = 25 + i * 25;
          const scale = popIn(frame, start, fps, { damping: 12 });
          const opacity = fadeIn(frame, start, 12);
          return (
            <div
              key={p.n}
              style={{
                transform: `scale(${scale})`,
                opacity,
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.25)",
                borderRadius: 28,
                padding: "32px 36px",
                display: "flex",
                alignItems: "center",
                gap: 28,
              }}
            >
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  background: COLORS.yellow,
                  color: COLORS.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 48,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {p.n}
              </div>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {p.title}
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 500,
                    opacity: 0.85,
                    marginTop: 6,
                  }}
                >
                  {p.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
