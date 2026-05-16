import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, TOUR_CONTENT } from "../constants";
import { fadeIn, slideY, slideX, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

type Role = keyof typeof TOUR_CONTENT;

/**
 * Cena "Benefícios" — 4 ganhos em sequência, fundo claro pra contraste.
 * 9s. Cada item entra com slideX dramático.
 */
export function SceneBeneficios({ role }: { role: Role }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const content = TOUR_CONTENT[role];

  const eyebrowOp = fadeIn(frame, 0, 12);
  const titleOp = fadeIn(frame, 8, 16);
  const titleY = slideY(frame, 8, 16, 40, 0);

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={85} y={10} size={45} opacity={0.18} />
      <Blob color={COLORS.emerald} x={10} y={90} size={50} opacity={0.15} />
      <Noise opacity={0.03} />

      <AbsoluteFill
        style={{
          padding: 70,
          paddingTop: 110,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            opacity: eyebrowOp,
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.accent,
            letterSpacing: "0.25em",
            fontFamily: "monospace",
            marginBottom: 18,
          }}
        >
          POR QUÊ
        </div>

        {/* Título */}
        <div
          style={{
            opacity: titleOp,
            transform: `translateY(${titleY}px)`,
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: COLORS.fgOnLight,
            marginBottom: 60,
          }}
        >
          O que <span style={{ color: COLORS.accent }}>você ganha</span>.
        </div>

        {/* Lista vertical com cards grandes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {content.beneficios.map((b, i) => {
            const cardStart = 35 + i * 32;
            const cardX = slideX(frame, cardStart, 22, -80, 0);
            const cardOp = fadeIn(frame, cardStart, 14);
            const checkScale = popIn(frame, cardStart + 14, fps, {
              damping: 10,
              stiffness: 220,
            });
            return (
              <div
                key={i}
                style={{
                  opacity: cardOp,
                  transform: `translateX(${cardX}px)`,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.borderOnLight}`,
                  borderLeft: `8px solid ${COLORS.emerald}`,
                  borderRadius: 22,
                  padding: 28,
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  boxShadow: "0 14px 40px rgba(10,14,26,0.06)",
                }}
              >
                <div
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${COLORS.emerald}, #059669)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 48,
                    boxShadow: "0 14px 30px rgba(16,185,129,0.35)",
                    flexShrink: 0,
                    transform: `scale(${checkScale})`,
                  }}
                >
                  {b.emoji}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 38,
                      fontWeight: 800,
                      color: COLORS.fgOnLight,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      marginBottom: 6,
                    }}
                  >
                    {b.titulo}
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 500,
                      color: COLORS.fgMutedOnLight,
                      lineHeight: 1.25,
                    }}
                  >
                    {b.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text="zero mensalidade"
        emoji="🎁"
        appearAt={180}
        position="bottom-center"
        variant="dark"
        size="md"
        rotate={-2}
        inset={50}
      />
    </AbsoluteFill>
  );
}
