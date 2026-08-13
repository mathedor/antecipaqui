import { getDuplicatasDaOperacao } from "@/lib/actions/opera";
import { formatBRL } from "@/lib/format";
import { toBlobProxyHref } from "@/lib/blob-url";

/** Duplicatas da operação no painel do cliente — construtora paga,
 *  imobiliária e cedente acompanham. Some quando não há título emitido. */
export async function OperaDuplicatasCliente({
  operacaoId,
}: {
  operacaoId: string;
}) {
  const duplicatas = await getDuplicatasDaOperacao(operacaoId);
  if (duplicatas.length === 0) return null;

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <h2 className="text-lg font-bold tracking-tight mb-1">Duplicatas</h2>
      <p className="text-sm text-fg-muted mb-5">
        Títulos emitidos para esta operação. O arquivo fica guardado aqui — se
        o link original expirar, o download continua funcionando.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
              <th className="text-left p-3">Nº</th>
              <th className="text-left p-3">Valor</th>
              <th className="text-left p-3">Vencimento</th>
              <th className="text-left p-3">Situação</th>
              <th className="text-left p-3">Linha digitável</th>
              <th className="text-left p-3">Arquivo</th>
            </tr>
          </thead>
          <tbody>
            {duplicatas.map((d) => {
              const vencida = d.situacao === "aberta" && d.vencimento < hoje;
              return (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="p-3 font-mono text-xs">{d.numero}</td>
                  <td className="p-3 tabular">{formatBRL(Number(d.valor))}</td>
                  <td className="p-3 whitespace-nowrap">
                    {new Date(d.vencimento + "T00:00:00").toLocaleDateString(
                      "pt-BR",
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`chip ${
                        d.situacao === "paga"
                          ? "bg-green-50 border-success/40 text-success"
                          : vencida
                            ? "bg-red-50 border-danger/40 text-danger"
                            : "bg-yellow-50 border-warn/40 text-warn"
                      }`}
                    >
                      {d.situacao === "paga"
                        ? "paga"
                        : vencida
                          ? "vencida"
                          : "em aberto"}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-fg-muted break-all max-w-xs">
                    {d.linhaDigitavel ?? "—"}
                  </td>
                  <td className="p-3">
                    {d.arquivoUrl ? (
                      <a
                        href={toBlobProxyHref(d.arquivoUrl)}
                        className="text-accent text-xs font-medium"
                      >
                        baixar
                      </a>
                    ) : d.linkExterno ? (
                      <a
                        href={d.linkExterno}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent text-xs font-medium"
                      >
                        baixar
                      </a>
                    ) : (
                      <span className="text-fg-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
