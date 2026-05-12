"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminCadastrarOperacaoAction,
  type CadastrarOpAdminState,
} from "@/lib/actions/admin-cadastrar";
import { FileUploadField, type UploadedBlob } from "./file-upload-field";
import { PagadorSelector } from "./pagador-selector";
import { useFeedback } from "@/components/feedback-provider";
import { SearchableSelect } from "@/components/searchable-select";
import { formatBRL, parseBRLNumber, valorPresente } from "@/lib/format";

type CorretorOption = {
  id: string;
  nome: string | null;
  email: string;
  role: string;
  imobNome: string | null;
  imobCnpj: string | null;
};

type ConstrutoraOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
};

type ComercialOption = {
  id: string;
  nomeCompleto: string;
  apelido: string | null;
};

type Parcela = { valor: string; vencimento: string };

function maskCurrency(v: string) {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function genParcelas(comissao: number, n: number, dataVendaISO: string) {
  const valorParcela = comissao / n;
  const inicio = new Date(dataVendaISO + "T00:00:00");
  return Array.from({ length: n }, (_, i) => {
    const v = new Date(inicio);
    v.setDate(v.getDate() + 30 * (i + 1));
    return {
      valor: valorParcela.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      vencimento: v.toISOString().slice(0, 10),
    };
  });
}

function monthsBetween(from: Date, to: Date) {
  return Math.max(
    (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30),
    0,
  );
}

export function AdminCadastrarOperacaoForm({
  corretores,
  construtoras,
  comerciais,
  taxaMensalSugerida,
  defaultComercialId = "",
}: {
  corretores: CorretorOption[];
  construtoras: ConstrutoraOption[];
  comerciais: ComercialOption[];
  taxaMensalSugerida: number;
  defaultComercialId?: string;
}) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    CadastrarOpAdminState,
    FormData
  >(adminCadastrarOperacaoAction, null);

  const [corretorUserId, setCorretorUserId] = useState("");
  const [construtoraId, setConstrutoraId] = useState("");
  const [comercialId, setComercialId] = useState(defaultComercialId);
  const [valorVenda, setValorVenda] = useState("");
  const [valorComissao, setValorComissao] = useState("");
  const [valorEntrada, setValorEntrada] = useState("");
  const [dataVenda, setDataVenda] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [numParcelas, setNumParcelas] = useState(3);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  // Documentos opcionais
  const [, setDocContratoVenda] = useState<UploadedBlob | null>(null);
  const [, setDocContratoComissao] = useState<UploadedBlob | null>(null);
  const [, setDocNotaFiscal] = useState<UploadedBlob | null>(null);
  const [, setDocComprovanteEntrada] = useState<UploadedBlob | null>(null);

  const valorComissaoNum = parseBRLNumber(valorComissao);

  useEffect(() => {
    if (valorComissaoNum > 0 && numParcelas > 0 && dataVenda) {
      setParcelas(genParcelas(valorComissaoNum, numParcelas, dataVenda));
    } else {
      setParcelas([]);
    }
  }, [valorComissaoNum, numParcelas, dataVenda]);

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        `Operação ${state.numero} cadastrada.`,
        "Pronto",
      ).then(() => router.push(`/admin/operacoes/${state.operacaoId}`));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao cadastrar operação");
    }
  }, [state, router, alertSuccess, alertError]);

  const { vp, desagio } = useMemo(() => {
    if (parcelas.length === 0 || valorComissaoNum === 0)
      return { vp: 0, desagio: 0 };
    const today = new Date();
    const arr = parcelas.map((p) => ({
      valor: parseBRLNumber(p.valor),
      mesesAteVencimento: monthsBetween(today, new Date(p.vencimento)),
    }));
    const v = valorPresente(arr, taxaMensalSugerida);
    return { vp: v, desagio: valorComissaoNum - v };
  }, [parcelas, valorComissaoNum, taxaMensalSugerida]);

  function updateParcela(idx: number, key: keyof Parcela, value: string) {
    setParcelas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  return (
    <form action={action} className="space-y-6">
      <Card title="Cedente">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Imobiliária / Corretor *">
            <SearchableSelect
              name="corretorUserId"
              required
              value={corretorUserId}
              onChange={setCorretorUserId}
              placeholder="Buscar imobiliária ou corretor..."
              options={corretores.map((c) => ({
                value: c.id,
                label: c.imobNome ?? c.nome ?? c.email,
                sub:
                  c.email +
                  (c.imobCnpj ? ` · CNPJ ${c.imobCnpj}` : "") +
                  ` · ${c.role}`,
              }))}
              emptyLabel="Nenhuma imobiliária / corretor encontrada."
            />
          </Field>
          <Field label="Construtora *">
            <SearchableSelect
              name="construtoraId"
              required
              value={construtoraId}
              onChange={setConstrutoraId}
              placeholder="Buscar construtora..."
              options={construtoras.map((c) => ({
                value: c.id,
                label: c.nomeFantasia ?? c.razaoSocial,
                sub: c.razaoSocial + ` · CNPJ ${c.cnpj}`,
              }))}
              emptyLabel="Nenhuma construtora encontrada."
            />
          </Field>
          <Field label="Comercial responsável">
            <SearchableSelect
              name="comercialId"
              value={comercialId}
              onChange={setComercialId}
              placeholder="Antecipaqui (default)"
              options={comerciais.map((c) => ({
                value: c.id,
                label: c.apelido ?? c.nomeCompleto,
                sub: c.nomeCompleto,
              }))}
              emptyLabel="Nenhum comercial cadastrado."
            />
            <p className="mt-1 text-[10px] text-fg-dim">
              Vai ganhar ~10% do lucro líquido. Vazio = atribuído ao Antecipaqui.
            </p>
          </Field>
        </div>
      </Card>

      <Card title="Dados financeiros">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Valor da venda *">
            <CurrencyInput
              name="valorVenda"
              required
              value={valorVenda}
              onChange={setValorVenda}
            />
          </Field>
          <Field label="Valor da comissão *">
            <CurrencyInput
              name="valorComissao"
              required
              value={valorComissao}
              onChange={setValorComissao}
            />
          </Field>
          <Field label="Valor da entrada">
            <CurrencyInput
              name="valorEntrada"
              value={valorEntrada}
              onChange={setValorEntrada}
            />
          </Field>
          <Field label="Data da venda *">
            <input
              name="dataVenda"
              type="date"
              required
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="Nº de parcelas (1 a 4) *">
            <input
              type="number"
              min={1}
              max={4}
              value={numParcelas}
              onChange={(e) => setNumParcelas(Number(e.target.value))}
              className="form-input"
            />
          </Field>
        </div>
        {parcelas.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-xl border border-accent/30 bg-accent-soft p-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-1">
                valor presente (taxa{" "}
                {(taxaMensalSugerida * 100).toFixed(2).replace(".", ",")}% a.m.)
              </div>
              <div className="font-mono tabular text-xl font-bold text-accent">
                {formatBRL(vp)}
              </div>
            </div>
            <div className="rounded-xl border border-warn/30 bg-yellow-50 p-3 text-sm">
              <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
                deságio
              </div>
              <div className="font-mono tabular text-xl font-bold text-warn">
                {formatBRL(desagio)}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card title="Cronograma de parcelas">
        {parcelas.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Preencha valor da comissão, data e nº de parcelas pra gerar o
            cronograma automático.
          </p>
        ) : (
          <ul className="space-y-2">
            {parcelas.map((p, i) => (
              <li
                key={i}
                className="grid grid-cols-12 gap-3 items-center text-sm"
              >
                <span className="col-span-1 font-mono text-xs text-fg-dim">
                  #{String(i + 1).padStart(2, "0")}
                </span>
                <div className="col-span-5">
                  <input
                    type="date"
                    value={p.vencimento}
                    onChange={(e) =>
                      updateParcela(i, "vencimento", e.target.value)
                    }
                    className="form-input !h-10"
                  />
                </div>
                <div className="col-span-6">
                  <CurrencyInput
                    name=""
                    value={p.valor}
                    onChange={(v) => updateParcela(i, "valor", v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <input type="hidden" name="parcelas" value={JSON.stringify(parcelas)} />
      </Card>

      <PagadorSelector />

      <Card
        title="Documentos (opcional)"
        subtitle="Pode pular e anexar depois pela página da operação."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <FileUploadField
            label="Contrato de compra e venda"
            name="doc_contrato_venda"
            tipo="contrato_venda"
            folder="operacoes/contrato-venda"
            onChange={setDocContratoVenda}
          />
          <FileUploadField
            label="Contrato de comissionamento"
            name="doc_contrato_comissao"
            tipo="contrato_comissao"
            folder="operacoes/contrato-comissao"
            onChange={setDocContratoComissao}
          />
          <FileUploadField
            label="Nota fiscal da comissão"
            name="doc_nota_fiscal"
            tipo="nota_fiscal"
            folder="operacoes/nota-fiscal"
            onChange={setDocNotaFiscal}
          />
          <FileUploadField
            label="Comprovante de pagamento da entrada"
            name="doc_comprovante_entrada"
            tipo="comprovante_entrada"
            folder="operacoes/comprovante-entrada"
            onChange={setDocComprovanteEntrada}
          />
        </div>
      </Card>

      <button
        type="submit"
        disabled={
          pending || !corretorUserId || !construtoraId || parcelas.length === 0
        }
        className="btn-primary !h-12 !px-6"
      >
        {pending ? "Cadastrando..." : "Cadastrar operação"}
      </button>
    </form>
  );
}

function CurrencyInput({
  name,
  required,
  value,
  onChange,
}: {
  name: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
        R$
      </span>
      <input
        name={name || undefined}
        required={required}
        value={value}
        onChange={(e) => onChange(maskCurrency(e.target.value))}
        inputMode="numeric"
        placeholder="0,00"
        className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
      />
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <h3 className="font-bold mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-fg-muted mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}
