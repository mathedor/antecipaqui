import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";

export function SceneDesktop() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = fadeIn(frame, 0, 15);
  const titleY = slideY(frame, 0, 15, 30, 0);
  const browserScale = popIn(frame, 12, fps, { damping: 14, stiffness: 100 });

  // KPIs anim
  const kpis = [
    { l: "Hoje", v: "R$ 80k", c: COLORS.accent, delay: 35 },
    { l: "Em análise", v: "2", c: "#a16207", delay: 45 },
    { l: "Aprovadas", v: "8", c: COLORS.emerald, delay: 55 },
    { l: "A receber", v: "R$ 32k", c: COLORS.fg, delay: 65 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: COLORS.fg,
        color: "white",
        padding: 70,
        paddingTop: 120,
        textAlign: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 18,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: COLORS.accentLight,
          marginBottom: 16,
          opacity: titleOpacity,
        }}
      >
        do escritório também
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          marginBottom: 50,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}
      >
        Painel completo
        <br />
        <span style={{ color: COLORS.accentLight }}>no desktop</span>.
      </div>

      {/* Browser frame */}
      <div
        style={{
          transform: `scale(${browserScale})`,
          width: 900,
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 60px 120px rgba(0,0,0,0.6)",
          background: "#1e293b",
          border: "1px solid #334155",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            height: 50,
            background: "#1e293b",
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 8,
            borderBottom: "1px solid #0f172a",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#ff5f57" }} />
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#febc2e" }} />
            <div style={{ width: 14, height: 14, borderRadius: 7, background: "#28c840" }} />
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                background: "#334155",
                borderRadius: 8,
                padding: "8px 20px",
                fontSize: 16,
                color: "#cbd5e1",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              🔒 antecipaqui.digital/painel
            </div>
          </div>
        </div>

        {/* Window content (light theme) */}
        <div
          style={{
            background: COLORS.bg,
            padding: 36,
            color: COLORS.fg,
            minHeight: 480,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontFamily: "ui-monospace, monospace",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: COLORS.fgDim,
              marginBottom: 6,
            }}
          >
            painel · corretor
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginBottom: 28,
              letterSpacing: "-0.02em",
            }}
          >
            Olá, Carlos!
          </div>

          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 28,
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
                    background: "white",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 14,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      color: COLORS.fgDim,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      fontFamily: "ui-monospace, monospace",
                      marginBottom: 6,
                    }}
                  >
                    {k.l}
                  </div>
                  <div
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
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

          {/* Fake chart */}
          <div
            style={{
              background: "white",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 18,
              padding: 22,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Operações nos últimos 90 dias{" "}
              <span style={{ color: COLORS.emerald, fontWeight: 600, fontSize: 14 }}>
                ↑ +23%
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
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
                        borderRadius: 4,
                        background: `linear-gradient(180deg, ${COLORS.accentLight}, ${COLORS.accent})`,
                        opacity: barIn,
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
  );
}
