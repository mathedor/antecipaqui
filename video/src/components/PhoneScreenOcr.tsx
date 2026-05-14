import { interpolate, useCurrentFrame } from "remotion";

export function PhoneScreenOcr() {
  const frame = useCurrentFrame();
  // Aparição progressiva dos campos extraídos
  const f1 = interpolate(frame, [110, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const f2 = interpolate(frame, [125, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const f3 = interpolate(frame, [140, 160], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ padding: "24px 28px", fontSize: 22, color: "#0f172a" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ color: "#1c6dd0", fontSize: 26 }}>←</div>
        <div style={{ fontWeight: 700, fontSize: 24 }}>Contrato</div>
        <div style={{ width: 26 }} />
      </div>

      {/* Hero card */}
      <div
        style={{
          background: "#eff6ff",
          border: "2px solid #93c5fd",
          padding: 22,
          borderRadius: 18,
          marginBottom: 22,
        }}
      >
        <div style={{ fontSize: 42, marginBottom: 6 }}>📄✨</div>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          Leitor inteligente
        </div>
        <div style={{ fontSize: 18, color: "#475569", lineHeight: 1.4 }}>
          Foto ou PDF. A IA preenche tudo. Você confere.
        </div>
      </div>

      {/* Upload */}
      <div
        style={{
          border: "3px dashed #1c6dd0",
          borderRadius: 18,
          padding: 30,
          textAlign: "center",
          marginBottom: 22,
          background: "white",
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 8 }}>📷</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#1c6dd0" }}>
          Foto do contrato
        </div>
      </div>

      {/* Extracted fields */}
      <ExtractedField
        label="Comprador"
        value="João da Silva"
        opacity={f1}
      />
      <ExtractedField
        label="CPF"
        value="123.456.789-01"
        opacity={f2}
      />
      <ExtractedField
        label="Valor da venda"
        value="R$ 480.000,00"
        opacity={f3}
        highlight
      />
    </div>
  );
}

function ExtractedField({
  label,
  value,
  opacity,
  highlight,
}: {
  label: string;
  value: string;
  opacity: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${(1 - opacity) * 10}px)`,
        background: highlight ? "#ecfdf5" : "white",
        border: `2px solid ${highlight ? "#86efac" : "#e2e8f0"}`,
        borderRadius: 14,
        padding: "14px 18px",
        marginBottom: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontFamily: "ui-monospace, monospace",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: highlight ? "#15803d" : "#0f172a",
          }}
        >
          {value}
        </div>
      </div>
      <div style={{ fontSize: 22, color: "#16a34a" }}>✓</div>
    </div>
  );
}
