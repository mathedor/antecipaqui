import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PrintButton } from "@/components/print-button";
import { getCurrentComercial } from "@/lib/actions/comerciais";
import {
  getHoleriteMes,
  listMesesComComissao,
} from "@/lib/actions/comercial-holerite";
import { formatBRL } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Holerite mensal" };
export const dynamic = "force-dynamic";

type Search = {
  searchParams: Promise<{ ym?: string }>;
};

export default async function ComercialHoleritePage({ searchParams }: Search) {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const comercial = await getCurrentComercial();
  if (!comercial) redirect("/painel");

  const { ym: ymParam } = await searchParams;

  // Default = mês atual
  const today = new Date();
  const ymDefault = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const ym = ymParam ?? ymDefault;

  const [holerite, meses] = await Promise.all([
    getHoleriteMes(comercial.id, ym, "pagas"),
    listMesesComComissao(comercial.id),
  ]);

  // Garante que o mês selecionado aparece no dropdown mesmo se não tem comissão
  const mesesDropdown = meses.find((m) => m.ym === ym)
    ? meses
    : [{ ym, label: monthLabel(ym) }, ...meses];

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/comissoes/holerite"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">holerite · comissão mensal</div>
        <h1 className="text-display-md">
          Recibo de{" "}
          <span className="text-gradient-blue">{holerite.label}</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Detalhamento das comissões pagas a você no mês. Imprima ou salve em
          PDF pelo botão do navegador (⌘+P / Ctrl+P).
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-comissoes-holerite" />
        </div>
      </div>

      {/* Seletor de mês */}
      <form
        method="get"
        action="/painel/comissoes/holerite"
        className="mb-6 flex items-center gap-2 flex-wrap print:hidden"
      >
        <label className="text-xs font-mono uppercase tracking-wider text-fg-dim">
          mês:
        </label>
        <select
          name="ym"
          defaultValue={ym}
          className="h-10 px-3 rounded-lg border border-border bg-bg text-sm"
        >
          {mesesDropdown.map((m) => (
            <option key={m.ym} value={m.ym}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold"
        >
          Carregar
        </button>
        <Link
          href="/painel/comissoes"
          className="text-xs text-accent font-semibold hover:underline ml-2"
        >
          ← lista de comissões
        </Link>
      </form>

      {/* Recibo "papel" */}
      <article className="rounded-2xl border border-border bg-white text-black p-6 md:p-10 mb-6 shadow-sm print:shadow-none print:border-0">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 pb-5 border-b border-gray-200 mb-5 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">
              recibo de comissão
            </div>
            <h2 className="text-2xl font-bold">
              {comercial.apelido ?? comercial.nomeCompleto}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {comercial.tipoPessoa === "juridica" ? "CNPJ" : "CPF"}:{" "}
              <span className="font-mono">{comercial.documento}</span>
            </p>
            <p className="text-sm text-gray-600">
              Email:{" "}
              <span className="font-mono">{comercial.email}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-mono mb-1">
              referente
            </div>
            <div className="text-xl font-bold">{holerite.label}</div>
            <div className="text-xs text-gray-500 mt-1">
              emitido em{" "}
              {new Date().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </div>
          </div>
        </header>

        {/* Totais grandes */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <ReciboKpi
            label="Comissão paga no mês"
            value={formatBRL(holerite.totalPago)}
            highlight
          />
          <ReciboKpi
            label="Total bruto (gerado)"
            value={formatBRL(holerite.totalBruto)}
          />
          <ReciboKpi
            label="Saldo em aberto"
            value={formatBRL(holerite.totalAberto)}
          />
        </div>

        {/* Tabela detalhada */}
        {holerite.itens.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500 text-sm">
            Sem comissões pagas neste mês.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 font-mono border-b border-gray-200">
                  <th className="py-2 pr-3">Op</th>
                  <th className="py-2 pr-3">Construtora · Corretor</th>
                  <th className="py-2 pr-3 text-right">Gerada</th>
                  <th className="py-2 pr-3 text-right">Devido</th>
                  <th className="py-2 pr-3 text-right">Pago</th>
                  <th className="py-2 pr-3 text-right">Saldo</th>
                  <th className="py-2 pr-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {holerite.itens.map((it) => (
                  <tr
                    key={it.comissaoId}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="py-2 pr-3 font-mono text-xs">
                      {it.operacaoNumero}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-700">
                      <div className="font-semibold truncate max-w-[260px]">
                        {it.construtoraNome ?? "—"}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[260px]">
                        {it.corretorNome ?? "—"}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-[10px] text-gray-500">
                      {new Date(it.geradaEm).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular">
                      {formatBRL(it.valorDevido)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular font-semibold text-green-700">
                      {formatBRL(it.valorPago)}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-mono tabular ${it.saldo > 0 ? "text-amber-700" : "text-gray-400"}`}
                    >
                      {formatBRL(it.saldo)}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <span
                        className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          it.status === "paga"
                            ? "bg-green-100 text-green-700"
                            : it.status === "pendente"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {it.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td colSpan={3} className="py-3 pr-3 text-sm">
                    Total
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular text-sm">
                    {formatBRL(holerite.totalBruto)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular text-base text-green-700">
                    {formatBRL(holerite.totalPago)}
                  </td>
                  <td className="py-3 pr-3 text-right font-mono tabular text-sm text-amber-700">
                    {formatBRL(holerite.totalAberto)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="text-[10px] text-gray-400 mt-6 font-mono">
          Este recibo é emitido eletronicamente pela Antecipaqui. Não substitui
          documentação fiscal — consulte seu contador.
        </p>
      </article>

      <div className="flex gap-3 print:hidden">
        <PrintButton>🖨️ Imprimir / Salvar PDF</PrintButton>
      </div>
    </PainelShell>
  );
}

function ReciboKpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 border ${
        highlight ? "border-green-500 bg-green-50" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div
        className={`text-[9px] uppercase tracking-wider font-mono mb-1 ${
          highlight ? "text-green-700" : "text-gray-500"
        }`}
      >
        {label}
      </div>
      <div
        className={`font-mono tabular text-xl font-bold ${
          highlight ? "text-green-700" : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  const LABELS = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${LABELS[m - 1]}/${String(y).slice(2)}`;
}
