/** ANA — Conector de consulta só-leitura (Antecipaqui).
 *
 *  GET  /api/ana/consulta?esquema=1          → lista as tabelas (schema public)
 *  GET  /api/ana/consulta?esquema=<tabela>   → lista as colunas da tabela
 *  POST /api/ana/consulta { "sql": "select ..." } → roda um SELECT só-leitura
 *
 *  Auth: Authorization: Bearer $ANA_PULSO_TOKEN (mesmo token do pulso).
 *
 *  O driver do Neon usado aqui (neon-http, via @neondatabase/serverless) não
 *  tem transação interativa — cada chamada é uma requisição HTTP isolada, não
 *  dá pra fazer "begin read only; ...; rollback". Por isso a blindagem é
 *  estrutural: toda consulta do POST é embrulhada como subquery
 *  (select * from (<consulta>) _ana [limit 200]) — o Postgres só aceita essa
 *  forma se o miolo for um SELECT de verdade, então qualquer coisa que não
 *  seja leitura já quebra a sintaxe antes de chegar no banco.
 */

import { NextResponse, type NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// conforme a versão do driver, query() devolve o array de linhas direto ou { rows }
function linhasDe(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const rows = (res as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as Record<string, unknown>[]) : [];
}

function checarAuth(req: NextRequest): NextResponse | null {
  const esperado = process.env.ANA_PULSO_TOKEN;
  const auth = req.headers.get("authorization");
  if (!esperado || auth !== `Bearer ${esperado}`) {
    return NextResponse.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  return null;
}

function erro(msg: string, status = 400) {
  return NextResponse.json({ ok: false, erro: msg }, { status });
}

// palavra de escrita em qualquer lugar da consulta → derruba
const PALAVRA_DE_ESCRITA =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do)\b/i;

// nome de coluna que cheira a dado sensível → mascara o valor
const COLUNA_SENSIVEL =
  /senha|password|token|secret|hash|cvv|cartao|card|chave_pix|api_key/i;

function mascarar(linha: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(linha)) {
    out[chave] =
      COLUNA_SENSIVEL.test(chave) && valor !== null && valor !== undefined
        ? "•••"
        : valor;
  }
  return out;
}

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`consulta demorou mais de ${ms / 1000}s (timeout)`)), ms),
    ),
  ]);
}

export async function GET(req: NextRequest) {
  const authErro = checarAuth(req);
  if (authErro) return authErro;

  const esquema = req.nextUrl.searchParams.get("esquema");
  if (!esquema) {
    return erro(
      'use ?esquema=1 (lista tabelas), ?esquema=<tabela> (lista colunas) ou faça um POST com { "sql": "select ..." }',
    );
  }

  try {
    const client = neon(process.env.DATABASE_URL!);

    if (esquema === "1") {
      const dados = linhasDe(
        await client.query(
          `select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
        ),
      );
      return NextResponse.json({ ok: true, linhas: dados.length, dados });
    }

    const dados = linhasDe(
      await client.query(
        `select column_name, data_type, is_nullable
           from information_schema.columns
          where table_schema = 'public' and table_name = $1
          order by ordinal_position`,
        [esquema],
      ),
    );
    return NextResponse.json({ ok: true, linhas: dados.length, dados });
  } catch (e) {
    return erro(e instanceof Error ? e.message : "erro ao consultar o esquema");
  }
}

export async function POST(req: NextRequest) {
  const authErro = checarAuth(req);
  if (authErro) return authErro;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return erro('corpo inválido, esperado JSON { "sql": "select ..." }');
  }

  const entrada = (body as { sql?: unknown } | null)?.sql;
  if (typeof entrada !== "string" || !entrada.trim()) {
    return erro('informe { "sql": "select ..." }');
  }

  // um comando só: tira ; final e barra ; sobrando no meio
  let consulta = entrada.trim();
  if (consulta.endsWith(";")) consulta = consulta.slice(0, -1).trim();
  if (consulta.includes(";")) {
    return erro("só um comando por vez (tem ponto-e-vírgula no meio)");
  }

  if (!/^(select|with)\b/i.test(consulta)) {
    return erro("só SELECT (ou WITH ... SELECT)");
  }

  if (PALAVRA_DE_ESCRITA.test(consulta)) {
    return erro(
      "consulta só-leitura: nada de insert/update/delete/drop/alter/create/truncate/grant/revoke/copy/call/do",
    );
  }

  const temLimit = /\blimit\s+\d+/i.test(consulta);
  const blindada = temLimit
    ? `select * from (${consulta}) _ana`
    : `select * from (${consulta}) _ana limit 200`;

  try {
    const client = neon(process.env.DATABASE_URL!);
    const dados = linhasDe(await comTimeout(client.query(blindada), 10_000)).map(mascarar);
    return NextResponse.json({ ok: true, linhas: dados.length, dados });
  } catch (e) {
    return erro(e instanceof Error ? e.message : "erro ao rodar a consulta");
  }
}
