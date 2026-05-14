import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

export function SceneHero() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const titleOpacity = fadeIn(frame, 12, 18);
  const titleY = slideY(frame, 12, 18, 40, 0);
  const word2Op = fadeIn(frame, 40, 14);
  const word2Y = slideY(frame, 40, 14, 40, 0);
  const word3Op = fadeIn(frame, 75, 18);
  const word3Scale = popIn(frame, 75, fps, { damping: 12, stiffness: 180 });

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      {/* Mesh sutil em tons azuis — sem carnaval */}
      <Blob color={COLORS.accent} x={70} y={20} size={70} opacity={0.4} />
      <Blob color={COLORS.accentDark} x={20} y={85} size={50} opacity={0.5} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* Logo + brand */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 80,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: COLORS.accent,
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: COLORS.white,
              letterSpacing: "-0.02em",
            }}
          >
            Antecipaqui
          </span>
        </div>

        {/* Headline — 3 linhas montando progressivamente */}
        <div style={{ color: COLORS.white, width: "100%" }}>
          <div
            style={{
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: COLORS.fgMutedOnDark,
              marginBottom: 16,
            }}
          >
            Você vende.
          </div>

          <div
            style={{
              opacity: word2Op,
              transform: `translateY(${word2Y}px)`,
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: COLORS.fgMutedOnDark,
              marginBottom: 30,
            }}
          >
            Tá no flow.
          </div>

          <div
            style={{
              opacity: word3Op,
              transform: `scale(${word3Scale})`,
              transformOrigin: "left center",
              fontSize: 140,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              color: COLORS.white,
            }}
          >
            Mas o{" "}
            <span
              style={{
                color: COLORS.accentLight,
                textShadow: `0 0 50px ${COLORS.accent}`,
              }}
            >
              dinheiro?
            </span>
          </div>
        </div>
      </AbsoluteFill>

      {/* Stickers — chamadas grudando no canto */}
      <Sticker
        text="120 dias?"
        emoji="⏳"
        appearAt={50}
        position="top-right"
        variant="yellow"
        size="md"
        inset={90}
      />
      <Sticker
        text="Tá parado"
        appearAt={85}
        position="bottom-right"
        variant="white"
        size="sm"
        rotate={-5}
        inset={110}
      />
    </AbsoluteFill>
  );
}
