/** Checagem read-only do estado do schema de grupo econômico. */
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = await sql`SELECT current_database() AS db`;
  const cnt = await sql`SELECT count(*)::int AS n FROM imobiliarias`;
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'imobiliarias'
      AND column_name IN ('matriz_id','possui_filiais','apelido','opera_em_nome_da_matriz','is_active')
    ORDER BY column_name`;
  console.log("banco:", db[0].db, "| imobiliarias:", cnt[0].n);
  console.log("colunas de grupo:", cols.map((c: Record<string, string>) => c.column_name));
}
main().then(() => process.exit(0)).catch((e) => { console.error("erro:", e.message); process.exit(1); });
