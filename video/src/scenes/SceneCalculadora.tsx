import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";
import { Noise } from "../components/Noise";
import { Blob } from "../components/Blob";

export function SceneCalculadora() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 12);
  const cardScale = popIn(frame, 10, fps, { damping: 14, stiffness: 100 });

  // Slider varre dramaticamente
  const slider = interpolate(
    frame,
    [15, 45, 75, 110],
    [30, 150, 80, 80],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 2),
    },
  );

  const parcelas = 3;
  const taxa = 0.06;
  const valorTotal = slider * 1000;
  const parcela = valorTotal / parcelas;
  let valorHoje = 0;
  for (let i = 1; i <= parcelas; i++) {
    valorHoje += parcela / Math.pow(1 + taxa, i);
  }

  // Pulse no número final
  const pulseAt = 75;
  const pulse =
    1 +
    Math.max(
      0,
      Math.sin((frame - pulseAt) * 0.4) *
        Math.exp(-Math.abs(frame - pulseAt) * 0.05) *
        0.05,
    );

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Blob color={COLORS.emerald} x={75} y={70} size={60} opacity={0.4} />
      <Blob color={COLORS.accent} x={20} y={25} size={50} opacity={0.3} />
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
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 22,
              letterSpacing: "0.3em",
              color: COLORS.emerald,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            ⚡ CALCULA AGORA
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: "-0.04em",
            }}
          >
            QUANTO
            <br />
            <span style={{ color: COLORS.emerald }}>NA SUA CONTA?</span>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            transform: `scale(${cardScale})`,
            background: COLORS.bgAlt,
            border: `2px solid ${COLORS.border}`,
            borderRadius: 28,
            padding: 40,
            width: "100%",
            maxWidth: 850,
            boxShadow: `0 0 80px ${COLORS.emerald}33`,
          }}
        >
          {/* Comissão */}
          <div style={{ marginBottom: 30 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 18,
                  letterSpacing: "0.2em",
                  color: COLORS.fgDim,
                  textTransform: "uppercase",
                }}
              >
                COMISSÃO
              </div>
              <div
                style={{
                  fontSize: 60,
                  fontWeight: 900,
                  color: COLORS.fg,
                  letterSpacing: "-0.03em",
                }}
              >
                R$ {Math.round(slider).toLocaleString("pt-BR")}k
              </div>
            </div>

            {/* Track */}
            <div
              style={{
                height: 14,
                borderRadius: 7,
                background: COLORS.border,
                position: "relative",
                overflow: "visible",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${((slider - 30) / 170) * 100}%`,
                  background: `linear-gradient(90deg, ${COLORS.emerald}, ${COLORS.neonYellow})`,
                  borderRadius: 7,
                  boxShadow: `0 0 20px ${COLORS.emerald}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${((slider - 30) / 170) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: COLORS.neonYellow,
                  border: `4px solid ${COLORS.bg}`,
                  boxShadow: `0 0 30px ${COLORS.neonYellow}`,
                }}
              />
            </div>
          </div>

          {/* Resultado massivo */}
          <div
            style={{
              transform: `scale(${pulse})`,
              background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.neonYellow})`,
              padding: 40,
              borderRadius: 24,
              textAlign: "center",
              boxShadow: `0 30px 80px ${COLORS.emerald}55`,
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 22,
                letterSpacing: "0.25em",
                color: COLORS.bg,
                textTransform: "uppercase",
                fontWeight: 800,
                marginBottom: 12,
                opacity: 0.85,
              }}
            >
              VOCÊ RECEBE HOJE
            </div>
            <div
              style={{
                fontSize: 130,
                fontWeight: 900,
                color: COLORS.bg,
                letterSpacing: "-0.04em",
                lineHeight: 0.9,
              }}
            >
              R$ {Math.round(valorHoje).toLocaleString("pt-BR")}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: COLORS.bg,
                marginTop: 14,
                opacity: 0.85,
              }}
            >
              via PIX · em 1 dia útil
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
