import { getIntegracaoDaOperacao } from "@/lib/actions/opera";
import {
  BotaoEnviarParaFundo,
  BotaoReenviarOperacao,
} from "@/components/opera-acoes";
import { formatBRL } from "@/lib/format";
import { toBlobProxyHref } from "@/lib/blob-url";

const ROTULO_JOB: Record<string, string> = {
  consultar_cliente: "Consulta de cadastro",
  cadastrar_cliente: "Cadastro do cliente",
  enviar_operacao: "Envio da operação",
};

const ROTULO_JOB_STATUS: Record<string, string> = {
  pendente: "na fila",
  processando: "em execução",
  concluido: "concluído",
  falhou: "falhou",
  desistido: "desistiu",
  bloqueado: "esperando correção",
};

const ROTULO_SITUACAO: Record<string, string> = {
  nao_consultado: "não consultado",
  nao_encontrado: "não existe no fundo",
  enviado: "enviado",
  em_analise: "em análise no fundo",
  aprovado: "aprovado",
  reprovado: "reprovado",
  erro: "erro",
};

function quando(d: Date | null) {
  return d ? new Date(d).toLocaleString("pt-BR") : "—";
}

function corDaSituacao(s: string) {
  if (s === "aprovado") return "bg-green-50 border-success/40 text-success";
  if (s === "reprovado" || s === "erro")
    return "bg-red-50 border-danger/40 text-danger";
  return "bg-yellow-50 border-warn/40 text-warn";
}

/** Aba OPERA da operação (admin): o que enviamos, o que voltou, e os botões
 *  de reenviar. Não renderiza nada quando o fundo da operação não é integrado. */
export async function OperaAbaOperacao({ operacaoId }: { operacaoId: string }) {
  const dados = await getIntegracaoDaOperacao(operacaoId);
  if (!dados) return null;

  const { fundo, espelho, clientes, jobs, eventos, duplicatas } = dados;

  return (
    <section className="mt-8 rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold tracking-tight">
            Integração · {fundo.nome}
          </h2>
          <p className="text-sm text-fg-muted mt-1">
            O fundo é dono do estado desta operação. Aqui fica o espelho do que
            saiu daqui e do que voltou de lá.
          </p>
        </div>
        <span
          className={`chip ${
            fundo.ambiente === "producao"
              ? "bg-green-50 border-success/40 text-success"
              : "bg-yellow-50 border-warn/40 text-warn"
          }`}
        >
          {fundo.ambiente === "producao" ? "produção" : "ambiente de teste"}
        </span>
      </div>

      {/* Estado atual */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Campo
          rotulo="Número no fundo"
          valor={espelho?.externoId ?? "ainda não enviada"}
        />
        <Campo
          rotulo="Status no fundo"
          valor={espelho?.statusLabel ?? "—"}
          alerta={espelho?.statusDesconhecido ?? false}
        />
        <Campo rotulo="Último evento" valor={quando(espelho?.ultimoEventoEm ?? null)} />
      </div>

      {espelho?.statusDesconhecido && (
        <div className="rounded-xl border border-warn/40 bg-yellow-50 text-warn p-3 text-sm mb-6">
          O fundo enviou o status{" "}
          <code className="font-mono">{espelho.statusExterno}</code>, que não
          está no catálogo. A esteira do cliente não foi alterada — inclua o
          estado no catálogo para que ele passe a valer.
        </div>
      )}

      {espelho?.observacao && (
        <div className="rounded-xl border border-border bg-bg p-3 text-sm mb-6">
          <span className="text-fg-dim font-mono text-[11px] uppercase tracking-wider block mb-1">
            observação do fundo
          </span>
          {espelho.observacao}
        </div>
      )}

      {espelho?.linkAssinatura && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft p-3 text-sm mb-6 break-all">
          <span className="text-fg-dim font-mono text-[11px] uppercase tracking-wider block mb-1">
            link de assinatura enviado ao cedente
          </span>
          <a href={espelho.linkAssinatura} target="_blank" rel="noreferrer" className="text-accent">
            {espelho.linkAssinatura}
          </a>
        </div>
      )}

      {/* Cadastros */}
      <h3 className="text-sm font-semibold mb-3">Cadastros no fundo</h3>
      {clientes.length === 0 ? (
        <p className="text-sm text-fg-muted mb-6">
          Nenhuma consulta cadastral feita ainda.
        </p>
      ) : (
        <ul className="space-y-2 mb-6">
          {clientes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg p-3 text-sm"
            >
              <span className="font-medium">
                {c.entidadeTipo === "construtora" ? "Construtora" : "Imobiliária"}
              </span>
              <span className="font-mono text-xs text-fg-muted">{c.cnpj}</span>
              <span className={`chip ${corDaSituacao(c.situacao)}`}>
                {ROTULO_SITUACAO[c.situacao] ?? c.situacao}
              </span>
              {c.motivo && (
                <span className="text-xs text-danger w-full">{c.motivo}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Duplicatas */}
      {duplicatas.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-3">Duplicatas</h3>
          <div className="overflow-x-auto rounded-xl border border-border mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
                  <th className="text-left p-3">Nº</th>
                  <th className="text-left p-3">Valor</th>
                  <th className="text-left p-3">Vencimento</th>
                  <th className="text-left p-3">Parcela</th>
                  <th className="text-left p-3">Arquivo</th>
                </tr>
              </thead>
              <tbody>
                {duplicatas.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{d.numero}</td>
                    <td className="p-3 tabular">{formatBRL(Number(d.valor))}</td>
                    <td className="p-3">
                      {new Date(d.vencimento + "T00:00:00").toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="p-3">
                      {d.parcelaId ? (
                        <span className="chip bg-green-50 border-success/40 text-success">
                          casada
                        </span>
                      ) : (
                        <span className="chip bg-yellow-50 border-warn/40 text-warn">
                          sem parcela
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {d.arquivoUrl ? (
                        <a
                          href={toBlobProxyHref(d.arquivoUrl)}
                          className="text-accent text-xs"
                        >
                          baixar
                        </a>
                      ) : d.linkExterno ? (
                        <a
                          href={d.linkExterno}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent text-xs"
                        >
                          abrir no fundo
                        </a>
                      ) : (
                        <span className="text-fg-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Fila */}
      <h3 className="text-sm font-semibold mb-3">Etapas de envio</h3>
      {jobs.length === 0 ? (
        <p className="text-sm text-fg-muted mb-4">
          Nada foi enviado ao fundo ainda.
        </p>
      ) : (
        <ul className="space-y-2 mb-4">
          {jobs.slice(0, 8).map((j) => (
            <li
              key={j.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg p-3 text-sm"
            >
              <span className="font-medium">{ROTULO_JOB[j.tipo] ?? j.tipo}</span>
              <span
                className={`chip ${
                  j.status === "concluido"
                    ? "bg-green-50 border-success/40 text-success"
                    : j.status === "bloqueado" || j.status === "desistido"
                      ? "bg-red-50 border-danger/40 text-danger"
                      : "bg-yellow-50 border-warn/40 text-warn"
                }`}
              >
                {ROTULO_JOB_STATUS[j.status] ?? j.status}
              </span>
              <span className="text-xs text-fg-muted font-mono">
                {quando(j.updatedAt)}
              </span>
              {j.tentativas > 0 && (
                <span className="text-xs text-fg-muted">
                  {j.tentativas} tentativa(s)
                </span>
              )}
              {j.ultimoErro && (
                <span className="text-xs text-danger w-full">{j.ultimoErro}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Eventos recebidos */}
      {eventos.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-3">Eventos recebidos</h3>
          <ul className="space-y-2 mb-6">
            {eventos.slice(0, 8).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg p-3 text-sm"
              >
                <span className="font-medium">{e.tipo}</span>
                <span className="text-xs text-fg-muted">{e.status}</span>
                <span className="text-xs text-fg-muted font-mono ml-auto">
                  {quando(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
        {espelho?.externoId ? (
          <BotaoReenviarOperacao operacaoId={operacaoId} />
        ) : (
          <BotaoEnviarParaFundo operacaoId={operacaoId} />
        )}
      </div>
    </section>
  );
}

function Campo({
  rotulo,
  valor,
  alerta,
}: {
  rotulo: string;
  valor: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1">
        {rotulo}
      </div>
      <div className={`text-sm ${alerta ? "text-warn font-medium" : "text-fg"}`}>
        {valor}
      </div>
    </div>
  );
}
