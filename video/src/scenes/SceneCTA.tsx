import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, popIn, slideY } from "../anim";
import { Noise } from "../components/Noise";

export function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lineOpacity = fadeIn(frame, 0, 12);
  const lineY = slideY(frame, 0, 12, 60, 0);
  const ctaScale = popIn(frame, 30, fps, { damping: 12, stiffness: 200 });
  const subOp = fadeIn(frame, 55, 12);
  const hashOp = fadeIn(frame, 80, 12);

  // Marquee horizontal de tags em loop
  const marqueeX = (frame * 8) % 1080;

  return (
    <AbsoluteFill style={{ background: COLORS.neonYellow, overflow: "hidden" }}>
      <Noise opacity={0.06} />

      <AbsoluteFill
        style={{
          padding: 60,
          paddingTop: 120,
          alignItems: "center",
          justifyContent: "flex-start",
        }}
      >
        {/* Headline gigante */}
        <div
          style={{
            opacity: lineOpacity,
            transform: `translateY(${lineY}px)`,
            fontSize: 200,
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: "-0.06em",
            color: COLORS.bg,
            textAlign: "center",
            marginBottom: 30,
            textTransform: "uppercase",
          }}
        >
          RECEBE
          <br />
          HOJE.
        </div>

        {/* CTA button gigante */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
            background: COLORS.bg,
            color: COLORS.neonYellow,
            padding: "36px 60px",
            borderRadius: 24,
            fontSize: 56,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
            marginBottom: 40,
            textAlign: "center",
          }}
        >
          antecipaqui.digital
        </div>

        {/* Sub */}
        <div
          style={{
            opacity: subOp,
            fontSize: 38,
            fontWeight: 800,
            color: COLORS.bg,
            textAlign: "center",
            letterSpacing: "-0.02em",
            marginBottom: 50,
            maxWidth: 900,
            lineHeight: 1.05,
          }}
        >
          Cadastre-se em 5 minutos.
          <br />
          Grátis. Sem garantia.
        </div>

        {/* Marquee de hashtags na base */}
        <div
          style={{
            opacity: hashOp,
            position: "absolute",
            bottom: 100,
            left: 0,
            right: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontFamily: "ui-monospace, monospace",
            fontSize: 32,
            fontWeight: 800,
            color: COLORS.bg,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              display: "inline-block",
              transform: `translateX(-${marqueeX}px)`,
            }}
          >
            {"#corretordeImóveis · #comissão · #imobiliária · #antecipação · #PIXhoje · ".repeat(
              4,
            )}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
