import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, popIn, slideY } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";

const PASSOS = [
  { n: "01", title: "CADASTRA", desc: "5 min · pelo celular" },
  { n: "02", title: "APROVAMOS", desc: "em 24 horas" },
  { n: "03", title: "PIX NA CONTA", desc: "1 dia útil" },
];

export function SceneSolucao() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chegaScale = popIn(frame, 0, fps, { damping: 10, stiffness: 280 });
  const subOp = fadeIn(frame, 22, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.neonYellow, overflow: "hidden" }}>
      <Blob color={COLORS.neonMagenta} x={80} y={20} size={50} opacity={0.5} />
      <Blob color={COLORS.bg} x={20} y={85} size={45} opacity={0.4} />
      <Noise opacity={0.08} />

      <AbsoluteFill
        style={{
          padding: 60,
          paddingTop: 100,
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        {/* CHEGA — gigante, choque visual */}
        <div
          style={{
            transform: `scale(${chegaScale})`,
            fontSize: 280,
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: "-0.06em",
            color: COLORS.bg,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          CHEGA.
        </div>

        {/* Sub */}
        <div
          style={{
            opacity: subOp,
            fontSize: 50,
            fontWeight: 800,
            color: COLORS.bg,
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            marginBottom: 60,
            maxWidth: 850,
          }}
        >
          Aqui, você recebe{" "}
          <span
            style={{
              background: COLORS.bg,
              color: COLORS.neonYellow,
              padding: "0 16px",
              borderRadius: 8,
            }}
          >
            HOJE
          </span>
          .
        </div>

        {/* 3 passos com flip-in */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            width: "100%",
            maxWidth: 850,
          }}
        >
          {PASSOS.map((p, i) => {
            const start = 35 + i * 18;
            const y = slideY(frame, start, 16, 60, 0);
            const op = fadeIn(frame, start, 12);
            return (
              <div
                key={p.n}
                style={{
                  opacity: op,
                  transform: `translateY(${y}px)`,
                  background: COLORS.bg,
                  borderRadius: 28,
                  padding: "36px 40px",
                  display: "flex",
                  alignItems: "center",
                  gap: 32,
                  boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
                }}
              >
                <div
                  style={{
                    fontSize: 120,
                    fontWeight: 900,
                    color: COLORS.neonYellow,
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                    minWidth: 160,
                  }}
                >
                  {p.n}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 900,
                      color: COLORS.fg,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {p.title}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 600,
                      color: COLORS.fgMuted,
                      marginTop: 8,
                      fontFamily: "ui-monospace, monospace",
                      letterSpacing: "0.05em",
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
    </AbsoluteFill>
  );
}
