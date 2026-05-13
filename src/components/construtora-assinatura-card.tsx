"use client";

import { useActionState, useState } from "react";
import {
  assinarOperacaoAction,
  type AssinarState,
} from "@/lib/actions/construtora-assinatura";

type Props = {
  operacaoId: string;
  numero: string;
  valorComissao: string;
  numeroParcelas: number;
  jaAssinada?: { em: Date | null; ip: string | null };
  jaRecusada?: { em: Date | null; motivo: string | null };
  podeAssinar: boolean;
};

function fmtDateTime(d: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConstrutoraAssinaturaCard({
  operacaoId,
  numero,
  valorComissao,
  numeroParcelas,
  jaAssinada,
  jaRecusada,
  podeAssinar,
}: Props) {
  const [state, action, pending] = useActionState<AssinarState, FormData>(
    assinarOperacaoAction,
    null,
  );
  const [modo, setModo] = useState<"escolher" | "assinar" | "recusar">("escolher");
  const [aceito, setAceito] = useState(false);
  const [motivo, setMotivo] = useState("");

  // Já assinada
  if (jaAssinada?.em) {
    return (
      <div className="rounded-2xl border border-success/40 bg-green-50 p-5 md:p-6 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <h3 className="font-bold text-success">
              Operação assinada pela construtora
            </h3>
            <p className="text-sm text-fg-muted mt-1">
              Confirmação registrada em <strong>{fmtDateTime(jaAssinada.em)}</strong>
              {jaAssinada.ip ? ` · IP ${jaAssinada.ip}` : ""}. A operação pode
              seguir pra liberação ao corretor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Já recusada
  if (jaRecusada?.em) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 md:p-6 mb-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠</span>
          <div className="min-w-0">
            <h3 className="font-bold text-danger">
              Assinatura recusada pela construtora
            </h3>
            <p className="text-sm text-fg-muted mt-1">
              Em {fmtDateTime(jaRecusada.em)}.
            </p>
            {jaRecusada.motivo && (
              <p className="mt-2 text-sm bg-bg-card border border-border rounded-lg p-3">
                <strong>Motivo:</strong> {jaRecusada.motivo}
              </p>
            )}
            <p className="mt-2 text-xs text-fg-muted">
              Entre em contato com o admin/fundo via chat pra resolver e
              reabrir a operação se for o caso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Não pode assinar ainda (status fora do range)
  if (!podeAssinar) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-5 md:p-6 mb-8">
        <h3 className="font-bold">Assinatura da construtora</h3>
        <p className="text-sm text-fg-muted mt-1">
          Esta operação ainda não chegou na fase em que precisa da sua
          assinatura. Você será notificada quando estiver pronta.
        </p>
      </div>
    );
  }

  return (
    <div
      id="assinatura"
      className="rounded-2xl border border-accent/40 bg-accent-soft p-5 md:p-6 mb-8 space-y-4 scroll-mt-24"
    >
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-3xl">✍️</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold">
            Confirme e assine a operação{" "}
            <span className="font-mono">{numero}</span>
          </h3>
          <p className="text-sm text-fg-muted mt-1">
            Ao assinar, você confirma que reconhece a comissão de{" "}
            <strong>R$ {parseFloat(valorComissao).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>{" "}
            como devida e se compromete a pagar as {numeroParcelas} parcelas
            conforme cronograma da Antecipaqui.
          </p>
        </div>
      </div>

      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-100 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-100 text-success p-3 text-sm">
          Decisão registrada com sucesso.
        </div>
      )}

      {modo === "escolher" && (
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setModo("assinar")}
            className="btn-primary !h-11 !px-5"
          >
            Assinar agora
          </button>
          <button
            type="button"
            onClick={() => setModo("recusar")}
            className="h-11 px-5 rounded-xl border border-danger/30 text-danger font-semibold hover:bg-red-50 transition-colors"
          >
            Recusar com motivo
          </button>
        </div>
      )}

      {modo === "assinar" && (
        <form action={action} className="space-y-4 bg-bg rounded-xl border border-border p-4">
          <input type="hidden" name="operacaoId" value={operacaoId} />
          <input type="hidden" name="decisao" value="assinar" />

          <label className="flex gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-1 accent-accent"
            />
            <span className="text-sm text-fg">
              Declaro que li, revisei e estou ciente da operação{" "}
              <strong className="font-mono">{numero}</strong>, da comissão de{" "}
              <strong>
                R${" "}
                {parseFloat(valorComissao).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>{" "}
              que minha construtora deve ao corretor cedente, e me comprometo
              a pagar as parcelas dessa comissão à Antecipaqui no cronograma
              acordado. Tenho ciência de que o registro desta assinatura inclui
              data/hora e endereço IP do meu acesso.
            </span>
          </label>

          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              disabled={!aceito || pending}
              className="btn-primary !h-11 !px-5"
            >
              {pending ? "Registrando..." : "Confirmar e assinar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("escolher");
                setAceito(false);
              }}
              className="h-11 px-5 rounded-xl border border-border text-fg font-semibold hover:bg-bg-card transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {modo === "recusar" && (
        <form action={action} className="space-y-4 bg-bg rounded-xl border border-border p-4">
          <input type="hidden" name="operacaoId" value={operacaoId} />
          <input type="hidden" name="decisao" value="recusar" />

          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Motivo da recusa
            </label>
            <textarea
              name="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              minLength={5}
              maxLength={500}
              rows={4}
              placeholder="Ex: divergência no valor da comissão, corretor não autorizado, etc."
              className="w-full bg-bg-card rounded-xl border border-border-strong p-3 text-sm text-fg placeholder:text-fg-dim outline-none focus:border-accent transition-colors resize-none"
            />
            <p className="mt-1 text-[11px] text-fg-muted">
              O motivo será visto pelo admin e fundo; um chat de negociação
              pode ser aberto pra resolver.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="submit"
              disabled={motivo.trim().length < 5 || pending}
              className="h-11 px-5 rounded-xl bg-danger text-white font-semibold hover:bg-danger/90 transition-colors disabled:opacity-50"
            >
              {pending ? "Registrando..." : "Confirmar recusa"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("escolher");
                setMotivo("");
              }}
              className="h-11 px-5 rounded-xl border border-border text-fg font-semibold hover:bg-bg-card transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
