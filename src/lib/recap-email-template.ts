import type { RecapDados } from "@/lib/recaps";

/* =========================================================================
   Template HTML "report estratégico" pros emails de recap.

   Princípios:
   - Inline CSS (Gmail/Outlook ignoram <style>)
   - Tabela-based layout (compat com Outlook desktop)
   - Logo via URL absoluta (NEXT_PUBLIC_SITE_URL/icon-512.png)
   - Cores fixas alinhadas à brand (#1c6dd0 accent)
   - Contexto didático curto em cada seção pra educar quem lê
   - Deltas vs período anterior (opcional, mostrado se fornecido)
   ========================================================================= */

const ACCENT = "#1c6dd0";
const ACCENT_DARK = "#0d4e9e";
const SUCCESS = "#15803d";
const SUCCESS_BG = "#dcfce7";
const WARN = "#a16207";
const WARN_BG = "#fef3c7";
const DANGER = "#b91c1c";
const DANGER_BG = "#fee2e2";
const FG = "#0f172a";
const FG_MUTED = "#475569";
const FG_DIM = "#94a3b8";
const BG = "#f8fafc";
const BG_CARD = "#ffffff";
const BORDER = "#e2e8f0";

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital"
  );
}

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateBR(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type RecapEmailOpts = {
  /** Título do bloco (ex: "Recap diário · admin") */
  titulo: string;
  /** Recap atual */
  d: RecapDados;
  /** Recap do período anterior (mesma duração) — gera deltas se fornecido */
  prev?: RecapDados;
  /** URL absoluta da página de recaps no painel apropriado */
  ctaUrl: string;
  /** Texto do botão final */
  ctaLabel?: string;
};

function delta(now: number, prev: number | undefined): string {
  if (prev === undefined || prev === null) return "";
  if (prev === 0 && now === 0) return "";
  if (prev === 0)
    return `<span style="color:${SUCCESS};font-weight:600">+novo</span>`;
  const pct = ((now - prev) / prev) * 100;
  const sign = pct >= 0 ? "+" : "";
  const cor = pct > 0 ? SUCCESS : pct < 0 ? DANGER : FG_DIM;
  return `<span style="color:${cor};font-weight:600">${sign}${pct.toFixed(0)}%</span>`;
}

function semaforoInadimplencia(valor: number): {
  cor: string;
  bg: string;
  rotulo: string;
} {
  if (valor === 0) return { cor: SUCCESS, bg: SUCCESS_BG, rotulo: "🟢 zero" };
  if (valor < 5000) return { cor: WARN, bg: WARN_BG, rotulo: "🟡 atenção" };
  return { cor: DANGER, bg: DANGER_BG, rotulo: "🔴 crítico" };
}

function statCard(opts: {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  width?: string;
}): string {
  const sub = opts.sub
    ? `<div style="font-size:11px;color:${FG_MUTED};margin-top:4px">${escapeHtml(opts.sub)}</div>`
    : "";
  const deltaTag = opts.delta
    ? `<div style="margin-top:6px;font-size:11px">${opts.delta}</div>`
    : "";
  return `
    <td valign="top" style="padding:0 6px 12px 6px;width:${opts.width ?? "33%"}">
      <div style="border:1px solid ${BORDER};border-radius:12px;padding:14px;background:${BG_CARD}">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${FG_DIM};margin-bottom:6px">${escapeHtml(opts.label)}</div>
        <div style="font-size:20px;font-weight:700;color:${FG};line-height:1.1">${opts.value}</div>
        ${sub}
        ${deltaTag}
      </div>
    </td>
  `;
}

function statCardTone(opts: {
  label: string;
  value: string;
  sub?: string;
  tone: "success" | "warn" | "danger";
}): string {
  const palette =
    opts.tone === "success"
      ? { fg: SUCCESS, bg: SUCCESS_BG }
      : opts.tone === "warn"
        ? { fg: WARN, bg: WARN_BG }
        : { fg: DANGER, bg: DANGER_BG };
  const sub = opts.sub
    ? `<div style="font-size:11px;color:${FG_MUTED};margin-top:4px">${escapeHtml(opts.sub)}</div>`
    : "";
  return `
    <td valign="top" style="padding:0 6px 12px 6px;width:33%">
      <div style="border:1px solid ${palette.fg}33;border-radius:12px;padding:14px;background:${palette.bg}">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${palette.fg};margin-bottom:6px">${escapeHtml(opts.label)}</div>
        <div style="font-size:20px;font-weight:700;color:${FG};line-height:1.1">${opts.value}</div>
        ${sub}
      </div>
    </td>
  `;
}

export function renderRecapHtml(opts: RecapEmailOpts): string {
  const { titulo, d, prev, ctaUrl, ctaLabel = "Abrir relatório completo" } =
    opts;
  const site = siteUrl();
  const logoUrl = `${site}/icon-512.png`;
  const isAdmin = d.escopo === "admin";
  const isSingleDay = d.inicio === d.fim;
  const periodoTxt = isSingleDay
    ? fmtDateBR(d.inicio)
    : `${fmtDateBR(d.inicio)} → ${fmtDateBR(d.fim)}`;

  const sem = semaforoInadimplencia(d.inadimplencia.vencidoNoPeriodo);

  // Topbar / hero
  const hero = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%);border-radius:18px 18px 0 0">
      <tr>
        <td style="padding:28px 28px 24px 28px;text-align:center">
          <img src="${logoUrl}" width="56" height="56" alt="Antecipaqui" style="display:inline-block;border-radius:14px;background:#fff;padding:6px;margin-bottom:14px"/>
          <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,0.7);margin-bottom:6px">${isAdmin ? "RELATÓRIO ESTRATÉGICO · ADMIN" : "REPORT DO FUNDO"}</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;color:#fff;letter-spacing:-0.02em">${escapeHtml(titulo)}</h1>
          <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.85)">${periodoTxt}</div>
        </td>
      </tr>
    </table>
  `;

  // Resumo executivo (didático)
  const resumoExec = (() => {
    const partes: string[] = [];
    if (d.opsNovas.qtd > 0)
      partes.push(
        `<strong>${d.opsNovas.qtd}</strong> nova${d.opsNovas.qtd === 1 ? "" : "s"} operação${d.opsNovas.qtd === 1 ? "" : "s"} (${fmtBRL(d.opsNovas.valor)})`,
      );
    if (d.totalAprovado.qtd > 0)
      partes.push(
        `<strong>${d.totalAprovado.qtd}</strong> aprovada${d.totalAprovado.qtd === 1 ? "" : "s"} pelo${isAdmin ? "s" : ""} fundo${isAdmin ? "s" : ""} (${fmtBRL(d.totalAprovado.valor)})`,
      );
    if (d.opsRealizadas.qtd > 0)
      partes.push(
        `<strong>${d.opsRealizadas.qtd}</strong> liquidada${d.opsRealizadas.qtd === 1 ? "" : "s"} (${fmtBRL(d.opsRealizadas.valor)})`,
      );
    if (d.inadimplencia.vencidoNoPeriodo > 0)
      partes.push(
        `inadimplência nova de <strong>${fmtBRL(d.inadimplencia.vencidoNoPeriodo)}</strong>`,
      );
    if (partes.length === 0) return "Sem movimento operacional no período.";
    return partes.join(" · ");
  })();

  // KPIs principais — 3 cards em linha
  const kpis = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 -6px">
      <tr>
        ${statCard({
          label: "Operações novas",
          value: String(d.opsNovas.qtd),
          sub: fmtBRL(d.opsNovas.valor),
          delta: delta(d.opsNovas.qtd, prev?.opsNovas.qtd),
        })}
        ${statCardTone({
          label: "Aprovadas",
          value: String(d.totalAprovado.qtd),
          sub: fmtBRL(d.totalAprovado.valor),
          tone: "success",
        })}
        ${statCardTone({
          label: "Recusadas",
          value: String(d.totalRecusado.qtd),
          sub: fmtBRL(d.totalRecusado.valor),
          tone: d.totalRecusado.qtd > 0 ? "danger" : "success",
        })}
      </tr>
      <tr>
        ${statCard({
          label: "Liquidadas",
          value: String(d.opsRealizadas.qtd),
          sub: fmtBRL(d.opsRealizadas.valor),
          delta: delta(d.opsRealizadas.qtd, prev?.opsRealizadas.qtd),
        })}
        ${statCardTone({
          label: "Inadimplência período",
          value: fmtBRL(d.inadimplencia.vencidoNoPeriodo),
          sub: sem.rotulo,
          tone:
            d.inadimplencia.vencidoNoPeriodo === 0
              ? "success"
              : d.inadimplencia.vencidoNoPeriodo < 5000
                ? "warn"
                : "danger",
        })}
        ${statCard({
          label: "Inadimplência acumulada",
          value: fmtBRL(d.inadimplencia.acumulado),
          sub: `${d.inadimplencia.qtdVencidasAcumulado} parcela${d.inadimplencia.qtdVencidasAcumulado === 1 ? "" : "s"} em aberto`,
        })}
      </tr>
    </table>
  `;

  // Tabela de aprovações por fundo (admin)
  const tabelaFundos =
    isAdmin && d.aprovacoes.length > 0
      ? `
    <div style="margin-top:24px">
      <div style="font-size:13px;font-weight:700;color:${FG};margin-bottom:4px">Aprovações por fundo</div>
      <div style="font-size:11px;color:${FG_MUTED};margin-bottom:10px">
        Distribuição do volume aprovado entre os fundos parceiros no período. Quem mais investe ↓
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${BORDER};border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;background:${BG_CARD}">
        <thead>
          <tr style="background:${BG}">
            <th align="left" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${FG_DIM};padding:10px 14px;border-bottom:1px solid ${BORDER}">Fundo</th>
            <th align="right" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${FG_DIM};padding:10px 14px;border-bottom:1px solid ${BORDER}">Qtd</th>
            <th align="right" style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${FG_DIM};padding:10px 14px;border-bottom:1px solid ${BORDER}">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${d.aprovacoes
            .map(
              (a, i) => `
            <tr style="${i === d.aprovacoes.length - 1 ? "" : `border-bottom:1px solid ${BORDER}`}">
              <td style="padding:10px 14px;font-size:13px;color:${FG}">${escapeHtml(a.fundoNome)}</td>
              <td align="right" style="padding:10px 14px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${FG}">${a.qtd}</td>
              <td align="right" style="padding:10px 14px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700;color:${FG}">${fmtBRL(a.valor)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
      : "";

  // Pipeline (originação + análise)
  const pipeline = `
    <div style="margin-top:24px">
      <div style="font-size:13px;font-weight:700;color:${FG};margin-bottom:4px">Pipeline de originação</div>
      <div style="font-size:11px;color:${FG_MUTED};margin-bottom:10px">
        Tempo médio entre cadastro da operação e decisão final. Quanto menor, mais ágil a esteira.
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 -6px">
        <tr>
          ${statCard({
            label: "Novos corretores",
            value: String(d.novosCorretores),
            sub: isAdmin ? "cadastrados no período" : "ativos no fundo",
            delta: delta(d.novosCorretores, prev?.novosCorretores),
          })}
          ${statCard({
            label: "Prazo médio análise",
            value: `${d.prazoMedioAnaliseHoras.toFixed(1)}h`,
            sub: "do cadastro até decisão",
            delta:
              prev?.prazoMedioAnaliseHoras !== undefined
                ? delta(
                    -d.prazoMedioAnaliseHoras,
                    -prev.prazoMedioAnaliseHoras,
                  )
                : undefined,
          })}
          ${statCard({
            label: "Antecipações",
            value: String(d.antecipacoes.solicitadas),
            sub: `${d.antecipacoes.aprovadas} aprov · ${d.antecipacoes.recusadas} recus`,
          })}
        </tr>
      </table>
    </div>
  `;

  // Bloco didático — glossário rápido
  const glossario = `
    <div style="margin-top:24px;border:1px solid ${BORDER};border-radius:12px;padding:16px 18px;background:${BG}">
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${FG_DIM};margin-bottom:10px">📘 entenda os números</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding:4px 0;font-size:12px;color:${FG};vertical-align:top;width:42%">
            <strong>Operações novas</strong>
          </td>
          <td style="padding:4px 0;font-size:12px;color:${FG_MUTED};vertical-align:top">
            Cadastros feitos no período, qualquer status.
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:${FG};vertical-align:top">
            <strong>Aprovadas</strong>
          </td>
          <td style="padding:4px 0;font-size:12px;color:${FG_MUTED};vertical-align:top">
            Decididas como <code style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;background:#fff;padding:1px 4px;border-radius:3px">fundo_aprovacao = aprovada</code> no período.
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:${FG};vertical-align:top">
            <strong>Liquidadas</strong>
          </td>
          <td style="padding:4px 0;font-size:12px;color:${FG_MUTED};vertical-align:top">
            Operações que mudaram pra status <em>realizada</em> (pagas) no período.
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:${FG};vertical-align:top">
            <strong>Inadimplência período</strong>
          </td>
          <td style="padding:4px 0;font-size:12px;color:${FG_MUTED};vertical-align:top">
            Parcelas cujo vencimento caiu no período e não foram pagas.
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:${FG};vertical-align:top">
            <strong>Inadimplência acumulada</strong>
          </td>
          <td style="padding:4px 0;font-size:12px;color:${FG_MUTED};vertical-align:top">
            Total de parcelas vencidas em aberto até o fim do período.
          </td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:12px;color:${FG};vertical-align:top">
            <strong>Prazo médio análise</strong>
          </td>
          <td style="padding:4px 0;font-size:12px;color:${FG_MUTED};vertical-align:top">
            Diferença entre <em>created_at</em> e <em>fundo_aprovado_em</em> das ops com decisão.
          </td>
        </tr>
      </table>
    </div>
  `;

  // Insight automático com observação contextual
  const insight = (() => {
    const obs: string[] = [];
    if (d.opsNovas.qtd === 0 && d.opsRealizadas.qtd === 0) {
      obs.push(
        "Dia sem movimento operacional — vale checar se o canal de cadastro está saudável.",
      );
    }
    if (
      d.prazoMedioAnaliseHoras > 24 &&
      d.totalAprovado.qtd + d.totalRecusado.qtd > 0
    ) {
      obs.push(
        `Prazo médio de análise (${d.prazoMedioAnaliseHoras.toFixed(1)}h) está acima de 24h. Considere acelerar a esteira de aprovação.`,
      );
    }
    if (d.inadimplencia.acumulado > 50_000) {
      obs.push(
        `Inadimplência acumulada de ${fmtBRL(d.inadimplencia.acumulado)} demanda atenção — priorize cobrança das parcelas mais antigas.`,
      );
    }
    if (
      d.totalRecusado.qtd > 0 &&
      d.totalRecusado.qtd >= d.totalAprovado.qtd
    ) {
      obs.push(
        "Taxa de recusa alta no período — verifique critérios de pré-análise antes do fundo.",
      );
    }
    if (obs.length === 0 && d.totalAprovado.qtd > 0) {
      obs.push(
        "Indicadores saudáveis — siga monitorando o pipeline pra manter o ritmo.",
      );
    }
    if (obs.length === 0) return "";
    return `
      <div style="margin-top:24px;border-left:4px solid ${ACCENT};background:#eff6ff;padding:14px 16px;border-radius:0 12px 12px 0">
        <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${ACCENT_DARK};margin-bottom:8px">💡 observação estratégica</div>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:${FG};line-height:1.55">
          ${obs.map((o) => `<li style="margin-bottom:4px">${o}</li>`).join("")}
        </ul>
      </div>
    `;
  })();

  // CTA
  const cta = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" style="display:inline-block;background:${ACCENT};color:#fff;font-weight:600;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:10px">${escapeHtml(ctaLabel)}</a>
        </td>
      </tr>
    </table>
  `;

  // Footer
  const footer = `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid ${BORDER};text-align:center">
      <div style="font-size:11px;color:${FG_DIM};line-height:1.6">
        Você recebeu esse email porque é ${isAdmin ? "admin da plataforma" : "responsável pelo fundo investidor"}.<br/>
        Os recaps rodam diariamente 00:30, semanalmente (seg) e mensalmente (dia 1).<br/>
        <a href="${site}" style="color:${ACCENT};text-decoration:none">www.antecipaqui.digital</a>
      </div>
    </div>
  `;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 12px;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${FG}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:${BG_CARD};border-radius:18px;overflow:hidden;border:1px solid ${BORDER}">
    <tr><td>${hero}</td></tr>
    <tr><td style="padding:24px 24px 28px 24px">
      <div style="background:${BG};border:1px solid ${BORDER};border-left:4px solid ${ACCENT};padding:14px 16px;border-radius:0 10px 10px 0;margin-bottom:22px;font-size:13px;color:${FG};line-height:1.55">
        ${resumoExec}
      </div>
      ${kpis}
      ${tabelaFundos}
      ${pipeline}
      ${insight}
      ${glossario}
      ${cta}
      ${footer}
    </td></tr>
  </table>
</body></html>`;
}

/** Versão texto puro pro cliente de email que não renderiza HTML. */
export function renderRecapText(opts: RecapEmailOpts): string {
  const { titulo, d } = opts;
  const isSingleDay = d.inicio === d.fim;
  const periodoTxt = isSingleDay
    ? fmtDateBR(d.inicio)
    : `${fmtDateBR(d.inicio)} → ${fmtDateBR(d.fim)}`;

  const linhas: string[] = [];
  linhas.push(`ANTECIPAQUI · ${titulo}`);
  linhas.push(`Período: ${periodoTxt}`);
  linhas.push("");
  linhas.push("RESUMO:");
  linhas.push(`  Operações novas: ${d.opsNovas.qtd} (${fmtBRL(d.opsNovas.valor)})`);
  linhas.push(`  Operações liquidadas: ${d.opsRealizadas.qtd} (${fmtBRL(d.opsRealizadas.valor)})`);
  linhas.push(`  Aprovadas: ${d.totalAprovado.qtd} (${fmtBRL(d.totalAprovado.valor)})`);
  linhas.push(`  Recusadas: ${d.totalRecusado.qtd} (${fmtBRL(d.totalRecusado.valor)})`);
  linhas.push("");

  if (d.escopo === "admin" && d.aprovacoes.length > 0) {
    linhas.push("APROVAÇÕES POR FUNDO:");
    for (const a of d.aprovacoes) {
      linhas.push(
        `  • ${a.fundoNome}: ${a.qtd} op${a.qtd === 1 ? "" : "s"} · ${fmtBRL(a.valor)}`,
      );
    }
    linhas.push("");
  }

  linhas.push("INADIMPLÊNCIA:");
  linhas.push(`  No período: ${fmtBRL(d.inadimplencia.vencidoNoPeriodo)}`);
  linhas.push(`  Acumulada: ${fmtBRL(d.inadimplencia.acumulado)} (${d.inadimplencia.qtdVencidasAcumulado} parcelas)`);
  linhas.push("");

  linhas.push("PIPELINE:");
  linhas.push(`  Novos corretores: ${d.novosCorretores}`);
  linhas.push(`  Prazo médio de análise: ${d.prazoMedioAnaliseHoras.toFixed(1)}h`);
  linhas.push(
    `  Antecipações: ${d.antecipacoes.solicitadas} solicitadas · ${d.antecipacoes.aprovadas} aprov · ${d.antecipacoes.recusadas} recus`,
  );
  linhas.push("");

  linhas.push(`Ver detalhe completo: ${opts.ctaUrl}`);
  linhas.push("");
  linhas.push(`Antecipaqui · ${siteUrl()}`);

  return linhas.join("\n");
}
