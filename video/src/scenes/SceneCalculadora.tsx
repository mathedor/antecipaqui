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
import { Sticker } from "../components/Sticker";

export function SceneCalculadora() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOp = fadeIn(frame, 0, 12);
  const cardScale = popIn(frame, 10, fps, { damping: 14, stiffness: 100 });

  // Slider varre R$30k → R$150k → estabiliza em R$80k
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

  const pulseAt = 75;
  const pulse =
    1 +
    Math.max(
      0,
      Math.sin((frame - pulseAt) * 0.4) *
        Math.exp(-Math.abs(frame - pulseAt) * 0.05) *
        0.04,
    );

  return (
    <AbsoluteFill style={{ background: COLORS.whiteBg, overflow: "hidden" }}>
      <Blob color={COLORS.accent} x={50} y={50} size={80} opacity={0.12} />
      <Noise opacity={0.03} />

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
            color: COLORS.fgOnLight,
            textAlign: "center",
            marginBottom: 40,
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
            sem letra miúda
          </div>
          <div
            style={{
              fontSize: 86,
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
            }}
          >
            Quanto entra
            <br />
            <span style={{ color: COLORS.accent }}>na sua conta?</span>
          </div>
        </div>

        {/* Card calculadora — branco com sombra suave */}
        <div
          style={{
            transform: `scale(${cardScale})`,
            background: COLORS.white,
            border: `1px solid ${COLORS.borderOnLight}`,
            borderRadius: 28,
            padding: 44,
            width: "100%",
            maxWidth: 850,
            boxShadow: "0 40px 100px rgba(28,109,208,0.15)",
          }}
        >
          {/* Comissão */}
          <div style={{ marginBottom: 30 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 18,
                  letterSpacing: "0.2em",
                  color: COLORS.fgDimOnLight,
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                Comissão
              </div>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: COLORS.fgOnLight,
                  letterSpacing: "-0.03em",
                }}
              >
                R$ {Math.round(slider).toLocaleString("pt-BR")}k
              </div>
            </div>

            {/* Slider track */}
            <div
              style={{
                height: 12,
                borderRadius: 6,
                background: COLORS.borderOnLight,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${((slider - 30) / 170) * 100}%`,
                  background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight})`,
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: `${((slider - 30) / 170) * 100}%`,
                  transform: "translate(-50%, -50%)",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: COLORS.accent,
                  border: `4px solid ${COLORS.white}`,
                  boxShadow: "0 6px 16px rgba(28,109,208,0.4)",
                }}
              />
            </div>
          </div>

          {/* Parcelas */}
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 18,
                letterSpacing: "0.2em",
                color: COLORS.fgDimOnLight,
                textTransform: "uppercase",
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              Parcelas
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  style={{
                    flex: 1,
                    height: 64,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 800,
                    background: n === 3 ? COLORS.accent : COLORS.white,
                    color: n === 3 ? COLORS.white : COLORS.fgMutedOnLight,
                    border: n === 3 ? "none" : `2px solid ${COLORS.borderOnLight}`,
                  }}
                >
                  {n}x
                </div>
              ))}
            </div>
          </div>

          {/* Resultado em destaque */}
          <div
            style={{
              transform: `scale(${pulse})`,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              padding: 36,
              borderRadius: 22,
              textAlign: "left",
              color: COLORS.white,
              boxShadow: "0 30px 60px rgba(28,109,208,0.3)",
            }}
          >
            <div
              style={{
                fontFamily: "ui-monospace, monospace",
                fontSize: 18,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                opacity: 0.85,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Você recebe hoje
            </div>
            <div
              style={{
                fontSize: 110,
                fontWeight: 900,
                letterSpacing: "-0.04em",
                lineHeight: 0.95,
              }}
            >
              R$ {Math.round(valorHoje).toLocaleString("pt-BR")}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                opacity: 0.85,
                marginTop: 8,
              }}
            >
              via PIX, em 1 dia útil
            </div>
          </div>
        </div>
      </AbsoluteFill>

      <Sticker
        text="Sem surpresa"
        emoji="🔍"
        appearAt={25}
        position="top-right"
        variant="yellow"
        size="sm"
        rotate={5}
        inset={90}
      />
      <Sticker
        text="Em tempo real"
        emoji="⚡"
        appearAt={50}
        position="top-left"
        variant="white"
        size="sm"
        rotate={-4}
        inset={90}
      />
    </AbsoluteFill>
  );
}
