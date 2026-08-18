"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { PagamentosAna as Estado } from "@/lib/custosAna";

/* ══ CAIXA + O QUE JÁ FOI PAGO ══
   O card de caixa mostra o dinheiro que sobra. A tabela mostra, mês a mês, o
   que já foi pago e o que está em aberto — marcar aqui avisa o controle da
   Diretório Web na hora. Os `children` (o descritivo de custos) entram ENTRE
   o card e a tabela. */

type Marcar = (tipo: "custos" | "dev", mes: string, pago: boolean) => Promise<Estado | null>;

/* Capital total aportado no projeto. O que já foi pago sai daqui; o que sobra
   é o caixa. Calibrado pra que, com tudo que já está pago hoje
   (R$ 94.965,81), o saldo bata os R$ 94.668,00 que sobraram positivos.
   Aportou mais? Some aqui. */
const CAPITAL_APORTADO_CENTAVOS = 189_633_81;

const real = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesBonito = (m: string) => {
  const [a, mm] = m.split("-");
  return `${MESES[Number(mm) - 1] ?? mm}/${a}`;
};
const dia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function PagamentosAna({
  inicial,
  marcar,
  children,
}: {
  inicial: Estado;
  marcar: Marcar;
  children?: ReactNode;
}) {
  const [estado, setEstado] = useState<Estado>(inicial);
  const [mexendo, setMexendo] = useState<string | null>(null);
  const [, comecar] = useTransition();

  const meses = Array.from(new Set([...Object.keys(estado.custos), ...Object.keys(estado.dev)])).sort().reverse();
  const temDados = meses.length > 0;

  // Caixa: capital aportado menos tudo que já foi pago (infra + desenv.).
  // Atualiza na hora que você marca/desmarca um pagamento abaixo.
  const somaPaga = (tipo: "custos" | "dev") =>
    Object.values(estado[tipo]).reduce((a, e) => a + (e?.pago ? e.centavos : 0), 0);
  const pagoInfra = somaPaga("custos");
  const pagoDev = somaPaga("dev");
  const totalPago = pagoInfra + pagoDev;
  const saldo = CAPITAL_APORTADO_CENTAVOS - totalPago;
  const pctConsumido = CAPITAL_APORTADO_CENTAVOS > 0
    ? Math.min(100, Math.max(0, (totalPago / CAPITAL_APORTADO_CENTAVOS) * 100))
    : 0;
  const negativo = saldo < 0;

  const clicar = (tipo: "custos" | "dev", mes: string, pago: boolean) => {
    setMexendo(`${tipo}:${mes}`);
    comecar(async () => {
      const novo = await marcar(tipo, mes, !pago);
      if (novo) setEstado(novo);
      setMexendo(null);
    });
  };

  const celula = (tipo: "custos" | "dev", mes: string) => {
    const e = estado[tipo][mes];
    if (!e) return <span style={{ opacity: 0.4 }}>—</span>;
    const ocupado = mexendo === `${tipo}:${mes}`;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontVariantNumeric: "tabular-nums" }}>{real(e.centavos)}</b>
        <button
          type="button"
          onClick={() => clicar(tipo, mes, e.pago)}
          disabled={ocupado}
          title={e.pago ? "marcado como pago — clique para desfazer" : `vence ${dia(e.vencimento)} — clique quando pagar`}
          style={{
            cursor: "pointer", borderRadius: 999, padding: "2px 10px", fontSize: ".72rem",
            border: "1px solid currentColor", background: "transparent",
            opacity: ocupado ? 0.5 : 1, color: e.pago ? "#3ecf8e" : "inherit",
          }}
        >
          {ocupado ? "…" : e.pago ? "✓ pago" : `em aberto · vence ${dia(e.vencimento)}`}
        </button>
      </span>
    );
  };

  return (
    <>
      {/* ══ 1. SALDO EM CAIXA ══ */}
      {temDados && (
        <section
          style={{
            border: `1px solid ${negativo ? "rgba(239,68,68,.5)" : "rgba(62,207,142,.4)"}`,
            borderRadius: 14, padding: 18, margin: "0 0 22px",
            background: negativo ? "rgba(239,68,68,.06)" : "rgba(62,207,142,.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.6 }}>
                saldo em caixa
              </p>
              <p style={{ margin: 0, fontSize: "2.1rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: negativo ? "#ef4444" : "#3ecf8e" }}>
                {real(saldo)}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: ".76rem", opacity: 0.6 }}>
                o que sobrou depois das contas pagas
              </p>
            </div>
            <div style={{ textAlign: "right", fontSize: ".8rem", opacity: 0.75 }}>
              <div>capital aportado <b style={{ fontVariantNumeric: "tabular-nums" }}>{real(CAPITAL_APORTADO_CENTAVOS)}</b></div>
              <div>já pago <b style={{ fontVariantNumeric: "tabular-nums" }}>{real(totalPago)}</b></div>
              <div style={{ opacity: 0.7 }}>infra {real(pagoInfra)} · desenv. {real(pagoDev)}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: "rgba(127,127,127,.18)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctConsumido}%`, background: negativo ? "#ef4444" : "#3ecf8e", transition: "width .3s" }} />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: ".76rem", opacity: 0.65 }}>
            {negativo
              ? "O caixa ficou negativo — o que foi pago já passou do capital aportado."
              : "Cada conta ou desenvolvimento que você marca como pago abaixo desconta deste saldo."}
          </p>
        </section>
      )}

      {/* ══ 2. CUSTOS & DESCRITIVOS (conteúdo passado por quem usa o componente) ══ */}
      {children}

      {/* ══ 3. PAGAMENTOS — mês a mês (no fim da página) ══ */}
      {temDados && (
        <section style={{ border: "1px solid rgba(127,127,127,.28)", borderRadius: 14, padding: 16, margin: "22px 0 0" }}>
          <p style={{ margin: "0 0 2px", fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.6 }}>
            pagamentos
          </p>
          <p style={{ margin: "0 0 12px", fontSize: ".8rem", opacity: 0.7 }}>
            o que já foi pago e o que está em aberto, mês a mês. Marcar aqui avisa o controle da Diretório Web na hora —
            e o que for baixado lá aparece aqui.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".84rem" }}>
              <thead>
                <tr style={{ textAlign: "left", opacity: 0.6, fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  <th style={{ padding: "6px 10px 6px 0" }}>mês</th>
                  <th style={{ padding: "6px 10px" }}>infraestrutura</th>
                  <th style={{ padding: "6px 0 6px 10px" }}>desenvolvimento</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr key={m} style={{ borderTop: "1px solid rgba(127,127,127,.18)" }}>
                    <td style={{ padding: "9px 10px 9px 0", whiteSpace: "nowrap" }}>{mesBonito(m)}</td>
                    <td style={{ padding: "9px 10px" }}>{celula("custos", m)}</td>
                    <td style={{ padding: "9px 0 9px 10px" }}>{celula("dev", m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
