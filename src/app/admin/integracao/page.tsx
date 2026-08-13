import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getPainelIntegracao } from "@/lib/actions/opera";
import {
  BotaoDestravarJob,
  BotaoReprocessarEvento,
} from "@/components/opera-acoes";

export const metadata = { title: "Admin · Integração com fundos" };

const ROTULO_JOB: Record<string, string> = {
  consultar_cliente: "consulta de cadastro",
  cadastrar_cliente: "cadastro do cliente",
  enviar_operacao: "envio da operação",
};

const ROTULO_SITUACAO: Record<string, string> = {
  nao_consultado: "não consultado",
  nao_encontrado: "não encontrado",
  enviado: "enviado",
  em_analise: "em análise no fundo",
  aprovado: "aprovado",
  reprovado: "reprovado",
  erro: "erro",
};

function quando(d: Date | null) {
  return d ? new Date(d).toLocaleString("pt-BR") : "—";
}

export default async function AdminIntegracaoPage() {
  const admin = await requireAdmin();
  const painel = await getPainelIntegracao();

  const { integrados, contagem, jobsTravados, eventosRecentes, clientesPendentes } =
    painel;

  return (
    <AdminShell active="/admin/integracao" userName={admin.nome}>
      <h1 className="text-display-md mb-2">Integração com fundos</h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        O que sai daqui para o sistema do fundo e o que volta de lá. Tudo que
        chega fica gravado cru — dá para reprocessar um evento depois de
        corrigir uma regra, sem pedir nada ao fundo.
      </p>

      {/* Fundos integrados */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Fundos integrados</h2>
        {integrados.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Nenhum fundo com integração ativa. Ligue em{" "}
            <Link href="/admin/fundos" className="text-accent">
              Fundos investidores
            </Link>{" "}
            → aba Integração.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {integrados.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-border bg-bg-elev p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">
                      {f.nomeFantasia ?? f.razaoSocial}
                    </h3>
                    <p className="text-xs text-fg-muted font-mono mt-1">
                      {f.integracaoApiUrl ?? "sem URL configurada"}
                    </p>
                  </div>
                  <span
                    className={`chip ${
                      f.integracaoAmbiente === "producao"
                        ? "bg-green-50 border-success/40 text-success"
                        : "bg-yellow-50 border-warn/40 text-warn"
                    }`}
                  >
                    {f.integracaoAmbiente === "producao" ? "produção" : "teste"}
                  </span>
                </div>
                <dl className="text-xs space-y-1 mb-4">
                  <div className="flex gap-2">
                    <dt className="text-fg-dim">última conversa ok:</dt>
                    <dd>{quando(f.integracaoUltimoOkEm)}</dd>
                  </div>
                  {f.integracaoUltimoErro && (
                    <div className="flex gap-2">
                      <dt className="text-fg-dim">último erro:</dt>
                      <dd className="text-danger">{f.integracaoUltimoErro}</dd>
                    </div>
                  )}
                </dl>
                <Link
                  href={`/admin/fundos/${f.id}/integracao`}
                  className="text-xs text-accent font-medium"
                >
                  Configurar →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fila */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Fila de envio</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Stat label="Na fila" valor={contagem.pendentes} />
          <Stat label="Em execução" valor={contagem.processando} />
          <Stat label="Esperando cliente" valor={contagem.bloqueados} alerta={contagem.bloqueados > 0} />
          <Stat label="Desistidos" valor={contagem.desistidos} alerta={contagem.desistidos > 0} />
          <Stat label="Concluídos" valor={contagem.concluidos} />
        </div>

        {jobsTravados.length === 0 ? (
          <p className="text-sm text-fg-muted">Nada travado.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
                  <th className="text-left p-3">Etapa</th>
                  <th className="text-left p-3">Situação</th>
                  <th className="text-left p-3">Motivo</th>
                  <th className="text-left p-3">Quando</th>
                  <th className="text-left p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {jobsTravados.map((j) => (
                  <tr key={j.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      {ROTULO_JOB[j.tipo] ?? j.tipo}
                      {j.operacaoId && (
                        <Link
                          href={`/admin/operacoes/${j.operacaoId}`}
                          className="block text-xs text-accent mt-1"
                        >
                          ver operação →
                        </Link>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`chip ${
                          j.status === "bloqueado"
                            ? "bg-yellow-50 border-warn/40 text-warn"
                            : "bg-red-50 border-danger/40 text-danger"
                        }`}
                      >
                        {j.status === "bloqueado"
                          ? "esperando cliente"
                          : "desistiu"}
                      </span>
                    </td>
                    <td className="p-3 text-fg-muted max-w-md">
                      {j.ultimoErro ?? "—"}
                    </td>
                    <td className="p-3 text-fg-muted whitespace-nowrap">
                      {quando(j.updatedAt)}
                    </td>
                    <td className="p-3">
                      <BotaoDestravarJob jobId={j.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cadastros */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Cadastros no fundo</h2>
        {clientesPendentes.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Nenhum cadastro pendente ou reprovado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Situação</th>
                  <th className="text-left p-3">Motivo</th>
                  <th className="text-left p-3">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {clientesPendentes.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      {c.rotulo}
                      <span className="block text-xs text-fg-muted font-mono">
                        {c.cnpj}
                      </span>
                    </td>
                    <td className="p-3 text-fg-muted">
                      {c.entidadeTipo === "construtora"
                        ? "construtora"
                        : "imobiliária"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`chip ${
                          c.situacao === "reprovado" || c.situacao === "erro"
                            ? "bg-red-50 border-danger/40 text-danger"
                            : "bg-yellow-50 border-warn/40 text-warn"
                        }`}
                      >
                        {ROTULO_SITUACAO[c.situacao] ?? c.situacao}
                      </span>
                    </td>
                    <td className="p-3 text-fg-muted max-w-md">
                      {c.motivo ?? "—"}
                    </td>
                    <td className="p-3 text-fg-muted whitespace-nowrap">
                      {quando(c.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Eventos */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Eventos recebidos</h2>
        <p className="text-sm text-fg-muted mb-4">
          Os últimos 30, com o corpo cru guardado. Reprocessar não fala com o
          fundo — reaplica o que já está aqui.
        </p>
        {eventosRecentes.length === 0 ? (
          <p className="text-sm text-fg-muted">Nenhum evento recebido ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Situação</th>
                  <th className="text-left p-3">Detalhe</th>
                  <th className="text-left p-3">Recebido</th>
                  <th className="text-left p-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {eventosRecentes.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      {e.tipo}
                      {e.operacaoId && (
                        <Link
                          href={`/admin/operacoes/${e.operacaoId}`}
                          className="block text-xs text-accent mt-1"
                        >
                          ver operação →
                        </Link>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`chip ${
                          e.status === "processado"
                            ? "bg-green-50 border-success/40 text-success"
                            : e.status === "erro"
                              ? "bg-red-50 border-danger/40 text-danger"
                              : "bg-yellow-50 border-warn/40 text-warn"
                        }`}
                      >
                        {e.status}
                      </span>
                      {!e.assinaturaValida && (
                        <span className="chip bg-red-50 border-danger/40 text-danger ml-2">
                          assinatura inválida
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-fg-muted max-w-md">
                      {e.erro ?? "—"}
                    </td>
                    <td className="p-3 text-fg-muted whitespace-nowrap">
                      {quando(e.createdAt)}
                    </td>
                    <td className="p-3">
                      {e.assinaturaValida && (
                        <BotaoReprocessarEvento eventoId={e.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function Stat({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        alerta
          ? "border-warn/40 bg-yellow-50"
          : "border-border bg-bg-elev"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold tabular ${alerta ? "text-warn" : "text-fg"}`}
      >
        {valor}
      </div>
    </div>
  );
}
