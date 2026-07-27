import type { Metadata } from "next";

/**
 * Página EM MANUTENÇÃO — servida via rewrite do proxy quando a Ana
 * liga a flag de manutenção do slug `antecipaqui`.
 *
 * Regras: HTML estático puro — sem banco, sem env, sem client JS.
 * Estilos inline com a identidade do Antecipaqui (navy #0c1a2c / azul #1c6dd0).
 */

export const metadata: Metadata = {
  title: "Em manutenção · Antecipaqui",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function ManutencaoPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem 1.5rem",
        background:
          "radial-gradient(1200px 600px at 50% -10%, #13294a 0%, #0c1a2c 55%, #081221 100%)",
        color: "#fbfbfa",
        fontFamily:
          "var(--font-sans), ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        aria-hidden
        style={{
          fontSize: "4.5rem",
          lineHeight: 1,
          marginBottom: "1.5rem",
          filter: "drop-shadow(0 8px 24px rgba(28, 109, 208, 0.35))",
        }}
      >
        🔧
      </div>

      <h1
        style={{
          fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
          fontWeight: 800,
          letterSpacing: "0.12em",
          margin: 0,
        }}
      >
        EM MANUTENÇÃO
      </h1>

      <p
        style={{
          marginTop: "0.75rem",
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "#5b9df0",
          letterSpacing: "0.02em",
        }}
      >
        Antecipaqui
      </p>

      <p
        style={{
          marginTop: "1.25rem",
          maxWidth: "34rem",
          fontSize: "1.0625rem",
          lineHeight: 1.6,
          color: "#aeb8c4",
        }}
      >
        Estamos fazendo uma melhoria rápida. Já já estamos de volta.
      </p>

      <div
        style={{
          marginTop: "2.5rem",
          width: "4rem",
          height: "3px",
          borderRadius: "999px",
          background: "linear-gradient(90deg, #1c6dd0, #0d4e9e)",
        }}
      />

      <p
        style={{
          position: "absolute",
          bottom: "1.5rem",
          left: 0,
          right: 0,
          fontSize: "0.8125rem",
          color: "#5a6571",
        }}
      >
        Diretório Web · diretoriow.com.br
      </p>
    </div>
  );
}
