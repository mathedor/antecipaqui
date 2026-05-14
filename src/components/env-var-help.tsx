"use client";

import { useState } from "react";

type EnvKey =
  | "blobToken"
  | "databaseUrl"
  | "clerkSecretKey"
  | "resendApiKey"
  | "twilioSid"
  | "zapsignToken"
  | "siteUrl"
  | "cronSecret"
  | "anthropicApiKey";

type Tutorial = {
  envName: string;
  service: string;
  why: string;
  /** Passos numerados pra obter a credencial. */
  steps: { title: string; body: string; link?: { href: string; label: string } }[];
  /** Como adicionar no Vercel. */
  vercel: string;
  /** Outros envs relacionados que podem ser necessários. */
  related?: string[];
};

const TUTORIALS: Record<EnvKey, Tutorial> = {
  blobToken: {
    envName: "BLOB_READ_WRITE_TOKEN",
    service: "Vercel Blob (storage de arquivos)",
    why: "Sem isso, todos os uploads de documento (KYC, contratos, repositório, comprovantes) falham.",
    steps: [
      {
        title: "Abrir o painel Vercel do projeto",
        body: "Acesse https://vercel.com/dashboard e clique no projeto Antecipaqui.",
        link: { href: "https://vercel.com/dashboard", label: "Vercel Dashboard" },
      },
      {
        title: "Aba Storage → Create Database → Blob",
        body: "No menu lateral do projeto, clique em Storage. Se não tiver Blob, crie um (botão Create → Blob). Pode usar o tier gratuito.",
        link: {
          href: "https://vercel.com/docs/storage/vercel-blob",
          label: "Docs Vercel Blob",
        },
      },
      {
        title: "Conectar o Blob ao projeto",
        body: "Após criar, clique em Connect Project e selecione o ambiente (Production, Preview, Development). O Vercel vai gerar BLOB_READ_WRITE_TOKEN automaticamente nas env vars.",
      },
      {
        title: "Redeploy",
        body: "Vá em Deployments e clique em Redeploy no último deploy pra carregar o token novo.",
      },
    ],
    vercel: "Vercel → Project → Storage → Connect Blob (cria env var automaticamente)",
  },
  databaseUrl: {
    envName: "DATABASE_URL",
    service: "Postgres (Neon)",
    why: "Sem isso, o app não conecta no banco e nada funciona — todas as páginas vão dar 500.",
    steps: [
      {
        title: "Criar projeto no Neon",
        body: "Cadastre-se em https://neon.tech (free tier serve). Crie um novo projeto e selecione a região.",
        link: { href: "https://neon.tech", label: "Neon" },
      },
      {
        title: "Copiar a connection string",
        body: "Em Dashboard → Connection Details, copie a connection string (formato postgresql://user:pass@host/db?sslmode=require).",
      },
      {
        title: "Adicionar no Vercel",
        body: "Vercel → Settings → Environment Variables → Add. Nome: DATABASE_URL. Valor: a connection string. Marque Production + Preview + Development.",
      },
      {
        title: "Sincronizar schema",
        body: "Localmente: `npm run db:push --force` (lê o DATABASE_URL do .env.local). Em produção, o schema precisa estar sincronizado também — geralmente o mesmo banco.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add DATABASE_URL",
  },
  clerkSecretKey: {
    envName: "CLERK_SECRET_KEY",
    service: "Clerk auth",
    why: "Sem isso, login/cadastro não funcionam. O app depende inteiramente do Clerk pra autenticação.",
    steps: [
      {
        title: "Criar app no Clerk",
        body: "Acesse https://dashboard.clerk.com → Create application. Selecione provedores (Email + Google recomendado).",
        link: { href: "https://dashboard.clerk.com", label: "Clerk Dashboard" },
      },
      {
        title: "Copiar as keys",
        body: "Em API Keys, copie tanto NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY quanto CLERK_SECRET_KEY.",
      },
      {
        title: "Adicionar no Vercel",
        body: "Adicione AMBAS as variáveis em Vercel → Environment Variables. A pública pode ficar exposta no client; a secret é só servidor.",
      },
      {
        title: "Configurar URLs autorizadas",
        body: "No Clerk Dashboard → Domains, adicione o domínio de produção (antecipaqui.digital) e os de preview do Vercel.",
      },
    ],
    vercel:
      "Vercel → Settings → Environment Variables → Add CLERK_SECRET_KEY (e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY se ainda não tiver)",
    related: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
  },
  resendApiKey: {
    envName: "RESEND_API_KEY",
    service: "Resend (envio de emails transacionais)",
    why: "Sem isso, emails de cobrança, notificação, convite e boas-vindas não são enviados. O app não quebra mas usuários não recebem comunicações.",
    steps: [
      {
        title: "Criar conta no Resend",
        body: "Acesse https://resend.com e cadastre-se. O free tier dá 100 emails/dia (3.000/mês).",
        link: { href: "https://resend.com", label: "Resend" },
      },
      {
        title: "Verificar domínio",
        body: "Dashboard → Domains → Add Domain. Adicione antecipaqui.digital e configure os DNS records (DKIM, SPF, MX) que o Resend vai pedir. Sem domínio verificado, só dá pra mandar pro próprio email.",
        link: {
          href: "https://resend.com/docs/dashboard/domains/introduction",
          label: "Docs verificação de domínio",
        },
      },
      {
        title: "Gerar API Key",
        body: "Dashboard → API Keys → Create. Dê um nome (ex: 'antecipaqui-prod'), permissão 'Full access' ou 'Sending access'. Copie a key (começa com 're_').",
      },
      {
        title: "Adicionar no Vercel",
        body: "Vercel → Settings → Environment Variables → Add. Nome: RESEND_API_KEY. Valor: re_xxxxx. Marque Production + Preview + Development.",
      },
      {
        title: "Configurar EMAIL_FROM",
        body: "Adicione também EMAIL_FROM (ex: 'Antecipaqui <contato@antecipaqui.digital>'). Esse vai ser o remetente. Precisa ser do domínio verificado.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add RESEND_API_KEY",
    related: ["EMAIL_FROM"],
  },
  twilioSid: {
    envName: "TWILIO_ACCOUNT_SID",
    service: "Twilio (envio de SMS)",
    why: "Opcional. Sem isso, notificações por SMS não rolam — só email. WhatsApp via wa.me continua funcionando porque é só link.",
    steps: [
      {
        title: "Criar conta Twilio",
        body: "Acesse https://twilio.com/try-twilio. Free trial dá $15 de crédito. Verifique celular e email.",
        link: { href: "https://twilio.com/try-twilio", label: "Twilio Free Trial" },
      },
      {
        title: "Comprar número brasileiro (ou usar trial)",
        body: "Console → Phone Numbers → Buy a Number. Filtre por Brasil (+55). Custa ~$1/mês. No trial, você usa um número americano e só pode mandar SMS pros números verificados.",
      },
      {
        title: "Pegar SID + Auth Token + From Number",
        body: "Console Dashboard mostra ACCOUNT_SID e AUTH_TOKEN (clique pra revelar). O número comprado fica em Phone Numbers → Active.",
      },
      {
        title: "Adicionar no Vercel",
        body: "Adicione 3 envs: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER (formato +5511999999999). Todas em Production + Preview + Development.",
      },
      {
        title: "Custos",
        body: "SMS pra Brasil custa ~R$0,40 por envio. Considere usar só pra alertas críticos (ex: confirmação de operação aprovada). Notificações de UI usam app/email.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER",
    related: ["TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"],
  },
  zapsignToken: {
    envName: "ZAPSIGN_API_TOKEN",
    service: "ZapSign (assinatura digital de contratos)",
    why: "Sem isso, contratos de cessão de comissão NÃO são enviados pra assinatura digital. O app gera o PDF mas o fluxo de aprovação para porque ninguém assina.",
    steps: [
      {
        title: "Criar conta ZapSign",
        body: "Acesse https://app.zapsign.com.br. Plano gratuito tem 5 documentos/mês — pra produção, plano Pro custa ~R$80/mês.",
        link: { href: "https://app.zapsign.com.br", label: "ZapSign" },
      },
      {
        title: "Gerar API Token",
        body: "Configurações → API → Gerar token. Copie o token (formato UUID longo). Esse token tem permissão total na conta — guarde com cuidado.",
        link: {
          href: "https://docs.zapsign.com.br/portugues/comecando/autenticacao",
          label: "Docs ZapSign API",
        },
      },
      {
        title: "Configurar Webhook",
        body: "Configurações → Webhooks → Add. URL: https://www.antecipaqui.digital/api/zapsign/webhook. Eventos: doc_signed, doc_partially_signed, doc_finished. Isso atualiza o status do contrato no app quando alguém assina.",
      },
      {
        title: "Adicionar no Vercel",
        body: "Vercel → Settings → Environment Variables → Add ZAPSIGN_API_TOKEN. Marque Production + Preview + Development.",
      },
      {
        title: "Testar",
        body: "Crie uma operação fake, leve até 'enviada_para_assinatura' no admin. Cheque se o ZapSign criou o documento e enviou os emails.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add ZAPSIGN_API_TOKEN",
  },
  siteUrl: {
    envName: "NEXT_PUBLIC_SITE_URL",
    service: "URL canônica do app",
    why: "Usado em emails, mensagens WhatsApp e links de convite. Sem isso, links apontam pra placeholder.",
    steps: [
      {
        title: "Definir a URL de produção",
        body: "Sua URL final (ex: https://www.antecipaqui.digital). Sem barra no final.",
      },
      {
        title: "Adicionar no Vercel",
        body: "Vercel → Settings → Environment Variables → Add. Nome: NEXT_PUBLIC_SITE_URL. Valor: https://www.antecipaqui.digital. Como começa com NEXT_PUBLIC_, fica acessível no browser.",
      },
      {
        title: "Para Preview/Dev",
        body: "Use a URL do branch de preview ou http://localhost:3000 pra dev.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add NEXT_PUBLIC_SITE_URL",
  },
  cronSecret: {
    envName: "CRON_SECRET",
    service: "Crons agendados (Vercel Cron)",
    why: "Sem isso, os endpoints /api/cron/* aceitam qualquer chamada — risco de abuso. Os crons do Vercel enviam Bearer ${CRON_SECRET} automaticamente.",
    steps: [
      {
        title: "Gerar um token aleatório",
        body: "Use openssl rand -hex 32 ou qualquer gerador de string segura.",
      },
      {
        title: "Adicionar no Vercel",
        body: "Vercel → Settings → Environment Variables → Add. Nome: CRON_SECRET. Valor: o token gerado. Production + Preview.",
      },
      {
        title: "Redeploy",
        body: "Após adicionar, faça um redeploy pros crons existentes (cobranca-parcelas, recaps-diarios, processar-webhooks, backup-diario, auto-nudge-chats) começarem a validar a auth.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add CRON_SECRET",
  },
  anthropicApiKey: {
    envName: "ANTHROPIC_API_KEY",
    service: "Claude (OCR de documentos + extração)",
    why: "Sem isso, validação automática de documentos (RG, CPF, comprovante) e extração de contratos do corretor não funciona — admin precisa validar manualmente.",
    steps: [
      {
        title: "Criar conta Anthropic",
        body: "Acesse https://console.anthropic.com e crie conta. Configure billing (cartão).",
        link: {
          href: "https://console.anthropic.com/settings/keys",
          label: "Anthropic Console",
        },
      },
      {
        title: "Gerar API key",
        body: "Settings → API Keys → Create Key. Copie o token (começa com sk-ant-).",
      },
      {
        title: "Adicionar no Vercel",
        body: "Vercel → Settings → Environment Variables → Add. Nome: ANTHROPIC_API_KEY. Valor: a chave. Production + Preview + Development.",
      },
    ],
    vercel: "Vercel → Settings → Environment Variables → Add ANTHROPIC_API_KEY",
    related: ["ANTHROPIC_MODEL (opcional, default claude-haiku-4-5)"],
  },
};

const SERVICE_LABEL: Record<EnvKey, string> = {
  blobToken: "Vercel Blob (BLOB_READ_WRITE_TOKEN)",
  databaseUrl: "Postgres (DATABASE_URL)",
  clerkSecretKey: "Clerk auth (CLERK_SECRET_KEY)",
  resendApiKey: "Resend email (RESEND_API_KEY)",
  twilioSid: "Twilio SMS (TWILIO_ACCOUNT_SID)",
  zapsignToken: "ZapSign (ZAPSIGN_API_TOKEN)",
  siteUrl: "Site URL (NEXT_PUBLIC_SITE_URL)",
  cronSecret: "Crons (CRON_SECRET)",
  anthropicApiKey: "Claude OCR (ANTHROPIC_API_KEY)",
};

export function EnvVarsList({
  env,
}: {
  env: Record<EnvKey, boolean>;
}) {
  const [openKey, setOpenKey] = useState<EnvKey | null>(null);

  const entries = Object.entries(env) as [EnvKey, boolean][];

  return (
    <>
      <ul className="space-y-2">
        {entries.map(([key, ok]) => (
          <li key={key}>
            {ok ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-success/30 bg-green-50">
                <span className="text-sm text-fg truncate">
                  {SERVICE_LABEL[key]}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded text-success">
                  ✓ ok
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpenKey(key)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-danger/30 bg-red-50 hover:bg-red-100 hover:border-danger/50 cursor-pointer transition-colors text-left group"
              >
                <span className="text-sm text-fg truncate">
                  {SERVICE_LABEL[key]}
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded text-danger">
                    ✕ ausente
                  </span>
                  <span className="text-[10px] font-mono text-danger group-hover:text-danger underline-offset-2 group-hover:underline">
                    como resolver →
                  </span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] text-fg-muted">
        ✕ ausente significa que o serviço relacionado vai falhar.{" "}
        <span className="text-danger font-semibold">
          Clique pra ver o tutorial passo a passo.
        </span>
      </p>

      {openKey && (
        <TutorialModal
          tutorial={TUTORIALS[openKey]}
          onClose={() => setOpenKey(null)}
        />
      )}
    </>
  );
}

function TutorialModal({
  tutorial,
  onClose,
}: {
  tutorial: Tutorial;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-border bg-bg-elev shadow-2xl">
        <div className="sticky top-0 bg-bg-elev/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-danger mb-1">
              env var ausente · tutorial de configuração
            </div>
            <h2 className="text-xl font-bold tracking-tight text-fg truncate">
              {tutorial.service}
            </h2>
            <code className="font-mono text-xs text-fg-muted">
              {tutorial.envName}
            </code>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="size-9 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-accent hover:text-accent transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="p-6 md:p-7 space-y-6">
          {/* Por que importa */}
          <div className="rounded-xl border border-warn/30 bg-yellow-50 p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
              por que importa
            </div>
            <p className="text-sm text-fg leading-relaxed">{tutorial.why}</p>
          </div>

          {/* Passo a passo */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
              passo a passo
            </div>
            <ol className="space-y-3">
              {tutorial.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 inline-flex items-center justify-center size-7 rounded-full bg-accent text-white text-xs font-bold font-mono">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-fg text-sm mb-0.5">
                      {step.title}
                    </div>
                    <p className="text-sm text-fg-muted leading-relaxed">
                      {step.body}
                    </p>
                    {step.link && (
                      <a
                        href={step.link.href}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 mt-2 text-accent text-xs font-semibold hover:underline"
                      >
                        {step.link.label} ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Resumo Vercel */}
          <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-1">
              resumo · onde adicionar
            </div>
            <p className="text-sm text-fg font-mono">{tutorial.vercel}</p>
            {tutorial.related && tutorial.related.length > 0 && (
              <p className="text-xs text-fg-muted mt-2">
                Envs relacionadas:{" "}
                {tutorial.related.map((r, i) => (
                  <span key={r}>
                    <code className="bg-bg-card px-1.5 py-0.5 rounded text-[10px]">
                      {r}
                    </code>
                    {i < tutorial.related!.length - 1 ? " · " : ""}
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-fg text-bg text-sm font-semibold hover:bg-fg/90 transition-colors"
            >
              Abrir Vercel ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
