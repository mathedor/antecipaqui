import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/auth-user";
import { db } from "@/db";
import {
  construtoras,
  fundos,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { formatBRL } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Recibo de pagamento" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function ReciboPage({ params }: Params) {
  const { id } = await params;
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const [row] = await db
    .select({
      parcelaId: parcelasComissao.id,
      numero: parcelasComissao.numero,
      valor: parcelasComissao.valor,
      pagoValor: parcelasComissao.pagoValor,
      pagoEm: parcelasComissao.pagoEm,
      vencimento: parcelasComissao.vencimento,
      status: parcelasComissao.status,
      opId: operacoes.id,
      opNumero: operacoes.numero,
      opValorComissao: operacoes.valorComissao,
      construtoraOwner: construtoras.ownerUserId,
      construtoraRazao: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
      construtoraEndereco: construtoras.endereco,
      construtoraCidade: construtoras.cidade,
      construtoraUf: construtoras.uf,
      corretorNome: users.nome,
      fundoRazao: fundos.razaoSocial,
      fundoNomeFantasia: fundos.nomeFantasia,
      fundoCnpj: fundos.cnpj,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
    .leftJoin(users, eq(users.id, operacoes.corretorUserId))
    .leftJoin(fundos, eq(fundos.id, operacoes.fundoId))
    .where(eq(parcelasComissao.id, id))
    .limit(1);

  if (!row) notFound();

  // Permissão: construtora dona OU admin
  const isAdmin = user.role === "admin";
  const isConstrutora =
    user.role === "construtora" && row.construtoraOwner === user.id;
  if (!isAdmin && !isConstrutora) notFound();

  if (row.status !== "paga" || !row.pagoEm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border border-warn/40 bg-yellow-50 p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Parcela ainda não paga
          </h1>
          <p className="text-fg-muted mb-4">
            O recibo só é gerado após confirmação do pagamento.
          </p>
          <Link href="/painel/duplicatas" className="btn-primary !h-11 !px-5">
            ← voltar pra duplicatas
          </Link>
        </div>
      </div>
    );
  }

  const valorPago = parseFloat(row.pagoValor ?? row.valor);
  const valorOriginal = parseFloat(row.valor);

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10 print:p-0 print:bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <Link
            href="/painel/duplicatas"
            className="text-sm text-fg-muted hover:text-accent"
          >
            ← voltar pra duplicatas
          </Link>
          <PrintButton>Imprimir / Salvar PDF</PrintButton>
        </div>

        <article className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12 print:border-0 print:shadow-none">
          <header className="text-center mb-8 pb-6 border-b border-border">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-fg-dim mb-3">
              Antecipaqui · Recibo de pagamento
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Pagamento confirmado
            </h1>
            <p className="mt-2 text-fg-muted">
              parcela {row.numero} da operação{" "}
              <strong className="font-mono">{row.opNumero}</strong>
            </p>
          </header>

          <div className="mb-8 text-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              valor pago
            </div>
            <div className="font-mono tabular text-5xl font-bold text-success">
              {formatBRL(valorPago)}
            </div>
            <div className="text-sm text-fg-muted mt-2">
              em {fmtDate(row.pagoEm)}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-8">
            <Box label="Pagadora · construtora">
              <div className="font-bold">{row.construtoraRazao ?? "—"}</div>
              <div className="text-xs font-mono text-fg-muted mt-1">
                CNPJ {row.construtoraCnpj ?? "—"}
              </div>
              {row.construtoraEndereco && (
                <div className="text-xs text-fg-muted mt-1">
                  {[row.construtoraEndereco, row.construtoraCidade, row.construtoraUf]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </Box>
            <Box label="Beneficiário · fundo investidor">
              <div className="font-bold">
                {row.fundoNomeFantasia ?? row.fundoRazao ?? "—"}
              </div>
              {row.fundoCnpj && (
                <div className="text-xs font-mono text-fg-muted mt-1">
                  CNPJ {row.fundoCnpj}
                </div>
              )}
              <div className="text-[11px] text-fg-muted mt-2">
                Pagamento via Antecipaqui pela operação{" "}
                <span className="font-mono">{row.opNumero}</span>, com cedente{" "}
                <strong>{row.corretorNome ?? "—"}</strong>.
              </div>
            </Box>
          </div>

          <div className="rounded-2xl border border-border bg-bg p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-3">
              Detalhes do pagamento
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <Detalhe label="Parcela" value={`${row.numero}`} />
              <Detalhe label="Vencimento original" value={fmtDate(row.vencimento)} />
              <Detalhe
                label="Valor original"
                value={formatBRL(valorOriginal)}
              />
              <Detalhe
                label="Valor efetivamente pago"
                value={formatBRL(valorPago)}
              />
              <Detalhe label="Data do pagamento" value={fmtDate(row.pagoEm)} />
              <Detalhe
                label="Comissão total da operação"
                value={formatBRL(parseFloat(row.opValorComissao))}
              />
            </dl>
          </div>

          <footer className="mt-10 pt-6 border-t border-border text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">
              recibo gerado automaticamente pela plataforma Antecipaqui
            </p>
            <p className="mt-1 text-[11px] text-fg-muted">
              Documento informativo válido como comprovante de quitação
              parcial das comissões devidas. ID:{" "}
              <span className="font-mono">{row.parcelaId.slice(0, 12)}…</span>
            </p>
          </footer>
        </article>

        <style>{`
          @media print {
            @page { size: A4; margin: 14mm; }
            body { background: white !important; color: black !important; }
          }
        `}</style>
      </div>
    </div>
  );
}

function Box({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg p-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function Detalhe({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-fg-dim font-mono">
        {label}
      </dt>
      <dd className="font-mono tabular text-fg font-semibold mt-0.5">
        {value}
      </dd>
    </div>
  );
}
