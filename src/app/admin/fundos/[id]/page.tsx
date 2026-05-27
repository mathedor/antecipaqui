import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { IniciarContatoButton } from "@/components/iniciar-contato-button";
import { FundoConviteLogin } from "@/components/fundo-convite-login";
import { getFundoDetail } from "@/lib/actions/fundos";
import { audit } from "@/lib/audit";
import { formatBRL } from "@/lib/format";
import { toBlobProxyHref } from "@/lib/blob-url";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Fundo" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminFundoDetail({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getFundoDetail(id);
  if (!detail) notFound();

  audit({
    action: "view_fundo",
    targetType: "fundo",
    targetId: id,
    targetLabel: detail.fundo.razaoSocial,
  }).catch(() => undefined);

  const { fundo, owner, operacoes, totals } = detail;
  const enderecoCompleto = [fundo.endereco, fundo.cidade, fundo.uf, fundo.cep && `CEP ${fundo.cep}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <Link
        href="/admin/fundos"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← fundos
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-display-md">{fundo.razaoSocial}</h1>
          {fundo.nomeFantasia && (
            <p className="mt-1 text-fg-muted">{fundo.nomeFantasia}</p>
          )}
          <div className="mt-2">
            <PageHelp pageKey="admin-fundo-detalhe" />
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="font-mono text-xs text-fg-muted">
              CNPJ {fundo.cnpj}
            </span>
            <span className="size-1 rounded-full bg-fg-dim" />
            <span className="chip chip-accent" title="Taxa de juros base">
              {(parseFloat(fundo.taxaMensalBase) * 100)
                .toFixed(2)
                .replace(".", ",")}
              % a.m.
            </span>
            {parseFloat(fundo.custoFinanceiroPct ?? "0") > 0 && (
              <span
                className="chip bg-green-50 border-success/40 text-success"
                title="Custo financeiro / % de rateio devolvido pra Antecipaqui"
              >
                rateio{" "}
                {(parseFloat(fundo.custoFinanceiroPct) * 100)
                  .toFixed(2)
                  .replace(".", ",")}
                %
              </span>
            )}
            {parseFloat(fundo.impostosPct ?? "0") > 0 && (
              <span
                className="chip bg-yellow-50 border-warn/40 text-warn"
                title="% de impostos sobre os juros"
              >
                impostos{" "}
                {(parseFloat(fundo.impostosPct) * 100)
                  .toFixed(2)
                  .replace(".", ",")}
                %
              </span>
            )}
            {!fundo.isActive && (
              <span className="chip bg-red-50 border-danger/40 text-danger">
                ⛔ inativo
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <IniciarContatoButton
            telefone={fundo.telefone}
            nome={fundo.contatoResponsavel ?? fundo.razaoSocial}
          />
          <Link
            href={`/admin/fundos/${id}/editar`}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors"
          >
            ✎ Editar
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="Operações" value={String(totals.qtd)} />
        <Stat
          label="Total operado (VP)"
          value={formatBRL(totals.valorOperado)}
          highlight
        />
        <Stat
          label="Em ativo"
          value={formatBRL(totals.valorAtivo)}
          tone="success"
        />
        <Stat
          label="Resultado acumulado"
          value={formatBRL(totals.lucroDesagio)}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
          <Card label="Identificação">
            <Grid>
              <FieldR label="Razão social" value={fundo.razaoSocial} />
              <FieldR label="Nome fantasia" value={fundo.nomeFantasia} />
              <FieldR label="CNPJ" value={fundo.cnpj} mono />
              <FieldR label="Endereço" value={enderecoCompleto || null} />
            </Grid>
          </Card>

          <Card label="Contato">
            <Grid>
              <FieldR
                label="Contato responsável"
                value={fundo.contatoResponsavel}
              />
              <FieldR label="Telefone" value={fundo.telefone} mono />
              <FieldR label="Email comercial" value={fundo.emailComercial} mono />
              <FieldR
                label="Email para assinatura"
                value={fundo.emailAssinatura}
                mono
              />
            </Grid>
          </Card>

          <Card label="Dados bancários">
            <Grid>
              <FieldR label="Banco" value={fundo.bancoNome} />
              <FieldR label="Código" value={fundo.bancoCodigo} mono />
              <FieldR label="Agência" value={fundo.bancoAgencia} mono />
              <FieldR label="Conta" value={fundo.bancoConta} mono />
              <FieldR label="PIX" value={fundo.bancoPix} mono />
            </Grid>
          </Card>

          <Card label="Rateio interno · Antecipaqui">
            <Grid>
              <FieldR
                label="Custo financeiro / % rateio"
                value={
                  fundo.custoFinanceiroPct
                    ? `${(parseFloat(fundo.custoFinanceiroPct) * 100).toFixed(2).replace(".", ",")}%`
                    : null
                }
                mono
              />
              <FieldR
                label="Impostos do fundo (% sobre juros)"
                value={
                  fundo.impostosPct
                    ? `${(parseFloat(fundo.impostosPct) * 100).toFixed(2).replace(".", ",")}%`
                    : null
                }
                mono
              />
            </Grid>
            <p className="mt-3 text-[11px] text-fg-dim leading-relaxed">
              Saldo de repasse pra Antecipaqui = (Juros − Impostos) × % rateio.
              Veja todas as operações desse fundo em{" "}
              <a
                href={`/admin/interno/invoice?fundoId=${id}`}
                className="text-accent hover:underline"
              >
                Interno · Invoice
              </a>
              .
            </p>
          </Card>

          <Card label="Configurações · integrações">
            <div className="space-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
                  banco emissor de boletos
                </div>
                <Grid>
                  <FieldR label="Banco" value={fundo.boletosBancoNome} />
                  <FieldR
                    label="API de geração"
                    value={fundo.boletosApiUrl}
                    mono
                    link={fundo.boletosApiUrl}
                  />
                </Grid>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
                  sistema de gestão
                </div>
                <Grid>
                  <FieldR label="Sistema" value={fundo.sistemaGestaoNome} />
                  <FieldR
                    label="Documentação"
                    value={fundo.sistemaGestaoDocsUrl}
                    mono
                    link={fundo.sistemaGestaoDocsUrl}
                  />
                </Grid>
              </div>
            </div>
          </Card>

          <Card label={`Operações (${operacoes.length})`}>
            {operacoes.length === 0 ? (
              <p className="text-sm text-fg-muted">
                Nenhuma operação vinculada a este fundo ainda.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm min-w-[680px] table-cards">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
                      <th className="px-2 py-2 text-left">Número</th>
                      <th className="px-2 py-2 text-left">Cedente</th>
                      <th className="px-2 py-2 text-left">Construtora</th>
                      <th className="px-2 py-2 text-right">Comissão</th>
                      <th className="px-2 py-2 text-right">VP</th>
                      <th className="px-2 py-2 text-right">Taxa</th>
                      <th className="px-2 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operacoes.map((op) => (
                      <tr
                        key={op.id}
                        className="border-b border-border last:border-0 hover:bg-bg transition-colors"
                      >
                        <td className="px-2 py-2">
                          <Link
                            href={`/admin/operacoes/${op.id}`}
                            className="font-mono text-xs text-fg hover:text-accent"
                          >
                            {op.numero}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-xs text-fg-muted truncate max-w-[160px]">
                          {op.corretorNome ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-xs text-fg-muted truncate max-w-[160px]">
                          {op.construtoraNome ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular text-xs text-fg-muted">
                          {formatBRL(parseFloat(op.valorComissao))}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular text-xs text-fg font-semibold">
                          {formatBRL(parseFloat(op.valorPresente))}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {(parseFloat(op.taxaMensal) * 100)
                            .toFixed(2)
                            .replace(".", ",")}
                          %
                        </td>
                        <td className="px-2 py-2">
                          <OperacaoStatusBadge status={op.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                      <td className="px-2 py-2" colSpan={3}>
                        Totais
                      </td>
                      <td className="px-2 py-2 text-right tabular text-fg font-bold">
                        {formatBRL(
                          operacoes.reduce(
                            (s, o) => s + parseFloat(o.valorComissao),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular text-fg font-bold">
                        {formatBRL(totals.valorOperado)}
                      </td>
                      <td className="px-2 py-2" colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          <Card label="Login do fundo">
            {owner ? (
              <div className="space-y-2 text-sm">
                <p className="text-fg">
                  <span className="text-fg-muted text-xs uppercase tracking-wider font-mono block mb-0.5">
                    nome
                  </span>
                  {owner.nome ?? "—"}
                </p>
                <p className="text-fg">
                  <span className="text-fg-muted text-xs uppercase tracking-wider font-mono block mb-0.5">
                    email de login
                  </span>
                  <span className="font-mono">{owner.email}</span>
                </p>
                <p className="text-success text-xs mt-3">
                  ✓ Fundo já tem acesso ao painel
                </p>
              </div>
            ) : (
              <FundoConviteLogin
                fundoId={fundo.id}
                fundoNome={fundo.razaoSocial}
                emailComercial={fundo.emailComercial}
              />
            )}
          </Card>

          <Card label="Contrato modelo">
            {fundo.contratoUrl ? (
              <a
                href={toBlobProxyHref(fundo.contratoUrl)}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-bg hover:border-accent transition-colors text-sm"
              >
                <span className="truncate text-fg">
                  {fundo.contratoNome ?? "Contrato"}
                </span>
                <span className="text-accent text-xs whitespace-nowrap">
                  abrir ↗
                </span>
              </a>
            ) : (
              <p className="text-sm text-fg-muted">
                Nenhum contrato modelo carregado.{" "}
                <Link
                  href={`/admin/fundos/${id}/editar`}
                  className="text-accent hover:underline"
                >
                  Adicionar
                </Link>
              </p>
            )}
          </Card>
        </aside>
      </div>
    </AdminShell>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
        {label}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>;
}

function FieldR({
  label,
  value,
  mono = false,
  link,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: string | null;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      {link && value ? (
        <a
          href={link}
          target="_blank"
          rel="noopener"
          className={`text-sm break-all hover:underline ${mono ? "font-mono" : ""} text-accent`}
          title={value}
        >
          {value}
        </a>
      ) : (
        <div
          className={`text-sm break-all ${mono ? "font-mono" : ""} ${
            value ? "text-fg" : "text-fg-dim italic"
          }`}
        >
          {value || "—"}
        </div>
      )}
    </div>
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
  tone?: "default" | "success" | "warn";
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : "border-border bg-bg-elev";
  const valueColor = highlight
    ? "text-accent"
    : tone === "success"
      ? "text-success"
      : "text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight break-words ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}
