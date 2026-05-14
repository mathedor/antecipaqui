import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";

export function SceneDesktop() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 12);
  const browserScale = popIn(frame, 10, fps, { damping: 14, stiffness: 90 });

  const kpis = [
    { l: "HOJE", v: "R$ 80k", c: COLORS.neonYellow, delay: 35 },
    { l: "ANÁLISE", v: "2", c: COLORS.fg, delay: 45 },
    { l: "APROV", v: "8", c: COLORS.emerald, delay: 55 },
    { l: "RECEBER", v: "R$ 32k", c: COLORS.fg, delay: 65 },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={70} opacity={0.4} />
      <Blob color={COLORS.neonMagenta} x={85} y={15} size={35} opacity={0.3} />
      <Noise opacity={0.05} />

      <AbsoluteFill
        style={{
          padding: 60,
          paddingTop: 110,
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: titleOp,
            color: COLORS.fg,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 22,
              letterSpacing: "0.3em",
              color: COLORS.accent,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            🖥 TUDO NO PAINEL
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
            }}
          >
            VOCÊ NO
            <br />
            <span style={{ color: COLORS.accent }}>COMANDO.</span>
          </div>
        </div>

        {/* Browser frame */}
        <div
          style={{
            transform: `scale(${browserScale})`,
            width: 880,
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 60px 120px rgba(0,0,0,0.6)",
            background: COLORS.bgAlt,
            border: `2px solid ${COLORS.border}`,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: 44,
              background: COLORS.bgAlt,
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: 8,
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ display: "flex", gap: 7 }}>
              {[COLORS.danger, COLORS.neonYellow, COLORS.emerald].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: c,
                  }}
                />
              ))}
            </div>
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  background: COLORS.bg,
                  borderRadius: 8,
                  padding: "7px 16px",
                  fontSize: 14,
                  color: COLORS.fgMuted,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                🔒 antecipaqui.digital/painel
              </div>
            </div>
          </div>

          {/* Content (escuro também — bold theme) */}
          <div
            style={{
              background: COLORS.bg,
              padding: 32,
              minHeight: 500,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.25em",
                color: COLORS.fgDim,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              corretor
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 900,
                color: COLORS.fg,
                letterSpacing: "-0.02em",
                marginBottom: 26,
              }}
            >
              CARLOS, BORA?
            </div>

            {/* KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 14,
                marginBottom: 26,
              }}
            >
              {kpis.map((k) => {
                const scale = popIn(frame, k.delay, fps, { damping: 14 });
                const opacity = fadeIn(frame, k.delay, 12);
                return (
                  <div
                    key={k.l}
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                      background: COLORS.bgAlt,
                      border: `2px solid ${COLORS.border}`,
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.fgDim,
                        textTransform: "uppercase",
                        letterSpacing: "0.2em",
                        fontFamily: "ui-monospace, monospace",
                        fontWeight: 700,
                        marginBottom: 6,
                      }}
                    >
                      {k.l}
                    </div>
                    <div
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        color: k.c,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {k.v}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart */}
            <div
              style={{
                background: COLORS.bgAlt,
                border: `2px solid ${COLORS.border}`,
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: COLORS.fg,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                90 DIAS{" "}
                <span style={{ color: COLORS.emerald, fontSize: 12 }}>
                  ↑ +23%
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 3,
                  height: 80,
                }}
              >
                {[30, 45, 38, 52, 48, 55, 62, 58, 70, 65, 78, 72, 85, 80, 88, 92].map(
                  (h, i) => {
                    const barIn = fadeIn(frame, 75 + i * 1.5, 10);
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: `${h * barIn}%`,
                          borderRadius: 3,
                          background: `linear-gradient(180deg, ${COLORS.neonYellow}, ${COLORS.emerald})`,
                          opacity: barIn,
                          boxShadow: `0 0 12px ${COLORS.emerald}88`,
                        }}
                      />
                    );
                  },
                )}
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
