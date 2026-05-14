import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideX, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";

const ITENS = [
  { num: "120", unit: "DIAS", label: "ESPERANDO" },
  { num: "❌", unit: "", label: "BANCO RECUSA" },
  { num: "🚫", unit: "", label: "PEDE AVALISTA" },
];

export function SceneProblema() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = fadeIn(frame, 0, 10);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Blob color={COLORS.danger} x={50} y={50} size={80} opacity={0.35} />
      <Noise opacity={0.05} />

      <AbsoluteFill
        style={{
          padding: "120px 60px",
          justifyContent: "center",
          alignItems: "stretch",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOp,
            color: COLORS.fg,
            textAlign: "center",
            marginBottom: 60,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 22,
              letterSpacing: "0.3em",
              color: COLORS.danger,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            ⚠ O QUE TRAVA
          </div>
          <div
            style={{
              fontSize: 90,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
            }}
          >
            HOJE É <span style={{ color: COLORS.danger }}>ASSIM:</span>
          </div>
        </div>

        {/* Cards empilhados — entram de lados alternados */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {ITENS.map((it, i) => {
            const start = 20 + i * 22;
            const fromLeft = i % 2 === 0;
            const x = slideX(
              frame,
              start,
              18,
              fromLeft ? -150 : 150,
              0,
            );
            const op = fadeIn(frame, start, 14);

            return (
              <div
                key={it.label}
                style={{
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  background: COLORS.bgAlt,
                  border: `3px solid ${COLORS.danger}`,
                  borderRadius: 24,
                  padding: "32px 40px",
                  display: "flex",
                  alignItems: "center",
                  gap: 32,
                  boxShadow: `0 0 60px ${COLORS.danger}33`,
                }}
              >
                <div
                  style={{
                    fontSize: 120,
                    fontWeight: 900,
                    lineHeight: 1,
                    color: COLORS.danger,
                    letterSpacing: "-0.05em",
                    minWidth: 220,
                  }}
                >
                  {it.num}
                </div>
                <div style={{ flex: 1 }}>
                  {it.unit && (
                    <div
                      style={{
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 20,
                        color: COLORS.fgDim,
                        letterSpacing: "0.2em",
                        marginBottom: 4,
                      }}
                    >
                      {it.unit}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 56,
                      fontWeight: 900,
                      color: COLORS.fg,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {it.label}
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
