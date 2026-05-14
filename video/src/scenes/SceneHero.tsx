import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";

export function SceneHero() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Sequência: badge → "VENDEU?" → "A COMISSÃO É SUA" → riscado → flash de "MAS O DINHEIRO... DEMORA"
  const badgeOp = fadeIn(frame, 0, 8);
  const word1 = popIn(frame, 8, fps, { damping: 14, stiffness: 200 });
  const word2 = popIn(frame, 28, fps, { damping: 14, stiffness: 200 });
  const strikeAt = 60;
  const strikeProgress = fadeIn(frame, strikeAt, 12);
  const word3In = fadeIn(frame, strikeAt + 12, 10);
  const word3Y = slideY(frame, strikeAt + 12, 10, 80, 0);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      {/* Background mesh agressivo */}
      <Blob color={COLORS.neonMagenta} x={20} y={20} size={70} opacity={0.6} />
      <Blob color={COLORS.neonYellow} x={85} y={80} size={50} opacity={0.4} />
      <Noise opacity={0.06} />

      <AbsoluteFill
        style={{
          padding: 80,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "left",
        }}
      >
        {/* Badge superior */}
        <div
          style={{
            opacity: badgeOp,
            position: "absolute",
            top: 120,
            left: 80,
            background: COLORS.neonYellow,
            color: COLORS.bg,
            padding: "12px 24px",
            borderRadius: 999,
            fontFamily: "ui-monospace, monospace",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            transform: "rotate(-3deg)",
          }}
        >
          ⚡ ATENÇÃO, CORRETOR
        </div>

        {/* Bloco principal de texto */}
        <div style={{ width: "100%", color: COLORS.fg }}>
          {/* Linha 1: VENDEU? */}
          <div
            style={{
              transform: `scale(${word1})`,
              fontSize: 240,
              fontWeight: 900,
              lineHeight: 0.85,
              letterSpacing: "-0.06em",
              marginBottom: 30,
            }}
          >
            VENDEU?
          </div>

          {/* Linha 2: A COMISSÃO É SUA (com riscado) */}
          <div
            style={{
              position: "relative",
              transform: `scale(${word2})`,
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: COLORS.fgMuted,
              marginBottom: 50,
            }}
          >
            A COMISSÃO É SUA...
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                height: 8,
                background: COLORS.neonMagenta,
                width: `${strikeProgress * 100}%`,
                transform: "translateY(-50%)",
                boxShadow: `0 0 20px ${COLORS.neonMagenta}`,
              }}
            />
          </div>

          {/* Linha 3: MAS O DINHEIRO... DEMORA */}
          <div
            style={{
              opacity: word3In,
              transform: `translateY(${word3Y}px)`,
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            MAS O DINHEIRO
            <br />
            <span
              style={{
                color: COLORS.neonMagenta,
                textShadow: `0 0 40px ${COLORS.neonMagenta}`,
              }}
            >
              DEMORA.
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
