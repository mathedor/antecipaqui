import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { Sticker } from "../components/Sticker";
import { fadeIn, slideY, popIn } from "../anim";
import { PhoneFrame } from "../components/PhoneFrame";
import { PhoneScreenNovaOp } from "../components/PhoneScreenNovaOp";
import { PhoneScreenOcr } from "../components/PhoneScreenOcr";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";

export function SceneMobile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 14);
  const phoneScale = popIn(frame, 10, fps, { damping: 14, stiffness: 110 });

  const showOcrAt = 110;
  const crossfade = fadeIn(frame, showOcrAt, 18);
  const captionOp = fadeIn(frame, showOcrAt + 12, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={70} opacity={0.18} />
      <Noise opacity={0.03} />

      <AbsoluteFill
        style={{
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: titleOp,
            color: COLORS.fgOnLight,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.accent,
              fontWeight: 700,
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            preenchimento automático
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Importa o contrato.
            <br />
            <span style={{ color: COLORS.accent }}>IA preenche tudo.</span>
          </div>
        </div>

        {/* Phone */}
        <div
          style={{
            position: "relative",
            transform: `scale(${Math.min(phoneScale, 1)}) rotate(${phoneTilt(frame, fps)}deg)`,
            marginTop: 30,
          }}
        >
          <div style={{ opacity: 1 - crossfade }}>
            <PhoneFrame>
              <PhoneScreenNovaOp />
            </PhoneFrame>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: crossfade,
            }}
          >
            <PhoneFrame>
              <PhoneScreenOcr />
            </PhoneFrame>
          </div>
        </div>

        {/* Caption */}
        <div
          style={{
            opacity: captionOp,
            marginTop: 30,
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.fgMutedOnLight,
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          Sem digitar nada. <strong style={{ color: COLORS.accent }}>Em segundos.</strong>
        </div>
      </AbsoluteFill>

      <Sticker
        text="5 min"
        emoji="⚡"
        appearAt={28}
        position="top-right"
        variant="yellow"
        size="md"
        rotate={5}
        inset={90}
      />
      <Sticker
        text="Importa contrato"
        emoji="📄"
        appearAt={120}
        position="bottom-left"
        variant="accent"
        size="sm"
        rotate={-3}
        inset={110}
      />
    </AbsoluteFill>
  );
}

function phoneTilt(frame: number, fps: number): number {
  const t = frame / fps;
  return Math.sin(t * 1.3) * 1.2;
}
