"use client";

import { useState, useTransition } from "react";
import type { PagamentosAna as Estado } from "@/lib/custosAna";

/* ══ O QUE JÁ FOI PAGO — E O QUE FALTA ══
   Este quadro não guarda nada aqui dentro: ele mostra as contas deste sistema
   como elas estão no controle da Diretório Web e escreve de volta lá quando
   você marca. Assim o "paguei" vale em qualquer computador, para todo mundo
   que abre esta página, e ninguém cobra o que já foi pago. */

type Marcar = (tipo: "custos" | "dev", mes: string, pago: boolean) => Promise<Estado | null>;

/** Dinheiro em caixa no ponto de partida (valor informado pelo dono). Tudo
 *  que for marcado como pago abaixo — infraestrutura e desenvolvimento — é
 *  descontado deste saldo. Em centavos pra bater com os valores da Ana. */
const SALDO_INICIAL_CENTAVOS = 94_668_00;

const real = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesBonito = (m: string) => {
  const [a, mm] = m.split("-");
  return `${MESES[Number(mm) - 1] ?? mm}/${a}`;
};
const dia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function PagamentosAna({ inicial, marcar }: { inicial: Estado; marcar: Marcar }) {
  const [estado, setEstado] = useState<Estado>(inicial);
  const [mexendo, setMexendo] = useState<string | null>(null);
  const [, comecar] = useTransition();

  const meses = Array.from(new Set([...Object.keys(estado.custos), ...Object.keys(estado.dev)])).sort().reverse();

  // Saldo em caixa: parte de SALDO_INICIAL e desconta tudo que está pago
  // (infra + desenvolvimento). Atualiza na hora que você marca/desmarca.
  const somaPaga = (tipo: "custos" | "dev") =>
    Object.values(estado[tipo]).reduce((a, e) => a + (e?.pago ? e.centavos : 0), 0);
  const pagoInfra = somaPaga("custos");
  const pagoDev = somaPaga("dev");
  const totalPago = pagoInfra + pagoDev;
  const saldo = SALDO_INICIAL_CENTAVOS - totalPago;
  const pctConsumido = SALDO_INICIAL_CENTAVOS > 0
    ? Math.min(100, Math.max(0, (totalPago / SALDO_INICIAL_CENTAVOS) * 100))
    : 0;
  const negativo = saldo < 0;

  if (meses.length === 0) return null;

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
    {/* ══ SALDO EM CAIXA ══ o dinheiro disponível, descontando o que já foi pago */}
    <section
      style={{
        border: `1px solid ${negativo ? "rgba(239,68,68,.5)" : "rgba(62,207,142,.4)"}`,
        borderRadius: 14, padding: 18, margin: "0 0 16px",
        background: negativo ? "rgba(239,68,68,.06)" : "rgba(62,207,142,.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: ".72rem", letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.6 }}>
            saldo em caixa
          </p>
          <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: negativo ? "#ef4444" : "#3ecf8e" }}>
            {real(saldo)}
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: ".8rem", opacity: 0.75 }}>
          <div>caixa inicial <b style={{ fontVariantNumeric: "tabular-nums" }}>{real(SALDO_INICIAL_CENTAVOS)}</b></div>
          <div>já pago <b style={{ fontVariantNumeric: "tabular-nums" }}>{real(totalPago)}</b></div>
          <div style={{ opacity: 0.7 }}>infra {real(pagoInfra)} · desenv. {real(pagoDev)}</div>
        </div>
      </div>
      <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: "rgba(127,127,127,.18)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pctConsumido}%`, background: negativo ? "#ef4444" : "#3ecf8e", transition: "width .3s" }} />
      </div>
      <p style={{ margin: "8px 0 0", fontSize: ".76rem", opacity: 0.65 }}>
        {negativo
          ? "O caixa ficou negativo — o que foi pago já passou do saldo inicial."
          : "Cada conta ou desenvolvimento marcado como pago abaixo desconta deste saldo."}
      </p>
    </section>

    <section style={{ border: "1px solid rgba(127,127,127,.28)", borderRadius: 14, padding: 16, margin: "0 0 22px" }}>
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
    </>
  );
}
