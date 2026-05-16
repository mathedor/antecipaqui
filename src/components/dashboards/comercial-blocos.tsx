"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import { registrarInteracao } from "@/lib/actions/comercial-acoes";

/* ============================================================
   TIPOS (espelhados de comercial-acoes.ts)
   ============================================================ */

export type FocoItem = {
  key: string;
  prioridade: number;
  titulo: string;
  descricao: string;
  alvoTipo: "imobiliaria" | "construtora" | "corretor";
  alvoId: string;
  alvoNome: string;
  telefone: string | null;
  tipo: string;
  msgSugerida: string;
};

export type ComercialMeta = {
  metaVolume: number;
  metaComissao: number;
  realVolume: number;
  realComissao: number;
  pctVolume: number;
  pctComissao: number;
  diasDecorridos: number;
  diasTotaisMes: number;
  projecaoVolume: number;
  projecaoComissao: number;
  mesAnteriorVolume: number;
  mesAnteriorComissao: number;
};

export type CarteiraEntry = {
  id: string;
  nome: string;
  telefone: string | null;
  temperatura: string;
  diasInativa: number | null;
  qtdOps: number;
  valorTotal: number;
  ticketMedio: number;
  ultimaInteracao: string | null;
  ultimaInteracaoTipo: string | null;
};

export type ProjecaoComercial = {
  ganhoSeManter: number;
  ganhoSeReativar30Pct: number;
  ganhoSeCadaQuenteFizerMais1: number;
};

/* ============================================================
   HELPERS
   ============================================================ */

function whatsappUrl(telefone: string | null, msg: string): string | null {
  if (!telefone) return null;
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

const TIPO_LABEL: Record<string, string> = {
  reativar: "Reativar",
  parabenizar: "Celebrar",
  investigar: "Investigar",
  empurrar: "Empurrar",
  novo_cadastro: "Novo cadastro",
  followup: "Follow-up",
};

const TIPO_COLOR: Record<string, string> = {
  reativar: "border-warn/40 bg-yellow-50",
  parabenizar: "border-success/40 bg-green-50",
  investigar: "border-danger/40 bg-red-50",
  empurrar: "border-accent/40 bg-accent-soft",
  novo_cadastro: "border-accent/40 bg-accent-soft",
  followup: "border-warn/40 bg-yellow-50",
};

const TIPO_BADGE: Record<string, string> = {
  reativar: "bg-warn text-white",
  parabenizar: "bg-success text-white",
  investigar: "bg-danger text-white",
  empurrar: "bg-accent text-white",
  novo_cadastro: "bg-accent text-white",
  followup: "bg-warn text-white",
};

const TEMP_COLOR: Record<string, { dot: string; label: string; cls: string }> = {
  quente: { dot: "bg-success", label: "🟢 Quente", cls: "text-success" },
  morna: { dot: "bg-yellow-400", label: "🟡 Morna", cls: "text-yellow-600" },
  fria: { dot: "bg-orange-400", label: "🟠 Fria", cls: "text-orange-600" },
  dormida: { dot: "bg-danger", label: "🔴 Dormida", cls: "text-danger" },
  nova: { dot: "bg-fg-dim", label: "⚪ Nova", cls: "text-fg-muted" },
};

/* ============================================================
   FOCO DO DIA — bloco grande no topo
   ============================================================ */

export function FocoDoDia({
  items,
  comercialId,
}: {
  items: FocoItem[];
  comercialId: string;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-success/30 bg-green-50 p-5 md:p-6 mb-6 flex items-center gap-4">
        <span className="text-3xl">🎯</span>
        <div>
          <h2 className="font-bold text-success text-lg">Carteira em dia</h2>
          <p className="text-sm text-fg-muted">
            Sem ações urgentes hoje. Use o tempo pra prospectar novos clientes.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-accent bg-accent-soft p-5 md:p-6 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
            foco do dia · ações priorizadas
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            {items.length} ação(ões) pra fazer acontecer hoje
          </h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Clientes que precisam de você agora. Cada linha tem um WhatsApp
            pronto.
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <FocoItemRow
            key={item.key}
            item={item}
            comercialId={comercialId}
          />
        ))}
      </ul>
    </section>
  );
}

function FocoItemRow({
  item,
  comercialId,
}: {
  item: FocoItem;
  comercialId: string;
}) {
  const [showRegistro, setShowRegistro] = useState(false);
  const waUrl = whatsappUrl(item.telefone, item.msgSugerida);
  const toneCls = TIPO_COLOR[item.tipo] ?? "border-border bg-bg-elev";
  const badgeCls = TIPO_BADGE[item.tipo] ?? "bg-accent text-white";
  const tipoLabel = TIPO_LABEL[item.tipo] ?? item.tipo;

  return (
    <li className={`rounded-xl border ${toneCls} p-3`}>
      <div className="flex items-start gap-3 flex-wrap">
        <span
          className={`shrink-0 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeCls}`}
        >
          {tipoLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-fg">{item.titulo}</div>
          <p className="text-xs text-fg-muted mt-0.5">{item.descricao}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-success text-white text-xs font-semibold hover:bg-success/90"
          >
            💬 WhatsApp com mensagem
          </a>
        ) : item.telefone ? (
          <span className="text-[10px] text-fg-dim font-mono px-2 py-1">
            tel inválido
          </span>
        ) : (
          <span className="text-[10px] text-fg-dim font-mono px-2 py-1">
            sem telefone cadastrado
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowRegistro(true)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-bg text-fg text-xs font-semibold hover:border-accent hover:text-accent"
        >
          📝 Registrar contato
        </button>
      </div>
      {showRegistro && (
        <ModalRegistrarInteracao
          comercialId={comercialId}
          alvoTipo={item.alvoTipo}
          alvoId={item.alvoId}
          alvoNome={item.alvoNome}
          onClose={() => setShowRegistro(false)}
        />
      )}
    </li>
  );
}

/* ============================================================
   META PROGRESS — barra grande + projeção
   ============================================================ */

export function MetaProgress({ meta }: { meta: ComercialMeta }) {
  const pctCom = Math.min(100, meta.pctComissao * 100);
  const pctVol = Math.min(100, meta.pctVolume * 100);
  const onTrack = meta.projecaoComissao >= meta.metaComissao;
  const ahead = meta.pctComissao >= 1;

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            meta do mês · automática (120% do anterior)
          </div>
          <h2 className="font-bold tracking-tight text-lg">
            {ahead ? (
              <span className="text-success">
                🔥 Você bateu a meta — {(meta.pctComissao * 100).toFixed(0)}%
              </span>
            ) : onTrack ? (
              <span className="text-fg">
                No ritmo — projeção {formatBRLcompact(meta.projecaoComissao)}{" "}
                <span className="text-success font-normal text-sm">
                  ({((meta.projecaoComissao / meta.metaComissao) * 100).toFixed(0)}%
                  da meta)
                </span>
              </span>
            ) : (
              <span className="text-fg">
                Precisa acelerar — projeção{" "}
                {formatBRLcompact(meta.projecaoComissao)}{" "}
                <span className="text-warn font-normal text-sm">
                  ({((meta.projecaoComissao / meta.metaComissao) * 100).toFixed(0)}%
                  da meta)
                </span>
              </span>
            )}
          </h2>
          <p className="text-xs text-fg-muted mt-1">
            Dia {meta.diasDecorridos}/{meta.diasTotaisMes} do mês · mês
            anterior fechou {formatBRLcompact(meta.mesAnteriorComissao)} em
            comissão
          </p>
        </div>
      </div>

      {/* Barra comissão */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between text-xs mb-1">
          <span className="font-mono uppercase tracking-wider text-fg-dim">
            comissão
          </span>
          <span className="font-mono tabular text-fg">
            <strong>{formatBRLcompact(meta.realComissao)}</strong> de{" "}
            {formatBRLcompact(meta.metaComissao)}
          </span>
        </div>
        <div className="h-3 bg-bg-card rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all ${
              ahead ? "bg-success" : onTrack ? "bg-accent" : "bg-warn"
            }`}
            style={{ width: `${pctCom}%` }}
          />
          {/* Marca de "onde deveria estar" pra estar no ritmo */}
          <div
            className="absolute top-0 h-3 w-0.5 bg-fg-muted/40"
            style={{
              left: `${(meta.diasDecorridos / meta.diasTotaisMes) * 100}%`,
            }}
            title="Ritmo necessário"
          />
        </div>
      </div>

      {/* Barra volume */}
      <div>
        <div className="flex items-baseline justify-between text-xs mb-1">
          <span className="font-mono uppercase tracking-wider text-fg-dim">
            volume operado
          </span>
          <span className="font-mono tabular text-fg-muted">
            <strong className="text-fg">
              {formatBRLcompact(meta.realVolume)}
            </strong>{" "}
            de {formatBRLcompact(meta.metaVolume)}
          </span>
        </div>
        <div className="h-2 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-fg-dim/40 rounded-full transition-all"
            style={{ width: `${pctVol}%` }}
          />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CARTEIRA VIVA — imobs com temperatura
   ============================================================ */

export function CarteiraViva({
  entries,
  comercialId,
  limit = 10,
}: {
  entries: CarteiraEntry[];
  comercialId: string;
  limit?: number;
}) {
  if (entries.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-2">
          carteira viva
        </div>
        <p className="text-sm text-fg-muted">
          Nenhuma imobiliária na sua carteira ainda. Comece prospectando.
        </p>
      </section>
    );
  }

  const display = entries.slice(0, limit);
  const counts = entries.reduce(
    (acc, e) => {
      acc[e.temperatura] = (acc[e.temperatura] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            carteira viva · saúde dos clientes
          </div>
          <h2 className="font-bold tracking-tight text-lg">
            {entries.length} imobiliária(s) sob você
          </h2>
        </div>
        <div className="flex gap-2 text-[11px]">
          {["quente", "morna", "fria", "dormida", "nova"].map((t) =>
            counts[t] ? (
              <span
                key={t}
                className={`font-mono ${TEMP_COLOR[t].cls}`}
              >
                {TEMP_COLOR[t].label.split(" ")[0]} {counts[t]}
              </span>
            ) : null,
          )}
        </div>
      </div>

      <ul className="space-y-1.5">
        {display.map((e) => (
          <CarteiraRow
            key={e.id}
            entry={e}
            comercialId={comercialId}
          />
        ))}
      </ul>

      {entries.length > display.length && (
        <p className="text-[11px] text-fg-muted mt-3">
          +{entries.length - display.length} cliente(s) na lista completa.
        </p>
      )}
    </section>
  );
}

function CarteiraRow({
  entry,
  comercialId,
}: {
  entry: CarteiraEntry;
  comercialId: string;
}) {
  const [showRegistro, setShowRegistro] = useState(false);
  const t = TEMP_COLOR[entry.temperatura] ?? TEMP_COLOR.nova;
  const msgSugerida =
    entry.temperatura === "dormida"
      ? `Oi! Notei que faz um tempo que a ${entry.nome} não opera com a gente. Tem alguma comissão parcelada pendente? Posso ajudar a antecipar.`
      : entry.temperatura === "nova"
        ? `Oi! Bem-vindo à Antecipaqui. Posso te mostrar em 10 min como cadastrar a primeira operação?`
        : `Oi! Tudo bem por aí? Tem novidades pra antecipar essa semana?`;
  const waUrl = whatsappUrl(entry.telefone, msgSugerida);

  return (
    <li className="rounded-lg border border-border bg-bg p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className={`size-2.5 rounded-full ${t.dot} shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-fg truncate">
            {entry.nome}
          </div>
          <div className="text-[10px] text-fg-muted font-mono">
            {entry.qtdOps > 0 ? (
              <>
                {entry.qtdOps} op(s) · ticket{" "}
                {formatBRLcompact(entry.ticketMedio)}
                {entry.diasInativa != null &&
                  ` · ${entry.diasInativa}d sem operar`}
              </>
            ) : (
              "ainda não operou"
            )}
            {entry.ultimaInteracao && (
              <span className="text-fg-dim">
                {" "}
                · último contato{" "}
                {new Date(entry.ultimaInteracao).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center size-8 rounded-lg bg-success/15 text-success hover:bg-success hover:text-white transition-colors text-base"
              title="WhatsApp"
            >
              💬
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowRegistro(true)}
            className="inline-flex items-center justify-center size-8 rounded-lg bg-bg-card border border-border text-fg-muted hover:border-accent hover:text-accent transition-colors text-base"
            title="Registrar contato"
          >
            📝
          </button>
        </div>
      </div>
      {showRegistro && (
        <ModalRegistrarInteracao
          comercialId={comercialId}
          alvoTipo="imobiliaria"
          alvoId={entry.id}
          alvoNome={entry.nome}
          onClose={() => setShowRegistro(false)}
        />
      )}
    </li>
  );
}

/* ============================================================
   PROJEÇÕES — 3 cenários
   ============================================================ */

export function ProjecoesCenarios({ proj }: { proj: ProjecaoComercial }) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        projeções · cenários
      </div>
      <h2 className="font-bold tracking-tight text-lg mb-4">
        Quanto você ganha em cada cenário
      </h2>
      <div className="space-y-2">
        <ScenarioRow
          label="Se manter o ritmo atual (próximos 90d)"
          value={proj.ganhoSeManter}
          tone="default"
        />
        <ScenarioRow
          label="Se reativar 30% das imobiliárias dormidas"
          value={proj.ganhoSeReativar30Pct}
          tone="warn"
          extra="+ ações de hoje"
        />
        <ScenarioRow
          label="Se cada cliente quente fizer +1 op"
          value={proj.ganhoSeCadaQuenteFizerMais1}
          tone="success"
          extra="bater na meta acima"
        />
      </div>
      <p className="text-[11px] text-fg-muted mt-3">
        Cálculos baseados na sua média de comissão dos últimos 180d. Os
        cenários se somam ao "se manter".
      </p>
    </section>
  );
}

function ScenarioRow({
  label,
  value,
  tone,
  extra,
}: {
  label: string;
  value: number;
  tone: "default" | "warn" | "success";
  extra?: string;
}) {
  const cls =
    tone === "success"
      ? "border-success/30 bg-green-50"
      : tone === "warn"
        ? "border-warn/30 bg-yellow-50"
        : "border-border bg-bg";
  const valueCls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border ${cls}`}
    >
      <div className="min-w-0">
        <div className="text-sm text-fg font-medium">{label}</div>
        {extra && (
          <div className="text-[10px] text-fg-muted">{extra}</div>
        )}
      </div>
      <div
        className={`font-mono tabular text-base font-bold shrink-0 ${valueCls}`}
      >
        {tone !== "default" && "+"}
        {formatBRL(value)}
      </div>
    </div>
  );
}

/* ============================================================
   MODAL — registrar interação
   ============================================================ */

export function ModalRegistrarInteracao({
  comercialId,
  alvoTipo,
  alvoId,
  alvoNome,
  onClose,
}: {
  comercialId: string;
  alvoTipo: "imobiliaria" | "construtora" | "corretor";
  alvoId: string;
  alvoNome: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tipo, setTipo] = useState<
    "visita" | "ligacao" | "whatsapp" | "email" | "anotacao"
  >("whatsapp");
  const [descricao, setDescricao] = useState("");
  const [proxAcao, setProxAcao] = useState("");
  const [proxData, setProxData] = useState("");

  const submit = () => {
    if (!descricao.trim()) {
      setError("Descreva brevemente o contato.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await registrarInteracao({
          comercialId,
          alvoTipo,
          alvoId,
          alvoNome,
          tipo,
          descricao: descricao.trim(),
          proximaAcaoEm: proxData || null,
          proximaAcaoTexto: proxAcao.trim() || null,
        });
        onClose();
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-bg-elev shadow-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              registrar contato com
            </div>
            <h3 className="font-bold text-fg truncate">{alvoNome}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full border border-border flex items-center justify-center text-fg-muted hover:text-fg"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
              tipo de contato
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["whatsapp", "💬 WhatsApp"],
                  ["ligacao", "📞 Ligação"],
                  ["visita", "🤝 Visita"],
                  ["email", "✉ Email"],
                  ["anotacao", "📝 Anotação"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipo(key)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border ${
                    tipo === key
                      ? "border-accent bg-accent text-white"
                      : "border-border bg-bg text-fg-muted hover:border-fg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
              o que aconteceu *
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Resumo do contato (o que conversaram, próximos passos…)"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
                follow-up em
              </label>
              <input
                type="date"
                value={proxData}
                onChange={(e) => setProxData(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-mono text-fg-dim block mb-1">
                o que fazer
              </label>
              <input
                type="text"
                value={proxAcao}
                onChange={(e) => setProxAcao(e.target.value)}
                placeholder="ex: ligar pra ver retorno"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger font-semibold">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-border text-fg-muted text-sm font-medium hover:text-fg"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50"
            >
              {pending ? "salvando…" : "salvar contato"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   LINK rápido pra "ver carteira completa"
   ============================================================ */

export function CarteiraQuickLinks() {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <Link
        href="/painel/daily"
        className="text-xs text-accent font-semibold hover:underline"
      >
        Daily completo →
      </Link>
      <Link
        href="/painel/comissoes"
        className="text-xs text-accent font-semibold hover:underline"
      >
        Comissões →
      </Link>
    </div>
  );
}
