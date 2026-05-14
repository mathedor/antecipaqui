import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
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
  const captionOp = fadeIn(frame, showOcrAt + 10, 12);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={90} opacity={0.35} />
      <Blob color={COLORS.neonMagenta} x={15} y={85} size={30} opacity={0.3} />
      <Noise opacity={0.05} />

      <AbsoluteFill
        style={{
          padding: 60,
          paddingTop: 110,
          alignItems: "center",
        }}
      >
        {/* Header */}
        <div
          style={{
            opacity: titleOp,
            color: COLORS.fg,
            textAlign: "center",
            marginBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 22,
              letterSpacing: "0.3em",
              color: COLORS.neonYellow,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            ⚡ DO CELULAR
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
            }}
          >
            5 MIN E
            <br />
            <span style={{ color: COLORS.neonYellow }}>TÁ FEITO.</span>
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

        {/* Caption final */}
        <div
          style={{
            opacity: captionOp,
            marginTop: 30,
            fontSize: 36,
            fontWeight: 800,
            color: COLORS.fg,
            textAlign: "center",
            letterSpacing: "-0.02em",
            maxWidth: 800,
          }}
        >
          📷 Foto do contrato.{" "}
          <span style={{ color: COLORS.neonYellow }}>IA preenche.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function phoneTilt(frame: number, fps: number): number {
  const t = frame / fps;
  return Math.sin(t * 1.3) * 1.2;
}
