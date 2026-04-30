"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmarSaqueAction } from "@/lib/actions/cashback";

type Props = {
  ticketId: string;
  ticketStatus: string;
  extra: Record<string, unknown> | null;
};

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

export function CashbackSaqueAdminPanel({
  ticketId,
  ticketStatus,
  extra,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [comprovante, setComprovante] = useState("");

  if (!extra) return null;

  const valor = asNumber(extra.valorSolicitado);
  const construtoraNome = asString(extra.construtoraNome) ?? "";
  const banco = asString(extra.banco) ?? "—";
  const agencia = asString(extra.agencia) ?? "—";
  const conta = asString(extra.conta) ?? "—";
  const titular = asString(extra.titular) ?? "—";
  const docTitular = asString(extra.docTitular) ?? "—";
  const obs = asString(extra.obs);
  const opsIds = Array.isArray(extra.opsIds)
    ? (extra.opsIds as string[])
    : [];
  const pagoEm = asString(extra.pagoEm);
  const pagoComprovante = asString(extra.comprovante);

  const isFinalized = ticketStatus === "finalizado" || !!pagoEm;

  function handleConfirmar() {
    if (!confirm(`Confirmar pagamento de ${fmtBRL(valor)}? As operações serão marcadas como sacadas e o saldo da construtora vai zerar.`))
      return;
    start(async () => {
      try {
        await confirmarSaqueAction(ticketId, comprovante.trim() || null);
        router.refresh();
      } catch (e) {
        alert("Erro: " + (e as Error).message);
      }
    });
  }

  return (
    <section
      className={`rounded-2xl border p-5 md:p-6 mb-6 ${
        isFinalized
          ? "border-success/30 bg-green-50"
          : "border-warn/40 bg-yellow-50"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div
            className={`font-mono text-[10px] uppercase tracking-wider mb-1 ${
              isFinalized ? "text-success" : "text-warn"
            }`}
          >
            {isFinalized
              ? "saque pago ✓"
              : "saque de cashback · aguardando pagamento"}
          </div>
          <h2 className="text-lg font-bold tracking-tight">
            {construtoraNome}
          </h2>
        </div>
        <div className="font-mono tabular text-2xl font-bold">
          {fmtBRL(valor)}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <Field label="Banco" value={banco} />
        <Field label="Agência" value={agencia} mono />
        <Field label="Conta" value={conta} mono />
        <Field label="Titular" value={titular} />
        <Field label="CPF/CNPJ titular" value={docTitular} mono />
        <Field
          label="Operações referenciadas"
          value={String(opsIds.length)}
          mono
        />
      </div>

      {obs && (
        <div className="mt-3 text-xs text-fg-muted">
          <span className="font-mono uppercase text-fg-dim mr-1">obs:</span>
          {obs}
        </div>
      )}

      {isFinalized ? (
        <div className="mt-4 pt-4 border-t border-success/30 text-sm">
          <div className="font-mono text-[10px] uppercase tracking-wider text-success mb-1">
            pagamento registrado
          </div>
          <div className="text-fg">
            Pago em{" "}
            {pagoEm
              ? new Date(pagoEm).toLocaleString("pt-BR")
              : "(data ausente)"}
          </div>
          {pagoComprovante && (
            <div className="text-fg-muted mt-1">
              Comprovante: {pagoComprovante}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5 pt-4 border-t border-warn/30 space-y-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
              Comprovante / referência (opcional)
            </label>
            <input
              value={comprovante}
              onChange={(e) => setComprovante(e.target.value)}
              placeholder="Ex: TED #98765 · 30/04/2026"
              className="form-input !h-10"
            />
          </div>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={pending}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {pending ? "Registrando..." : "✓ Confirmar pagamento e zerar saldo"}
          </button>
          <p className="text-[11px] text-fg-muted leading-relaxed">
            Marca {opsIds.length} operação(ões) como sacada(s), zera o saldo
            da construtora e finaliza este ticket. Cria audit log em cada
            operação.
          </p>
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`text-fg ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
