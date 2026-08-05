"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  anexarComprovantePagamento,
  solicitarAntecipacaoAction,
  solicitarRenegociacaoAction,
  type AnexarComprovanteState,
  type SolicitarAntecipacaoState,
  type SolicitarRenegociacaoState,
} from "@/lib/actions/construtora-operacional";
import { useFeedback } from "@/components/feedback-provider";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Tab = "pagar" | "antecipar" | "renegociar";

export function DuplicataAcoesPanel({
  parcelaId,
  valorOriginal,
  valorAtualizado,
  vencimento,
  temAntecipacaoPendente,
  temRenegociacaoPendente,
}: {
  parcelaId: string;
  valorOriginal: number;
  valorAtualizado: number;
  vencimento: string;
  temAntecipacaoPendente: boolean;
  temRenegociacaoPendente: boolean;
}) {
  const [tab, setTab] = useState<Tab>("pagar");

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6">
      <h3 className="font-bold mb-4">Ações</h3>

      <div className="flex gap-2 flex-wrap mb-5 border-b border-border pb-3">
        <TabButton
          active={tab === "pagar"}
          onClick={() => setTab("pagar")}
        >
          💰 Pagar
        </TabButton>
        <TabButton
          active={tab === "antecipar"}
          onClick={() => setTab("antecipar")}
          disabled={temAntecipacaoPendente}
          disabledLabel="Aguardando decisão"
        >
          ⚡ Antecipar
        </TabButton>
        <TabButton
          active={tab === "renegociar"}
          onClick={() => setTab("renegociar")}
          disabled={temRenegociacaoPendente}
          disabledLabel="Aguardando decisão"
        >
          🔄 Renegociar
        </TabButton>
      </div>

      {tab === "pagar" && (
        <PagarForm
          parcelaId={parcelaId}
          valorSugerido={valorAtualizado}
        />
      )}
      {tab === "antecipar" && (
        <AnteciparForm
          parcelaId={parcelaId}
          valorOriginal={valorOriginal}
          vencimento={vencimento}
        />
      )}
      {tab === "renegociar" && (
        <RenegociarForm parcelaId={parcelaId} vencimento={vencimento} />
      )}
    </section>
  );
}

function TabButton({
  active,
  disabled,
  disabledLabel,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledLabel : undefined}
      className={`h-9 px-3 rounded-lg text-xs font-semibold border transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-border text-fg-muted hover:text-fg hover:border-accent"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function PagarForm({
  parcelaId,
  valorSugerido,
}: {
  parcelaId: string;
  valorSugerido: number;
}) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    AnexarComprovanteState,
    FormData
  >(anexarComprovantePagamento, null);
  const [comprovante, setComprovante] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/chats/upload",
      });
      setComprovante({
        url: `/api/blob/${blob.pathname}`,
        name: file.name,
      });
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (state?.ok) {
    setTimeout(() => {
      alertSuccess(
        "Comprovante anexado. Admin/fundo vai conferir e dar baixa.",
        "Enviado",
      );
      router.refresh();
    }, 0);
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="parcelaId" value={parcelaId} />
      <input type="hidden" name="url" value={comprovante?.url ?? ""} />
      <input type="hidden" name="nome" value={comprovante?.name ?? ""} />
      <p className="text-sm text-fg-muted">
        Anexe o comprovante de pagamento (PDF, imagem ou recibo). Admin/fundo
        confirma e dá baixa final.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Valor pago (R$)
          </label>
          <input
            name="valorPago"
            defaultValue={valorSugerido.toFixed(2).replace(".", ",")}
            className="form-input"
            inputMode="decimal"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Data do pagamento
          </label>
          <input
            name="dataPagamento"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="form-input"
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Comprovante
        </label>
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="block w-full text-sm text-fg file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-dark"
        />
        {uploading && (
          <div className="text-xs text-fg-dim mt-2">Enviando...</div>
        )}
        {comprovante && (
          <div className="text-xs text-success mt-2">
            ✓ {comprovante.name} anexado
          </div>
        )}
      </div>
      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending || !comprovante}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Confirmar pagamento"}
      </button>
    </form>
  );
}

function AnteciparForm({
  parcelaId,
  valorOriginal,
  vencimento,
}: {
  parcelaId: string;
  valorOriginal: number;
  vencimento: string;
}) {
  const router = useRouter();
  const { alertSuccess } = useFeedback();
  const [state, action, pending] = useActionState<
    SolicitarAntecipacaoState,
    FormData
  >(solicitarAntecipacaoAction, null);
  const [desconto, setDesconto] = useState("3");

  if (state?.ok) {
    setTimeout(() => {
      alertSuccess(
        "Antecipação solicitada. Admin/fundo vai decidir.",
        "Enviado",
      );
      router.refresh();
    }, 0);
  }

  const descontoNum = parseFloat(desconto.replace(",", ".")) || 0;
  const valorAntecipado = valorOriginal * (1 - descontoNum / 100);
  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="parcelaId" value={parcelaId} />
      <p className="text-sm text-fg-muted">
        Proponha quitar antes do vencimento ({new Date(vencimento + "T00:00:00").toLocaleDateString("pt-BR")}) aceitando um desconto. Fundo/admin
        analisa o desconto e aprova ou contra-propõe.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Desconto que você propõe (%)
          </label>
          <input
            name="descontoPct"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            className="form-input"
            inputMode="decimal"
            required
          />
          <p className="text-xs text-fg-dim mt-1">
            Valor antecipado: <strong>{fmtBRL(valorAntecipado)}</strong>
          </p>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Data pretendida pra pagar
          </label>
          <input
            name="dataPretendida"
            type="date"
            defaultValue={hoje}
            max={vencimento}
            className="form-input"
            required
          />
        </div>
      </div>
      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Solicitar antecipação"}
      </button>
    </form>
  );
}

function RenegociarForm({
  parcelaId,
  vencimento,
}: {
  parcelaId: string;
  vencimento: string;
}) {
  const router = useRouter();
  const { alertSuccess } = useFeedback();
  const [state, action, pending] = useActionState<
    SolicitarRenegociacaoState,
    FormData
  >(solicitarRenegociacaoAction, null);
  const [tipo, setTipo] = useState<"prorrogar" | "dividir">("prorrogar");

  if (state?.ok) {
    setTimeout(() => {
      alertSuccess(
        "Renegociação solicitada. Admin/fundo vai decidir.",
        "Enviado",
      );
      router.refresh();
    }, 0);
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="parcelaId" value={parcelaId} />
      <p className="text-sm text-fg-muted">
        Peça pra prorrogar (novo vencimento) ou dividir em parcelas menores.
        Justifique a razão — admin/fundo decide.
      </p>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Tipo
        </label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "prorrogar" | "dividir")}
          className="form-input"
        >
          <option value="prorrogar">Prorrogar (novo vencimento)</option>
          <option value="dividir">Dividir em parcelas menores</option>
        </select>
      </div>

      {tipo === "prorrogar" && (
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Novo vencimento
          </label>
          <input
            name="novoVencimento"
            type="date"
            defaultValue={vencimento}
            className="form-input"
            required
          />
        </div>
      )}

      {tipo === "dividir" && (
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Split (JSON com vencimento+valor por parcela)
          </label>
          <textarea
            name="splitParcelas"
            rows={5}
            placeholder={`[\n  {"vencimento": "2026-06-15", "valor": 1500.00},\n  {"vencimento": "2026-07-15", "valor": 1500.00}\n]`}
            className="form-input font-mono text-xs"
          />
          <p className="text-xs text-fg-dim mt-1">
            Soma deve bater com o valor da parcela original.
          </p>
        </div>
      )}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Justificativa
        </label>
        <textarea
          name="motivo"
          rows={3}
          placeholder="Explique por que precisa renegociar..."
          className="form-input"
          required
        />
      </div>

      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Solicitar renegociação"}
      </button>
    </form>
  );
}
