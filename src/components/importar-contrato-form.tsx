"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { useFeedback } from "@/components/feedback-provider";
import { sanitizeFileName } from "@/lib/sanitize-filename";

type Extracao = {
  valorVenda: number | null;
  valorComissao: number | null;
  comissaoPercentual: number | null;
  dataVenda: string | null;
  numeroParcelas: number | null;
  construtoraNome: string | null;
  construtoraCnpj: string | null;
  confianca: number;
  observacao: string;
};

function fmtBRL(n: number | null) {
  return n != null
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
}

function numberToMask(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function ImportarContratoForm() {
  const router = useRouter();
  const { alertError } = useFeedback();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<Extracao | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  async function onFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      await alertError(
        "Arquivo maior que 15MB. Comprima ou tire uma foto menor.",
        "Arquivo muito grande",
      );
      return;
    }
    setUploading(true);
    setResult(null);
    setFilename(file.name);
    try {
      // Sobe o arquivo DIRETO pro Blob (client-side) pra evitar o limite de
      // 4,5MB do corpo das funções da Vercel — que dava 413 em foto grande de
      // iPhone/iPad. O servidor lê o arquivo de volta e apaga depois do OCR.
      const safeName = sanitizeFileName(file.name);
      const uploaded = await upload(`ocr-temp/${Date.now()}-${safeName}`, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: file.type || undefined,
      });
      const res = await fetch("/api/corretor/extrair-contrato", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: uploaded.url,
          pathname: uploaded.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        await alertError(data.error ?? "Erro ao extrair", "Falha no OCR");
        return;
      }
      setResult({
        valorVenda: data.valorVenda,
        valorComissao: data.valorComissao,
        comissaoPercentual: data.comissaoPercentual,
        dataVenda: data.dataVenda,
        numeroParcelas: data.numeroParcelas,
        construtoraNome: data.construtoraNome,
        construtoraCnpj: data.construtoraCnpj,
        confianca: data.confianca,
        observacao: data.observacao,
      });
    } catch (e) {
      await alertError((e as Error).message, "Falha no OCR");
    } finally {
      setUploading(false);
    }
  }

  function aplicarAoForm() {
    if (!result) return;
    const draft: Record<string, unknown> = {
      savedAt: Date.now(),
    };
    if (result.valorVenda !== null)
      draft.valorVenda = numberToMask(result.valorVenda);

    // Comissão: usa o valor em R$ se houver; senão calcula a partir do
    // percentual (que vem como fração, ex 0.05) × valor da venda.
    let comissao = result.valorComissao;
    if (
      (comissao === null || comissao <= 0) &&
      result.comissaoPercentual &&
      result.valorVenda
    ) {
      comissao = result.valorVenda * result.comissaoPercentual;
    }
    if (comissao !== null && comissao > 0)
      draft.valorComissao = numberToMask(comissao);

    if (result.dataVenda) draft.dataVenda = result.dataVenda;
    // Parcelas DA COMISSÃO: o produto aceita no máx 4 (limite de 120 dias).
    if (result.numeroParcelas)
      draft.numParcelas = Math.min(Math.max(result.numeroParcelas, 1), 4);
    // Construtora: leva nome/CNPJ pro form casar com as já cadastradas
    // (ou abrir o cadastro já preenchido se for nova).
    if (result.construtoraNome) draft.construtoraNome = result.construtoraNome;
    if (result.construtoraCnpj) draft.construtoraCnpj = result.construtoraCnpj;
    try {
      localStorage.setItem("nova-operacao-draft-v1", JSON.stringify(draft));
    } catch {
      /* ignora */
    }
    router.push("/painel/operacoes/nova");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-bg-elev p-6">
        <h2 className="font-bold mb-1">1. Selecione o arquivo</h2>
        <p className="text-xs text-fg-muted mb-4">
          PDF ou imagem (JPG/PNG/WEBP), até 15MB. Pode tirar foto do contrato
          pelo celular.
        </p>
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
          className="block w-full text-sm text-fg file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-dark"
        />
        {uploading && (
          <div className="mt-3 text-xs text-fg-muted">
            Analisando {filename}... pode levar até 30s.
          </div>
        )}
      </section>

      {result && (
        <section className="rounded-2xl border border-success/40 bg-green-50 p-6">
          <h2 className="font-bold mb-1">2. Campos extraídos</h2>
          <p className="text-xs text-fg-muted mb-4">
            Confiança:{" "}
            <strong>{(result.confianca * 100).toFixed(0)}%</strong>
            {result.observacao && (
              <>
                {" · "}
                {result.observacao}
              </>
            )}
          </p>

          <dl className="grid sm:grid-cols-2 gap-3 mb-5">
            <Field label="Valor da venda" value={fmtBRL(result.valorVenda)} />
            <Field
              label="Valor da comissão"
              value={
                result.valorComissao !== null
                  ? fmtBRL(result.valorComissao)
                  : result.comissaoPercentual !== null
                    ? `${(result.comissaoPercentual * 100).toFixed(2)}% (a calcular)`
                    : "—"
              }
            />
            <Field label="Data da venda" value={result.dataVenda ?? "—"} />
            <Field
              label="Nº de parcelas"
              value={result.numeroParcelas?.toString() ?? "—"}
            />
            <Field
              label="Construtora"
              value={result.construtoraNome ?? "—"}
            />
            <Field label="CNPJ" value={result.construtoraCnpj ?? "—"} mono />
          </dl>

          <button
            type="button"
            onClick={aplicarAoForm}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
          >
            ✓ Aplicar ao form e continuar
          </button>
          <p className="text-xs text-fg-muted mt-2">
            Os dados extraídos vão pra um rascunho local. Confira e ajuste no
            formulário antes de enviar.
          </p>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-0.5">
        {label}
      </dt>
      <dd className={`text-sm font-semibold ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
