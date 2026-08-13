"use client";

import { useActionState, useState } from "react";
import {
  salvarIntegracaoFundoAction,
  testarConexaoFundoAction,
  type SalvarIntegracaoState,
} from "@/lib/actions/opera";

type Props = {
  fundoId: string;
  fundoNome: string;
  baseUrl: string;
  atual: {
    tipo: string;
    ambiente: string;
    apiUrl: string | null;
    credenciais: unknown;
    contrato: unknown;
    temSegredo: boolean;
    ultimoOkEm: Date | null;
    ultimoErro: string | null;
  };
  contratoPadrao: string;
};

const rotulo =
  "block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono";
const campo =
  "w-full bg-bg h-12 px-4 rounded-xl border border-border-strong text-fg placeholder:text-fg-dim outline-none focus:border-accent transition-colors";
const area =
  "w-full bg-bg p-4 rounded-xl border border-border-strong text-fg placeholder:text-fg-dim outline-none focus:border-accent transition-colors font-mono text-xs leading-relaxed";

export function OperaIntegracaoForm({
  fundoId,
  fundoNome,
  baseUrl,
  atual,
  contratoPadrao,
}: Props) {
  const [state, action, pending] = useActionState<
    SalvarIntegracaoState,
    FormData
  >(salvarIntegracaoFundoAction, null);

  const [tipo, setTipo] = useState(atual.tipo);
  const [teste, setTeste] = useState<{ ok: boolean; detalhe: string } | null>(
    null,
  );
  const [testando, setTestando] = useState(false);

  const ligada = tipo !== "nenhuma";

  const urls = [
    { nome: "Cadastro do cliente", peca: "03", caminho: `/api/opera/webhook/cadastro/${fundoId}` },
    { nome: "Status da operação", peca: "05", caminho: `/api/opera/webhook/status/${fundoId}` },
    { nome: "Duplicatas", peca: "06", caminho: `/api/opera/webhook/duplicatas/${fundoId}` },
  ];

  async function testar() {
    setTestando(true);
    setTeste(null);
    try {
      const r = await testarConexaoFundoAction(fundoId);
      setTeste(r);
    } catch (e) {
      setTeste({ ok: false, detalhe: (e as Error).message });
    } finally {
      setTestando(false);
    }
  }

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-6 max-w-3xl">
        <input type="hidden" name="fundoId" value={fundoId} />

        {state?.ok === false && (
          <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
            {state.error}
          </div>
        )}
        {state?.ok === true && (
          <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
            Integração salva.
            {state.segredo && (
              <>
                <br />
                <span className="font-medium">
                  Guarde o segredo agora — ele não é mostrado de novo:
                </span>
                <code className="block mt-2 p-2 rounded-lg bg-bg-soft text-fg font-mono text-xs break-all">
                  {state.segredo}
                </code>
              </>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className={rotulo}>Integração</label>
            <select
              name="integracaoTipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className={campo}
            >
              <option value="nenhuma">Nenhuma — fundo opera pelo painel</option>
              <option value="opera">OPERA CAPITAL (QPROF)</option>
            </select>
            <p className="mt-2 text-xs text-fg-muted">
              Com a integração ligada, a operação é enviada ao fundo
              automaticamente a partir da análise final.
            </p>
          </div>

          <div>
            <label className={rotulo}>Ambiente</label>
            <select
              name="integracaoAmbiente"
              defaultValue={atual.ambiente}
              className={campo}
              disabled={!ligada}
            >
              <option value="sandbox">Teste (sandbox)</option>
              <option value="producao">Produção</option>
            </select>
            <p className="mt-2 text-xs text-fg-muted">
              Homologue tudo em teste antes de virar a chave. Só produção toca
              em operação real.
            </p>
          </div>
        </div>

        <div>
          <label className={rotulo}>URL base da API do fundo</label>
          <input
            name="integracaoApiUrl"
            defaultValue={atual.apiUrl ?? ""}
            placeholder="https://api.qprof.com.br/v1"
            className={campo}
            disabled={!ligada}
          />
        </div>

        <div>
          <label className={rotulo}>Credenciais (JSON)</label>
          <textarea
            name="integracaoCredenciais"
            rows={5}
            defaultValue={
              atual.credenciais
                ? JSON.stringify(atual.credenciais, null, 2)
                : ""
            }
            placeholder={'{\n  "tipo": "api_key",\n  "apiKey": "...",\n  "header": "x-api-key"\n}'}
            className={area}
            disabled={!ligada}
          />
          <p className="mt-2 text-xs text-fg-muted">
            Aceita <code>api_key</code>, <code>bearer</code>,{" "}
            <code>basic</code> e <code>oauth</code> (com{" "}
            <code>tokenUrl</code>, <code>clientId</code> e{" "}
            <code>clientSecret</code>). Deixe em branco para manter o que já
            está salvo.
          </p>
        </div>

        <div>
          <label className={rotulo}>
            Contrato de integração (JSON) — rotas e nomes de campo
          </label>
          <textarea
            name="integracaoContrato"
            rows={10}
            defaultValue={
              atual.contrato ? JSON.stringify(atual.contrato, null, 2) : ""
            }
            placeholder={contratoPadrao}
            className={area}
            disabled={!ligada}
          />
          <p className="mt-2 text-xs text-fg-muted">
            Em branco vale o padrão do sistema (mostrado como exemplo acima).
            É aqui que a documentação da OPERA entra quando chegar — sem
            precisar de deploy.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-fg-muted">
          <input
            type="checkbox"
            name="gerarSegredo"
            className="mt-1"
            disabled={!ligada}
          />
          <span>
            Gerar um novo segredo de assinatura dos webhooks
            {atual.temSegredo
              ? " (substitui o atual — o fundo precisa atualizar do lado deles)"
              : " (obrigatório na primeira vez)"}
            .
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {pending ? "Salvando…" : "Salvar integração"}
          </button>

          <button
            type="button"
            onClick={testar}
            disabled={!ligada || testando}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {testando ? "Testando…" : "Testar conexão"}
          </button>

          {teste && (
            <span
              className={`text-sm ${teste.ok ? "text-success" : "text-danger"}`}
            >
              {teste.ok ? "Conectado · " : "Falhou · "}
              {teste.detalhe}
            </span>
          )}
        </div>
      </form>

      {/* Endereços que o fundo precisa cadastrar do lado deles */}
      <div className="rounded-2xl border border-border bg-bg-elev p-6">
        <h2 className="text-lg font-semibold mb-1">
          Endereços para a {fundoNome} cadastrar
        </h2>
        <p className="text-sm text-fg-muted mb-5">
          São os três webhooks que o fundo chama. Todos exigem a assinatura
          HMAC-SHA256 do corpo, no cabeçalho definido no contrato de
          integração (padrão <code>x-opera-signature</code>).
        </p>
        <div className="space-y-3">
          {urls.map((u) => (
            <div
              key={u.caminho}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-bg p-3"
            >
              <span className="chip chip-accent font-mono text-[11px]">
                peça {u.peca}
              </span>
              <span className="text-sm font-medium">{u.nome}</span>
              <code className="text-xs text-fg-muted font-mono break-all ml-auto">
                POST {baseUrl}
                {u.caminho}
              </code>
            </div>
          ))}
        </div>
      </div>

      {/* Saúde */}
      <div className="rounded-2xl border border-border bg-bg-elev p-6">
        <h2 className="text-lg font-semibold mb-4">Saúde da conexão</h2>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1">
              Última conversa bem-sucedida
            </dt>
            <dd className="text-fg">
              {atual.ultimoOkEm
                ? new Date(atual.ultimoOkEm).toLocaleString("pt-BR")
                : "ainda não houve"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono mb-1">
              Último erro
            </dt>
            <dd className={atual.ultimoErro ? "text-danger" : "text-fg-muted"}>
              {atual.ultimoErro ?? "nenhum"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
