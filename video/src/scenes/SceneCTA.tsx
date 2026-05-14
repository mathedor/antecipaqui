import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, popIn, slideY } from "../anim";

export function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const titleOpacity = fadeIn(frame, 12, 18);
  const titleY = slideY(frame, 12, 18, 30, 0);
  const urlOpacity = fadeIn(frame, 40, 15);
  const ctaScale = popIn(frame, 60, fps, { damping: 12 });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.accentDark} 0%, ${COLORS.accent} 50%, ${COLORS.emerald} 130%)`,
        color: "white",
        padding: 80,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 28,
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 900,
            color: COLORS.accent,
            boxShadow: "0 30px 80px rgba(0,0,0,0.3)",
          }}
        >
          A
        </div>
      </div>

      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 92,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.04em",
          marginBottom: 30,
          maxWidth: 900,
        }}
      >
        Sua próxima venda
        <br />
        vira{" "}
        <span
          style={{
            color: COLORS.yellow,
            textShadow: "0 4px 30px rgba(250,204,21,0.5)",
          }}
        >
          dinheiro hoje
        </span>
        .
      </div>

      <div
        style={{
          opacity: urlOpacity,
          fontSize: 36,
          fontWeight: 500,
          color: "rgba(255,255,255,0.9)",
          marginBottom: 50,
        }}
      >
        Cadastre-se grátis em 5 minutos.
      </div>

      <div
        style={{
          transform: `scale(${ctaScale})`,
          background: COLORS.yellow,
          color: COLORS.fg,
          padding: "32px 60px",
          borderRadius: 24,
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
        }}
      >
        antecipaqui.digital
      </div>

      <div
        style={{
          opacity: urlOpacity,
          marginTop: 40,
          fontSize: 24,
          fontFamily: "ui-monospace, monospace",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        comissão antecipada · imobiliária · corretor
      </div>
    </AbsoluteFill>
  );
}
