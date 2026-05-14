import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS } from "../constants";
import { fadeIn, slideY, popIn } from "../anim";

export function SceneCalculadora() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = fadeIn(frame, 0, 15);
  const titleY = slideY(frame, 0, 15, 40, 0);

  // Slider animation — vai de R$ 30k até R$ 150k e estabiliza em R$ 80k
  const slider = interpolate(
    frame,
    [20, 50, 75, 105],
    [30, 150, 80, 80],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 2),
    },
  );

  // Calcula valor presente com taxa 6% mensal, 3 parcelas
  const parcelas = 3;
  const taxa = 0.06;
  const valorTotal = slider * 1000;
  const parcela = valorTotal / parcelas;
  let valorHoje = 0;
  for (let i = 1; i <= parcelas; i++) {
    valorHoje += parcela / Math.pow(1 + taxa, i);
  }
  const desagio = valorTotal - valorHoje;

  return (
    <AbsoluteFill
      style={{
        background: COLORS.bg,
        padding: 70,
        paddingTop: 120,
        textAlign: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 18,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: COLORS.accent,
          marginBottom: 16,
          opacity: titleOpacity,
        }}
      >
        calcula agora
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
          maxWidth: 850,
        }}
      >
        Quanto você recebe
        <br />
        <span style={{ color: COLORS.accent }}>hoje?</span>
      </div>

      {/* Calculator card */}
      <div
        style={{
          background: "white",
          borderRadius: 32,
          padding: 50,
          boxShadow: "0 30px 80px rgba(15,23,42,0.15)",
          width: 780,
          maxWidth: "90%",
        }}
      >
        {/* Comissão slider */}
        <div style={{ marginBottom: 36 }}>
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
                fontSize: 20,
                color: COLORS.fgMuted,
                fontFamily: "ui-monospace, monospace",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              Comissão
            </div>
            <div
              style={{
                fontSize: 50,
                fontWeight: 800,
                color: COLORS.fg,
                letterSpacing: "-0.02em",
              }}
            >
              R$ {Math.round(slider).toLocaleString("pt-BR")}k
            </div>
          </div>

          {/* Slider track */}
          <div
            style={{
              height: 16,
              borderRadius: 8,
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
                background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight})`,
                borderRadius: 8,
              }}
            />
            {/* Thumb */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${((slider - 30) / 170) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: COLORS.accent,
                border: "5px solid white",
                boxShadow: "0 8px 20px rgba(28,109,208,0.4)",
              }}
            />
          </div>
        </div>

        {/* Parcelas mini */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              fontSize: 20,
              color: COLORS.fgMuted,
              fontFamily: "ui-monospace, monospace",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
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
                  height: 70,
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                  fontWeight: 800,
                  background: n === 3 ? COLORS.accent : "white",
                  color: n === 3 ? "white" : COLORS.fgMuted,
                  border: n === 3 ? "none" : `2px solid ${COLORS.border}`,
                }}
              >
                {n}x
              </div>
            ))}
          </div>
        </div>

        {/* Result big */}
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
            padding: 36,
            borderRadius: 22,
            color: "white",
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontFamily: "ui-monospace, monospace",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.85,
              marginBottom: 8,
            }}
          >
            Você recebe hoje
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            R$ {Math.round(valorHoje).toLocaleString("pt-BR")}
          </div>
          <div
            style={{
              fontSize: 22,
              opacity: 0.9,
              marginTop: 10,
            }}
          >
            Deságio:{" "}
            <strong>
              R$ {Math.round(desagio).toLocaleString("pt-BR")}
            </strong>{" "}
            ({((desagio / valorTotal) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
