/** Smoke test das tools do Cícero contra o banco (read-only exceto nada).
 *  Rodar: npx tsx --env-file=.env.local scripts/test-cicero.ts */
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { buildCiceroCtx, ciceroRunTool } from "../src/lib/cicero";

const PLANO: Record<string, [string, Record<string, unknown>][]> = {
  admin: [
    ["resumo_plataforma", {}],
    ["faturamento_dia", {}],
    ["inadimplencia", {}],
    ["desempenho_fundos", {}],
    ["listar_operacoes", { limite: 3 }],
  ],
  fundo: [
    ["faturamento_dia", {}],
    ["inadimplencia", {}],
    ["listar_operacoes", { limite: 3 }],
    ["disparar_cobranca_email", { confirmar: false }],
  ],
  construtora: [
    ["proximos_vencimentos", { dias: 60 }],
    ["dados_pagamento", {}],
  ],
  imobiliaria: [
    ["listar_operacoes", { limite: 3 }],
    ["proximos_vencimentos", {}],
    ["calcular_operacao", { valor_comissao: 100000, prazos_dias: [30, 60, 90] }],
    ["preparar_cadastro_operacao", { valor_venda: 500000, valor_comissao: 25000, numero_parcelas: 3 }],
  ],
  corretor: [["listar_operacoes", { limite: 3 }]],
};

async function main() {
  for (const [role, testes] of Object.entries(PLANO)) {
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.role, role as "admin"))
      .limit(1);
    if (!u) {
      console.log(`\n===== ${role}: SEM USUÁRIO NO BANCO =====`);
      continue;
    }
    console.log(`\n===== ${role} (${u.email}) =====`);
    const ctx = await buildCiceroCtx(u);
    for (const [tool, args] of testes) {
      try {
        const r = await ciceroRunTool(ctx, tool, args);
        console.log(`\n--- ${tool} ---\n${r.texto.slice(0, 500)}`);
      } catch (e) {
        console.log(`\n--- ${tool} --- ❌ ERRO: ${e}`);
        process.exitCode = 1;
      }
    }
  }
  process.exit(process.exitCode ?? 0);
}
main();
