/**
 * CONSERTO PONTUAL — espelhos cujo externo_id virou o próprio CNPJ.
 *
 * O webhook de cadastro da OPERA manda o CNPJ mascarado no campo do ID
 * (visto em 02/09); antes da correção em lib/opera/aplicar.ts isso
 * sobrescrevia o id real do cliente na base deles. Aqui a gente devolve o id
 * verdadeiro, lido da consulta ao vivo — e nunca grava CNPJ como id.
 *
 * Enquanto a esteira do fundo transita, a consulta devolve id 0 — nesses
 * casos dá pra informar o id que o criar-cliente já devolveu:
 *
 *   npx tsx scripts/corrigir-externoid-cnpj.ts
 *   npx tsx scripts/corrigir-externoid-cnpj.ts --cnpj 45989123000135 --id 17029
 */
import { config } from "dotenv";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "/neondb?",
  "/antecipaqui_prod?",
);

/** Lê `--flag valor` da linha de comando. */
function arg(nome: string): string | null {
  const i = process.argv.indexOf(`--${nome}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  const cnpjArg = arg("cnpj")?.replace(/\D/g, "") ?? null;
  const idArg = arg("id");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { fundos, operaClientes } = await import("../src/db/schema");
  const { contratoDoFundo, operaFetch } = await import("../src/lib/opera/client");
  const { lerTexto } = await import("../src/lib/opera/contrato");

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.integracaoTipo, "opera"))
    .limit(1);
  if (!fundo) throw new Error("fundo opera não encontrado");
  const contrato = contratoDoFundo(fundo);

  const clientes = await db
    .select()
    .from(operaClientes)
    .where(eq(operaClientes.fundoId, fundo.id));

  for (const c of clientes) {
    const idAtual = String(c.externoId ?? "");
    if (!idAtual || idAtual.replace(/\D/g, "") !== c.cnpj) continue;

    const resp = await operaFetch(fundo, contrato.rotas.consultarCliente, {
      vars: { cnpj: c.cnpj },
      body: { parceiro: contrato.envio.parceiro, cnpj_cliente: c.cnpj },
    });
    const consultado = lerTexto(resp.data, contrato.leitura.clienteId);
    const idReal =
      consultado && consultado !== "0" && consultado.replace(/\D/g, "") !== c.cnpj
        ? consultado
        : cnpjArg === c.cnpj
          ? idArg
          : null;
    if (!idReal) {
      console.log(
        `${c.cnpj}: consulta não devolveu id real agora (esteira em trânsito) — deixando como está.`,
      );
      continue;
    }
    await db
      .update(operaClientes)
      .set({ externoId: idReal, updatedAt: new Date() })
      .where(eq(operaClientes.id, c.id));
    console.log(`${c.cnpj}: externoId ${idAtual} → ${idReal}`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
