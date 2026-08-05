"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  abrirCicero,
  CICERO_EVENTO_ACEITAR,
} from "@/lib/cicero-eventos";
import { finalizarOperacaoPendente } from "@/lib/actions/operacao-pendente";
import {
  createOperacaoAction,
  type CreateOperacaoState,
} from "@/lib/actions/operacoes";
import { ConstrutoraModal } from "./construtora-modal";
import { FileUploadField, type UploadedBlob } from "./file-upload-field";
import { PagadorSelector } from "./pagador-selector";
import { TemplatesOperacaoPanel } from "./templates-operacao-panel";
import type { OperacaoTemplateConfig } from "@/lib/actions/corretor-velocidade";
import { useFeedback } from "@/components/feedback-provider";
import { formatBRL, parseBRLNumber, valorPresente } from "@/lib/format";

type Construtora = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
};

type Unidade = {
  id: string;
  label: string;
  cnpj: string;
  isMatriz: boolean;
  operaEmNomeDaMatriz: boolean;
};

type Props = {
  construtoras: Construtora[];
  /** Unidades do grupo (matriz + filiais) que o user pode usar como origem.
   *  Com 0 ou 1 item o seletor nem aparece — o fluxo fica igual ao de antes. */
  unidades?: Unidade[];
  /** Taxa mensal sugerida vinda do admin (default 0.06) */
  taxaMensalSugerida?: number;
  /** Valores pré-preenchidos quando "duplicando" uma op existente. */
  preset?: {
    construtoraId: string;
    valorVenda: number;
    valorComissao: number;
    numeroParcelas: number;
  } | null;
};

type Parcela = { valor: string; vencimento: string };

function maskCurrency(value: string): string {
  // Aceita "1234.56", "1234,56", "1234" — sempre devolve "X.XXX,XX"
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata número direto pra máscara BR (ex: 5000 → "5.000,00"). */
function numberToMask(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function genParcelas(
  total: number,
  numero: number,
  startDate: string,
): Parcela[] {
  if (numero <= 0 || !Number.isFinite(total)) return [];
  const valor = total / numero;
  const start = new Date(startDate || new Date().toISOString().slice(0, 10));
  return Array.from({ length: numero }, (_, i) => {
    const v = new Date(start);
    v.setMonth(v.getMonth() + i + 1);
    return {
      valor: numberToMask(valor),
      vencimento: v.toISOString().slice(0, 10),
    };
  });
}

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return years * 12 + months + dayFrac;
}

const DRAFT_KEY = "nova-operacao-draft-v1";

type DraftOperacao = {
  construtoraId?: string;
  construtoraNome?: string;
  construtoraCnpj?: string;
  valorVenda?: string;
  valorComissao?: string;
  valorEntrada?: string;
  dataVenda?: string;
  numParcelas?: number;
  savedAt?: number;
};

/** Lê o rascunho salvo e descarta o que passou de 24h. Fica fora do
 *  componente porque depende do relógio — não pode rodar em memo de render. */
function lerDraft(): DraftOperacao | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as DraftOperacao;
    if (d.savedAt && Date.now() - d.savedAt > 24 * 3600 * 1000) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function NovaOperacaoForm({
  construtoras,
  unidades = [],
  taxaMensalSugerida = 0.06,
  preset = null,
}: Props) {
  const TAXA_MENSAL = taxaMensalSugerida;
  // Só faz sentido escolher unidade quando o grupo tem filiais cadastradas.
  const temGrupo = unidades.length > 1;
  const [unidadeId, setUnidadeId] = useState(
    unidades.find((u) => u.isMatriz)?.id ?? unidades[0]?.id ?? "",
  );
  const unidadeSel = unidades.find((u) => u.id === unidadeId) ?? null;
  const [state, action, pending] = useActionState<
    CreateOperacaoState,
    FormData
  >(createOperacaoAction, null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [salvandoPendente, setSalvandoPendente] = useState(false);
  // Evita o Cícero pular em cima do usuário mais de uma vez por sessão de
  // preenchimento — ele oferece, não insiste.
  const jaOfereceu = useRef(false);
  const { alertSuccess, alertError } = useFeedback();

  // Tenta restaurar draft do localStorage quando não há preset.
  // A leitura mora FORA do render (lerDraft usa Date.now pra expirar em 24h,
  // e função impura em useMemo quebra a regra de pureza do React Compiler).
  const [draftRestore] = useState<DraftOperacao | null>(() =>
    preset ? null : lerDraft(),
  );

  // Casa a construtora extraída por OCR (nome/CNPJ no draft) com uma já
  // cadastrada: primeiro por CNPJ (só dígitos), depois por nome.
  const construtoraMatch = useMemo(() => {
    const nome = (draftRestore?.construtoraNome ?? "").trim();
    const cnpj = draftRestore?.construtoraCnpj ?? "";
    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (!nome && !cnpjDigits) return null;
    const nomeLc = nome.toLowerCase();
    let hit: Construtora | undefined;
    if (cnpjDigits.length >= 8)
      hit = construtoras.find((c) => c.cnpj.replace(/\D/g, "") === cnpjDigits);
    if (!hit && nomeLc) {
      hit = construtoras.find((c) => {
        const rs = (c.razaoSocial ?? "").trim().toLowerCase();
        const nf = (c.nomeFantasia ?? "").trim().toLowerCase();
        return (
          rs === nomeLc ||
          nf === nomeLc ||
          (!!rs && (rs.includes(nomeLc) || nomeLc.includes(rs)))
        );
      });
    }
    return { hit: hit ?? null, nome, cnpj };
  }, [draftRestore, construtoras]);

  const [construtoraId, setConstrutoraId] = useState(
    preset?.construtoraId ??
      draftRestore?.construtoraId ??
      construtoraMatch?.hit?.id ??
      "",
  );
  const [showModal, setShowModal] = useState(false);
  // Quando a construtora do contrato não está cadastrada, guardamos os dados
  // extraídos pra pré-preencher o modal de cadastro num clique.
  const [modalPrefill, setModalPrefill] = useState<{
    nome?: string;
    cnpj?: string;
  } | null>(null);

  const [valorVenda, setValorVenda] = useState(
    preset
      ? numberToMask(preset.valorVenda)
      : (draftRestore?.valorVenda ?? ""),
  );
  const [valorComissao, setValorComissao] = useState(
    preset
      ? numberToMask(preset.valorComissao)
      : (draftRestore?.valorComissao ?? ""),
  );
  const [valorEntrada, setValorEntrada] = useState(
    draftRestore?.valorEntrada ?? "",
  );
  const [dataVenda, setDataVenda] = useState(
    draftRestore?.dataVenda ?? new Date().toISOString().slice(0, 10),
  );
  const [numParcelas, setNumParcelas] = useState(
    preset?.numeroParcelas ??
      (draftRestore?.numParcelas
        ? Math.min(Math.max(draftRestore.numParcelas, 1), 4)
        : 3),
  );
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  const [docContratoVenda, setDocContratoVenda] = useState<UploadedBlob | null>(null);
  const [docContratoComissao, setDocContratoComissao] = useState<UploadedBlob | null>(null);
  const [docNotaFiscal, setDocNotaFiscal] = useState<UploadedBlob | null>(null);
  /* ---------------------------------------------------------------
     Cícero proativo: quando o cadastro está pronto mas trava porque
     falta (ou a IA recusou) um contrato obrigatório, ele abre sozinho e
     oferece finalizar deixando o envio pendente — em vez de o usuário
     olhar pro botão desabilitado e desistir.
     --------------------------------------------------------------- */
  // Só se antecipa parcela A VENCER — a que já venceu pertence ao contrato
  // da construtora, mas não há o que comprar.
  const hojeISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const parcelasVencidas = parcelas.filter(
    (p) => p.vencimento && p.vencimento < hojeISO,
  ).length;

  // Parcela que vence além da janela de 120 dias NÃO impede o cadastro:
  // fica registrada e vira prospect — quando entra na janela, a gente
  // avisa o cliente pra antecipar.
  const limite120ISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 120);
    return d.toISOString().slice(0, 10);
  }, []);
  const parcelasFuturas = parcelas.filter(
    (p) => p.vencimento && p.vencimento > limite120ISO,
  ).length;

  const faltamDocs = !docContratoVenda || !docContratoComissao;
  // Não oferece finalizar quando o bloqueio não é (só) documento: com
  // parcela vencida no cronograma a própria ação recusaria.
  const restoPreenchido =
    !!construtoraId &&
    parcelas.length > 0 &&
    parcelasVencidas === 0 &&
    !!valorComissao &&
    !!valorVenda;

  useEffect(() => {
    if (!restoPreenchido || !faltamDocs || jaOfereceu.current || pending) return;
    const faltando = [
      !docContratoVenda ? "Contrato de compra e venda" : null,
      !docContratoComissao ? "Contrato de comissionamento" : null,
    ].filter((x): x is string => !!x);

    // Espera o usuário parar de mexer — não pula no meio da digitação.
    const t = setTimeout(() => {
      if (jaOfereceu.current) return;
      jaOfereceu.current = true;
      abrirCicero({
        texto:
          `Vi que o cadastro já está completo, só falta ${faltando.length > 1 ? "anexar os contratos" : `anexar o ${faltando[0].toLowerCase()}`}. ` +
          `Quer que eu finalize o cadastro e deixe esse envio pendente? Você me manda o arquivo depois e a operação já entra na fila — assim não perde a venda de vista.`,
        proposta: {
          tipo: "finalizar_operacao_pendente",
          aceitar: "Pode finalizar, mando depois",
          recusar: "Vou anexar agora",
          faltando,
        },
      });
    }, 2500);
    return () => clearTimeout(t);
  }, [
    restoPreenchido,
    faltamDocs,
    docContratoVenda,
    docContratoComissao,
    pending,
  ]);

  // O widget só transporta o "sim" — quem tem o FormData é este formulário.
  useEffect(() => {
    async function aoAceitar() {
      const form = formRef.current;
      if (!form || salvandoPendente) return;
      setSalvandoPendente(true);
      try {
        const r = await finalizarOperacaoPendente(new FormData(form));
        if (!r.ok) {
          await alertError(r.error, "Não consegui finalizar");
          return;
        }
        localStorage.removeItem(DRAFT_KEY);
        await alertSuccess(
          `Operação ${r.numero} cadastrada. Ficou pendente: ${r.faltando.join(", ")}. Abra a operação e anexe quando puder.`,
          "Cícero finalizou pra você",
        );
        router.push(`/painel/operacoes/${r.operacaoId}`);
      } finally {
        setSalvandoPendente(false);
      }
    }
    window.addEventListener(CICERO_EVENTO_ACEITAR, aoAceitar);
    return () => window.removeEventListener(CICERO_EVENTO_ACEITAR, aoAceitar);
  }, [salvandoPendente, alertError, alertSuccess, router]);

  const [docComprovanteEntrada, setDocComprovanteEntrada] =
    useState<UploadedBlob | null>(null);

  const valorComissaoNum = parseBRLNumber(valorComissao);

  // Auto-gera parcelas iguais quando muda comissão / numParcelas / dataVenda
  useEffect(() => {
    if (valorComissaoNum > 0 && numParcelas > 0 && dataVenda) {
      setParcelas(genParcelas(valorComissaoNum, numParcelas, dataVenda));
    } else {
      setParcelas([]);
    }
  }, [valorComissaoNum, numParcelas, dataVenda]);

  useEffect(() => {
    if (state?.ok) {
      // Limpa draft após sucesso
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignora */
      }
      alertSuccess(`Operação ${state.numero} criada com sucesso.`, "Operação registrada")
        .then(() => router.push(`/painel/operacoes/${state.operacaoId}`));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao registrar operação");
    }
  }, [state, router, alertSuccess, alertError]);

  // Autosave draft a cada mudança de campo principal (debounced)
  useEffect(() => {
    if (state?.ok) return; // não salva após submeter com sucesso
    const handle = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            construtoraId,
            valorVenda,
            valorComissao,
            valorEntrada,
            dataVenda,
            numParcelas,
            savedAt: Date.now(),
          }),
        );
      } catch {
        /* ignora */
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [
    construtoraId,
    valorVenda,
    valorComissao,
    valorEntrada,
    dataVenda,
    numParcelas,
    state,
  ]);

  // Estimativa de VP em tempo real (taxa não exposta ao corretor — só no borderô)
  const vp = useMemo(() => {
    if (parcelas.length === 0 || valorComissaoNum === 0) return 0;
    const today = new Date();
    const arr = parcelas.map((p) => ({
      valor: parseBRLNumber(p.valor),
      mesesAteVencimento: Math.max(monthsBetween(today, new Date(p.vencimento)), 0),
    }));
    return valorPresente(arr, TAXA_MENSAL);
  }, [parcelas, valorComissaoNum, TAXA_MENSAL]);

  function updateParcela(idx: number, key: keyof Parcela, value: string) {
    setParcelas((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  function aplicarTemplate(cfg: OperacaoTemplateConfig) {
    if (typeof cfg.numeroParcelas === "number" && cfg.numeroParcelas > 0) {
      setNumParcelas(cfg.numeroParcelas);
    }
    if (
      typeof cfg.percentualComissao === "number" &&
      cfg.percentualComissao > 0 &&
      cfg.percentualComissao <= 1
    ) {
      const vendaNum = parseBRLNumber(valorVenda);
      if (vendaNum > 0) {
        const novaComissao = vendaNum * cfg.percentualComissao;
        setValorComissao(numberToMask(novaComissao));
      }
    }
    // pagadorTipo é controlado pelo PagadorSelector — não setamos diretamente,
    // mas o user pode ajustar manualmente após aplicar
  }

  const configAtual: OperacaoTemplateConfig = {
    numeroParcelas: numParcelas,
    percentualComissao: (() => {
      const v = parseBRLNumber(valorVenda);
      const c = parseBRLNumber(valorComissao);
      if (v > 0 && c > 0) return Math.min(c / v, 1);
      return undefined;
    })(),
  };

  return (
    <>
      <form ref={formRef} action={action} className="grid lg:grid-cols-12 gap-6">
        {/* Coluna principal — inputs */}
        <div className="lg:col-span-7 space-y-6">
          {state && !state.ok && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
              {state.error}
            </div>
          )}

          {/* Unidade do grupo (matriz / filial) — só quando há filiais */}
          {temGrupo && (
            <Section
              title="00. Unidade"
              subtitle="De qual empresa do grupo é esta operação"
            >
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Matriz ou filial
              </label>
              <select
                name="imobiliariaId"
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
                required
                className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors appearance-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5L6 6.5L11 1.5' stroke='%235a6571' stroke-width='1.5' fill='none'/></svg>\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 16px center",
                }}
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
              {unidadeSel && (
                <p className="mt-2 text-xs text-fg-muted">
                  {unidadeSel.operaEmNomeDaMatriz ? (
                    <>
                      Esta filial opera <strong>em nome da matriz</strong> — o
                      contrato de cessão sai no CNPJ e na conta da matriz.
                    </>
                  ) : (
                    <>
                      O contrato de cessão sai no CNPJ{" "}
                      <strong className="font-mono">{unidadeSel.cnpj}</strong> e
                      na conta bancária desta unidade.
                    </>
                  )}
                </p>
              )}
            </Section>
          )}
          {!temGrupo && unidades[0] && (
            <input type="hidden" name="imobiliariaId" value={unidades[0].id} />
          )}

          {/* Construtora */}
          <Section title="01. Construtora" subtitle="A quem é devida essa comissão">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Selecionar construtora
                </label>
                <select
                  name="construtoraId"
                  value={construtoraId}
                  onChange={(e) => setConstrutoraId(e.target.value)}
                  required
                  className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors appearance-none"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5L6 6.5L11 1.5' stroke='%235a6571' stroke-width='1.5' fill='none'/></svg>\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 16px center",
                  }}
                >
                  <option value="">— Selecionar construtora —</option>
                  {construtoras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razaoSocial}
                      {c.nomeFantasia ? ` (${c.nomeFantasia})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalPrefill(null);
                  setShowModal(true);
                }}
                className="btn-ghost !h-12"
              >
                + Nova
              </button>
            </div>
            {construtoraMatch &&
              !construtoraMatch.hit &&
              !construtoraId &&
              (construtoraMatch.nome || construtoraMatch.cnpj) && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 text-sm">
                  <span className="text-fg-muted">
                    Detectei no contrato{" "}
                    <strong className="text-fg">
                      {construtoraMatch.nome || construtoraMatch.cnpj}
                    </strong>
                    {construtoraMatch.nome && construtoraMatch.cnpj
                      ? ` (CNPJ ${construtoraMatch.cnpj})`
                      : ""}
                    , mas não está cadastrada.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setModalPrefill({
                        nome: construtoraMatch.nome,
                        cnpj: construtoraMatch.cnpj,
                      });
                      setShowModal(true);
                    }}
                    className="btn-primary !h-9 shrink-0 whitespace-nowrap"
                  >
                    Cadastrar agora
                  </button>
                </div>
              )}
            {construtoraId && (
              <div className="mt-4">
                <TemplatesOperacaoPanel
                  construtoraId={construtoraId}
                  configAtual={configAtual}
                  onAplicar={aplicarTemplate}
                />
              </div>
            )}
          </Section>

          {/* Dados da venda */}
          <Section
            title="02. Dados da venda"
            subtitle="Valores e data conforme contrato"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Valor da venda
                  <span className="ml-1 text-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    name="valorVenda"
                    required
                    value={valorVenda}
                    onChange={(e) => setValorVenda(maskCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Valor da comissão
                  <span className="ml-1 text-accent">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    name="valorComissao"
                    required
                    value={valorComissao}
                    onChange={(e) => setValorComissao(maskCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Valor da entrada
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    name="valorEntrada"
                    value={valorEntrada}
                    onChange={(e) => setValorEntrada(maskCurrency(e.target.value))}
                    inputMode="numeric"
                    placeholder="0,00"
                    className="w-full h-12 rounded-xl bg-bg border border-border-strong pl-10 pr-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors tabular text-right"
                  />
                </div>
                <p className="mt-1 text-[10px] text-fg-dim">
                  Valor pago à vista pelo comprador. O comprovante é anexado na
                  seção 04 (Documentos), se houver.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Data da venda<span className="ml-1 text-accent">*</span>
              </label>
              <input
                name="dataVenda"
                type="date"
                required
                value={dataVenda}
                onChange={(e) => setDataVenda(e.target.value)}
                className="w-full sm:w-60 h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors"
              />
            </div>
          </Section>

          {/* Parcelas */}
          <Section
            title="03. Parcelas da comissão"
            subtitle="Cronograma que a construtora pagaria a você"
          >
            <div className="flex items-end gap-3 mb-5">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                  Número de parcelas (máx 4)
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={numParcelas}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1;
                    setNumParcelas(Math.min(Math.max(v, 1), 4));
                  }}
                  className="w-32 h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors tabular"
                />
              </div>
              <span className="text-xs text-fg-dim font-mono pb-3">
                até 4 parcelas mensais · só parcela a vencer
              </span>
            </div>
            {parcelas.length > 0 && (
              <ul className="space-y-2">
                {parcelas.map((p, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <span className="col-span-1 font-mono text-[10px] text-fg-dim text-center">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="date"
                      min={hojeISO}
                      value={p.vencimento}
                      onChange={(e) => updateParcela(i, "vencimento", e.target.value)}
                      className={`col-span-6 h-10 rounded-lg bg-bg border px-3 text-sm text-fg outline-none transition-colors ${
                        p.vencimento && p.vencimento < hojeISO
                          ? "border-danger focus:border-danger"
                          : p.vencimento && p.vencimento > limite120ISO
                            ? "border-warn focus:border-warn"
                            : "border-border focus:border-accent"
                      }`}
                    />
                    <div className="col-span-5 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted text-xs font-mono pointer-events-none">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={p.valor}
                        onChange={(e) =>
                          updateParcela(
                            i,
                            "valor",
                            maskCurrency(e.target.value),
                          )
                        }
                        placeholder="0,00"
                        className="w-full h-10 rounded-lg bg-bg border border-border pl-8 pr-3 text-sm text-fg focus:border-accent outline-none transition-colors tabular text-right"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {parcelasVencidas > 0 && (
              <p className="mt-3 rounded-xl border border-danger/40 bg-red-50 px-3 py-2 text-xs text-danger">
                {parcelasVencidas === 1
                  ? "Há uma parcela com vencimento já passado."
                  : `Há ${parcelasVencidas} parcelas com vencimento já passado.`}{" "}
                Só dá pra antecipar o que ainda está a vencer — tire essas do
                cronograma e informe na comissão apenas o valor que falta
                receber.
              </p>
            )}
            {parcelasVencidas === 0 && parcelasFuturas > 0 && (
              <p className="mt-3 rounded-xl border border-warn/40 bg-yellow-50 px-3 py-2 text-xs text-fg">
                {parcelasFuturas === 1
                  ? "Uma parcela vence daqui a mais de 120 dias."
                  : `${parcelasFuturas} parcelas vencem daqui a mais de 120 dias.`}{" "}
                Pode cadastrar normalmente — elas ficam registradas e a gente
                te avisa quando entrarem no prazo de antecipação.
              </p>
            )}
            <input type="hidden" name="parcelas" value={JSON.stringify(parcelas)} />
          </Section>

          <PagadorSelector />

          {/* Documentos da operação */}
          <Section
            title="04. Documentos da operação"
            subtitle="Contratos de venda e comissão são obrigatórios; nota fiscal e comprovante de entrada, opcionais."
          >
            <FileUploadField
              label="Contrato de compra e venda do imóvel"
              name="doc_contrato_venda"
              required
              tipo="contrato_venda"
              folder="operacoes/contrato-venda"
              description="Contrato assinado com o comprador final."
              onChange={setDocContratoVenda}
            />
            <FileUploadField
              label="Contrato de comissionamento"
              name="doc_contrato_comissao"
              required
              tipo="contrato_comissao"
              folder="operacoes/contrato-comissao"
              description="Contrato firmado entre você (corretor/imobiliária) e a construtora."
              onChange={setDocContratoComissao}
            />
            <FileUploadField
              label="Nota fiscal da comissão (opcional)"
              name="doc_nota_fiscal"
              tipo="nota_fiscal"
              folder="operacoes/nota-fiscal"
              description="NF emitida pelo corretor/imobiliária pra construtora. Pode anexar depois."
              onChange={setDocNotaFiscal}
            />
            <FileUploadField
              label="Comprovante de entrada (opcional)"
              name="doc_comprovante_entrada"
              tipo="comprovante_entrada"
              folder="operacoes/comprovante-entrada"
              description="Comprovante do valor pago à vista pelo comprador (TED, PIX, recibo). Anexe só se houver entrada."
              onChange={setDocComprovanteEntrada}
            />
            <input type="hidden" name="doc_contrato_venda_nome" value={docContratoVenda?.name ?? ""} />
            <input type="hidden" name="doc_contrato_comissao_nome" value={docContratoComissao?.name ?? ""} />
            <input type="hidden" name="doc_nota_fiscal_nome" value={docNotaFiscal?.name ?? ""} />
            <input type="hidden" name="doc_comprovante_entrada_nome" value={docComprovanteEntrada?.name ?? ""} />
          </Section>

          <button
            type="submit"
            disabled={
              pending ||
              parcelas.length === 0 ||
              parcelasVencidas > 0 ||
              !construtoraId ||
              !docContratoVenda ||
              !docContratoComissao
            }
            className="btn-primary !w-full justify-center !h-13"
          >
            {pending ? "Registrando..." : "Registrar operação"}
            <span className="arrow">→</span>
          </button>
        </div>

        {/* Coluna lateral — resumo do VP */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 rounded-3xl bg-bg-dark text-fg-inverse p-7 md:p-9 relative overflow-hidden">
            <div className="absolute inset-0 bg-mesh-dark pointer-events-none" aria-hidden />
            <div className="relative">
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fg-inverse/70 mb-2">
                receba amanhã
              </div>
              <div className="font-mono tabular text-3xl md:text-5xl font-bold tracking-tight text-gradient-blue leading-tight">
                {formatBRL(vp)}
              </div>
              <div className="mt-2 text-fg-inverse text-sm font-semibold">
                na sua conta!
              </div>
              <div className="mt-3 rounded-xl bg-white/10 border border-white/15 p-3 text-[11px] leading-relaxed text-fg-inverse/85">
                Esta é uma <strong>estimativa</strong>. A taxa final, valor
                presente e deságio definitivos são <strong>definidos pelo
                fundo na aprovação da operação</strong> e aparecem no borderô.
              </div>

              <div className="mt-7 pt-6 border-t border-white/10 space-y-3 text-sm">
                <Row
                  label="Comissão total"
                  value={formatBRL(valorComissaoNum)}
                />
                <Row
                  label="Parcelas"
                  value={`${parcelas.length}x`}
                />
              </div>
            </div>
          </div>
        </aside>
      </form>

      <ConstrutoraModal
        open={showModal}
        initialNome={modalPrefill?.nome}
        initialCnpj={modalPrefill?.cnpj}
        onClose={() => setShowModal(false)}
        onCreated={(id) => {
          setShowModal(false);
          setModalPrefill(null);
          setConstrutoraId(id);
          // forçar reload pra puxar a nova construtora
          router.refresh();
        }}
      />
    </>
  );
}

function Section({
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="rounded-2xl border border-border bg-bg-elev md:open:p-7 group [&[open]]:p-7 p-4"
    >
      <summary className="cursor-pointer md:cursor-default list-none flex items-start justify-between gap-3 md:mb-5 [&[open]]:mb-5 group-[&[open]]:mb-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-fg-muted mt-1">{subtitle}</p>
          )}
        </div>
        <span className="md:hidden text-fg-muted text-xl transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="space-y-4">{children}</div>
    </details>
  );
}

function Row({
  label,
  value,
  highlight = "default",
}: {
  label: string;
  value: string;
  highlight?: "default" | "muted" | "warn";
}) {
  const valueColor =
    highlight === "warn"
      ? "text-orange-300"
      : highlight === "muted"
        ? "text-fg-inverse/80"
        : "text-fg-inverse";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-fg-inverse/60 text-xs uppercase tracking-wider font-mono">
        {label}
      </span>
      <span className={`font-mono tabular ${valueColor}`}>{value}</span>
    </div>
  );
}
