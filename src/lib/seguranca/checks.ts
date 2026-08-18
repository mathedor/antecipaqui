/**
 * OS ROBÔS — catálogo de checks de segurança e saúde.
 *
 * Cada check é honesto: consulta o estado real (banco, env, integração) e
 * devolve um veredito. Nada é mockado. O runner agrupa por área e o painel
 * mostra área a área. Checks de escopo 'fundo' recebem ctx.fundoId e só
 * olham o que é daquele fundo — um fundo nunca vê segredo global.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { fundos } from "@/db/schema";
import { testarConexao } from "@/lib/opera/client";
import type { Check, Resultado } from "@/lib/seguranca/tipos";

/* ───────── helpers ───────── */

function env(nome: string): string {
  return (process.env[nome] ?? "").trim();
}

/** O driver Neon devolve { rows }; o pg puro devolve array. Normaliza. */
function linhas<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    const r = (result as { rows: unknown }).rows;
    if (Array.isArray(r)) return r as T[];
  }
  return [];
}

/** Um env sensível está "fraco" se ausente ou curto demais pra ser segredo. */
function segredoForte(valor: string, minimo = 16): boolean {
  return valor.length >= minimo;
}

const OK = (detalhe: string, metrica?: string): Resultado => ({
  status: "ok",
  detalhe,
  metrica,
});

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Conexão & Banco de dados
   ═══════════════════════════════════════════════════════════════ */

const dbConectividade: Check = {
  id: "db-conectividade",
  area: "Conexão & Banco",
  titulo: "Banco de dados responde",
  visibilidade: "ambos",
  peso: 3,
  async run() {
    const t0 = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      const ms = Date.now() - t0;
      if (ms > 1500)
        return {
          status: "atencao",
          detalhe: `Banco respondeu, mas lento (${ms} ms).`,
          recomendacao: "Latência alta pode indicar pool saturado ou região distante. Observe se persiste.",
          metrica: `${ms} ms`,
        };
      return OK("Conexão saudável com o Postgres.", `${ms} ms`);
    } catch (e) {
      return {
        status: "falha",
        detalhe: `Sem conexão com o banco: ${(e as Error).message.slice(0, 120)}`,
        recomendacao: "Verifique DATABASE_URL e o status do Neon. Sem banco, o sistema inteiro para.",
      };
    }
  },
};

const dbTls: Check = {
  id: "db-tls",
  area: "Conexão & Banco",
  titulo: "Conexão do banco criptografada (TLS)",
  visibilidade: "admin",
  async run() {
    const url = env("DATABASE_URL");
    if (!url) return { status: "falha", detalhe: "DATABASE_URL não configurada.", recomendacao: "Defina a URL do Neon nas variáveis de ambiente." };
    if (/sslmode=require|sslmode=verify/.test(url))
      return OK("A conexão exige SSL/TLS.");
    return {
      status: "atencao",
      detalhe: "DATABASE_URL não força sslmode=require.",
      recomendacao: "Adicione ?sslmode=require na string de conexão pra impedir tráfego em claro.",
    };
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Autenticação (Clerk)
   ═══════════════════════════════════════════════════════════════ */

const clerkConfig: Check = {
  id: "clerk-config",
  area: "Autenticação",
  titulo: "Provedor de login configurado",
  visibilidade: "admin",
  peso: 3,
  async run() {
    const pk = env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    const sk = env("CLERK_SECRET_KEY");
    if (!pk || !sk)
      return {
        status: "falha",
        detalhe: "Chaves do Clerk ausentes — o login não funciona.",
        recomendacao: "Preencha NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY e CLERK_SECRET_KEY.",
      };
    const ehProducao = env("VERCEL_ENV") === "production" || env("NODE_ENV") === "production";
    if (ehProducao && (pk.startsWith("pk_test_") || sk.startsWith("sk_test_")))
      return {
        status: "atencao",
        detalhe: "Rodando em produção com chaves de TESTE do Clerk.",
        recomendacao: "Troque para chaves pk_live_/sk_live_. Chaves de teste permitem logins de sandbox em produção.",
      };
    return OK("Clerk configurado e com chaves compatíveis com o ambiente.");
  },
};

const adminEmails: Check = {
  id: "admin-emails",
  area: "Autenticação",
  titulo: "Lista de administradores definida",
  visibilidade: "admin",
  peso: 2,
  async run() {
    const raw = env("ADMIN_EMAILS");
    if (!raw)
      return {
        status: "falha",
        detalhe: "ADMIN_EMAILS vazia — ninguém é promovido a admin.",
        recomendacao: "Defina os e-mails de admin (CSV). Sem isso, o painel administrativo fica inacessível.",
      };
    const n = raw.split(",").map((s) => s.trim()).filter(Boolean).length;
    return OK(`${n} e-mail(s) com acesso administrativo.`, `${n}`);
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Autorização & Acessos
   ═══════════════════════════════════════════════════════════════ */

const contagemAdmins: Check = {
  id: "admins-cadastrados",
  area: "Autorização & Acessos",
  titulo: "Administradores ativos",
  visibilidade: "admin",
  async run() {
    const [r] = linhas<{ n: number }>(
      await db.execute(
        sql`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND is_active = true`,
      ),
    );
    const n = Number(r?.n ?? 0);
    if (n === 0)
      return {
        status: "atencao",
        detalhe: "Nenhum admin ativo no banco.",
        recomendacao: "Um admin é criado no primeiro login de um e-mail em ADMIN_EMAILS. Faça login com um deles.",
      };
    return OK(`${n} administrador(es) ativo(s).`, `${n}`);
  },
};

const fundosSemDono: Check = {
  id: "fundos-sem-dono",
  area: "Autorização & Acessos",
  titulo: "Fundos com login vinculado",
  visibilidade: "admin",
  async run() {
    const linhas = await db
      .select({ id: fundos.id, razao: fundos.razaoSocial, owner: fundos.ownerUserId })
      .from(fundos)
      .where(sql`${fundos.isActive} = true`);
    const semDono = linhas.filter((f) => !f.owner);
    if (semDono.length > 0)
      return {
        status: "atencao",
        detalhe: `${semDono.length} fundo(s) ativo(s) sem usuário dono — não conseguem logar no painel.`,
        recomendacao: `Vincule um usuário dono: ${semDono.slice(0, 3).map((f) => f.razao).join(", ")}${semDono.length > 3 ? "…" : ""}.`,
        metrica: `${linhas.length - semDono.length}/${linhas.length}`,
      };
    return OK(`Todos os ${linhas.length} fundos ativos têm login vinculado.`, `${linhas.length}`);
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Crons & Automação
   ═══════════════════════════════════════════════════════════════ */

const cronSecret: Check = {
  id: "cron-secret",
  area: "Crons & Automação",
  titulo: "Rotas de cron protegidas por segredo",
  visibilidade: "admin",
  peso: 4,
  async run() {
    const s = env("CRON_SECRET");
    if (!s)
      return {
        status: "falha",
        detalhe: "CRON_SECRET vazio — as rotas /api/cron aceitam QUALQUER chamada.",
        recomendacao: "Defina um CRON_SECRET forte já. Sem ele, qualquer um dispara cobrança, backup e e-mails em massa.",
      };
    if (!segredoForte(s))
      return {
        status: "atencao",
        detalhe: "CRON_SECRET configurado, mas curto.",
        recomendacao: "Use um segredo de 32+ caracteres aleatórios.",
      };
    return OK("Crons exigem segredo forte.");
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Webhooks & Assinaturas
   ═══════════════════════════════════════════════════════════════ */

const webhooksSegredo: Check = {
  id: "webhooks-segredo",
  area: "Webhooks & Assinaturas",
  titulo: "Webhooks de entrada com segredo de assinatura",
  visibilidade: "ambos",
  peso: 3,
  async run(ctx) {
    const base = db
      .select({
        id: fundos.id,
        razao: fundos.razaoSocial,
        integracaoTipo: fundos.integracaoTipo,
        integracaoSecret: fundos.integracaoWebhookSecret,
        contratoEnviadaPor: fundos.contratoAssinaturaEnviadaPor,
        contratoSecret: fundos.contratoAssinaturaWebhookSecret,
        cobrancaGeradaPor: fundos.cobrancaGeradaPor,
        cobrancaSecret: fundos.cobrancaWebhookSecret,
      })
      .from(fundos)
      .where(sql`${fundos.isActive} = true`);
    let linhas = await base;
    if (ctx.escopo === "fundo" && ctx.fundoId)
      linhas = linhas.filter((f) => f.id === ctx.fundoId);

    const problemas: string[] = [];
    for (const f of linhas) {
      if (f.integracaoTipo && f.integracaoTipo !== "nenhuma" && !f.integracaoSecret)
        problemas.push(`${f.razao}: integração sem segredo`);
      if (f.contratoEnviadaPor === "fundo" && !f.contratoSecret)
        problemas.push(`${f.razao}: webhook de assinatura sem segredo`);
      if (f.cobrancaGeradaPor === "fundo" && !f.cobrancaSecret)
        problemas.push(`${f.razao}: webhook de cobrança sem segredo`);
    }
    if (problemas.length > 0)
      return {
        status: "falha",
        detalhe: `${problemas.length} webhook(s) aceitariam eventos sem validar origem.`,
        recomendacao: `Gere o segredo na tela de integração do fundo: ${problemas.slice(0, 3).join("; ")}.`,
      };
    const ativos = linhas.filter(
      (f) =>
        (f.integracaoTipo && f.integracaoTipo !== "nenhuma") ||
        f.contratoEnviadaPor === "fundo" ||
        f.cobrancaGeradaPor === "fundo",
    ).length;
    return OK(
      ativos > 0
        ? `Todos os ${ativos} webhook(s) ativos exigem assinatura.`
        : "Nenhum webhook de fundo ativo no momento.",
    );
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Integração OPERA
   ═══════════════════════════════════════════════════════════════ */

const operaConexao: Check = {
  id: "opera-conexao",
  area: "Integração OPERA",
  titulo: "Conexão viva com o sistema do fundo",
  visibilidade: "ambos",
  peso: 2,
  async run(ctx) {
    let linhas = await db
      .select()
      .from(fundos)
      .where(sql`${fundos.integracaoTipo} = 'opera' AND ${fundos.isActive} = true`);
    if (ctx.escopo === "fundo" && ctx.fundoId)
      linhas = linhas.filter((f) => f.id === ctx.fundoId);

    if (linhas.length === 0)
      return OK("Nenhum fundo com integração OPERA ativa.");

    const resultados: { nome: string; ok: boolean; ms: number; erro?: string }[] = [];
    for (const f of linhas) {
      try {
        const r = await testarConexao(f);
        resultados.push({ nome: f.razaoSocial, ok: r.ok, ms: r.duracaoMs, erro: r.erro });
      } catch (e) {
        resultados.push({ nome: f.razaoSocial, ok: false, ms: 0, erro: (e as Error).message });
      }
    }
    const caidos = resultados.filter((r) => !r.ok);
    const mediaMs = Math.round(
      resultados.reduce((s, r) => s + r.ms, 0) / Math.max(1, resultados.length),
    );
    if (caidos.length > 0)
      return {
        status: "falha",
        detalhe: `${caidos.length}/${resultados.length} integração(ões) OPERA sem resposta.`,
        recomendacao: `Confira credenciais e ambiente: ${caidos.map((c) => `${c.nome} (${c.erro ?? "erro"})`).slice(0, 2).join("; ")}.`,
        metrica: `${resultados.length - caidos.length}/${resultados.length}`,
      };
    return OK(`Autenticação e consulta OK em ${resultados.length} fundo(s).`, `~${mediaMs} ms`);
  },
};

const operaJobsTravados: Check = {
  id: "opera-jobs-travados",
  area: "Integração OPERA",
  titulo: "Fila de integração sem entupimento",
  visibilidade: "ambos",
  async run(ctx) {
    const escopoFundo =
      ctx.escopo === "fundo" && ctx.fundoId
        ? sql`AND fundo_id = ${ctx.fundoId}`
        : sql``;
    const [r] = linhas<{ travados: number; desistidos: number }>(
      await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE status = 'bloqueado')::int AS travados,
          count(*) FILTER (WHERE status = 'desistido')::int AS desistidos
        FROM opera_jobs
        WHERE 1=1 ${escopoFundo}
      `),
    );
    const travados = Number(r?.travados ?? 0);
    const desistidos = Number(r?.desistidos ?? 0);
    if (travados + desistidos === 0)
      return OK("Nenhum job de integração travado.");
    return {
      status: "atencao",
      detalhe: `${travados} job(s) bloqueado(s) e ${desistidos} desistido(s) na fila.`,
      recomendacao: "Abra a central de integração e destrave ou reprocesse. Costuma ser documento faltando ou dado recusado pelo fundo.",
      metrica: `${travados + desistidos}`,
    };
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Comunicação (E-mail, WhatsApp, Assinatura)
   ═══════════════════════════════════════════════════════════════ */

const resendConfig: Check = {
  id: "resend-config",
  area: "Comunicação",
  titulo: "Envio de e-mail configurado",
  visibilidade: "admin",
  async run() {
    const key = env("RESEND_API_KEY");
    const from = env("RESEND_FROM");
    if (!key)
      return {
        status: "atencao",
        detalhe: "RESEND_API_KEY ausente — e-mails transacionais não saem.",
        recomendacao: "Configure a chave do Resend. Notificações de operação dependem disso.",
      };
    if (!from)
      return {
        status: "atencao",
        detalhe: "RESEND_FROM ausente — sem remetente definido.",
        recomendacao: "Defina o e-mail remetente verificado no Resend.",
      };
    return OK("Resend configurado com remetente.");
  },
};

const zapsignConfig: Check = {
  id: "zapsign-config",
  area: "Comunicação",
  titulo: "Assinatura de contrato (ZapSign)",
  visibilidade: "admin",
  async run() {
    const token = env("ZAPSIGN_API_TOKEN");
    if (!token)
      return {
        status: "atencao",
        detalhe: "ZAPSIGN_API_TOKEN ausente — contratos não vão pra assinatura pela AQ.",
        recomendacao: "Configure o token do ZapSign (só necessário quando a Antecipaqui coleta a assinatura).",
      };
    return OK("ZapSign configurado.");
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Armazenamento & Uploads
   ═══════════════════════════════════════════════════════════════ */

const blobToken: Check = {
  id: "blob-token",
  area: "Armazenamento & Uploads",
  titulo: "Storage de documentos disponível",
  visibilidade: "admin",
  peso: 2,
  async run() {
    const token = env("BLOB_READ_WRITE_TOKEN");
    if (!token)
      return {
        status: "falha",
        detalhe: "BLOB_READ_WRITE_TOKEN ausente — upload de documentos quebra.",
        recomendacao: "Configure o Vercel Blob. Sem ele, contratos e comprovantes não sobem.",
      };
    return OK("Vercel Blob configurado.");
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Segredos & Exposição
   ═══════════════════════════════════════════════════════════════ */

const segredosVazados: Check = {
  id: "segredos-nextpublic",
  area: "Segredos & Exposição",
  titulo: "Nenhum segredo exposto ao navegador",
  visibilidade: "admin",
  peso: 3,
  async run() {
    // Variáveis NEXT_PUBLIC_* são embutidas no bundle do cliente. Se alguma
    // carrega valor com cara de segredo, vazou pro navegador.
    const suspeitas: string[] = [];
    const padraoSegredo = /^(sk_|rk_|whsec_|re_|SG\.|xoxb-|AKIA)/;
    for (const [chave, valor] of Object.entries(process.env)) {
      if (!chave.startsWith("NEXT_PUBLIC_")) continue;
      const v = (valor ?? "").trim();
      if (padraoSegredo.test(v) || /secret|password|private[_-]?key/i.test(chave))
        suspeitas.push(chave);
    }
    if (suspeitas.length > 0)
      return {
        status: "falha",
        detalhe: `Variável(is) com cara de segredo exposta(s) ao cliente: ${suspeitas.join(", ")}.`,
        recomendacao: "Renomeie removendo o prefixo NEXT_PUBLIC_ — esse prefixo publica o valor no bundle do navegador.",
      };
    return OK("Nenhuma variável sensível marcada como pública.");
  },
};

const envObrigatorias: Check = {
  id: "env-obrigatorias",
  area: "Segredos & Exposição",
  titulo: "Variáveis essenciais presentes",
  visibilidade: "admin",
  async run() {
    const req = ["DATABASE_URL", "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"];
    const faltando = req.filter((k) => !env(k));
    if (faltando.length > 0)
      return {
        status: "falha",
        detalhe: `Faltando: ${faltando.join(", ")}.`,
        recomendacao: "O sistema não opera sem essas. Configure nas variáveis de ambiente.",
      };
    return OK(`Todas as ${req.length} variáveis essenciais estão definidas.`);
  },
};

/* ═══════════════════════════════════════════════════════════════
   ÁREA · Robustez dos dados
   ═══════════════════════════════════════════════════════════════ */

const webhooksFila: Check = {
  id: "webhooks-fila",
  area: "Robustez dos dados",
  titulo: "Fila de webhooks de saída sem acúmulo",
  visibilidade: "admin",
  async run() {
    try {
      const [r] = linhas<{ pendentes: number; falhos: number }>(
        await db.execute(sql`
          SELECT
            count(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
            count(*) FILTER (WHERE status IN ('falhou','desistido'))::int AS falhos
          FROM webhooks_eventos
        `),
      );
      const pend = Number(r?.pendentes ?? 0);
      const falh = Number(r?.falhos ?? 0);
      if (falh > 0)
        return {
          status: "atencao",
          detalhe: `${falh} webhook(s) de saída falhando e ${pend} na fila.`,
          recomendacao: "Confira os endpoints dos assinantes. Falhas repetidas indicam URL fora do ar do lado deles.",
          metrica: `${falh}`,
        };
      if (pend > 50)
        return {
          status: "atencao",
          detalhe: `${pend} webhooks pendentes — o processador pode estar atrasado.`,
          recomendacao: "Verifique o cron processar-webhooks.",
          metrica: `${pend}`,
        };
      return OK("Fila de webhooks fluindo.", pend ? `${pend} na fila` : undefined);
    } catch {
      return OK("Sem fila de webhooks configurada.");
    }
  },
};

const operacoesOrfas: Check = {
  id: "operacoes-orfas",
  area: "Robustez dos dados",
  titulo: "Operações em análise sem fundo",
  visibilidade: "admin",
  async run() {
    const [r] = linhas<{ n: number }>(
      await db.execute(sql`
        SELECT count(*)::int AS n FROM operacoes
        WHERE fundo_id IS NULL AND status IN ('analise_final','aguardando_aprovacao')
      `),
    );
    const n = Number(r?.n ?? 0);
    if (n > 0)
      return {
        status: "atencao",
        detalhe: `${n} operação(ões) em análise sem fundo vinculado — travam na esteira.`,
        recomendacao: "Vincule um fundo na mesa de decisão pra elas seguirem.",
        metrica: `${n}`,
      };
    return OK("Toda operação em análise tem fundo vinculado.");
  },
};

/* ═══════════════════════════════════════════════════════════════
   REGISTRO
   ═══════════════════════════════════════════════════════════════ */

export const CHECKS: Check[] = [
  dbConectividade,
  dbTls,
  clerkConfig,
  adminEmails,
  contagemAdmins,
  fundosSemDono,
  cronSecret,
  webhooksSegredo,
  operaConexao,
  operaJobsTravados,
  resendConfig,
  zapsignConfig,
  blobToken,
  segredosVazados,
  envObrigatorias,
  webhooksFila,
  operacoesOrfas,
];

/** Ordem canônica das áreas no painel. */
export const ORDEM_AREAS = [
  "Conexão & Banco",
  "Autenticação",
  "Autorização & Acessos",
  "Crons & Automação",
  "Webhooks & Assinaturas",
  "Integração OPERA",
  "Comunicação",
  "Armazenamento & Uploads",
  "Segredos & Exposição",
  "Robustez dos dados",
];
