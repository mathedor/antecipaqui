/**
 * Troca o e-mail de acesso do responsável do grupo IMÓVEIS DE PRIMEIRA e
 * dispara o e-mail de boas-vindas com os dados de acesso.
 *
 * Ordem importa: primeiro o Clerk (fonte de verdade do login), depois o
 * nosso DB, e só então o envio — assim a credencial que vai no e-mail já
 * é a que funciona.
 *
 * ATENÇÃO: dispara e-mail real pro cliente. Rodar só quando o dono pedir.
 *
 * Pra rodar (PRODUÇÃO):
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- \
 *     | sed 's#/neondb?#/antecipaqui_prod?#') \
 *     npx tsx --env-file=.env.local scripts/trocar-email-e-boas-vindas.ts
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { sendEmail } from "../src/lib/email";
// (fluxo crítico — se não entregar, o cliente fica sem a credencial)

const EMAIL_ANTIGO = "chinasso.corretor@gmail.com";
const EMAIL_NOVO = "financeiro@imoveisdeprimeira.com";
const SENHA = "dE#EmaV6gVBnkT";

const URL_PAINEL = "https://www.antecipaqui.digital/entrar";
const URL_APRESENTACAO = "https://antecipaqui-apresentacao.vercel.app/publica";

const CLERK_API = "https://api.clerk.com/v1";

async function clerk<T = unknown>(
  rota: string,
  metodo: string,
  corpo?: unknown,
): Promise<T> {
  const chave = process.env.CLERK_SECRET_KEY;
  if (!chave) throw new Error("CLERK_SECRET_KEY não configurada");
  const res = await fetch(`${CLERK_API}${rota}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Clerk ${metodo} ${rota} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

type ClerkEmail = {
  id: string;
  email_address: string;
  verification?: { status: string } | null;
};
type ClerkUser = {
  id: string;
  email_addresses?: ClerkEmail[];
  primary_email_address_id?: string;
};

async function trocarEmailNoClerk(): Promise<string> {
  const achados = await clerk<ClerkUser[]>(
    `/users?email_address=${encodeURIComponent(EMAIL_ANTIGO)}`,
    "GET",
  );
  const user =
    achados[0] ??
    (
      await clerk<ClerkUser[]>(
        `/users?email_address=${encodeURIComponent(EMAIL_NOVO)}`,
        "GET",
      )
    )[0];
  if (!user) throw new Error("Usuário não encontrado no Clerk");

  const jaTemNovo = (user.email_addresses ?? []).find(
    (e) => e.email_address.toLowerCase() === EMAIL_NOVO,
  );

  let novoId: string;
  if (jaTemNovo) {
    novoId = jaTemNovo.id;
    console.log("  · e-mail novo já estava no Clerk");
  } else {
    const criado = await clerk<ClerkEmail>("/email_addresses", "POST", {
      user_id: user.id,
      email_address: EMAIL_NOVO,
      verified: true,
      primary: true,
    });
    novoId = criado.id;
    console.log(`  ✓ e-mail novo adicionado e verificado (${EMAIL_NOVO})`);
  }

  // Garante primário (o POST já pede, mas confirmamos — é o que decide o login)
  await clerk(`/users/${user.id}`, "PATCH", {
    primary_email_address_id: novoId,
  });
  console.log("  ✓ definido como e-mail primário");

  // Remove o antigo pra não restar dois caminhos de login
  const antigo = (user.email_addresses ?? []).find(
    (e) => e.email_address.toLowerCase() === EMAIL_ANTIGO,
  );
  if (antigo) {
    await clerk(`/email_addresses/${antigo.id}`, "DELETE");
    console.log(`  ✓ e-mail antigo removido (${EMAIL_ANTIGO})`);
  }

  return user.id;
}

function corpoTexto(unidades: string[], operacoes: number, comissao: string) {
  return `Olá!

Sua conta na Antecipaqui está pronta. A partir de agora você antecipa as comissões da Imóveis de Primeira direto pelo painel, escolhendo por qual unidade do grupo sai cada operação.

SEUS DADOS DE ACESSO
Endereço: ${URL_PAINEL}
E-mail: ${EMAIL_NOVO}
Senha: ${SENHA}

Troque a senha no primeiro acesso, em "Meus dados".

CONHEÇA A PLATAFORMA
Preparamos uma apresentação com tudo que o sistema faz, tela por tela:
${URL_APRESENTACAO}

O QUE JÁ ESTÁ CADASTRADO
Grupo econômico com ${unidades.length} unidades: ${unidades.join(", ")}.
${operacoes} operações lançadas a partir dos contratos que recebemos, somando ${comissao} em comissões.

Todas as operações estão marcadas como "documentos incompletos": ao abrir cada uma, você vê exatamente o que falta anexar para seguir para análise. É só subir o documento por lá.

PRÓXIMO PASSO
Faltam os dados bancários de cada unidade — banco, agência e conta. Eles entram na cláusula 3ª do contrato de cessão e são obrigatórios antes da primeira antecipação. Você mesmo pode preencher em "Matriz e filiais", editando cada unidade.

Qualquer dúvida, é só responder este e-mail ou falar com a gente pelo chat dentro do painel.

Equipe Antecipaqui`;
}

function corpoHtml(unidades: string[], operacoes: number, comissao: string) {
  const li = (t: string) =>
    `<li style="margin:0 0 6px 0;line-height:1.5">${t}</li>`;
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;background:#f7f7f8;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:32px 28px;border:1px solid #e5e7eb">

    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#1f4ed8;margin-bottom:18px">Antecipaqui</div>

    <h1 style="font-size:24px;line-height:1.25;margin:0 0 14px 0">Bem-vindo à Antecipaqui</h1>
    <p style="margin:0 0 22px 0;line-height:1.6;color:#374151">
      Sua conta está pronta. A partir de agora você antecipa as comissões da
      <strong>Imóveis de Primeira</strong> direto pelo painel, escolhendo por qual
      unidade do grupo sai cada operação.
    </p>

    <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:12px;padding:18px 20px;margin:0 0 22px 0">
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#1f4ed8;margin-bottom:12px">Seus dados de acesso</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0;color:#6b7280;width:80px">Endereço</td><td style="padding:4px 0"><a href="${URL_PAINEL}" style="color:#1f4ed8;font-weight:600;text-decoration:none">${URL_PAINEL}</a></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">E-mail</td><td style="padding:4px 0;font-family:ui-monospace,Menlo,monospace"><strong>${EMAIL_NOVO}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Senha</td><td style="padding:4px 0;font-family:ui-monospace,Menlo,monospace"><strong>${SENHA}</strong></td></tr>
      </table>
      <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280">Troque a senha no primeiro acesso, em “Meus dados”.</p>
    </div>

    <div style="text-align:center;margin:0 0 26px 0">
      <a href="${URL_APRESENTACAO}" style="display:inline-block;background:#1f4ed8;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px">Conheça a plataforma →</a>
      <p style="margin:10px 0 0 0;font-size:12px;color:#6b7280">Apresentação completa, tela por tela</p>
    </div>

    <h2 style="font-size:16px;margin:0 0 10px 0">O que já está cadastrado</h2>
    <ul style="margin:0 0 20px 0;padding-left:20px;color:#374151;font-size:14px">
      ${li(`Grupo econômico com <strong>${unidades.length} unidades</strong>: ${unidades.join(", ")}`)}
      ${li(`<strong>${operacoes} operações</strong> lançadas a partir dos contratos que recebemos, somando <strong>${comissao}</strong> em comissões`)}
      ${li(`Contratos de cada operação já anexados`)}
    </ul>

    <div style="border-left:3px solid #f59e0b;background:#fffbeb;padding:14px 16px;border-radius:0 8px 8px 0;margin:0 0 22px 0">
      <p style="margin:0;font-size:14px;line-height:1.55;color:#374151">
        As operações estão como <strong>“documentos incompletos”</strong>: ao abrir
        cada uma, você vê exatamente o que falta anexar para seguir para análise.
        É só subir o documento por lá.
      </p>
    </div>

    <h2 style="font-size:16px;margin:0 0 10px 0">Próximo passo</h2>
    <p style="margin:0 0 22px 0;line-height:1.6;color:#374151;font-size:14px">
      Faltam os <strong>dados bancários de cada unidade</strong> — banco, agência e
      conta. Eles entram na cláusula 3ª do contrato de cessão e são obrigatórios
      antes da primeira antecipação. Você mesmo preenche em
      <strong>Matriz e filiais</strong>, editando cada unidade.
    </p>

    <p style="margin:0;line-height:1.6;color:#374151;font-size:14px">
      Qualquer dúvida, responda este e-mail ou fale com a gente pelo chat dentro do painel.
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 14px 0"/>
    <div style="font-size:11px;color:#9ca3af">
      Antecipaqui · antecipação de comissões imobiliárias<br/>
      Você recebeu este e-mail porque sua conta foi criada na plataforma.
    </div>
  </div>
</body></html>`;
}

async function main() {
  console.log("✉️  Troca de e-mail + boas-vindas — Imóveis de Primeira\n");

  const userId = await trocarEmailNoClerk();

  await db
    .update(users)
    .set({ email: EMAIL_NOVO, updatedAt: new Date() })
    .where(eq(users.id, userId));
  console.log(`  ✓ e-mail atualizado no banco (${EMAIL_NOVO})`);

  // Contexto real pro e-mail — nada chutado.
  const unidadesRows = await db.execute(sql`
    SELECT COALESCE(apelido, razao_social) AS nome
    FROM imobiliarias WHERE owner_user_id = ${userId}
    ORDER BY (matriz_id IS NOT NULL), razao_social
  `);
  const opsRows = await db.execute(sql`
    SELECT count(*)::int AS total, COALESCE(sum(valor_comissao),0)::float8 AS comissao
    FROM operacoes o
    JOIN imobiliarias i ON i.id = o.imobiliaria_id
    WHERE i.owner_user_id = ${userId}
  `);
  type R = Record<string, string | number>;
  const pick = (r: unknown) =>
    (Array.isArray(r) ? r : ((r as { rows: R[] }).rows ?? [])) as R[];

  const unidades = pick(unidadesRows).map((u) => String(u.nome));
  const totalOps = Number(pick(opsRows)[0]?.total ?? 0);
  const comissao = Number(pick(opsRows)[0]?.comissao ?? 0).toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" },
  );
  console.log(
    `  · contexto: ${unidades.length} unidades, ${totalOps} operações, ${comissao}`,
  );

  const r = await sendEmail({
    contexto: "boas-vindas",
    to: EMAIL_NOVO,
    subject: "Bem-vindo à Antecipaqui — seus dados de acesso",
    body: corpoTexto(unidades, totalOps, comissao),
    html: corpoHtml(unidades, totalOps, comissao),
  });

  if (r.mocked) {
    console.log("\n⚠ RESEND_API_KEY ausente — e-mail NÃO foi enviado (mock).");
  } else if (r.ok) {
    console.log(`\n  ✓ e-mail de boas-vindas enviado (id ${r.id})`);
  } else {
    throw new Error("Falha no envio do e-mail");
  }

  console.log("\n✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e.message ?? e);
    process.exit(1);
  });
