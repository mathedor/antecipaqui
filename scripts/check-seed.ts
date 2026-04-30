import "dotenv/config";
import { sql, like } from "drizzle-orm";
import { db } from "../src/db";
import { construtoras, imobiliarias, operacoes, users } from "../src/db/schema";

async function main() {
  const [u] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(users)
    .where(like(users.id, "seed_user_%"));
  const [i] = await db.select({ c: sql<number>`count(*)::int` }).from(imobiliarias);
  const [c] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(construtoras)
    .where(like(construtoras.cnpj, "00%"));
  const [o] = await db.select({ c: sql<number>`count(*)::int` }).from(operacoes);
  console.log({ usersSeed: u.c, imobTotal: i.c, construtorasSeed: c.c, opsTotal: o.c });

  const byStatus = await db.execute(sql`
    SELECT status, count(*)::int as n, round(sum(valor_comissao)::numeric, 0) as comissao
    FROM operacoes GROUP BY status ORDER BY n DESC
  `);
  console.log("por status:");
  console.table((byStatus as { rows?: unknown[] }).rows ?? byStatus);

  const totals = await db.execute(sql`
    SELECT
      round(sum(valor_comissao)::numeric, 0) as comissao,
      round(sum(valor_presente)::numeric, 0) as vp,
      round(sum(desagio)::numeric, 0) as desagio,
      min(valor_comissao)::float as min_com,
      max(valor_comissao)::float as max_com
    FROM operacoes
  `);
  console.log("totais:");
  console.table((totals as { rows?: unknown[] }).rows ?? totals);

  const byMonth = await db.execute(sql`
    SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') as mes, count(*)::int as n
    FROM operacoes
    GROUP BY date_trunc('month', created_at)
    ORDER BY mes
  `);
  console.log("por mês:");
  console.table((byMonth as { rows?: unknown[] }).rows ?? byMonth);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
