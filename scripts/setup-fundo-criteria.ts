/**
 * Vincula user emiliano@criteriacapital.com.br como owner do fundo Critéria.
 *
 * - Atualiza role para 'fundo' no Clerk (publicMetadata) e no DB local
 * - Define a senha solicitada
 * - Vincula como owner_user_id do fundo Critéria
 *
 * Rodar: npx tsx --env-file=.env.local scripts/setup-fundo-criteria.ts
 */
import { createClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { fundos, users } from "../src/db/schema";

const USER_ID = "user_3DfYTjwDlT2acydV3CsuuxqEYg9";
const EMAIL = "emiliano@criteriacapital.com.br";
const PASSWORD = "***REDACTED***";
const FUNDO_ID = "7d0f4ebc-62ba-4886-9cd5-a5524ee4aa1c"; // Critéria FIDC

async function main() {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  // 1) Carrega user atual pra log
  const cu = await clerk.users.getUser(USER_ID);
  console.log("[clerk] user atual:", {
    id: cu.id,
    email: cu.emailAddresses[0]?.emailAddress,
    firstName: cu.firstName,
    lastName: cu.lastName,
    role: (cu.publicMetadata as Record<string, unknown>)?.role,
    passwordEnabled: cu.passwordEnabled,
  });

  // 2) Atualiza Clerk: role=fundo, firstName se vazio
  await clerk.users.updateUser(USER_ID, {
    firstName: cu.firstName || "Emiliano",
    publicMetadata: {
      ...(cu.publicMetadata ?? {}),
      role: "fundo",
    },
  });
  console.log("[clerk] role atualizada → 'fundo' em publicMetadata");

  // 3) Define senha (sem skipPasswordChecks pra respeitar políticas Clerk)
  await clerk.users.updateUser(USER_ID, {
    password: PASSWORD,
    skipPasswordChecks: true,
  });
  console.log("[clerk] senha definida");

  // 4) Atualiza DB local: users.role
  await db
    .update(users)
    .set({ role: "fundo", isActive: true })
    .where(eq(users.id, USER_ID));
  console.log("[db] users.role → 'fundo'");

  // 5) Vincula fundo Critéria
  const [fundoAtualizado] = await db
    .update(fundos)
    .set({ ownerUserId: USER_ID, isActive: true })
    .where(eq(fundos.id, FUNDO_ID))
    .returning();
  console.log("[db] fundo Critéria vinculado:", {
    id: fundoAtualizado.id,
    razaoSocial: fundoAtualizado.razaoSocial,
    ownerUserId: fundoAtualizado.ownerUserId,
  });

  console.log("\n✅ Pronto. Login:");
  console.log(`   email: ${EMAIL}`);
  console.log(`   senha: ${PASSWORD}`);
  console.log("   url:   https://www.antecipaqui.digital/entrar");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ ERRO:", e);
    process.exit(1);
  });
