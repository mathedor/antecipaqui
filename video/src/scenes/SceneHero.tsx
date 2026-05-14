import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";

export function SceneHero() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = popIn(frame, 0, fps, { damping: 14 });
  const titleOpacity = fadeIn(frame, 15, 25);
  const titleY = slideY(frame, 15, 25, 40, 0);
  const subtitleOpacity = fadeIn(frame, 50, 20);
  const wordHoje = popIn(frame, 65, fps);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentDark} 100%)`,
        color: "white",
        padding: 80,
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Background dots */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.15,
          backgroundImage:
            "radial-gradient(circle at 20% 30%, white 2px, transparent 2px), radial-gradient(circle at 80% 70%, white 2px, transparent 2px)",
          backgroundSize: "120px 120px",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Logo + brand */}
        <div
          style={{
            transform: `scale(${logoScale})`,
            marginBottom: 60,
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 22,
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 900,
              color: COLORS.accent,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            A
          </div>
          <span
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            Antecipaqui
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 100,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            maxWidth: 900,
            marginBottom: 30,
          }}
        >
          Dinheiro na mão{" "}
          <span
            style={{
              transform: `scale(${wordHoje})`,
              display: "inline-block",
              color: COLORS.yellow,
            }}
          >
            hoje
          </span>
          .
        </div>

        {/* Subtitle */}
        <div
          style={{
            opacity: subtitleOpacity,
            fontSize: 42,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            maxWidth: 800,
            lineHeight: 1.35,
          }}
        >
          Sua comissão parcelada
          <br />
          vira PIX em 1 dia útil.
        </div>
      </div>
    </AbsoluteFill>
  );
}
