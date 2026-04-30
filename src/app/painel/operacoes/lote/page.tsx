import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { LoteOperacoesForm } from "@/components/lote-operacoes-form";
import {
  listImobiliariasForLote,
  listPendingByCurrentConstrutora,
} from "@/lib/actions/pending-operacoes";

export const metadata = {
  title: "Cadastro de operações em lote",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  aguardando_cedente: {
    label: "Aguardando cedente",
    cls: "bg-yellow-50 text-warn border-yellow-200",
  },
  reivindicada: {
    label: "Reivindicada",
    cls: "bg-blue-50 text-accent border-blue-200",
  },
  descartada: {
    label: "Descartada",
    cls: "bg-bg-soft text-fg-dim border-border",
  },
};

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatBRL(v: string | number) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function LotePage() {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const [imobs, pendings] = await Promise.all([
    listImobiliariasForLote(),
    listPendingByCurrentConstrutora(),
  ]);

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/operacoes/lote"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">cadastro em lote</div>
        <h1 className="text-display-md">
          Registrar <span className="text-gradient-blue">operações</span> em
          lote
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Cadastre rapidamente as comissões que você tem a pagar pras suas
          imobiliárias / corretores. Eles recebem um email convidando a
          completar o cadastro e simular a antecipação.
        </p>
      </div>

      <LoteOperacoesForm imobiliarias={imobs} />

      {pendings.length > 0 && (
        <section className="mt-12">
          <h2 className="font-bold mb-3 tracking-tight">
            Histórico ({pendings.length})
          </h2>
          <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
            <ul>
              {pendings.map((p) => {
                const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.aguardando_cedente;
                return (
                  <li
                    key={p.id}
                    className="grid grid-cols-12 gap-3 px-5 py-4 items-center border-b border-border last:border-0"
                  >
                    <div className="col-span-12 md:col-span-4 text-sm">
                      <div className="font-semibold truncate">
                        {p.corretorNome ?? p.corretorEmail}
                      </div>
                      <div className="font-mono text-[10px] text-fg-dim truncate">
                        {p.corretorEmail}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-3 text-sm text-fg-muted">
                      {formatBRL(p.valorComissao)} ·{" "}
                      <span className="text-fg-dim">{p.numeroParcelas}x</span>
                    </div>
                    <div className="hidden md:block col-span-2 text-xs font-mono text-fg-muted">
                      1ª {formatDate(p.dataPrimeiraParcela)}
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </div>
                    <div className="hidden md:block col-span-1 text-right text-xs text-fg-dim font-mono">
                      {formatDate(p.createdAt)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            <Link
              href="/painel/operacoes"
              className="text-accent hover:underline"
            >
              Ver operações já efetivadas →
            </Link>
          </p>
        </section>
      )}
    </PainelShell>
  );
}
