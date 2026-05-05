import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getOperacaoDetail } from "@/lib/actions/operacoes";
import { getContratoForOperacao } from "@/lib/actions/contract";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { PrintButton } from "@/components/print-button";
import { ContratoCard } from "@/components/contrato-card";
import { PainelShell } from "@/components/painel-shell";
import { formatBRL, formatPercent } from "@/lib/format";
import { toBlobProxyHref } from "@/lib/blob-url";

export const metadata = {
  title: "Borderô da operação",
};

type Params = { params: Promise<{ id: string }> };

const TIPO_LABEL: Record<string, string> = {
  contrato_venda: "Contrato de compra e venda",
  contrato_comissao: "Contrato de comissionamento",
  nota_fiscal: "Nota fiscal",
  contrato_social: "Contrato social",
  comprovante_endereco: "Comprovante de endereço",
  creci: "Comprovante CRECI",
  rg: "RG",
  cpf: "CPF",
  outro: "Outro",
};

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthsBetween(from: Date, to: Date) {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return Math.max(y * 12 + m + dayFrac, 0);
}

export default async function OperacaoDetailPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const [op, contrato] = await Promise.all([
    getOperacaoDetail(id, user.id),
    getContratoForOperacao(id),
  ]);
  if (!op) notFound();

  const taxaMensal = parseFloat(op.taxaMensal);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parcelasComCalculo = op.parcelas.map((p) => {
    const venc = new Date(p.vencimento + "T00:00:00");
    const meses = monthsBetween(today, venc);
    const valorNominal = parseFloat(p.valor);
    const fator = Math.pow(1 + taxaMensal, meses);
    const vp = valorNominal / fator;
    const juros = valorNominal - vp;
    return { ...p, meses, vp, juros, valorNominal };
  });

  const totalNominal = parcelasComCalculo.reduce((s, p) => s + p.valorNominal, 0);
  const totalVP = parcelasComCalculo.reduce((s, p) => s + p.vp, 0);
  const totalJuros = parcelasComCalculo.reduce((s, p) => s + p.juros, 0);

  const role = (
    user.role === "construtora"
      ? "construtora"
      : user.role === "imobiliaria"
        ? "imobiliaria"
        : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria";

  return (
    <PainelShell
      role={role}
      userName={user.nome}
      active="/painel/operacoes"
    >
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/painel/operacoes"
          className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors"
        >
          ← operações
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/operacoes/${op.id}/bordero`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-accent/40 bg-accent-soft text-accent hover:bg-accent hover:text-white font-medium text-sm transition-colors"
          >
            📄 Visualizar bordero
          </Link>
          <PrintButton>🖨 Imprimir / salvar PDF</PrintButton>
        </div>
      </div>

      <article className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12 print:border-0 print:rounded-none print:p-0 print:bg-transparent">
        <header className="border-b border-border pb-6 mb-8 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-2">
              borderô · operação antecipada
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight font-mono">
              {op.numero}
            </h1>
            <div className="mt-2 text-sm text-fg-muted">
              Emitido em {formatDateTime(op.createdAt)}
            </div>
          </div>
          <div className="text-right">
            <OperacaoStatusBadge status={op.status} />
            <div className="mt-2 text-xs text-fg-dim font-mono">
              taxa {formatPercent(taxaMensal)} a.m.
            </div>
          </div>
        </header>

        {op.status === "recusada" && op.motivoRecusa && (
          <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 mb-6 print:border print:border-danger">
            <div className="font-mono text-[10px] uppercase tracking-wider text-danger mb-2">
              motivo da recusa
            </div>
            <p className="text-fg">{op.motivoRecusa}</p>
          </div>
        )}

        {contrato && (
          <div className="mb-6">
            <ContratoCard
              pdfUrl={contrato.pdfUrl}
              createdAt={contrato.createdAt}
              status={contrato.status}
              signers={contrato.signers}
              zapsignDocumentToken={contrato.zapsignDocumentToken}
              operacaoId={op.id}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <Card label="Cedente · corretor / imobiliária">
            <div className="text-sm text-fg-muted mb-1">
              Quem antecipou a comissão
            </div>
            <div className="text-fg font-mono text-sm">
              user · {op.corretorUserId.slice(0, 16)}…
            </div>
          </Card>
          <Card label="Devedora · construtora">
            <div className="text-base font-bold tracking-tight">
              {op.construtoraNome ?? "—"}
            </div>
            <div className="mt-1 font-mono text-xs text-fg-muted">
              CNPJ {op.construtoraCnpj ?? "—"}
            </div>
          </Card>
        </div>

        <Card label="Resumo financeiro" className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Venda total" value={formatBRL(parseFloat(op.valorVenda))} />
            <Stat
              label="Comissão"
              value={formatBRL(parseFloat(op.valorComissao))}
            />
            <Stat
              label="Valor presente"
              value={formatBRL(parseFloat(op.valorPresente))}
              highlight
            />
            <Stat
              label="Deságio total"
              value={formatBRL(parseFloat(op.desagio))}
              tone="warn"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <Stat label="Data da venda" value={formatDate(op.dataVenda)} />
            <Stat label="Parcelas" value={`${op.numeroParcelas}x`} />
            <Stat label="Taxa mensal" value={formatPercent(taxaMensal)} />
            <Stat
              label="% deságio"
              value={`${(((parseFloat(op.desagio)) / parseFloat(op.valorComissao)) * 100).toFixed(2)}%`}
            />
          </div>
        </Card>

        <Card label="Cronograma com cálculo de juros por parcela" className="mb-8">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">Nº</th>
                  <th className="text-left py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">Vencimento</th>
                  <th className="text-right py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">Prazo</th>
                  <th className="text-right py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">Valor nominal</th>
                  <th className="text-right py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">Juros</th>
                  <th className="text-right py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">Valor presente</th>
                </tr>
              </thead>
              <tbody>
                {parcelasComCalculo.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
                  >
                    <td className="py-3 px-2 font-mono text-xs text-fg-dim">
                      {String(p.numero).padStart(2, "0")}
                    </td>
                    <td className="py-3 px-2 text-fg">{formatDate(p.vencimento)}</td>
                    <td className="py-3 px-2 text-right font-mono tabular text-fg-muted text-xs">
                      {p.meses.toFixed(1)} mês{p.meses === 1 ? "" : "es"}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular text-fg">
                      {formatBRL(p.valorNominal)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular text-warn">
                      − {formatBRL(p.juros)}
                    </td>
                    <td className="py-3 px-2 text-right font-mono tabular font-semibold text-accent">
                      {formatBRL(p.vp)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong bg-bg-card">
                  <td colSpan={3} className="py-3 px-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    Totais
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular text-fg font-bold">
                    {formatBRL(totalNominal)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular text-warn font-bold">
                    − {formatBRL(totalJuros)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono tabular text-accent font-bold">
                    {formatBRL(totalVP)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {op.documentos.length > 0 && (
          <Card label="Documentos anexados" className="mb-8 print:break-before-page">
            <ul className="grid sm:grid-cols-2 gap-3">
              {op.documentos.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:border-accent transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
                      {TIPO_LABEL[d.tipo] ?? d.tipo}
                    </div>
                    <div className="text-sm text-fg truncate" title={d.nomeOriginal}>
                      {d.nomeOriginal}
                    </div>
                  </div>
                  <a
                    href={toBlobProxyHref(d.url)}
                    target="_blank"
                    rel="noopener"
                    className="text-accent text-sm font-semibold whitespace-nowrap shrink-0 print:hidden"
                  >
                    abrir ↗
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <footer className="text-center text-xs text-fg-dim border-t border-border pt-6 mt-8">
          <p className="font-mono">
            Borderô gerado pela plataforma Antecipaqui · Documento informativo
          </p>
          <p className="mt-1">
            Os valores são resultado do cálculo de valor presente com juros
            compostos mensais à taxa de {formatPercent(taxaMensal)} ao mês,
            descontados a partir da data de emissão deste documento.
          </p>
        </footer>
      </article>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
    </PainelShell>
  );
}

function Card({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-bg p-5 md:p-7 print:border print:rounded-none ${className}`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        {label}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "warn";
}) {
  const valueColor =
    tone === "warn" ? "text-warn" : highlight ? "text-accent" : "text-fg";
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        {label}
      </div>
      <div className={`font-mono tabular text-base md:text-lg font-bold ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
