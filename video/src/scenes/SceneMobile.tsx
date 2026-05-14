import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { PhoneFrame } from "../components/PhoneFrame";
import { PhoneScreenNovaOp } from "../components/PhoneScreenNovaOp";
import { PhoneScreenOcr } from "../components/PhoneScreenOcr";

export function SceneMobile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = slideY(frame, 0, 15, 30, 0);
  const titleOpacity = fadeIn(frame, 0, 15);

  // Phone entra escalando
  const phone1Scale = popIn(frame, 12, fps, { damping: 16, stiffness: 120 });
  const phone1Tilt = -4 + (1 - phone1Scale) * 8;

  // Trocamos a tela do telefone aos 100 frames (3.3s na cena → começa a "rolar")
  const showOcrAt = 100;
  const phoneCrossfade = fadeIn(frame, showOcrAt, 14);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        padding: 60,
        justifyContent: "flex-start",
        alignItems: "center",
        textAlign: "center",
        paddingTop: 120,
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 18,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: COLORS.accent,
          marginBottom: 18,
          opacity: titleOpacity,
        }}
      >
        do celular
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
          color: COLORS.fg,
          marginBottom: 50,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          maxWidth: 800,
        }}
      >
        Cadastra a operação.
        <br />
        <span style={{ color: COLORS.accent }}>Em 5 minutos.</span>
      </div>

      <div
        style={{
          position: "relative",
          transform: `scale(${Math.min(phone1Scale, 1)}) rotate(${phoneTilt(frame, fps)}deg)`,
          marginTop: 30,
        }}
      >
        {/* Tela A: Nova Op */}
        <div style={{ opacity: 1 - phoneCrossfade }}>
          <PhoneFrame>
            <PhoneScreenNovaOp />
          </PhoneFrame>
        </div>
        {/* Tela B: OCR (sobreposta com fade) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: phoneCrossfade,
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
          marginTop: 40,
          fontSize: 30,
          fontWeight: 600,
          color: COLORS.fgMuted,
          opacity: phoneCrossfade,
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        📷 Fotografa o contrato.{" "}
        <strong style={{ color: COLORS.accent }}>A IA preenche.</strong>
      </div>
    </AbsoluteFill>
  );
}

function phoneTilt(frame: number, fps: number): number {
  // Oscilação sutil (parado mas vivo)
  const t = frame / fps;
  return Math.sin(t * 1.3) * 1.2;
}
