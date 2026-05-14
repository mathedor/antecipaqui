import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

export function SceneDesktop() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 12);
  const browserScale = popIn(frame, 10, fps, { damping: 14, stiffness: 90 });

  const kpis = [
    { l: "Hoje", v: "R$ 80k", c: COLORS.accent, delay: 35 },
    { l: "Análise", v: "2", c: COLORS.fgOnLight, delay: 45 },
    { l: "Aprov", v: "8", c: COLORS.emerald, delay: 55 },
    { l: "Receber", v: "R$ 32k", c: COLORS.fgOnLight, delay: 65 },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={70} opacity={0.4} />
      <Blob color={COLORS.accentDark} x={85} y={15} size={35} opacity={0.4} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: titleOp,
            color: COLORS.white,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.accentLight,
              fontWeight: 700,
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            no painel completo
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Tudo na palma
            <br />
            <span style={{ color: COLORS.accentLight }}>da sua mão.</span>
          </div>
        </div>

        {/* Browser frame */}
        <div
          style={{
            transform: `scale(${browserScale})`,
            width: 880,
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 60px 120px rgba(0,0,0,0.5)",
            background: COLORS.white,
            border: `1px solid ${COLORS.borderOnDark}`,
          }}
        >
          {/* Title bar */}
          <div
            style={{
              height: 42,
              background: COLORS.whiteBg,
              display: "flex",
              alignItems: "center",
              padding: "0 16px",
              gap: 8,
              borderBottom: `1px solid ${COLORS.borderOnLight}`,
            }}
          >
            <div style={{ display: "flex", gap: 7 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
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
                  background: COLORS.white,
                  border: `1px solid ${COLORS.borderOnLight}`,
                  borderRadius: 8,
                  padding: "7px 18px",
                  fontSize: 14,
                  color: COLORS.fgMutedOnLight,
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                🔒 antecipaqui.digital/painel
              </div>
            </div>
          </div>

          {/* Content (light theme — visual marca) */}
          <div
            style={{
              background: COLORS.whiteBg,
              padding: 32,
              minHeight: 480,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.25em",
                color: COLORS.fgDimOnLight,
                marginBottom: 8,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              painel · corretor
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: COLORS.fgOnLight,
                letterSpacing: "-0.02em",
                marginBottom: 26,
              }}
            >
              Olá, Carlos!
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
                      background: COLORS.white,
                      border: `1px solid ${COLORS.borderOnLight}`,
                      borderRadius: 14,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.fgDimOnLight,
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
                        fontSize: 34,
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

            {/* Chart */}
            <div
              style={{
                background: COLORS.white,
                border: `1px solid ${COLORS.borderOnLight}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: COLORS.fgOnLight,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                90 dias{" "}
                <span style={{ color: COLORS.emerald, fontSize: 12 }}>
                  ↑ +23%
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 3,
                  height: 70,
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

      <Sticker
        text="Processo natural"
        emoji="✨"
        appearAt={28}
        position="top-right"
        variant="yellow"
        size="sm"
        rotate={5}
        inset={90}
      />
      <Sticker
        text="Acompanha cada R$"
        emoji="📊"
        appearAt={75}
        position="bottom-left"
        variant="white"
        size="sm"
        rotate={-4}
        inset={120}
      />
    </AbsoluteFill>
  );
}
