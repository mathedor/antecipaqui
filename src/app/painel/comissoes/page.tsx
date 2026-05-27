import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listMinhasComissoes } from "@/lib/actions/comissoes-comercial";
import { formatBRL } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Comissões" };

function fmtDT(d: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const STATUS_BADGE: Record<string, string> = {
  pendente: "bg-yellow-50 text-warn",
  paga: "bg-green-50 text-success",
  cancelada: "bg-bg-card text-fg-dim line-through",
};

export default async function ComissoesComercialPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const itens = await listMinhasComissoes();

  const totais = itens.reduce(
    (acc, i) => {
      acc.total += i.valorDevido;
      if (i.status === "paga") acc.paga += i.valorPago;
      else if (i.status === "pendente") acc.pendente += i.valorDevido;
      return acc;
    },
    { total: 0, paga: 0, pendente: 0 },
  );

  return (
    <PainelShell role="comercial" userName={user.nome} active="/painel/comissoes">
      <div className="mb-6">
        <div className="eyebrow mb-2">ledger</div>
        <h1 className="text-display-md">
          Minhas <span className="text-gradient-blue">comissões</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Histórico detalhado de comissões por operação carteirizada.
          Comissão = 10% do lucro líquido AQ (spread/2 × 0,82 × 0,10).
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-comissoes" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total devido" value={formatBRL(totais.total)} />
        <Stat label="Já pago" value={formatBRL(totais.paga)} tone="success" />
        <Stat label="Pendente" value={formatBRL(totais.pendente)} tone="warn" />
      </div>

      {itens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
          Você ainda não tem comissões. Operações sob sua responsabilidade
          aparecem aqui quando passam pra pré-aprovada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
          <table className="w-full text-sm table-cards">
            <thead>
              <tr className="bg-bg-card border-b border-border text-left">
                <Th>Op</Th>
                <Th>Construtora</Th>
                <Th>Cedente</Th>
                <Th right>Comissão op</Th>
                <Th right>Devido a mim</Th>
                <Th right>Pago</Th>
                <Th>Status</Th>
                <Th>Gerada</Th>
                <Th>Paga em</Th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-border hover:bg-bg-card"
                >
                  <td className="px-3 py-2 font-mono font-semibold">
                    <Link
                      href={`/painel/operacoes/${i.operacaoId}`}
                      className="hover:text-accent"
                    >
                      {i.operacaoNumero}
                    </Link>
                  </td>
                  <td className="px-3 py-2 truncate max-w-[160px]">
                    {i.construtoraNome ?? "—"}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[160px] text-fg-muted">
                    {i.corretorNome ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatBRL(i.valorComissaoOp)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">
                    {formatBRL(i.valorDevido)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-success">
                    {formatBRL(i.valorPago)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        STATUS_BADGE[i.status] ?? STATUS_BADGE.pendente
                      }`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {fmtDT(i.geradaEm)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-fg-muted">
                    {fmtDT(i.pagaEm)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "border-success/40 bg-green-50 text-success"
      : tone === "warn"
        ? "border-warn/40 bg-yellow-50 text-warn"
        : "border-border bg-bg-elev text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${cls.split(" text-")[0]}`}>
      <div className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-1 text-fg-dim`}>
        {label}
      </div>
      <div
        className={`text-xl font-bold tracking-tight ${
          tone === "success"
            ? "text-success"
            : tone === "warn"
              ? "text-warn"
              : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Th({
  children,
  right = false,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-fg-dim ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
