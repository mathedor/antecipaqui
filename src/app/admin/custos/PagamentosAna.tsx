"use client";

import { useState, useTransition } from "react";
import type { PagamentosAna as Estado } from "@/lib/custosAna";

/* ══ O QUE JÁ FOI PAGO — E O QUE FALTA ══
   Este quadro não guarda nada aqui dentro: ele mostra as contas deste sistema
   como elas estão no controle da Diretório Web e escreve de volta lá quando
   você marca. Assim o "paguei" vale em qualquer computador, para todo mundo
   que abre esta página, e ninguém cobra o que já foi pago. */

type Marcar = (tipo: "custos" | "dev", mes: string, pago: boolean) => Promise<Estado | null>;

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
  );
}
