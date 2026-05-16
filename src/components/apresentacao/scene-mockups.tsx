/**
 * Mockups cinematográficos para apresentações em vídeo (PresentationPlayer).
 * Cada export é um pedaço de UI fake (mobile ou desktop) com micro-animações
 * internas — bars que crescem, badges que aparecem, números que pulsam, etc.
 *
 * Os mockups ficam DENTRO de <MobileFrame> ou <DesktopFrame> nas cenas.
 */

import type { ReactNode } from "react";
import { MobileFrame, DesktopFrame } from "./mockup-frame";

/* ===================================================================
   COMUM
   =================================================================== */

export function SceneHero({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center text-white">
      <div className="text-7xl md:text-8xl mb-4 animate-mockup-pop">{emoji}</div>
      <div className="text-2xl md:text-4xl font-bold tracking-tight animate-text-stagger" style={{ animationDelay: "0.2s" }}>
        {title}
      </div>
      {subtitle && (
        <div className="mt-3 text-sm md:text-base text-blue-200/80 animate-text-stagger" style={{ animationDelay: "0.4s" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* ===================================================================
   COMERCIAL
   =================================================================== */

export function MockupMapaProspects() {
  return (
    <DesktopFrame url="antecipaqui.digital/painel/prospects" label="Mapa de prospects · captação ativa">
      <div className="relative h-full bg-gradient-to-br from-blue-50 to-slate-100">
        {/* Mapa fake com grid */}
        <div className="absolute inset-0 opacity-50" style={{
          backgroundImage: "linear-gradient(rgba(28,109,208,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(28,109,208,0.15) 1px, transparent 1px)",
          backgroundSize: "30px 30px"
        }} />
        {/* Pins surgindo */}
        {[
          { top: "30%", left: "25%", delay: "0.3s", color: "bg-success" },
          { top: "55%", left: "40%", delay: "0.6s", color: "bg-warn" },
          { top: "40%", left: "60%", delay: "0.9s", color: "bg-success" },
          { top: "70%", left: "55%", delay: "1.2s", color: "bg-accent" },
          { top: "25%", left: "75%", delay: "1.5s", color: "bg-success" },
        ].map((p, i) => (
          <div key={i} className="absolute animate-badge-pop" style={{ top: p.top, left: p.left, animationDelay: p.delay }}>
            <div className="relative">
              <div className={`size-4 rounded-full ${p.color} ring-4 ring-white shadow-lg`} />
              <div className={`absolute inset-0 size-4 rounded-full ${p.color} animate-dot-ping`} />
            </div>
          </div>
        ))}
        {/* Search bar topo */}
        <div className="absolute top-3 left-3 right-3 bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2 text-xs">
          <span>🔍</span>
          <span className="text-slate-500">Joinville, SC</span>
        </div>
        {/* Card de pin selecionado */}
        <div className="absolute bottom-3 left-3 right-3 bg-white rounded-lg shadow-xl p-3 text-xs animate-slide-in-bottom" style={{ animationDelay: "1.8s" }}>
          <div className="font-bold text-slate-900">Imob. Vista do Mar</div>
          <div className="text-slate-500 mt-0.5">CRECI 4123 · (47) 99...</div>
          <div className="flex gap-1 mt-2">
            <div className="px-2 py-1 rounded bg-accent text-white text-[10px] font-semibold">+ Add ao kanban</div>
            <div className="px-2 py-1 rounded border border-border text-[10px]">📞 ligar</div>
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupPipelineKanban() {
  const cols = [
    { label: "novo", n: 8, color: "bg-slate-100" },
    { label: "contato", n: 5, color: "bg-blue-50" },
    { label: "visita", n: 3, color: "bg-purple-50" },
    { label: "proposta", n: 2, color: "bg-yellow-50" },
    { label: "fechado", n: 1, color: "bg-green-50" },
  ];
  return (
    <DesktopFrame url="painel/prospeccao" label="Pipeline de leads · kanban">
      <div className="h-full p-4 bg-white">
        <div className="text-xs font-bold mb-3 text-slate-700">Pipeline de leads</div>
        <div className="grid grid-cols-5 gap-2 h-[70%]">
          {cols.map((c, i) => (
            <div key={i} className={`${c.color} rounded-lg p-2 flex flex-col gap-1.5`}>
              <div className="text-[9px] uppercase tracking-wider text-slate-600 font-mono">{c.label} ({c.n})</div>
              {Array.from({ length: Math.min(c.n, 3) }).map((_, j) => (
                <div
                  key={j}
                  className="bg-white rounded p-1.5 shadow-sm text-[9px] animate-badge-pop"
                  style={{ animationDelay: `${0.2 + i * 0.15 + j * 0.05}s` }}
                >
                  <div className="font-semibold text-slate-700 truncate">Lead #{i * 10 + j + 1}</div>
                  <div className="text-slate-500 truncate">imob.aviso.com</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Card animado movendo */}
        <div className="mt-3 text-[10px] text-fg-muted italic">cards movem do funil em direção a 'fechado' ✓</div>
      </div>
    </DesktopFrame>
  );
}

export function MockupCadastroExpress() {
  return (
    <MobileFrame label="Cadastro express · imobiliária ou construtora">
      <div className="px-4 pt-2 space-y-2.5 text-[11px]">
        <div className="font-bold text-slate-900 text-sm">Cadastro express</div>
        <div className="text-slate-500">Crie a conta + envie convite</div>
        <div className="space-y-2 mt-3">
          {[
            { label: "Tipo", v: "Imobiliária", delay: "0.2s" },
            { label: "Razão", v: "Vista do Mar Imóveis", delay: "0.5s" },
            { label: "CNPJ", v: "12.345.678/0001-90", delay: "0.8s" },
            { label: "Email", v: "contato@vista.com.br", delay: "1.1s" },
            { label: "Telefone", v: "(47) 99988-7766", delay: "1.4s" },
          ].map((f, i) => (
            <div key={i} className="animate-slide-in-bottom" style={{ animationDelay: f.delay }}>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">{f.label}</div>
              <div className="font-semibold text-slate-900 border-b border-slate-200 pb-1">{f.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 h-10 rounded-lg bg-accent text-white text-xs font-bold flex items-center justify-center animate-badge-pop" style={{ animationDelay: "1.8s" }}>
          + Cadastrar e enviar convite
        </div>
      </div>
    </MobileFrame>
  );
}

export function MockupComissoes() {
  return (
    <DesktopFrame url="painel/comissoes" label="Comissões · acumulado mês a mês">
      <div className="h-full p-5 bg-white">
        <div className="text-xs font-bold mb-3 text-slate-700">Suas comissões</div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { l: "Pago", v: "R$ 47.820", c: "text-success" },
            { l: "A receber", v: "R$ 23.140", c: "text-warn" },
            { l: "Em aberto", v: "R$ 11.500", c: "text-accent" },
          ].map((k, i) => (
            <div key={i} className="rounded-lg border border-border p-3 animate-slide-in-bottom" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">{k.l}</div>
              <div className={`text-base font-bold ${k.c} tabular animate-number-pulse`} style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
                {k.v}
              </div>
            </div>
          ))}
        </div>
        {/* Bars */}
        <div className="space-y-1.5 mt-4">
          {[
            { m: "Jan", v: 60 },
            { m: "Fev", v: 75 },
            { m: "Mar", v: 80 },
            { m: "Abr", v: 95 },
            { m: "Mai", v: 100 },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="w-7 text-slate-500 font-mono">{b.m}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded">
                <div
                  className="h-full bg-gradient-to-r from-accent to-blue-700 rounded animate-bar-fill"
                  style={{ ["--target-width" as never]: `${b.v}%`, animationDelay: `${0.8 + i * 0.1}s` }}
                />
              </div>
              <span className="w-12 text-right font-semibold text-slate-700">{b.v}%</span>
            </div>
          ))}
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ===================================================================
   CORRETOR / IMOBILIÁRIA
   =================================================================== */

export function MockupAtendimentosCRM() {
  const cols = [
    { label: "Contato", n: 4 },
    { label: "Qualif.", n: 3 },
    { label: "Visita", n: 2 },
    { label: "Proposta", n: 1 },
    { label: "Fechado", n: 2, hi: true },
  ];
  return (
    <DesktopFrame url="painel/atendimentos" label="CRM de atendimentos · kanban">
      <div className="h-full p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-700">Pipeline de vendas</div>
          <div className="text-[9px] font-mono px-2 py-1 rounded bg-accent text-white">+ Novo</div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cols.map((c, i) => (
            <div key={i} className={`${c.hi ? "bg-green-50 border border-success/40" : "bg-slate-50"} rounded-lg p-2 min-h-[180px]`}>
              <div className="text-[9px] uppercase tracking-wider text-slate-600 font-mono mb-1.5">
                {c.label} ({c.n})
              </div>
              {Array.from({ length: Math.min(c.n, 3) }).map((_, j) => (
                <div
                  key={j}
                  className="bg-white rounded p-1.5 shadow-sm text-[9px] mb-1 animate-badge-pop"
                  style={{ animationDelay: `${0.2 + i * 0.1 + j * 0.05}s` }}
                >
                  <div className="font-semibold text-slate-700 truncate">Apt 304 · Vista</div>
                  <div className="text-slate-500">R$ 12.5k</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-fg-muted text-center italic">cards movem pelo funil · clique pra ver timeline</div>
      </div>
    </DesktopFrame>
  );
}

export function MockupLinkDados() {
  return (
    <MobileFrame label="Link de dados · cliente preenche sozinho">
      <div className="px-4 pt-2 space-y-3 text-[11px]">
        <div className="font-bold text-slate-900 text-sm">📋 Seus dados</div>
        <div className="text-slate-500 text-[10px]">Preencha pra antecipação · 2 min</div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-accent animate-bar-fill" style={{ ["--target-width" as never]: "60%", animationDelay: "0.3s" }} />
        </div>
        <div className="text-[9px] text-slate-500 font-mono">3 de 5 campos</div>
        <div className="space-y-2 mt-3">
          {[
            { label: "Nome completo", v: "Maria Silva Costa", icon: "✓" },
            { label: "CPF", v: "123.456.789-00", icon: "✓" },
            { label: "Telefone", v: "(11) 98765-4321", icon: "✓" },
            { label: "Email", v: "...", icon: "" },
            { label: "Endereço", v: "...", icon: "" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 animate-slide-in-bottom" style={{ animationDelay: `${0.4 + i * 0.15}s` }}>
              <div className="size-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: f.icon ? "#15803d" : "#e2e8f0", color: f.icon ? "white" : "#64748b" }}>
                {f.icon || "·"}
              </div>
              <div className="flex-1">
                <div className="text-[9px] text-slate-500 font-mono">{f.label}</div>
                <div className="font-semibold text-slate-900">{f.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileFrame>
  );
}

export function MockupOperacaoFlow() {
  const steps = [
    { l: "Rascunho", c: "bg-slate-200", on: true },
    { l: "Em análise", c: "bg-blue-200", on: true },
    { l: "Pré-aprovada", c: "bg-blue-400", on: true },
    { l: "Assinatura", c: "bg-yellow-400", on: true },
    { l: "Realizada", c: "bg-success", on: false },
  ];
  return (
    <DesktopFrame url="painel/operacoes/OP-2026-0142" label="Status flow da operação">
      <div className="h-full p-5 bg-white flex flex-col justify-center">
        <div className="text-xs font-bold mb-1 text-slate-700">OP-2026-0142</div>
        <div className="text-[10px] text-slate-500 mb-5">R$ 18.500 · 6 parcelas · Construtora Atlas</div>
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 animate-slide-in-bottom" style={{ animationDelay: `${0.3 + i * 0.4}s` }}>
              <div className={`${s.c} ${s.on ? "" : "animate-number-pulse"} rounded-full size-7 flex items-center justify-center text-white text-[10px] font-bold shadow`}>
                {i + 1}
              </div>
              <div className="text-[9px] font-mono text-slate-600 max-w-[60px]">{s.l}</div>
              {i < steps.length - 1 && <div className="h-px w-4 bg-slate-300" />}
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-xl bg-green-50 border border-success/40 p-3 animate-slide-in-bottom" style={{ animationDelay: "2.5s" }}>
          <div className="text-[10px] text-success font-bold uppercase tracking-wider">💰 dinheiro na conta</div>
          <div className="text-lg font-bold text-success tabular">R$ 16.852,30</div>
          <div className="text-[10px] text-slate-600">valor presente · transferido em 4h</div>
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupProjecaoCorretor() {
  const meses = [3, 5, 4, 7, 9, 6];
  return (
    <DesktopFrame url="painel/forecast-corretor" label="Projeção pessoal · 6 meses">
      <div className="h-full p-5 bg-white">
        <div className="text-xs font-bold mb-1 text-slate-700">Sua grana nos próximos 6 meses</div>
        <div className="text-2xl font-bold text-accent tabular animate-number-pulse">R$ 34.200</div>
        <div className="text-[10px] text-slate-500 mb-5">já antecipado · cai na sua conta</div>
        <div className="flex items-end gap-2 h-32 mt-4">
          {meses.map((v, i) => {
            const max = Math.max(...meses);
            const pct = (v / max) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-accent to-blue-400 rounded-t animate-bar-fill"
                  style={{ height: `${pct}%`, ["--target-width" as never]: "100%", animationDelay: `${0.3 + i * 0.15}s` }}
                />
                <div className="text-[9px] text-slate-500 font-mono">
                  {["Jun", "Jul", "Ago", "Set", "Out", "Nov"][i]}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ===================================================================
   CONSTRUTORA
   =================================================================== */

export function MockupAtendimentoParceiro() {
  return (
    <DesktopFrame url="painel/atendimentos-parceiros/ATD-892" label="★ Atendimento parceiro · você opina antes da venda fechar">
      <div className="h-full p-4 bg-white flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-slate-700">Apt 1207 · Edifício Atlas</div>
            <div className="text-[10px] text-slate-500">corretor Lucas Silva · 12 min atrás</div>
          </div>
          <div className="px-2 py-1 rounded-full bg-warn/20 text-warn text-[9px] font-bold uppercase animate-badge-pop">
            aguardando você
          </div>
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex justify-start animate-slide-in-bottom" style={{ animationDelay: "0.3s" }}>
            <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-2 max-w-[80%] text-[10px]">
              Cliente pediu 8% desconto. Posso?
            </div>
          </div>
          <div className="flex justify-end animate-slide-in-bottom" style={{ animationDelay: "1.0s" }}>
            <div className="bg-accent text-white rounded-2xl rounded-br-sm p-2 max-w-[80%] text-[10px]">
              Pode liberar até 6%, mas só essa unidade. Outras ficam tabela.
            </div>
          </div>
          <div className="flex justify-end animate-slide-in-bottom" style={{ animationDelay: "1.5s" }}>
            <div className="rounded-xl border-2 border-success/40 bg-green-50 p-2 max-w-[80%] text-[10px]">
              <div className="text-[8px] uppercase font-bold text-success mb-0.5">recomenda? sim · condicional</div>
              ✓ pode prosseguir com ajuste
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 animate-slide-in-bottom" style={{ animationDelay: "2.2s" }}>
          <div className="flex-1 h-9 rounded-lg bg-success text-white text-[10px] font-bold flex items-center justify-center">
            ✓ Aprovar (sim)
          </div>
          <div className="flex-1 h-9 rounded-lg border border-warn text-warn text-[10px] font-bold flex items-center justify-center">
            Condicional
          </div>
          <div className="flex-1 h-9 rounded-lg border border-danger text-danger text-[10px] font-bold flex items-center justify-center">
            ✗ Não
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupCashbackGrowing() {
  return (
    <MobileFrame label="Cashback · saldo cresce automático">
      <div className="px-4 pt-2 space-y-3 text-[11px]">
        <div className="font-bold text-slate-900 text-sm">💰 Cashback</div>
        <div className="text-slate-500 text-[10px]">acumula a cada op aprovada</div>
        {/* Saldo card */}
        <div className="rounded-2xl bg-gradient-to-br from-accent to-blue-700 text-white p-4 shadow-lg">
          <div className="text-[9px] uppercase tracking-wider opacity-80">saldo disponível</div>
          <div className="text-3xl font-bold tabular mt-1 animate-number-pulse">R$ 4.820</div>
          <div className="text-[10px] opacity-80 mt-1">+R$ 320 este mês</div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="rounded-lg border border-border p-2 animate-slide-in-bottom" style={{ animationDelay: "0.4s" }}>
            <div className="text-[9px] uppercase text-slate-500 font-mono">acumulado</div>
            <div className="font-bold text-slate-900 tabular">R$ 12.450</div>
          </div>
          <div className="rounded-lg border border-border p-2 animate-slide-in-bottom" style={{ animationDelay: "0.6s" }}>
            <div className="text-[9px] uppercase text-slate-500 font-mono">sacado</div>
            <div className="font-bold text-slate-900 tabular">R$ 7.630</div>
          </div>
        </div>
        <div className="mt-3 h-10 rounded-xl bg-accent text-white text-xs font-bold flex items-center justify-center animate-badge-pop" style={{ animationDelay: "0.9s" }}>
          💸 Sacar pra conta
        </div>
        <div className="text-[9px] text-slate-500 text-center mt-1">você ganha automático por pagar em dia</div>
      </div>
    </MobileFrame>
  );
}

export function MockupScoreBar() {
  return (
    <DesktopFrame url="painel/score" label="Score · fórmula transparente">
      <div className="h-full p-6 bg-white flex flex-col justify-center items-center">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">score Antecipaqui</div>
        <div className="text-6xl font-bold text-success tabular animate-number-pulse">87</div>
        <div className="text-sm text-success font-bold uppercase tracking-wider mt-1">banda BOA</div>
        <div className="w-full max-w-md mt-6 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-danger via-warn to-success rounded-full animate-bar-fill"
            style={{ ["--target-width" as never]: "87%", animationDelay: "0.4s" }}
          />
        </div>
        <div className="flex justify-between w-full max-w-md text-[9px] font-mono text-slate-500 mt-1.5">
          <span>0 · BAIXA</span>
          <span>50 · NEUTRA</span>
          <span>100 · BOA</span>
        </div>
        <div className="mt-5 text-[10px] text-slate-600 text-center max-w-xs">
          fórmula: <span className="font-mono">100 − vencidas × 2 − vencidas_graves × 8</span>
        </div>
        <div className="mt-3 px-3 py-1 rounded-full bg-success/15 text-success text-[10px] font-bold animate-badge-pop" style={{ animationDelay: "1.5s" }}>
          ✓ aprovações rápidas · ops maiores
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupDuplicatas() {
  const dups = [
    { mes: "Mai", v: "R$ 12.500", s: "paga", c: "success" },
    { mes: "Jun", v: "R$ 12.500", s: "paga", c: "success" },
    { mes: "Jul", v: "R$ 12.500", s: "a vencer", c: "warn" },
    { mes: "Ago", v: "R$ 12.500", s: "a vencer", c: "warn" },
  ];
  return (
    <DesktopFrame url="painel/duplicatas" label="Duplicatas · cronograma de pagamentos">
      <div className="h-full p-4 bg-white">
        <div className="text-xs font-bold mb-1 text-slate-700">Duplicatas a pagar</div>
        <div className="text-[10px] text-slate-500 mb-4">mesmos valores que tinha com o corretor</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded border border-success/30 bg-green-50 p-2 animate-slide-in-bottom" style={{ animationDelay: "0.2s" }}>
            <div className="text-[9px] uppercase font-mono text-success">paga</div>
            <div className="text-base font-bold text-success tabular">R$ 25.000</div>
          </div>
          <div className="rounded border border-warn/30 bg-yellow-50 p-2 animate-slide-in-bottom" style={{ animationDelay: "0.4s" }}>
            <div className="text-[9px] uppercase font-mono text-warn">a vencer</div>
            <div className="text-base font-bold text-warn tabular">R$ 25.000</div>
          </div>
          <div className="rounded border border-border bg-slate-50 p-2 animate-slide-in-bottom" style={{ animationDelay: "0.6s" }}>
            <div className="text-[9px] uppercase font-mono text-slate-500">total</div>
            <div className="text-base font-bold text-slate-900 tabular">R$ 50.000</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {dups.map((d, i) => (
            <div key={i} className="flex items-center justify-between text-[10px] p-2 rounded border border-border bg-slate-50 animate-slide-in-bottom" style={{ animationDelay: `${0.8 + i * 0.15}s` }}>
              <span className="font-mono w-12 text-slate-500">15/{d.mes}</span>
              <span className="font-semibold tabular flex-1">{d.v}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${d.c === "success" ? "bg-success/15 text-success" : "bg-warn/15 text-warn"}`}>
                {d.s}
              </span>
            </div>
          ))}
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ===================================================================
   FUNDO
   =================================================================== */

export function MockupMesaDecisao() {
  return (
    <DesktopFrame url="painel/aprovar" label="Mesa de decisão · aprovar/recusar ops">
      <div className="h-full p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-700">Mesa de decisão · 4 pendentes</div>
          <div className="text-[9px] font-mono text-slate-500">ordenado por score ↓</div>
        </div>
        {[
          { num: "OP-0142", const: "Atlas", score: 92, val: "R$ 18.5k", c: "success" },
          { num: "OP-0143", const: "Vista Mar", score: 76, val: "R$ 24.0k", c: "success" },
          { num: "OP-0144", const: "Solaris", score: 58, val: "R$ 9.2k", c: "warn" },
        ].map((o, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-center p-2.5 mb-2 rounded-lg border border-border bg-slate-50 text-[10px] animate-slide-in-bottom" style={{ animationDelay: `${0.3 + i * 0.25}s` }}>
            <div className="col-span-2 font-mono font-semibold text-slate-700">{o.num}</div>
            <div className="col-span-3 text-slate-700">{o.const}</div>
            <div className="col-span-2">
              <div className="text-[9px] text-slate-500">score</div>
              <div className={`font-bold ${o.c === "success" ? "text-success" : "text-warn"}`}>{o.score}</div>
            </div>
            <div className="col-span-2 font-semibold tabular text-slate-700">{o.val}</div>
            <div className="col-span-3 flex gap-1">
              <div className="flex-1 h-7 rounded bg-success text-white text-[9px] font-bold flex items-center justify-center animate-badge-pop" style={{ animationDelay: `${1.0 + i * 0.25}s` }}>
                ✓ aprovar
              </div>
              <div className="flex-1 h-7 rounded border border-danger text-danger text-[9px] font-bold flex items-center justify-center">
                ✗
              </div>
            </div>
          </div>
        ))}
        <div className="text-[10px] text-fg-muted text-center mt-3 italic">+1 op pendente · regras auto cobrem 70% das óbvias</div>
      </div>
    </DesktopFrame>
  );
}

export function MockupRegraDryRun() {
  return (
    <DesktopFrame url="painel/regras" label="★ Simulação dry-run · testa regra antes de salvar">
      <div className="h-full p-4 bg-white">
        <div className="text-xs font-bold mb-1 text-slate-700">Nova regra · Top construtoras + prazo curto</div>
        <div className="grid grid-cols-2 gap-2 my-3">
          {[
            { l: "taxa mín", v: "5,5%" },
            { l: "prazo máx", v: "6 parcelas" },
            { l: "valor máx", v: "R$ 100k" },
            { l: "construtoras", v: "5 da allowlist" },
          ].map((c, i) => (
            <div key={i} className="rounded bg-slate-50 border border-border p-2 text-[10px] animate-slide-in-bottom" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">{c.l}</div>
              <div className="font-bold text-slate-900">{c.v}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-4 animate-slide-in-bottom" style={{ animationDelay: "0.8s" }}>
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-xs font-bold text-slate-700">📊 Resultado da simulação</div>
            <div className="text-xs font-mono text-slate-500">últimas 90 ops</div>
          </div>
          <div className="text-3xl font-bold text-accent tabular animate-number-pulse">
            42 <span className="text-base font-mono text-slate-500">/ 87 (48,3%)</span>
          </div>
          <div className="text-[10px] text-slate-600 mt-1">
            ✓ boa cobertura · não permissivo demais
          </div>
        </div>
        <div className="mt-3 flex gap-2 animate-slide-in-bottom" style={{ animationDelay: "1.4s" }}>
          <div className="h-9 px-4 rounded-lg border-2 border-accent text-accent text-xs font-bold flex items-center">🧪 Simular</div>
          <div className="flex-1 h-9 rounded-lg bg-accent text-white text-xs font-bold flex items-center justify-center">
            + Criar regra
          </div>
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupWebhookTest() {
  return (
    <DesktopFrame url="painel/webhooks" label="Webhooks · testar endpoint antes de produção">
      <div className="h-full p-4 bg-[#0a0e1a] text-slate-300">
        <div className="text-xs font-bold mb-3 text-white">POST → seu endpoint</div>
        <div className="rounded bg-[#1e293b] p-3 font-mono text-[10px] mb-3">
          <div className="text-blue-300">x-antecipaqui-event: <span className="text-white">parcela_paga</span></div>
          <div className="text-blue-300">x-antecipaqui-signature: <span className="text-green-300">sha256=a7f9b...</span></div>
          <div className="mt-2 text-slate-400">{`{`}</div>
          <div className="ml-3"><span className="text-purple-300">&quot;evento&quot;</span>: <span className="text-green-300">&quot;parcela_paga&quot;</span>,</div>
          <div className="ml-3"><span className="text-purple-300">&quot;parcelaId&quot;</span>: <span className="text-green-300">&quot;abc-123&quot;</span>,</div>
          <div className="ml-3"><span className="text-purple-300">&quot;valor&quot;</span>: <span className="text-yellow-300">50000</span>,</div>
          <div className="ml-3"><span className="text-purple-300">&quot;pagoEm&quot;</span>: <span className="text-green-300">&quot;2026-05-15&quot;</span></div>
          <div className="text-slate-400">{`}`}</div>
        </div>
        <div className="rounded-lg bg-success/20 border border-success/40 p-3 animate-badge-pop" style={{ animationDelay: "1.0s" }}>
          <div className="flex items-center gap-2 text-white font-bold text-xs">
            <span className="size-2 rounded-full bg-success animate-dot-ping" />
            ✓ Endpoint respondeu OK
          </div>
          <div className="text-[10px] mt-1 text-green-200 font-mono">HTTP 200 · 142ms</div>
        </div>
        <div className="mt-3 text-[10px] text-slate-500 text-center italic">retry automático: 1, 5, 25, 125 min</div>
      </div>
    </DesktopFrame>
  );
}

export function MockupApiCurl() {
  return (
    <DesktopFrame url="painel/api" label="API REST · sandbox com cURL">
      <div className="h-full p-4 bg-[#0a0e1a] text-slate-300">
        <div className="text-xs font-bold mb-3 text-white">Terminal · pronto pra colar</div>
        <div className="rounded bg-[#1e293b] p-3 font-mono text-[10px] mb-2">
          <div className="text-slate-500">$ curl -H &quot;Authorization: Bearer aq_xxx&quot; \</div>
          <div className="text-slate-500">    &apos;.../api/external/fundo/operacoes?fundoAprovacao=pendente&apos;</div>
        </div>
        <div className="rounded bg-[#0f172a] p-3 font-mono text-[9px] animate-slide-in-bottom" style={{ animationDelay: "0.8s" }}>
          <div className="text-slate-400">{`{`}</div>
          <div className="ml-3 text-purple-300">&quot;total&quot;: <span className="text-yellow-300">12</span>,</div>
          <div className="ml-3 text-purple-300">&quot;operacoes&quot;: [</div>
          <div className="ml-6 text-slate-300">{"{ "}<span className="text-purple-300">&quot;numero&quot;</span>: <span className="text-green-300">&quot;OP-0142&quot;</span>, ...{ " }"},</div>
          <div className="ml-6 text-slate-300">{"{ "}<span className="text-purple-300">&quot;numero&quot;</span>: <span className="text-green-300">&quot;OP-0143&quot;</span>, ...{ " }"}</div>
          <div className="ml-3 text-purple-300">]</div>
          <div className="text-slate-400">{`}`}</div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { e: "GET", p: "/me" },
            { e: "GET", p: "/operacoes" },
            { e: "GET", p: "/parcelas" },
            { e: "POST", p: "/decisao" },
          ].map((ep, i) => (
            <div key={i} className="flex items-center gap-2 rounded bg-[#1e293b] p-1.5 text-[10px] animate-badge-pop" style={{ animationDelay: `${1.2 + i * 0.1}s` }}>
              <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${ep.e === "GET" ? "bg-blue-500 text-white" : "bg-yellow-500 text-black"}`}>{ep.e}</span>
              <span className="font-mono text-slate-300">{ep.p}</span>
            </div>
          ))}
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupCobrancaModos() {
  return (
    <DesktopFrame url="painel/fundos/[id]" label="Cobrança automática · 3 modos">
      <div className="h-full p-5 bg-white">
        <div className="text-xs font-bold mb-3 text-slate-700">Cobrança · escolha o modo</div>
        <div className="space-y-3">
          {[
            { e: "🟡", t: "Manual", d: "sistema calcula encargos, você dá baixa", on: false },
            { e: "🟢", t: "API", d: "banco emite boleto + webhook dá baixa auto", on: true },
            { e: "🔵", t: "CNAB", d: "arquivo remessa + upload retorno em lote", on: false },
          ].map((m, i) => (
            <div
              key={i}
              className={`rounded-xl p-3 flex items-center gap-3 animate-slide-in-bottom ${m.on ? "border-2 border-success bg-green-50" : "border border-border bg-slate-50"}`}
              style={{ animationDelay: `${0.3 + i * 0.25}s` }}
            >
              <div className="text-2xl">{m.e}</div>
              <div className="flex-1">
                <div className="font-bold text-slate-900 text-sm">{m.t}</div>
                <div className="text-[10px] text-slate-600">{m.d}</div>
              </div>
              {m.on && (
                <div className="px-2 py-1 rounded-full bg-success text-white text-[9px] font-bold uppercase animate-badge-pop" style={{ animationDelay: "1.2s" }}>
                  ✓ ativo
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-accent/10 border border-accent/30 p-3 text-[10px] text-slate-700 animate-slide-in-bottom" style={{ animationDelay: "1.5s" }}>
          <span className="font-bold">multa</span> 2% · <span className="font-bold">juros mora</span> taxa_mensal/30 × dias atraso
        </div>
      </div>
    </DesktopFrame>
  );
}

export function MockupRisco() {
  return (
    <DesktopFrame url="painel/risco" label="Gestão de risco · concentração + blacklist">
      <div className="h-full p-4 bg-white">
        <div className="text-xs font-bold mb-3 text-slate-700">Concentração por construtora</div>
        {[
          { n: "Atlas", pct: 42, c: "danger", label: "CRÍTICO" },
          { n: "Vista Mar", pct: 28, c: "warn", label: "alerta" },
          { n: "Solaris", pct: 18, c: "success", label: "ok" },
          { n: "Edif. Bela", pct: 12, c: "success", label: "ok" },
        ].map((b, i) => (
          <div key={i} className="mb-2.5 animate-slide-in-bottom" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>
            <div className="flex justify-between items-baseline text-[10px] mb-1">
              <span className="font-semibold text-slate-700">{b.n}</span>
              <span className={`font-mono ${b.c === "danger" ? "text-danger font-bold" : b.c === "warn" ? "text-warn" : "text-slate-500"}`}>
                {b.pct}% {b.label !== "ok" && `· ${b.label}`}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full animate-bar-fill ${b.c === "danger" ? "bg-danger" : b.c === "warn" ? "bg-warn" : "bg-success"}`}
                style={{ ["--target-width" as never]: `${b.pct}%`, animationDelay: `${0.5 + i * 0.15}s` }}
              />
            </div>
          </div>
        ))}
        <div className="mt-4 rounded-lg bg-danger/10 border border-danger/40 p-3 animate-slide-in-bottom" style={{ animationDelay: "1.5s" }}>
          <div className="text-[10px] font-bold text-danger uppercase tracking-wider">⚠ alerta</div>
          <div className="text-xs text-slate-700 mt-0.5">Atlas concentra 42% — diversifique</div>
        </div>
      </div>
    </DesktopFrame>
  );
}

/* ===================================================================
   ADMIN (caso queira no futuro)
   =================================================================== */

export function MockupGenericoSlide({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent to-blue-700 text-white p-8 text-center w-full max-w-md shadow-2xl">
      <div className="text-6xl mb-3 animate-mockup-pop">{emoji}</div>
      <div className="text-xl font-bold animate-text-stagger" style={{ animationDelay: "0.2s" }}>
        {title}
      </div>
      {subtitle && (
        <div className="text-sm text-blue-100/90 mt-2 animate-text-stagger" style={{ animationDelay: "0.4s" }}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
}
