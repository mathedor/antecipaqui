/**
 * Seed do fundo Critéria — primeiro fundo cadastrado.
 * Usa os dados do CESSIONARIA do contrato atual + override de razão social.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) npx tsx scripts/seed-fundo-criteria.ts
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { fundos } from "../src/db/schema";

const CRITERIA = {
  razaoSocial: "Critéria sociedade de credito LTDA",
  nomeFantasia: "Critéria FIDC",
  // Mantém formato com máscara — mesmo formato usado nas operações
  cnpj: "32708702000110",
  cep: "05676-120".replace(/\D/g, ""),
  endereco: "Avenida Magalhães de Castro, 4.800, Conjunto 105 — Jardim Panorama",
  cidade: "São Paulo",
  uf: "SP",
  contatoResponsavel: "Emiliano",
  telefone: "11972049004",
  emailComercial: "emiliano@criteriacapital.com.br",
  emailAssinatura: "emiliano@criteriacapital.com.br",
  // Contrato: usa o gerador dinâmico (contract-pdf.tsx) — não tem PDF modelo estático
  contratoUrl: null,
  contratoNome: "Contrato dinâmico (gerado por operação via contract-pdf.tsx)",
  // Taxa-base atual do sistema (system_settings) — 6% a.m.
  taxaMensalBase: "0.0600",
};

async function main() {
  console.log("🌱 Cadastrando fundo Critéria...");

  const existing = await db
    .select()
    .from(fundos)
    .where(eq(fundos.cnpj, CRITERIA.cnpj))
    .limit(1);

  if (existing[0]) {
    console.log(`✓ Fundo já cadastrado (id: ${existing[0].id}). Atualizando dados...`);
    await db
      .update(fundos)
      .set({ ...CRITERIA, updatedAt: new Date() })
      .where(eq(fundos.id, existing[0].id));
    console.log(`✓ Atualizado. ID: ${existing[0].id}`);
  } else {
    const [created] = await db.insert(fundos).values(CRITERIA).returning();
    console.log(`✓ Criado. ID: ${created.id}`);
  }

  console.log("\nDados cadastrados:");
  console.log("  • Razão social: " + CRITERIA.razaoSocial);
  console.log("  • Nome fantasia: " + CRITERIA.nomeFantasia);
  console.log("  • CNPJ: " + CRITERIA.cnpj);
  console.log("  • Email: " + CRITERIA.emailComercial);
  console.log(
    "  • Taxa base: " +
      (parseFloat(CRITERIA.taxaMensalBase) * 100).toFixed(2) +
      "% a.m.",
  );
  console.log(
    "  • Contrato: " + CRITERIA.contratoNome,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  });
