import { Logo } from "@/components/logo";
import { formatBRL } from "@/lib/format";
import type { BorderoData } from "@/lib/bordero";

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtPct(n: number, digits = 2) {
  return (n * 100).toFixed(digits).replace(".", ",") + "%";
}

function fmtCNPJ(s: string | null) {
  if (!s) return "—";
  const c = s.replace(/\D/g, "");
  if (c.length !== 14) return s;
  return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function BorderoCard({ data }: { data: BorderoData }) {
  return (
    <div className="bordero rounded-2xl border border-border bg-bg-elev shadow-sm overflow-hidden print:shadow-none print:border-0">
      <div className="bg-gradient-to-r from-accent to-accent-soft px-6 md:px-8 py-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Logo size={36} className="text-white" />
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/80">
            Borderô da operação
          </div>
          <div className="font-mono font-bold text-white text-lg leading-tight">
            {data.numero}
          </div>
          <div className="font-mono text-[11px] text-white/85 mt-1">
            realizada em {fmtDate(data.dataVenda)}
            <span className="mx-1.5 opacity-60">·</span>
            taxa {fmtPct(data.taxaMensal)} a.m.
          </div>
        </div>
      </div>

      <div className="px-6 md:px-8 py-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Cedente"
            value={data.cedente.razaoSocial}
            sub={
              data.cedente.cnpj
                ? `CNPJ ${fmtCNPJ(data.cedente.cnpj)}`
                : `Responsável: ${data.cedente.nomeResponsavel}`
            }
          />
          <Field
            label="Sacado (construtora)"
            value={data.construtora.razaoSocial}
            sub={`CNPJ ${fmtCNPJ(data.construtora.cnpj)}`}
          />
          <Field
            label="Valor da venda"
            value={formatBRL(data.valorVenda)}
            mono
          />
          <Field
            label="Comissão bruta"
            value={formatBRL(data.valorComissao)}
            mono
            tone="accent"
          />
        </div>

        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-bg-card border-b border-border">
              <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                <th className="px-3 py-2.5 text-left">#</th>
                <th className="px-3 py-2.5 text-left">Vencimento</th>
                <th className="px-3 py-2.5 text-right">Prazo</th>
                <th className="px-3 py-2.5 text-right">Valor bruto</th>
                <th className="px-3 py-2.5 text-right">Deságio</th>
                <th className="px-3 py-2.5 text-right">Valor líquido</th>
              </tr>
            </thead>
            <tbody>
              {data.parcelas.map((p) => (
                <tr key={p.numero} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-mono text-xs text-fg-muted">
                    {String(p.numero).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-fg">
                    {fmtDate(p.vencimento)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-fg-muted">
                    {p.prazoDias}d
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular text-xs text-fg">
                    {formatBRL(p.valorBruto)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular text-xs text-warn">
                    {formatBRL(p.desagio)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular text-sm text-fg font-semibold">
                    {formatBRL(p.valorLiquido)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-bg-card border-t-2 border-border-strong font-mono text-[10px] uppercase tracking-wider">
                <td className="px-3 py-3 text-fg-dim" colSpan={2}>
                  [{data.parcelas.length}] parcela{data.parcelas.length === 1 ? "" : "s"}
                </td>
                <td className="px-3 py-3 text-right text-fg-dim">total</td>
                <td className="px-3 py-3 text-right tabular text-fg font-bold">
                  {formatBRL(data.totais.valorBruto)}
                </td>
                <td className="px-3 py-3 text-right tabular text-warn font-bold">
                  {formatBRL(data.totais.desagio)}
                </td>
                <td className="px-3 py-3 text-right tabular text-accent font-bold text-sm">
                  {formatBRL(data.totais.valorLiquido)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Stat
            label="Comissão bruta"
            value={formatBRL(data.totais.valorBruto)}
          />
          <Stat
            label="Deságio total"
            value={formatBRL(data.totais.desagio)}
            tone="warn"
          />
          <Stat
            label="Líquido a receber"
            value={formatBRL(data.totais.valorLiquido)}
            tone="accent"
            highlight
          />
        </div>

        {(data.cedente.bancoNome || data.cedente.bancoConta) && (
          <div className="rounded-xl border border-border bg-bg-card p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
              pagamento — dados bancários do cedente
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <FieldR label="Banco" value={data.cedente.bancoNome} />
              <FieldR label="Código" value={data.cedente.bancoCodigo} mono />
              <FieldR label="Agência" value={data.cedente.bancoAgencia} mono />
              <FieldR label="Conta" value={data.cedente.bancoConta} mono />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-[11px] text-fg-dim font-mono pt-2 border-t border-border">
          {data.fundo && <span>fundo · {data.fundo.razaoSocial}</span>}
          {data.comercial && <span>comercial · {data.comercial.nome}</span>}
          <span className="ml-auto">
            taxa aplicada {fmtPct(data.taxaMensal)} a.m.
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  sub,
  mono = false,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  tone?: "default" | "accent";
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`text-base font-semibold leading-tight ${mono ? "font-mono tabular" : ""} ${
          tone === "accent" ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-fg-muted mt-0.5 font-mono">{sub}</div>
      )}
    </div>
  );
}

function FieldR({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-0.5">
        {label}
      </div>
      <div
        className={`${mono ? "font-mono" : ""} ${value ? "text-fg" : "text-fg-dim italic"}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "warn";
  highlight?: boolean;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : "border-border bg-bg-card";
  const valueColor =
    tone === "accent"
      ? "text-accent"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div className={`rounded-xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-lg sm:text-xl font-bold tracking-tight leading-tight ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}
