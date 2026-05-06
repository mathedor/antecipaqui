"use client";

import { useState } from "react";
import {
  CompradoresEditor,
  type CompradorInput,
  novoCompradorVazio,
} from "@/components/compradores-editor";

type Props = {
  /** Default inicial. */
  initialPagadorTipo?: "construtora" | "compradores";
  initialCompradores?: CompradorInput[];
  /** Nome da construtora pra exibir no card "construtora". */
  construtoraNome?: string;
  /** Custom labels (lote usa "comissão por linha"). */
  description?: string;
};

export function PagadorSelector({
  initialPagadorTipo = "construtora",
  initialCompradores,
  construtoraNome,
  description,
}: Props) {
  const [pagadorTipo, setPagadorTipo] = useState<"construtora" | "compradores">(
    initialPagadorTipo,
  );
  const [compradores, setCompradores] = useState<CompradorInput[]>(
    initialCompradores ?? [novoCompradorVazio()],
  );

  return (
    <section className="rounded-2xl border border-warn/30 bg-yellow-50/30 p-6 md:p-7">
      <h3 className="font-bold mb-1">
        Responsável pelo pagamento da comissão *
      </h3>
      <p className="text-xs text-fg-muted mb-5">
        {description ??
          "A construtora segue como responsável pela operação. O pagador escolhido aqui aparece no contrato e nos boletos como fiel devedor das parcelas."}
      </p>

      <input type="hidden" name="pagadorTipo" value={pagadorTipo} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <label
          className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${
            pagadorTipo === "construtora"
              ? "border-accent bg-accent-soft"
              : "border-border bg-bg hover:border-accent/40"
          }`}
        >
          <input
            type="radio"
            name="pagadorTipoUI"
            value="construtora"
            checked={pagadorTipo === "construtora"}
            onChange={() => setPagadorTipo("construtora")}
            className="sr-only"
          />
          <div
            className={`font-bold mb-1 ${
              pagadorTipo === "construtora" ? "text-accent" : "text-fg"
            }`}
          >
            Construtora
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            {construtoraNome
              ? `${construtoraNome} paga a comissão diretamente.`
              : "A construtora paga a comissão diretamente."}
          </p>
        </label>
        <label
          className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${
            pagadorTipo === "compradores"
              ? "border-accent bg-accent-soft"
              : "border-border bg-bg hover:border-accent/40"
          }`}
        >
          <input
            type="radio"
            name="pagadorTipoUI"
            value="compradores"
            checked={pagadorTipo === "compradores"}
            onChange={() => setPagadorTipo("compradores")}
            className="sr-only"
          />
          <div
            className={`font-bold mb-1 ${
              pagadorTipo === "compradores" ? "text-accent" : "text-fg"
            }`}
          >
            Comprador(es)
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            O comprador do imóvel paga a comissão. Cadastre cada um abaixo —
            todos viram sacados solidários do boleto.
          </p>
        </label>
      </div>

      {pagadorTipo === "compradores" && (
        <CompradoresEditor
          inputName="compradores"
          value={compradores}
          onChange={setCompradores}
        />
      )}
    </section>
  );
}