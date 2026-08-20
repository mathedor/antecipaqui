/**
 * Migração Clerk: instância TEST (immune-duck-37) → LIVE (clerk.antecipaqui.digital)
 *
 * Contexto: produção rodou desde sempre na instância test; a live foi criada
 * em 18/08 vazia. O banco usa o id do Clerk como chave de users, então migrar
 * = recriar os usuários na live (login é email_code/OAuth, sem hash de senha
 * pra carregar) e remapear ids antigos→novos em todas as FKs do banco PROD.
 *
 * Uso: node scripts/migracao-clerk-live.mjs <status|usuarios|convites|remap|varredura>
 *   status    — certificado da live, contagens nas duas instâncias
 *   usuarios  — copia usuários test→live (idempotente por e-mail) e grava o mapa de ids
 *   convites  — recria convites PENDENTES na live (rodar só na virada; dispara e-mail)
 *   remap     — transação no banco PROD: copia rows de users com id novo,
 *               repointa todas as FKs (via information_schema) e apaga os antigos
 *   varredura — procura ids antigos remanescentes em todas as colunas texto do PROD
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const raiz = new URL("..", import.meta.url).pathname;
const envLocal = Object.fromEntries(
  readFileSync(raiz + ".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const SK_TEST = envLocal.CLERK_SECRET_KEY;
const SK_LIVE = readFileSync(raiz + ".env.live.local", "utf8").match(/CLERK_SECRET_KEY_LIVE=(.+)/)[1].trim();
if (!SK_TEST?.startsWith("sk_test") || !SK_LIVE?.startsWith("sk_live")) {
  console.error("chaves erradas: test=" + SK_TEST?.slice(0, 8) + " live=" + SK_LIVE?.slice(0, 8));
  process.exit(1);
}
// PROD = mesmo endpoint Neon do .env.local, trocando SÓ o nome do banco (pathname).
const urlProd = new URL(envLocal.DATABASE_URL);
urlProd.pathname = "/antecipaqui_prod";
const DB_PROD = urlProd.toString();
const MAPA = raiz + ".migracao-clerk-idmap.json";

const api = (sk) => async (path, init = {}) => {
  const r = await fetch("https://api.clerk.com/v1" + path, {
    ...init,
    headers: { Authorization: "Bearer " + sk, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(path + " HTTP " + r.status + ": " + JSON.stringify(body).slice(0, 300));
  return body;
};
const test = api(SK_TEST);
const live = api(SK_LIVE);

async function listarUsuarios(call) {
  const out = [];
  for (let off = 0; ; off += 100) {
    const page = await call(`/users?limit=100&offset=${off}&order_by=created_at`);
    out.push(...page);
    if (page.length < 100) break;
  }
  return out;
}

const cmd = process.argv[2];

if (cmd === "status") {
  let cert = "SEM CERTIFICADO (TLS falha)";
  try {
    const r = await fetch("https://clerk.antecipaqui.digital/v1/environment", { signal: AbortSignal.timeout(8000) });
    cert = "OK — FAPI responde " + r.status;
  } catch {}
  console.log("certificado clerk.antecipaqui.digital:", cert);
  const [ut, ul] = await Promise.all([test("/users/count"), live("/users/count")]);
  console.log("usuários — test:", ut.total_count, "| live:", ul.total_count);
  const pend = await test("/invitations?status=pending&limit=100");
  console.log("convites pendentes na test:", (pend.data ?? pend).length);
  if (existsSync(MAPA)) {
    const m = JSON.parse(readFileSync(MAPA, "utf8"));
    console.log("mapa de ids existente:", Object.keys(m).length, "entradas");
  }
}

if (cmd === "usuarios") {
  const [deTest, deLive] = await Promise.all([listarUsuarios(test), listarUsuarios(live)]);
  const emailDe = (u) =>
    (u.email_addresses.find((e) => e.id === u.primary_email_address_id) ?? u.email_addresses[0])?.email_address?.toLowerCase();
  const jaNaLive = new Map(deLive.map((u) => [emailDe(u), u.id]));
  const mapa = existsSync(MAPA) ? JSON.parse(readFileSync(MAPA, "utf8")) : {};
  let criados = 0, pulados = 0;
  for (const u of deTest) {
    const email = emailDe(u);
    if (!email) { console.log("SEM EMAIL, pulando:", u.id); continue; }
    if (jaNaLive.has(email)) {
      mapa[u.id] = jaNaLive.get(email);
      pulados++;
      continue;
    }
    const body = {
      email_address: [email],
      first_name: u.first_name ?? undefined,
      last_name: u.last_name ?? undefined,
      username: u.username ?? undefined,
      public_metadata: u.public_metadata ?? {},
      private_metadata: u.private_metadata ?? {},
      unsafe_metadata: u.unsafe_metadata ?? {},
      skip_password_requirement: true,
      created_at: u.created_at ? new Date(u.created_at).toISOString() : undefined,
    };
    const tel = u.phone_numbers?.[0]?.phone_number;
    if (tel) body.phone_number = [tel];
    let novo;
    try {
      novo = await live("/users", { method: "POST", body: JSON.stringify(body) });
    } catch (e) {
      // telefone duplicado/inválido etc: tenta sem telefone e sem username
      console.log("retry sem tel/username:", email, "|", e.message.slice(0, 120));
      delete body.phone_number; delete body.username;
      novo = await live("/users", { method: "POST", body: JSON.stringify(body) });
    }
    mapa[u.id] = novo.id;
    criados++;
  }
  // Segunda passada: publicMetadata com convidadoPor (id antigo) → id novo
  for (const u of deTest) {
    const conv = u.public_metadata?.convidadoPor;
    if (conv && mapa[conv] && mapa[u.id]) {
      await live(`/users/${mapa[u.id]}/metadata`, {
        method: "PATCH",
        body: JSON.stringify({ public_metadata: { ...u.public_metadata, convidadoPor: mapa[conv] } }),
      });
    }
  }
  writeFileSync(MAPA, JSON.stringify(mapa, null, 1));
  console.log("criados:", criados, "| já existiam:", pulados, "| mapa total:", Object.keys(mapa).length);
}

if (cmd === "convites") {
  const mapa = JSON.parse(readFileSync(MAPA, "utf8"));
  const pend = await test("/invitations?status=pending&limit=100");
  for (const inv of (pend.data ?? pend)) {
    const meta = { ...(inv.public_metadata ?? {}) };
    if (meta.convidadoPor && mapa[meta.convidadoPor]) meta.convidadoPor = mapa[meta.convidadoPor];
    const r = await live("/invitations", {
      method: "POST",
      body: JSON.stringify({
        email_address: inv.email_address,
        public_metadata: meta,
        redirect_url: "https://www.antecipaqui.digital/cadastre-se",
      }),
    });
    console.log("convite recriado na live:", inv.email_address, "→", r.id);
  }
}

if (cmd === "remap") {
  const mapa = JSON.parse(readFileSync(MAPA, "utf8"));
  const pares = Object.entries(mapa);
  if (!pares.length) throw new Error("mapa vazio");
  const sql = neon(DB_PROD);

  const fks = await sql`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users' AND ccu.column_name = 'id' AND tc.table_schema = 'public'`;
  console.log("colunas FK a repointar:", fks.length);

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' ORDER BY ordinal_position`;
  const nomes = cols.map((c) => `"${c.column_name}"`).join(", ");
  const antigos = pares.map(([a]) => a);

  // Só remapeia quem existe no PROD (test tem usuários de dev que nunca logaram no prod).
  const noProd = await sql`SELECT id FROM users WHERE id = ANY(${antigos})`;
  const idsProd = new Set(noProd.map((r) => r.id));
  const paresProd = pares.filter(([a]) => idsProd.has(a));
  console.log("usuários no banco PROD a remapear:", paresProd.length, "de", pares.length, "no mapa");

  const lote = [];
  // e-mail tem índice único: mangla o do row antigo antes, e a cópia restaura
  // o original (substr tira o prefixo 'mig~' de 4 chars).
  const selecao = cols.map((c) =>
    c.column_name === "id" ? "__NOVO__" :
    c.column_name === "email" ? `substr("email", 5)` : `"${c.column_name}"`,
  ).join(", ");
  lote.push(sql.query(
    `UPDATE users SET email = 'mig~' || email WHERE id = ANY($1)`,
    [paresProd.map(([a]) => a)],
  ));
  for (const [antigo, novo] of paresProd) {
    lote.push(sql.query(
      `INSERT INTO users (${nomes}) SELECT ${selecao.replace("__NOVO__", `'${novo}'`)} FROM users WHERE id = $1 ON CONFLICT (id) DO NOTHING`,
      [antigo],
    ));
  }
  for (const fk of fks) {
    for (const [antigo, novo] of paresProd) {
      lote.push(sql.query(
        `UPDATE "${fk.table_name}" SET "${fk.column_name}" = $1 WHERE "${fk.column_name}" = $2`,
        [novo, antigo],
      ));
    }
  }
  lote.push(sql.query(`DELETE FROM users WHERE id = ANY($1)`, [paresProd.map(([a]) => a)]));
  console.log("executando transação com", lote.length, "comandos…");
  await sql.transaction(lote);
  console.log("remap concluído.");
}

if (cmd === "remap-polimorfico") {
  // Colunas polimórficas sem FK (guardam id de várias entidades, inclusive
  // user): a varredura achou audit_logs.target_id. Mesmo remap de identidade
  // antigo→novo dos demais — o conteúdo dos registros não muda.
  const mapa = JSON.parse(readFileSync(MAPA, "utf8"));
  const sql = neon(DB_PROD);
  let n = 0;
  for (const [antigo, novo] of Object.entries(mapa)) {
    const r = await sql.query(
      "UPDATE audit_logs SET target_id = $1 WHERE target_id = $2 RETURNING id",
      [novo, antigo],
    );
    n += r.length;
  }
  console.log("audit_logs.target_id remapeados:", n);
}

if (cmd === "varredura") {
  const mapa = JSON.parse(readFileSync(MAPA, "utf8"));
  const antigos = Object.keys(mapa);
  const sql = neon(DB_PROD);
  const cols = await sql`
    SELECT table_name, column_name, data_type FROM information_schema.columns
    WHERE table_schema='public' AND data_type IN ('text','character varying','jsonb')`;
  let achados = 0;
  for (const c of cols) {
    const cast = c.data_type === "jsonb" ? `"${c.column_name}"::text` : `"${c.column_name}"`;
    const r = await sql.query(
      `SELECT count(*)::int AS n FROM "${c.table_name}" WHERE ${cast} = ANY($1)`,
      [antigos],
    );
    if (r[0].n > 0) { console.log("RESTOU:", c.table_name + "." + c.column_name, "→", r[0].n); achados += r[0].n; }
  }
  console.log(achados === 0 ? "varredura de igualdade limpa — nenhum id antigo restante." : `ATENÇÃO: ${achados} ocorrências restantes.`);
}
