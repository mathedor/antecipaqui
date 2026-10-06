"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRL } from "@/lib/format";
import {
  APIS_SERVICOS,
  CAMBIO,
  SETUP,
  STORAGE_KEY,
  contasDoMes,
  formatTokens,
  labelEntrega,
  labelMes,
  listarMeses,
  precoEntrega,
  tokensEntrega,
  type ContaFixa,
} from "@/lib/custos-data";
import type { ContaAna, EntregaDaAna, PagamentosAna, SaldoAna } from "@/lib/custosAna";
import {
  EVENTO_PAGAMENTOS,
  avisarPagamentos,
  devDoMesComAna,
  notasDaOrigem,
  pedidosDaAnaPorMes,
  saldosNoMes,
  type LinhaDev,
  type LinhaSaldo,
} from "@/lib/custos-entregas";

/* =============================================================
   Ícones (SVG desenhado — sem emoji)
   ============================================================= */

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m3 8.5 3.2 3.2L13 4.8" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m3 6 5 5 5-5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 4h11M6 4V2.8h4V4M4 4l.6 9h6.8L12 4M6.5 6.5v4M9.5 6.5v4" />
    </svg>
  );
}

/* =============================================================
   Estado persistido
   ============================================================= */

type Extra = {
  id: string;
  titulo: string;
  valor: number;
  /** YYYY-MM-DD */
  data: string;
  /** YYYY-MM — quando preenchido, repete todo mês a partir daí. */
  recorrenteDesde?: string;
  obs?: string;
};

type Estado = {
  pagos: Record<string, boolean>;
  overrides: Record<string, number>;
  extras: Extra[];
};

const ESTADO_VAZIO: Estado = { pagos: {}, overrides: {}, extras: [] };

function carregar(): Estado {
  if (typeof window === "undefined") return ESTADO_VAZIO;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ESTADO_VAZIO;
    const parsed = JSON.parse(raw) as Partial<Estado>;
    return {
      pagos: parsed.pagos ?? {},
      overrides: parsed.overrides ?? {},
      extras: parsed.extras ?? [],
    };
  } catch {
    return ESTADO_VAZIO;
  }
}

/* =============================================================
   Blocos visuais
   ============================================================= */

function Kpi({
  eyebrow,
  valor,
  detalhe,
  destaque,
}: {
  eyebrow: string;
  valor: string;
  detalhe: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 md:p-6 ${
        destaque
          ? "border-accent/40 bg-accent-soft"
          : "border-border bg-bg-elev"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">
        {eyebrow}
      </div>
      <div
        className={`mt-2 font-mono tabular text-2xl md:text-3xl font-bold ${
          destaque ? "text-accent" : "text-fg"
        }`}
      >
        {valor}
      </div>
      <div className="mt-1 text-xs text-fg-muted">{detalhe}</div>
    </div>
  );
}

function BarraPago({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 rounded-full bg-bg-card overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          pct >= 100 ? "bg-success" : "bg-accent"
        }`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function ChipEstimado() {
  return (
    <span className="inline-flex items-center rounded-full border border-warn/50 bg-warn/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-warn">
      estimado
    </span>
  );
}

/** Selo das linhas que a Ana entregou (tarefa do Terminal com commit publicado). */
function ChipAna() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent"
      title="Entregue pela Ana — entra no desenvolvimento do mês e paga junto com ele"
    >
      Ana
    </span>
  );
}

/** Estado da fatura de um pedido — só leitura: a baixa vem da fatura. */
function ChipFatura({ pago }: { pago: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
        pago
          ? "border-success/50 bg-success-soft text-success"
          : "border-warn/50 bg-warn/10 text-warn"
      }`}
      title="A baixa vem sozinha quando a fatura do pedido é paga"
    >
      {pago ? "fatura paga" : "fatura aberta"}
    </span>
  );
}

/** Linha de saldo no mês de destino — o pago é o da Ana, só leitura. */
function LinhaDeSaldo({ s }: { s: LinhaSaldo }) {
  return (
    <LinhaItem
      pago={s.pago}
      titulo={s.titulo}
      obs={s.desc}
      chip={
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
            s.valor < 0 ? "border-success/50 bg-success-soft text-success" : "border-border bg-bg text-fg-muted"
          }`}
          title="A baixa vem junto com a do mês, no controle da Diretório Web"
        >
          {s.valor < 0 ? "crédito" : "saldo"}
          {s.pago ? " · pago" : ""}
        </span>
      }
      valor={s.valor}
      tom={s.valor < 0 ? "sucesso" : undefined}
    />
  );
}

/** Embaixo do total do mês: o total + a nota de pra onde foi a diferença. */
function TotalComNotas({ total, notas }: { total: number; notas: string[] }) {
  return (
    <span className="block">
      <span className="block font-mono tabular text-sm font-bold">{formatBRL(total)}</span>
      {notas.map((n) => (
        <span key={n} className="block mt-1 max-w-[13rem] text-[11px] leading-snug text-fg-muted">
          {n}
        </span>
      ))}
    </span>
  );
}

function BotaoPago({
  pago,
  onClick,
  label,
}: {
  pago: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pago}
      title={pago ? "Marcado como pago" : "Marcar como pago"}
      aria-label={label}
      className={`shrink-0 h-6 w-6 rounded-md border inline-flex items-center justify-center transition-colors ${
        pago
          ? "border-success bg-success text-white"
          : "border-border-strong text-fg-dim hover:border-accent hover:text-accent"
      }`}
    >
      {pago ? <IconCheck /> : null}
    </button>
  );
}

function Acordeao({
  titulo,
  sub,
  direita,
  aberto,
  onToggle,
  children,
  rodape,
}: {
  titulo: React.ReactNode;
  sub?: React.ReactNode;
  direita?: React.ReactNode;
  aberto: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberto}
        className="w-full text-left px-4 md:px-5 py-4 flex items-start gap-3 hover:bg-bg-card/50 transition-colors"
      >
        <span className="mt-1 text-fg-dim">
          <IconChevron open={aberto} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-semibold text-sm md:text-base leading-tight">
            {titulo}
          </span>
          {sub ? (
            <span className="block text-xs text-fg-muted mt-1">{sub}</span>
          ) : null}
        </span>
        {direita ? <span className="text-right shrink-0">{direita}</span> : null}
      </button>
      {aberto ? (
        <div className="border-t border-border">
          {children}
          {rodape ? (
            <div className="border-t border-border px-4 md:px-5 py-3">
              {rodape}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Linha de item: no celular vira card (label em cima, valor embaixo). */
function LinhaItem({
  pago,
  onTogglePago,
  titulo,
  obs,
  chip,
  valor,
  onEditarValor,
  onRemover,
  extraEsq,
  tom,
}: {
  pago: boolean;
  onTogglePago?: () => void;
  titulo: React.ReactNode;
  obs?: React.ReactNode;
  chip?: React.ReactNode;
  valor: number;
  onEditarValor?: (novo: number) => void;
  onRemover?: () => void;
  extraEsq?: React.ReactNode;
  /** "sucesso" pinta o valor de verde (crédito) */
  tom?: "sucesso";
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState(String(valor));

  return (
    <div
      className={`px-4 md:px-5 py-3 border-b border-border last:border-b-0 flex items-start gap-3 ${
        pago ? "opacity-70" : ""
      }`}
    >
      {onTogglePago ? (
        <div className="pt-0.5">
          <BotaoPago
            pago={pago}
            onClick={onTogglePago}
            label={`Marcar ${typeof titulo === "string" ? titulo : "item"} como pago`}
          />
        </div>
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium leading-tight">{titulo}</span>
          {chip}
        </div>
        {obs ? (
          <div className="text-xs text-fg-muted mt-0.5 leading-snug">{obs}</div>
        ) : null}
        {extraEsq}
      </div>
      <div className="shrink-0 text-right">
        {editando && onEditarValor ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              type="number"
              step="0.01"
              value={rascunho}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onEditarValor(Number(rascunho) || 0);
                  setEditando(false);
                }
                if (e.key === "Escape") setEditando(false);
              }}
              className="w-28 h-8 rounded-lg border border-accent bg-bg px-2 text-sm font-mono tabular text-right outline-none"
            />
            <button
              type="button"
              onClick={() => {
                onEditarValor(Number(rascunho) || 0);
                setEditando(false);
              }}
              className="h-8 px-2 rounded-lg border border-border-strong text-xs hover:border-accent hover:text-accent"
            >
              ok
            </button>
          </span>
        ) : (
          <button
            type="button"
            disabled={!onEditarValor}
            onClick={() => {
              setRascunho(String(valor));
              setEditando(true);
            }}
            title={onEditarValor ? "Clique para ajustar o valor" : undefined}
            className={`font-mono tabular text-sm font-semibold ${
              onEditarValor ? "hover:text-accent cursor-pointer" : "cursor-default"
            } ${pago || tom === "sucesso" ? "text-success" : "text-fg"}`}
          >
            {formatBRL(valor)}
          </button>
        )}
        {onRemover ? (
          <button
            type="button"
            onClick={onRemover}
            title="Remover custo registrado"
            className="ml-2 align-middle text-fg-dim hover:text-danger"
          >
            <IconTrash />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* =============================================================
   Painel
   ============================================================= */

/* `precosDaAna` chega do servidor com o que a infraestrutura custou de verdade
   neste mês (a Ana lê a fatura da Vercel e o consumo do banco todo dia). Só as
   contas compartilhadas da casa são trocadas — a infra dedicada do Antecipaqui
   (servidor principal, backup duplo, as 4 proxies, firewall hot blind, a VPS do
   Cícero) fica exatamente como está no relatório. */
/* `pagosAna` é o estado de pago mês a mês no controle da Diretório Web: mês
   pago lá entra marcado aqui, e fechar/reabrir um mês aqui avisa lá — o ✓
   deixou de valer só neste navegador. */
/* `entregasAna` é o que a própria Ana entregou neste sistema (lista vinda do
   servidor — o token nunca chega aqui). Tarefa entra no desenvolvimento do
   mês; pedido vai pro bloco "Pedidos pela Ana", fora do mês. */
export function CustosPanel({ mesCorrente, precosDaAna, pagosAna, avisarAna, entregasAna }: {
  mesCorrente: string;
  precosDaAna: ContaAna[] | null;
  pagosAna: PagamentosAna;
  avisarAna: (tipo: "custos" | "dev", mes: string, pago: boolean) => Promise<PagamentosAna | null>;
  entregasAna: EntregaDaAna[];
}) {
  const [estado, setEstado] = useState<Estado>(ESTADO_VAZIO);
  const [pronto, setPronto] = useState(false);
  const [sinc, setSinc] = useState<"quieto" | "indo" | "ok" | "erro">("quieto");
  const [abertos, setAbertos] = useState<Record<string, boolean>>({
    [`mes:${mesCorrente}`]: true,
    setup: true,
    dev: true,
    [`dev:${mesCorrente}`]: true,
    apis: false,
    pedidos: true,
    [`ped:${mesCorrente}`]: true,
  });
  const [formAberto, setFormAberto] = useState(false);
  /* saldos da Ana (mês pago que mudou depois): redesenha com a resposta de
     cada baixa — daqui ou do quadro de pagamentos */
  const [saldos, setSaldos] = useState<SaldoAna[]>(pagosAna.saldos ?? []);
  useEffect(() => {
    const ouvir = (ev: Event) => {
      const d = (ev as CustomEvent<PagamentosAna>).detail;
      if (d && Array.isArray(d.saldos)) setSaldos(d.saldos);
    };
    window.addEventListener(EVENTO_PAGAMENTOS, ouvir);
    return () => window.removeEventListener(EVENTO_PAGAMENTOS, ouvir);
  }, []);
  const avisar = (tipo: "custos" | "dev", mes: string, pago: boolean) => {
    setSinc("indo");
    void avisarAna(tipo, mes, pago).then((r) => {
      setSinc(r ? "ok" : "erro");
      if (r) avisarPagamentos(r);
    });
  };

  /* já migramos as marcações antigas deste navegador pra Ana? Antes da
     migração, marcação local vale mais (foi feita com a ponte quebrada);
     depois, a Ana é a autoridade nos DOIS sentidos. */
  const migrado = useRef(false);

  useEffect(() => {
    migrado.current = window.localStorage.getItem(`${STORAGE_KEY}:ana`) === "1";
    const carregado = carregar();
    /* mês pago na Ana entra marcado, aconteça o que acontecer com o
       localStorage — é o mesmo número pra todo mundo que abre a página */
    const chavesDoMes = (tipo: "custos" | "dev", m: string): string[] =>
      tipo === "custos"
        ? [
            ...contasDoMes(m).map((c) => `${m}#${c.id}`),
            ...carregado.extras
              .filter((x) => (x.recorrenteDesde ? m >= x.recorrenteDesde : x.data.slice(0, 7) === m))
              .map((x) => `${m}#x:${x.id}`),
          ]
        : devDoMesComAna(m, entregasAna).map((e) => e.id);
    for (const tipo of ["custos", "dev"] as const) {
      for (const [m, e] of Object.entries(pagosAna[tipo])) {
        if (!e) continue;
        const ks = chavesDoMes(tipo, m);
        if (!ks.length) continue;
        if (e.pago) for (const k of ks) carregado.pagos[k] = true;
        /* mês reaberto na Ana desmarca aqui — mas só depois da migração, pra
           não apagar marcação feita enquanto a ponte não existia */
        else if (migrado.current && ks.every((k) => carregado.pagos[k]))
          for (const k of ks) delete carregado.pagos[k];
      }
    }
    setEstado(carregado);
    setPronto(true);
    try { window.localStorage.setItem(`${STORAGE_KEY}:ana`, "1"); } catch { /* quota */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pronto) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch {
      /* quota cheia / modo privado — ignora */
    }
  }, [estado, pronto]);

  const toggle = (k: string) =>
    setAbertos((s) => ({ ...s, [k]: !s[k] }));

  const marcarPago = (id: string, valor?: boolean) =>
    setEstado((s) => {
      const pagos = { ...s.pagos };
      const novo = valor ?? !pagos[id];
      if (novo) pagos[id] = true;
      else delete pagos[id];
      return { ...s, pagos };
    });

  const marcarVarios = (ids: string[], valor: boolean) =>
    setEstado((s) => {
      const pagos = { ...s.pagos };
      for (const id of ids) {
        if (valor) pagos[id] = true;
        else delete pagos[id];
      }
      return { ...s, pagos };
    });

  const setOverride = (id: string, valor: number) =>
    setEstado((s) => ({ ...s, overrides: { ...s.overrides, [id]: valor } }));

  const meses = useMemo(() => listarMeses(mesCorrente), [mesCorrente]);

  /** Itens de custo fixo de um mês (contas + extras vigentes). */
  const itensDoMes = (mes: string) => {
    const base = contasDoMes(mes).map((c: ContaFixa) => {
      // mês corrente e conta compartilhada: vale o preço lido na fonte
      const real = mes === mesCorrente ? precosDaAna?.find((p) => p.id === c.id) : undefined;
      return {
        id: `${mes}#${c.id}`,
        titulo: c.titulo,
        obs: real ? real.obs : c.obs,
        estimado: real ? real.estimado : c.estimado,
        valor: estado.overrides[`${mes}#${c.id}`] ?? real?.valor ?? c.valor,
        extraId: null as string | null,
      };
    });
    const extras = estado.extras
      .filter((e) =>
        e.recorrenteDesde
          ? mes >= e.recorrenteDesde
          : e.data.slice(0, 7) === mes,
      )
      .map((e) => ({
        id: `${mes}#x:${e.id}`,
        titulo: e.titulo,
        obs: [e.obs, e.recorrenteDesde ? "recorrente" : "eventual"]
          .filter(Boolean)
          .join(" · "),
        estimado: false,
        valor: estado.overrides[`${mes}#x:${e.id}`] ?? e.valor,
        extraId: e.id,
      }));
    return [...base, ...extras];
  };

  /* desenvolvimento do mês = arquivo + tarefas da Ana (custos-entregas.ts) */
  const devPorMes = useMemo(
    () => Object.fromEntries(meses.map((m) => [m, devDoMesComAna(m, entregasAna)])) as Record<string, LinhaDev[]>,
    [meses, entregasAna],
  );
  const devDoMes = (mes: string): LinhaDev[] => devPorMes[mes] ?? [];
  /* preço da entrega na competência — a margem da casa (set/2026+) entra
     aqui; ajuste manual do dono continua valendo por cima */
  const devValor = (mes: string, e: LinhaDev) =>
    estado.overrides[e.id] ?? precoEntrega(mes, e);

  /* pedidos da Ana: fatura própria, fora do mês — só leitura aqui */
  const pedidosPorMes = useMemo(() => pedidosDaAnaPorMes(entregasAna), [entregasAna]);
  const mesesPedidos = Object.keys(pedidosPorMes).sort().reverse();
  const todosPedidos = mesesPedidos.flatMap((m) => pedidosPorMes[m]);
  const totalPedidos = todosPedidos.reduce((a, p) => a + p.valor, 0);
  const abertoPedidos = todosPedidos.reduce((a, p) => a + (p.pago ? 0 : p.valor), 0);

  /* mês que fechou (ou reabriu) — por qualquer caminho: item a item ou botão
     do mês — vira baixa no controle da Diretório Web. A primeira passada só
     mede a régua; daí em diante toda virada avisa a Ana. */
  const completoRef = useRef<Record<string, boolean> | null>(null);
  useEffect(() => {
    if (!pronto) return;
    const atual: Record<string, boolean> = {};
    for (const m of meses) {
      const itens = itensDoMes(m);
      if (itens.length) atual[`custos:${m}`] = itens.every((i) => !!estado.pagos[i.id]);
      const dev = devDoMes(m);
      if (dev.length) atual[`dev:${m}`] = dev.every((e) => !!estado.pagos[e.id]);
    }
    const antes = completoRef.current;
    completoRef.current = atual;
    if (!antes) {
      /* primeira visita depois da ponte nascer: mês fechado neste navegador
         mas em aberto na Ana é empurrado pra lá (a marcação foi feita com a
         ponte quebrada). Depois de migrado, a Ana é quem manda. */
      if (!migrado.current) {
        for (const [k, v] of Object.entries(atual)) {
          const [tipo, mes] = k.split(":") as ["custos" | "dev", string];
          const la = pagosAna[tipo][mes];
          if (v && la && !la.pago) avisar(tipo, mes, true);
        }
      }
      return;
    }
    for (const [k, v] of Object.entries(atual)) {
      if (antes[k] === undefined || antes[k] === v) continue;
      const [tipo, mes] = k.split(":") as ["custos" | "dev", string];
      avisar(tipo, mes, v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.pagos, pronto]);

  /* ---------- totais ---------- */

  const totalMensalPorMes = useMemo(
    () =>
      Object.fromEntries(
        meses.map((m) => [
          m,
          itensDoMes(m).reduce((acc, i) => acc + i.valor, 0),
        ]),
      ) as Record<string, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meses, estado],
  );

  const totalDevPorMes = useMemo(
    () =>
      Object.fromEntries(
        meses.map((m) => [
          m,
          devDoMes(m).reduce((acc, e) => acc + devValor(m, e), 0),
        ]),
      ) as Record<string, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meses, estado, devPorMes],
  );

  /* saldo do mês (destino): entra no total, no % pago e nos KPIs do mês — mas
     não no investido/acumulado, que somam o relatório (a diferença já está no
     mês de origem) */
  const saldoDe = (tipo: "custos" | "dev", m: string) => saldosNoMes(saldos, tipo, m);
  const somaSaldo = (l: LinhaSaldo[], soPago = false) =>
    l.reduce((a, x) => a + (soPago && !x.pago ? 0 : x.valor), 0);

  const totalDev = meses.reduce((a, m) => a + (totalDevPorMes[m] ?? 0), 0);
  const totalTokens = meses.reduce(
    (a, m) => a + devDoMes(m).reduce((x, e) => x + tokensEntrega(e), 0),
    0,
  );
  const qtdDev = meses.reduce((a, m) => a + devDoMes(m).length, 0);
  const totalInvestido = SETUP.valor + totalDev;
  const custoMensalAtual = (totalMensalPorMes[mesCorrente] ?? 0) + somaSaldo(saldoDe("custos", mesCorrente));
  const totalMensalAcumulado = meses.reduce(
    (a, m) => a + (totalMensalPorMes[m] ?? 0),
    0,
  );

  const devMesCorrente = devDoMes(mesCorrente);
  const totalDevMesCorrente = (totalDevPorMes[mesCorrente] ?? 0) + somaSaldo(saldoDe("dev", mesCorrente));
  const pagoDevMesCorrente = devMesCorrente.reduce(
    (a, e) => a + (estado.pagos[e.id] ? devValor(mesCorrente, e) : 0),
    0,
  ) + somaSaldo(saldoDe("dev", mesCorrente), true);
  const pctDevMesCorrente =
    totalDevMesCorrente > 0
      ? (pagoDevMesCorrente / totalDevMesCorrente) * 100
      : 100;

  return (
    <div className="space-y-6">
      {/* ============ KPIs ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Kpi
          eyebrow="total investido"
          valor={formatBRL(totalInvestido)}
          detalhe={`setup ${formatBRL(SETUP.valor)} + ${qtdDev} entregas pós-lançamento`}
          destaque
        />
        <Kpi
          eyebrow="custo mensal"
          valor={formatBRL(custoMensalAtual)}
          detalhe={`contas fixas de ${labelMes(mesCorrente)} · câmbio R$ ${CAMBIO.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
        />
        <Kpi
          eyebrow="mês corrente"
          valor={formatBRL(totalDevMesCorrente)}
          detalhe={`desenvolvimento de ${labelMes(mesCorrente)} · ${Math.round(pctDevMesCorrente)}% pago`}
        />
      </div>

      {/* ============ sincronia com o controle da casa ============ */}
      <p className={`text-xs ${sinc === "erro" ? "text-danger" : "text-fg-dim"}`}>
        {sinc === "erro"
          ? "⚠ Não consegui avisar o controle da Diretório Web — a última marcação valeu só neste navegador. Tente de novo em instantes."
          : `Mês fechado (ou reaberto) aqui dá baixa direto no controle da Diretório Web${sinc === "indo" ? " — avisando…" : sinc === "ok" ? " — ✓ avisado" : ""}. Marcações parciais e ajustes de valor ficam neste navegador. O que a Ana entrega entra sozinho: tarefa dela vai no desenvolvimento do mês (selo Ana) e pedido externo aparece em Pedidos pela Ana, com a fatura de quem pediu.`}
      </p>

      {/* ============ Registrar custo ============ */}
      <div>
        <button
          type="button"
          onClick={() => setFormAberto((s) => !s)}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border-strong bg-bg-elev text-sm font-medium hover:border-accent hover:text-accent transition-colors"
        >
          <IconPlus />
          {formAberto ? "Fechar" : "Registrar custo"}
        </button>
        {formAberto ? (
          <FormNovoCusto
            mesCorrente={mesCorrente}
            onSalvar={(extra) => {
              setEstado((s) => ({ ...s, extras: [...s.extras, extra] }));
              setFormAberto(false);
            }}
          />
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ============ COLUNA ESQUERDA — custos mensais ============ */}
        <section className="space-y-3">
          <header className="flex items-baseline justify-between gap-3 flex-wrap px-1">
            <h2 className="text-lg font-bold tracking-tight">
              Custos mensais
            </h2>
            <span className="text-xs text-fg-muted">
              {meses.length} {meses.length === 1 ? "mês" : "meses"} ·{" "}
              <span className="font-mono tabular">
                {formatBRL(totalMensalAcumulado)}
              </span>{" "}
              acumulado
            </span>
          </header>

          {meses.map((mes) => {
            const itens = itensDoMes(mes);
            const saldosMes = saldoDe("custos", mes);
            const total = itens.reduce((a, i) => a + i.valor, 0) + somaSaldo(saldosMes);
            const pago = itens.reduce(
              (a, i) => a + (estado.pagos[i.id] ? i.valor : 0),
              0,
            ) + somaSaldo(saldosMes, true);
            const pct = total > 0 ? (pago / total) * 100 : 100;
            const tudoPago = itens.every((i) => estado.pagos[i.id]);
            return (
              <Acordeao
                key={mes}
                aberto={!!abertos[`mes:${mes}`]}
                onToggle={() => toggle(`mes:${mes}`)}
                titulo={
                  <span className="capitalize">{labelMes(mes)}</span>
                }
                sub={
                  <span className="block">
                    <span className="block mb-1.5">
                      {itens.length} contas · {Math.round(pct)}% pago
                    </span>
                    <span className="block max-w-[16rem]">
                      <BarraPago pct={pct} />
                    </span>
                  </span>
                }
                direita={<TotalComNotas total={total} notas={notasDaOrigem(saldos, "custos", mes)} />}
                rodape={
                  <button
                    type="button"
                    onClick={() =>
                      marcarVarios(
                        itens.map((i) => i.id),
                        !tudoPago,
                      )
                    }
                    className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted hover:text-accent transition-colors"
                  >
                    <IconCheck />
                    {tudoPago
                      ? "Desmarcar o mês"
                      : "Marcar mês como pago"}
                  </button>
                }
              >
                {itens.map((item) => (
                  <LinhaItem
                    key={item.id}
                    pago={!!estado.pagos[item.id]}
                    onTogglePago={() => marcarPago(item.id)}
                    titulo={item.titulo}
                    obs={item.obs}
                    chip={item.estimado ? <ChipEstimado /> : null}
                    valor={item.valor}
                    onEditarValor={(v) => setOverride(item.id, v)}
                    onRemover={
                      item.extraId
                        ? () =>
                            setEstado((s) => ({
                              ...s,
                              extras: s.extras.filter(
                                (e) => e.id !== item.extraId,
                              ),
                            }))
                        : undefined
                    }
                  />
                ))}
                {saldosMes.map((x) => <LinhaDeSaldo key={x.id} s={x} />)}
              </Acordeao>
            );
          })}
        </section>

        {/* ============ COLUNA DIREITA ============ */}
        <section className="space-y-3">
          {/* -------- Setup -------- */}
          <Acordeao
            aberto={!!abertos.setup}
            onToggle={() => toggle("setup")}
            titulo="Setup inicial (investimento)"
            sub={`Valor contratado da plataforma · pago · fora do custo mensal`}
            direita={
              <span className="font-mono tabular text-sm font-bold text-success">
                {formatBRL(SETUP.valor)}
              </span>
            }
          >
            <LinhaItem
              pago
              titulo={SETUP.titulo}
              obs={
                <>
                  <span className="font-mono text-[11px] text-fg-dim">
                    entrega {SETUP.data} · {SETUP.origem}
                  </span>
                  <span className="block mt-1">{SETUP.descricao}</span>
                </>
              }
              chip={
                <span className="inline-flex items-center rounded-full border border-success/50 bg-success-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-success">
                  pago
                </span>
              }
              valor={SETUP.valor}
            />
          </Acordeao>

          {/* -------- Desenvolvimento -------- */}
          <Acordeao
            aberto={!!abertos.dev}
            onToggle={() => toggle("dev")}
            titulo="Desenvolvimento pós-entrega"
            sub={`${qtdDev} entregas · ${formatTokens(totalTokens)} de processamento`}
            direita={
              <span className="font-mono tabular text-sm font-bold">
                {formatBRL(totalDev)}
              </span>
            }
          >
            <div className="p-3 md:p-4 space-y-3 bg-bg">
              {meses
                .filter((m) => devDoMes(m).length > 0 || saldoDe("dev", m).length > 0)
                .map((mes) => {
                  const entradas = devDoMes(mes);
                  const saldosMes = saldoDe("dev", mes);
                  const ids = entradas.map((e) => e.id);
                  const total = (totalDevPorMes[mes] ?? 0) + somaSaldo(saldosMes);
                  const pago = entradas.reduce(
                    (a, e) => a + (estado.pagos[e.id] ? devValor(mes, e) : 0),
                    0,
                  ) + somaSaldo(saldosMes, true);
                  const pct = total > 0 ? (pago / total) * 100 : 100;
                  const tudoPago = ids.every((id) => estado.pagos[id]);
                  const tokensMes = entradas.reduce(
                    (a, e) => a + tokensEntrega(e),
                    0,
                  );
                  return (
                    <Acordeao
                      key={mes}
                      aberto={!!abertos[`dev:${mes}`]}
                      onToggle={() => toggle(`dev:${mes}`)}
                      titulo={
                        <span className="capitalize">{labelMes(mes)}</span>
                      }
                      sub={
                        <span className="block">
                          <span className="block mb-1.5">
                            {entradas.length}{" "}
                            {entradas.length === 1 ? "entrega" : "entregas"} ·{" "}
                            {saldosMes.length ? `${saldosMes.length === 1 ? "1 saldo" : `${saldosMes.length} saldos`} · ` : ""}
                            {formatTokens(tokensMes)} · {Math.round(pct)}% pago
                          </span>
                          <span className="block max-w-[16rem]">
                            <BarraPago pct={pct} />
                          </span>
                        </span>
                      }
                      direita={<TotalComNotas total={total} notas={notasDaOrigem(saldos, "dev", mes)} />}
                      rodape={
                        ids.length === 0 ? undefined : <button
                          type="button"
                          onClick={() => marcarVarios(ids, !tudoPago)}
                          className="inline-flex items-center gap-2 text-xs font-medium text-fg-muted hover:text-accent transition-colors"
                        >
                          <IconCheck />
                          {tudoPago
                            ? "Desmarcar o mês"
                            : "Marcar mês como pago"}
                        </button>
                      }
                    >
                      {entradas.map((e) => {
                        const id = e.id;
                        return (
                          <LinhaItem
                            key={id}
                            pago={!!estado.pagos[id]}
                            onTogglePago={() => marcarPago(id)}
                            titulo={
                              <>
                                <span className="font-mono text-[11px] text-fg-dim mr-2">
                                  {e.data}
                                </span>
                                {e.titulo}
                              </>
                            }
                            obs={e.desc}
                            chip={
                              <>
                                {e.ana ? <ChipAna /> : null}
                                <span
                                  className="inline-flex items-center rounded-full border border-border bg-bg px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted"
                                  title={labelEntrega(e)}
                                >
                                  {formatTokens(tokensEntrega(e))}
                                </span>
                              </>
                            }
                            valor={devValor(mes, e)}
                            onEditarValor={(v) => setOverride(id, v)}
                          />
                        );
                      })}
                      {saldosMes.map((x) => <LinhaDeSaldo key={x.id} s={x} />)}
                    </Acordeao>
                  );
                })}
            </div>
          </Acordeao>

          {/* -------- Pedidos pela Ana --------
              Pedido externo que a Ana executou aqui já sai com fatura
              própria, cobrada de quem pediu: não entra no mês nem na baixa
              do mês. O estado é o da fatura — só leitura. */}
          {mesesPedidos.length > 0 ? (
            <Acordeao
              aberto={!!abertos.pedidos}
              onToggle={() => toggle("pedidos")}
              titulo="Pedidos pela Ana"
              sub={`${todosPedidos.length} ${todosPedidos.length === 1 ? "pedido" : "pedidos"} · faturados a quem pediu · fora do custo mensal e do desenvolvimento${abertoPedidos > 0 ? ` · ${formatBRL(abertoPedidos)} em aberto` : ""}`}
              direita={
                <span className="font-mono tabular text-sm font-bold">
                  {formatBRL(totalPedidos)}
                </span>
              }
            >
              <div className="p-3 md:p-4 space-y-3 bg-bg">
                {mesesPedidos.map((mes) => {
                  const lista = pedidosPorMes[mes];
                  const total = lista.reduce((a, p) => a + p.valor, 0);
                  const pago = lista.reduce((a, p) => a + (p.pago ? p.valor : 0), 0);
                  const pct = total > 0 ? (pago / total) * 100 : 100;
                  return (
                    <Acordeao
                      key={mes}
                      aberto={!!abertos[`ped:${mes}`]}
                      onToggle={() => toggle(`ped:${mes}`)}
                      titulo={
                        <span>
                          Pedidos pela Ana —{" "}
                          <span className="capitalize">{labelMes(mes)}</span>
                        </span>
                      }
                      sub={
                        <span className="block">
                          <span className="block mb-1.5">
                            {lista.length} {lista.length === 1 ? "pedido" : "pedidos"} ·{" "}
                            {Math.round(pct)}% das faturas pagas
                          </span>
                          <span className="block max-w-[16rem]">
                            <BarraPago pct={pct} />
                          </span>
                        </span>
                      }
                      direita={
                        <span className="font-mono tabular text-sm font-bold">
                          {formatBRL(total)}
                        </span>
                      }
                    >
                      {lista.map((p) => (
                        <LinhaItem
                          key={p.id}
                          pago={p.pago}
                          titulo={
                            <>
                              <span className="font-mono text-[11px] text-fg-dim mr-2">
                                {p.data}
                              </span>
                              {p.titulo}
                            </>
                          }
                          obs={[p.desc, `pedido #${p.numero}${p.quem ? ` de ${p.quem}` : ""}`]
                            .filter(Boolean)
                            .join(" · ")}
                          chip={
                            <>
                              <ChipFatura pago={p.pago} />
                              {p.tokens > 0 ? (
                                <span className="inline-flex items-center rounded-full border border-border bg-bg px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                                  {formatTokens(p.tokens)}
                                </span>
                              ) : null}
                            </>
                          }
                          valor={p.valor}
                        />
                      ))}
                    </Acordeao>
                  );
                })}
              </div>
            </Acordeao>
          ) : null}

          {/* -------- APIs & serviços -------- */}
          <Acordeao
            aberto={!!abertos.apis}
            onToggle={() => toggle("apis")}
            titulo="APIs & serviços"
            sub="Cobrados por uso — não entram na conta fixa"
            direita={
              <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                informativo
              </span>
            }
          >
            {APIS_SERVICOS.map((a) => (
              <div
                key={a.nome}
                className="px-4 md:px-5 py-3 border-b border-border last:border-b-0 flex items-start justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">{a.nome}</div>
                  <div className="text-xs text-fg-muted mt-0.5">{a.obs}</div>
                </div>
                <div className="text-xs font-mono text-accent shrink-0">
                  {a.custo}
                </div>
              </div>
            ))}
          </Acordeao>
        </section>
      </div>
    </div>
  );
}

/* =============================================================
   Formulário de custo avulso
   ============================================================= */

function FormNovoCusto({
  mesCorrente,
  onSalvar,
}: {
  mesCorrente: string;
  onSalvar: (e: Extra) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(`${mesCorrente}-01`);
  const [recorrente, setRecorrente] = useState(false);
  const [desde, setDesde] = useState(mesCorrente);
  const [obs, setObs] = useState("");

  return (
    <div className="mt-3 rounded-2xl border border-border bg-bg-elev p-4 md:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-fg-muted mb-1">Título</span>
          <input
            className="form-input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Certificado digital"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-fg-muted mb-1">Valor (R$)</span>
          <input
            className="form-input font-mono"
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
          />
        </label>
        <label className="block">
          <span className="block text-xs text-fg-muted mb-1">Data</span>
          <input
            className="form-input"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>
        <div className="block">
          <span className="block text-xs text-fg-muted mb-1">
            Recorrente a partir de
          </span>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={(e) => setRecorrente(e.target.checked)}
              />
              todo mês
            </label>
            <input
              className="form-input flex-1"
              type="month"
              value={desde}
              disabled={!recorrente}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
        </div>
        <label className="block md:col-span-2">
          <span className="block text-xs text-fg-muted mb-1">Observação</span>
          <input
            className="form-input"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="opcional"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={!titulo.trim() || !Number(valor)}
          onClick={() =>
            onSalvar({
              id: `${Date.now()}`,
              titulo: titulo.trim(),
              valor: Number(valor),
              data,
              recorrenteDesde: recorrente ? desde : undefined,
              obs: obs.trim() || undefined,
            })
          }
          className="btn-primary h-10 disabled:opacity-40 disabled:pointer-events-none"
        >
          Salvar custo
        </button>
        <span className="text-xs text-fg-muted">
          Fica salvo neste navegador.
        </span>
      </div>
    </div>
  );
}
