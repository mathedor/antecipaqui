import { NextResponse } from "next/server";

/**
 * Endpoint público pra confirmar qual git SHA está deployado.
 * Útil pra debugar "deploy ainda não pegou" — comparar com `git log --oneline`
 * local mostra se o commit atual está em produção.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    sha: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelGitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    vercelGitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    deployedAt: process.env.VERCEL_GIT_COMMIT_AUTHOR_DATE ?? null,
    blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    resendConfigured: !!process.env.RESEND_API_KEY,
    resendFrom: process.env.RESEND_FROM ?? null,
    zapsignConfigured: !!process.env.ZAPSIGN_API_TOKEN,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  });
}
