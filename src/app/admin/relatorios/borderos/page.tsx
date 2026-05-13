import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getBorderosBatch } from "@/lib/borderos-batch";
import { listFundosForSelector } from "@/lib/actions/fundos";
import { listConstrutorasForSelector } from "@/lib/actions/admin-cadastrar";
import { listImobiliariasForLote } from "@/lib/actions/pending-operacoes";
import { listComerciaisForSelector } from "@/lib/actions/comerciais";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Admin · Borderôs consolidados",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "documentos_incompletos", label: "Docs incompletos" },
  { value: "pre_aprovada", label: "Pré-aprovada" },
  { value: "analise_final", label: "Análise final" },
  { value: "enviada_para_assinatura", label: "Em assinatura" },
  { value: "enviada_para_pagamento", label: "Em pagamento" },
  { value: "realizada", label: "Realizada" },
  { value: "recusada", label: "Recusada" },
  { value: "cancelada", label: "Cancelada" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, o.label]),
);

function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

type Search = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    fundoId?: string;
    construtoraId?: string;
    imobiliariaId?: string;
    comercialId?: string;
    status?: string;
  }>;
};

export default async function BorderosConsolidadosPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const sp = await searchParams;

  const [batch, fundos, construtorasList, imobs, comerciaisList] =
    await Promise.all([
      getBorderosBatch({
        from: sp.from || undefined,
        to: sp.to || undefined,
        fundoId: sp.fundoId || undefined,
        construtoraId: sp.construtoraId || undefined,
        imobiliariaId: sp.imobiliariaId || undefined,
        comercialId: sp.comercialId || undefined,
        status: sp.status || undefined,
      }),
      listFundosForSelector(),
      listConstrutorasForSelector(),
      listImobiliariasForLote(),
      listComerciaisForSelector(),
    ]);

  const hasFilter =
    !!sp.from ||
    !!sp.to ||
    !!sp.fundoId ||
    !!sp.construtoraId ||
    !!sp.imobiliariaId ||
    !!sp.comercialId ||
    !!sp.status;

  // Querystring pra exportações (mesmo conjunto de filtros)
  const exportQs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v) exportQs.set(k, v);
  }
  const exportSuffix = exportQs.toString()
    ? `?${exportQs.toString()}`
    : "";

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <Link
        href="/admin/relatorios"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← relatórios
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">borderôs</div>
        <h1 className="text-display-md">
          Borderôs <span className="text-gradient-blue">consolidados</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Lista de operações com totais agregados (bruto, deságio, líquido,
          custos). Filtre por período/fundo/construtora/cedente e exporte CSV
          ou PDF consolidado.
        </p>
      </div>

      {/* Filtros */}
      <form
        method="get"
        action="/admin/relatorios/borderos"
        className="mb-6 rounded-2xl border border-border bg-bg-elev p-5 grid grid-cols-12 gap-3"
      >
        <div className="col-span-12 md:col-span-3">
          <label className="block text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
            Período (data da venda)
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              name="from"
              defaultValue={sp.from ?? ""}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
            />
            <input
              type="date"
              name="to"
              defaultValue={sp.to ?? ""}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
            />
          </div>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
            Fundo
          </label>
          <select
            name="fundoId"
            defaultValue={sp.fundoId ?? ""}
            className="w-full h-10 px-2 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
          >
            <option value="">Todos</option>
            {fundos.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomeFantasia ?? f.razaoSocial}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
            Construtora
          </label>
          <select
            name="construtoraId"
            defaultValue={sp.construtoraId ?? ""}
            className="w-full h-10 px-2 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
          >
            <option value="">Todas</option>
            {construtorasList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razaoSocial}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
            Imobiliária
          </label>
          <select
            name="imobiliariaId"
            defaultValue={sp.imobiliariaId ?? ""}
            className="w-full h-10 px-2 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
          >
            <option value="">Todas</option>
            {imobs.map((i) => (
              <option key={i.id} value={i.id}>
                {i.razaoSocial}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
            Comercial
          </label>
          <select
            name="comercialId"
            defaultValue={sp.comercialId ?? ""}
            className="w-full h-10 px-2 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
          >
            <option value="">Todos</option>
            {comerciaisList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nomeCompleto}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-6 md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
            Status operação
          </label>
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="w-full h-10 px-2 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-12 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="h-10 px-5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
          >
            Filtrar
          </button>
          {hasFilter && (
            <Link
              href="/admin/relatorios/borderos"
              className="text-xs text-accent hover:underline"
            >
              Limpar filtros
            </Link>
          )}
          <div className="ml-auto flex gap-2">
            <a
              href={`/api/borderos/csv${exportSuffix}`}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold text-fg hover:border-accent hover:text-accent"
            >
              📊 Baixar CSV
            </a>
            <a
              href={`/api/borderos/pdf-batch${exportSuffix}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold text-fg hover:border-accent hover:text-accent"
            >
              📄 PDF consolidado
            </a>
          </div>
        </div>
      </form>

      {/* Stats agregados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Operações"
          value={String(batch.agregados.qtdOperacoes)}
          highlight
        />
        <Stat
          label="Valor de venda"
          value={formatBRL(batch.agregados.valorVendaTotal)}
        />
        <Stat
          label="Comissão bruta"
          value={formatBRL(batch.agregados.bruto)}
        />
        <Stat
          label="Líquido pro cedente"
          value={formatBRL(batch.agregados.liquidoCedente)}
          tone="success"
        />
        <Stat
          label="Deságio total"
          value={formatBRL(batch.agregados.desagio)}
          tone="warn"
        />
        <Stat
          label="Líquido (antes custos)"
          value={formatBRL(batch.agregados.liquido)}
        />
        <Stat
          label="Custos totais"
          value={formatBRL(batch.agregados.custos)}
          tone="warn"
        />
        <Stat
          label="Comissão original"
          value={formatBRL(batch.agregados.valorComissaoTotal)}
        />
      </div>

      {/* Tabela */}
      {batch.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-fg-muted">
            Nenhuma operação bate com esses filtros.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card border-b border-border text-left">
                <Th>Op</Th>
                <Th>Data</Th>
                <Th>Cedente</Th>
                <Th>Construtora</Th>
                <Th>Fundo</Th>
                <Th right>Bruto</Th>
                <Th right>Deságio</Th>
                <Th right>Líquido</Th>
                <Th right>Custos</Th>
                <Th right>Líq. cedente</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {batch.rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border hover:bg-bg-card transition-colors"
                >
                  <Td className="font-mono font-semibold">{r.numero}</Td>
                  <Td className="font-mono text-xs">
                    {formatDate(r.dataVenda)}
                  </Td>
                  <Td className="truncate max-w-[180px]">{r.cedenteNome}</Td>
                  <Td className="truncate max-w-[180px]">
                    {r.construtoraNome}
                  </Td>
                  <Td className="truncate max-w-[140px] text-fg-muted">
                    {r.fundoNome ?? "—"}
                  </Td>
                  <Td right className="font-mono">
                    {formatBRL(r.totaisBruto)}
                  </Td>
                  <Td right className="font-mono text-warn">
                    {formatBRL(r.totaisDesagio)}
                  </Td>
                  <Td right className="font-mono">
                    {formatBRL(r.totaisLiquido)}
                  </Td>
                  <Td right className="font-mono text-fg-muted">
                    {formatBRL(r.custosTotal)}
                  </Td>
                  <Td right className="font-mono text-success font-semibold">
                    {formatBRL(r.valorLiquidoCedente)}
                  </Td>
                  <Td className="text-xs text-fg-muted">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Td>
                  <Td>
                    <Link
                      href={`/operacoes/${r.id}/bordero`}
                      target="_blank"
                      rel="noopener"
                      className="text-accent hover:underline text-xs font-semibold"
                    >
                      abrir →
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
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
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-accent/40 bg-accent-soft"
          : "border-border bg-bg-elev"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${toneClass}`}>
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

function Td({
  children,
  className = "",
  right = false,
}: {
  children?: React.ReactNode;
  className?: string;
  right?: boolean;
}) {
  return (
    <td
      className={`px-3 py-2.5 align-middle ${
        right ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}
