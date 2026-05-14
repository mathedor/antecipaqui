import { interpolate, useCurrentFrame } from "remotion";

export function PhoneScreenNovaOp() {
  const frame = useCurrentFrame();
  // Animate "valor recebe hoje" counting up
  const valorAnim = interpolate(frame, [20, 50], [50000, 71338], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <div style={{ padding: "24px 28px", fontSize: 22, color: "#0f172a" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ color: "#1c6dd0", fontSize: 26 }}>←</div>
        <div style={{ fontWeight: 700, fontSize: 24 }}>Nova operação</div>
        <div style={{ width: 26 }} />
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        <div style={{ flex: 1, height: 4, background: "#1c6dd0", borderRadius: 2 }} />
        <div style={{ flex: 1, height: 4, background: "#1c6dd0", borderRadius: 2 }} />
        <div style={{ flex: 1, height: 4, background: "#e2e8f0", borderRadius: 2 }} />
        <div style={{ flex: 1, height: 4, background: "#e2e8f0", borderRadius: 2 }} />
      </div>

      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 14,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          marginBottom: 18,
        }}
      >
        Passo 2 de 4 · Comissão
      </div>

      {/* Valor input */}
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontFamily: "ui-monospace, monospace",
            marginBottom: 8,
          }}
        >
          Valor da comissão
        </div>
        <div
          style={{
            border: "3px solid #1c6dd0",
            borderRadius: 14,
            padding: "16px 20px",
            background: "#eff6ff",
            fontSize: 32,
            fontWeight: 800,
          }}
        >
          R$ 80.000,00
        </div>
      </div>

      {/* Parcelas */}
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontFamily: "ui-monospace, monospace",
            marginBottom: 8,
          }}
        >
          Parcelas
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style={{
                height: 56,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 700,
                background: n === 3 ? "#1c6dd0" : "white",
                color: n === 3 ? "white" : "#475569",
                border: n === 3 ? "none" : "2px solid #e2e8f0",
              }}
            >
              {n}x
            </div>
          ))}
        </div>
      </div>

      {/* Resultado destacado */}
      <div
        style={{
          background: "linear-gradient(135deg, #1c6dd0, #0d4e9e)",
          padding: 22,
          borderRadius: 18,
          color: "white",
          boxShadow: "0 20px 40px rgba(28,109,208,0.35)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            opacity: 0.85,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontFamily: "ui-monospace, monospace",
            marginBottom: 6,
          }}
        >
          Você recebe hoje
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.02em" }}>
          R$ {Math.round(valorAnim).toLocaleString("pt-BR")}
        </div>
        <div style={{ fontSize: 16, opacity: 0.9, marginTop: 4 }}>
          via PIX, em 1 dia útil
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: 22,
          height: 56,
          borderRadius: 14,
          background: "#1c6dd0",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        Continuar →
      </div>
    </div>
  );
}
