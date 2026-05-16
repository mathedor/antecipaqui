import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, TOUR_CONTENT } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

type Role = keyof typeof TOUR_CONTENT;

/**
 * Cena "Recursos" — grid 2x4 de ferramentas do role.
 * 10s de animação progressiva: cada card aparece em cascata.
 */
export function SceneRecursos({ role }: { role: Role }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const content = TOUR_CONTENT[role];

  const eyebrowOp = fadeIn(frame, 0, 12);
  const titleOp = fadeIn(frame, 8, 16);
  const titleY = slideY(frame, 8, 16, 40, 0);

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={20} y={15} size={50} opacity={0.35} />
      <Blob color={COLORS.accentDark} x={80} y={85} size={55} opacity={0.4} />
      <Noise opacity={0.04} />

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
            color: COLORS.accentLight,
            letterSpacing: "0.25em",
            fontFamily: "monospace",
            marginBottom: 18,
          }}
        >
          {content.eyebrow}
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
            color: COLORS.white,
            marginBottom: 60,
          }}
        >
          Tudo isso<br />no painel.
        </div>

        {/* Grid de cards 2 colunas x 4 linhas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 22,
          }}
        >
          {content.recursos.map((r, i) => {
            const cardStart = 35 + i * 12;
            const cardScale = popIn(frame, cardStart, fps, {
              damping: 12,
              stiffness: 160,
            });
            const cardOp = fadeIn(frame, cardStart, 14);
            return (
              <div
                key={i}
                style={{
                  opacity: cardOp,
                  transform: `scale(${cardScale})`,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 22,
                  padding: 26,
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 18,
                    background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 42,
                    boxShadow: "0 14px 30px rgba(28,109,208,0.4)",
                    flexShrink: 0,
                  }}
                >
                  {r.emoji}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: COLORS.white,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      marginBottom: 4,
                    }}
                  >
                    {r.nome}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 500,
                      color: COLORS.fgMutedOnDark,
                      lineHeight: 1.2,
                    }}
                  >
                    {r.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <Sticker
        text={`${content.recursos.length} ferramentas`}
        emoji="✨"
        appearAt={140}
        position="bottom-right"
        variant="yellow"
        size="md"
        rotate={-4}
        inset={50}
      />
    </AbsoluteFill>
  );
}
