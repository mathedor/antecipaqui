import Link from "next/link";
import {
  getImpersonationStatus,
  stopImpersonation,
} from "@/lib/actions/admin-impersonate";

/** Server component — renderiza só se admin está impersonando alguém.
 *  Inserido no layout root pra aparecer em qualquer página. */
export async function ImpersonationBanner() {
  const status = await getImpersonationStatus();
  if (!status.active) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 border-b-2 border-amber-700 shadow">
      <div className="mx-auto max-w-7xl px-4 md:px-6 h-12 flex items-center justify-between gap-3 flex-wrap text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">👁</span>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-100 shrink-0">
            modo visão
          </span>
          <span className="font-semibold truncate">
            Visualizando como <strong>{status.targetNome ?? status.targetEmail}</strong>
            {status.targetContext && (
              <span className="font-normal opacity-80">
                {" "}— {status.targetContext}
              </span>
            )}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-900 text-amber-100 shrink-0">
            {status.targetRole}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin"
            className="text-xs font-semibold underline hover:no-underline"
          >
            painel admin →
          </Link>
          <form action={stopImpersonation}>
            <button
              type="submit"
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-amber-950 text-amber-100 hover:bg-amber-900 text-xs font-bold"
            >
              ✕ Voltar pro admin
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
