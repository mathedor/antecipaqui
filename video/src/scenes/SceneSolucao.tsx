import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, popIn, slideY } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

const PASSOS = [
  { n: "01", title: "Cadastra", desc: "5 minutos pelo celular" },
  { n: "02", title: "Aprovamos", desc: "em 24 horas" },
  { n: "03", title: "PIX na conta", desc: "1 dia útil" },
];

export function SceneSolucao() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = fadeIn(frame, 0, 14);
  const hojeScale = popIn(frame, 14, fps, { damping: 10, stiffness: 220 });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.accentDark} 0%, ${COLORS.accent} 100%)`,
        overflow: "hidden",
      }}
    >
      <Blob color={COLORS.white} x={80} y={20} size={45} opacity={0.15} />
      <Blob color={COLORS.white} x={15} y={85} size={40} opacity={0.1} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 80,
          paddingTop: 110,
          alignItems: "flex-start",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOp,
            marginBottom: 60,
            color: COLORS.white,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              fontWeight: 700,
              marginBottom: 20,
              textTransform: "uppercase",
              opacity: 0.8,
            }}
          >
            a antecipaqui paga
          </div>
          <div
            style={{
              fontSize: 100,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            Sua comissão
            <br />à vista,{" "}
            <span
              style={{
                transform: `scale(${hojeScale})`,
                display: "inline-block",
                color: COLORS.fgOnDark,
                background: COLORS.accent,
                padding: "4px 24px",
                borderRadius: 16,
                border: `4px solid ${COLORS.white}`,
              }}
            >
              hoje
            </span>
            .
          </div>
        </div>

        {/* Passos */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            width: "100%",
          }}
        >
          {PASSOS.map((p, i) => {
            const start = 30 + i * 18;
            const y = slideY(frame, start, 16, 60, 0);
            const op = fadeIn(frame, start, 14);
            return (
              <div
                key={p.n}
                style={{
                  opacity: op,
                  transform: `translateY(${y}px)`,
                  background: "rgba(255,255,255,0.08)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 24,
                  padding: "28px 36px",
                  display: "flex",
                  alignItems: "center",
                  gap: 30,
                }}
              >
                <div
                  style={{
                    fontSize: 88,
                    fontWeight: 900,
                    color: COLORS.white,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    minWidth: 130,
                    opacity: 0.85,
                  }}
                >
                  {p.n}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 52,
                      fontWeight: 800,
                      color: COLORS.white,
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
                      color: "rgba(255,255,255,0.8)",
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

      <Sticker
        text="Sem garantia"
        emoji="✓"
        appearAt={30}
        position="top-right"
        variant="yellow"
        size="sm"
        rotate={6}
        inset={100}
      />
      <Sticker
        text="Sem avalista"
        emoji="✓"
        appearAt={50}
        position="bottom-right"
        variant="white"
        size="sm"
        rotate={-4}
        inset={130}
      />
    </AbsoluteFill>
  );
}
