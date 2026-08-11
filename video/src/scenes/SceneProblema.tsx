import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideX, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Sticker } from "../components/Sticker";

const ITENS = [
  { num: "150", label: "dias parado" },
  { num: "❌", label: "banco recusa" },
  { num: "🚫", label: "pede avalista" },
];

export function SceneProblema() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = fadeIn(frame, 0, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Noise opacity={0.03} />

      <AbsoluteFill
        style={{
          padding: "100px 60px",
          justifyContent: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: headerOp,
            color: COLORS.fgOnLight,
            marginBottom: 70,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.danger,
              fontWeight: 700,
              marginBottom: 20,
              textTransform: "uppercase",
            }}
          >
            o que trava você
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: "-0.04em",
              maxWidth: 900,
            }}
          >
            Quanta venda já passou
            <br />
            <span style={{ color: COLORS.danger }}>esperando o dinheiro?</span>
          </div>
        </div>

        {/* Cards — entram alternados */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {ITENS.map((it, i) => {
            const start = 22 + i * 22;
            const fromLeft = i % 2 === 0;
            const x = slideX(frame, start, 18, fromLeft ? -120 : 120, 0);
            const op = fadeIn(frame, start, 14);

            return (
              <div
                key={it.label}
                style={{
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.borderOnLight}`,
                  borderLeft: `6px solid ${COLORS.danger}`,
                  borderRadius: 18,
                  padding: "30px 36px",
                  display: "flex",
                  alignItems: "center",
                  gap: 32,
                  boxShadow: "0 12px 40px rgba(10,14,26,0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: 100,
                    fontWeight: 900,
                    color: COLORS.danger,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    minWidth: 200,
                  }}
                >
                  {it.num}
                </div>
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    color: COLORS.fgOnLight,
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

      <Sticker
        text="Cansou?"
        emoji="😩"
        appearAt={95}
        position="bottom-right"
        variant="dark"
        size="md"
        inset={100}
      />
    </AbsoluteFill>
  );
}
