import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getOpsAguardandoFundo } from "@/lib/actions/fundo-mesa";
import { formatBRL } from "@/lib/format";
import { DecisaoForm } from "@/components/fundo-decisao-form";

export const metadata = { title: "Aprovar · Painel do fundo" };
export const dynamic = "force-dynamic";

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return dt.toLocaleDateString("pt-BR");
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2).replace(".", ",")}%`;
}

export default async function FundoAprovarPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  const ops = await getOpsAguardandoFundo();
  if (!ops) {
    return (
      <PainelShell role="fundo" userName={user.nome} active="/painel/aprovar">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Fundo não vinculado
          </h1>
        </div>
      </PainelShell>
    );
  }

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/aprovar">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · mesa de decisão</div>
        <h1 className="text-display-md">
          {ops.length} operaç
          {ops.length === 1 ? "ão aguardando" : "ões aguardando"} sua{" "}
          <span className="text-gradient-blue">aprovação</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Ops que admin enviou pro seu fundo. Decida em 30 segundos:
          documentos validados (IA), score da construtora baseado no seu
          histórico, e detalhamento financeiro consolidado.
        </p>
      </div>

      {ops.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          🎉 Nenhuma operação pendente. Quando o admin enviar novas
          operações pro seu fundo, elas aparecem aqui.
          <div className="mt-4">
            <Link
              href="/painel/regras"
              className="text-accent hover:underline text-sm"
            >
              Configurar regras de auto-aprovação →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {ops.map((op) => {
            const scoreClass =
              op.scoreConstrutora >= 75
                ? "text-success"
                : op.scoreConstrutora >= 50
                  ? "text-fg"
                  : "text-danger";
            const docsTotal =
              op.docsStatus.ok + op.docsStatus.revisao + op.docsStatus.semValidacao;
            return (
              <article
                key={op.operacaoId}
                className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6"
              >
                {/* Header com numero + construtora + corretor */}
                <div className="flex items-baseline justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <Link
                      href={`/painel/operacoes/${op.operacaoId}`}
                      className="font-mono text-base font-bold text-fg hover:text-accent"
                    >
                      {op.numero}
                    </Link>
                    <div className="text-sm text-fg-muted mt-0.5">
                      <strong>{op.construtoraNome ?? "—"}</strong>
                      {op.imobiliariaNome && ` · ${op.imobiliariaNome}`}
                      {op.corretorNome && ` · ${op.corretorNome}`}
                    </div>
                    <div className="font-mono text-[10px] text-fg-dim mt-0.5">
                      venda {fmtDate(op.dataVenda)} ·{" "}
                      {op.aprovadoEm
                        ? `aprovada por admin em ${fmtDate(op.aprovadoEm)}`
                        : "enviada pra você"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      score construtora
                    </div>
                    <div className={`font-mono tabular text-3xl font-bold ${scoreClass}`}>
                      {op.scoreConstrutora}
                      <span className="text-xs text-fg-muted font-normal ml-0.5">
                        /100
                      </span>
                    </div>
                    <div className="text-[10px] text-fg-dim">
                      {op.opsComConstrutora} op
                      {op.opsComConstrutora === 1 ? "" : "s"} prévia
                      {op.opsComConstrutora === 1 ? "" : "s"} com você
                    </div>
                  </div>
                </div>

                {/* Decomposição financeira */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  <Stat label="Valor comissão" value={formatBRL(op.valorComissao)} />
                  <Stat label="VP (você desembolsa)" value={formatBRL(op.valorPresente)} tone="accent" />
                  <Stat label="Juros total" value={formatBRL(op.juros)} />
                  <Stat
                    label="Sua parte"
                    value={formatBRL(op.parteFundo)}
                    tone="success"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-xs">
                  <Mini
                    label="Spread (taxas)"
                    value={`${fmtPct(op.spreadPct)}/m`}
                  />
                  <Mini
                    label="Taxa op / fundo"
                    value={`${fmtPct(op.taxaOpMensal)} / ${fmtPct(op.taxaFundoMensal)}`}
                  />
                  <Mini label="Prazo" value={`${op.numeroParcelas} parcelas`} />
                  <Mini
                    label="Custos op"
                    value={formatBRL(op.custos)}
                    tone={op.custos > 0 ? "warn" : "default"}
                  />
                </div>

                {/* Docs status */}
                <div className="flex items-center gap-2 mb-5 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    documentos:
                  </span>
                  {docsTotal === 0 ? (
                    <span className="text-xs text-danger">
                      ⚠ nenhum documento anexado
                    </span>
                  ) : (
                    <>
                      {op.docsStatus.ok > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-green-50 text-success border border-success/30">
                          ✓ {op.docsStatus.ok} validado
                          {op.docsStatus.ok === 1 ? "" : "s"} (IA)
                        </span>
                      )}
                      {op.docsStatus.revisao > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-yellow-50 text-warn border border-warn/30">
                          ⚠ {op.docsStatus.revisao} revisar
                        </span>
                      )}
                      {op.docsStatus.semValidacao > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-bg-card text-fg-muted border border-border">
                          {op.docsStatus.semValidacao} sem validação
                        </span>
                      )}
                    </>
                  )}
                  <span className="flex-1" />
                  <Link
                    href={`/painel/operacoes/${op.operacaoId}`}
                    className="text-accent text-xs font-mono hover:underline"
                  >
                    ver 360 →
                  </Link>
                </div>

                {/* Ações */}
                <DecisaoForm
                  operacaoId={op.operacaoId}
                  numero={op.numero}
                />
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-fg-muted">
        <Link
          href="/painel/regras"
          className="text-accent hover:underline font-semibold"
        >
          ⚙ Configurar regras de auto-aprovação →
        </Link>
        {" — "}
        deixe que o sistema aprove sozinho ops que casarem com seu perfil.
      </p>
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
  tone?: "default" | "accent" | "success";
}) {
  const valueCls =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
        ? "text-success"
        : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div className={`font-mono tabular text-sm md:text-base font-bold ${valueCls}`}>
        {value}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
        {label}
      </span>
      <span
        className={`font-mono tabular text-xs ${
          tone === "warn" ? "text-warn font-semibold" : "text-fg"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
