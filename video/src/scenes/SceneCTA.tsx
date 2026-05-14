import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, popIn, slideY } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";
import { Sticker } from "../components/Sticker";

export function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const titleOpacity = fadeIn(frame, 12, 16);
  const titleY = slideY(frame, 12, 16, 40, 0);
  const subOp = fadeIn(frame, 38, 14);
  const ctaScale = popIn(frame, 55, fps, { damping: 12, stiffness: 200 });

  return (
    <AbsoluteFill style={{ background: COLORS.dark, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={90} opacity={0.5} />
      <Blob color={COLORS.accentDark} x={20} y={20} size={50} opacity={0.4} />
      <Noise opacity={0.04} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            marginBottom: 50,
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 24,
              background: COLORS.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 50,
              fontWeight: 900,
              color: COLORS.accent,
              boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
            }}
          >
            A
          </div>
        </div>

        {/* Headline final */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: COLORS.white,
            marginBottom: 28,
            maxWidth: 900,
          }}
        >
          Próxima venda?
          <br />
          <span style={{ color: COLORS.accentLight }}>Vira PIX hoje.</span>
        </div>

        {/* Sub */}
        <div
          style={{
            opacity: subOp,
            fontSize: 32,
            fontWeight: 500,
            color: COLORS.fgMutedOnDark,
            marginBottom: 50,
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          Cadastro em 5 minutos. Grátis.
          <br />
          Sem garantia, sem letra miúda.
        </div>

        {/* CTA */}
        <div
          style={{
            transform: `scale(${ctaScale})`,
            background: COLORS.white,
            color: COLORS.accent,
            padding: "32px 60px",
            borderRadius: 22,
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            boxShadow: "0 40px 80px rgba(28,109,208,0.4)",
          }}
        >
          antecipaqui.digital
        </div>
      </AbsoluteFill>

      <Sticker
        text="Cadastro grátis"
        emoji="🎁"
        appearAt={75}
        position="top-right"
        variant="yellow"
        size="md"
        rotate={6}
        inset={90}
      />
    </AbsoluteFill>
  );
}
