import { NextResponse } from "next/server";

/**
 * Endpoint público pra confirmar qual git SHA está deployado.
 * Útil pra debugar "deploy ainda não pegou" — comparar com `git log --oneline`
 * local mostra se o commit atual está em produção.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // Público de propósito (comparar deploy). Só o SHA — nada de fingerprint de
  // infraestrutura (remetente de e-mail, integrações, branch). O estado das
  // integrações vive no painel autenticado /admin/seguranca.
  return NextResponse.json({
    sha: process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    env: process.env.VERCEL_ENV ?? null,
  });
}
