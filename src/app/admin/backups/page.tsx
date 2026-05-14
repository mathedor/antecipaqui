import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";

export const metadata = { title: "Admin · Backups & exports" };

export default async function BackupsPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="/admin/backups" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">backups e exports</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Backups</span> & exports
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Export JSON consolidado de operações (com parcelas, custos,
          compradores). Útil pra contabilidade externa, auditoria e backup
          off-platform.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-bg-elev p-6 mb-6">
        <h2 className="font-bold mb-2">Export JSON sob demanda</h2>
        <p className="text-sm text-fg-muted mb-4">
          Filtre por período (data da venda) e baixe um JSON com todas as
          operações que batem nos filtros.
        </p>
        <form
          method="get"
          action="/api/admin/export-json"
          className="grid sm:grid-cols-3 gap-3 items-end"
        >
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              De
            </label>
            <input type="date" name="from" className="form-input" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Até
            </label>
            <input type="date" name="to" className="form-input" />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
          >
            📥 Baixar JSON
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-6">
        <h2 className="font-bold mb-2">Backup automático diário</h2>
        <p className="text-sm text-fg-muted mb-3">
          Roda automaticamente todo dia às <strong>03:00 UTC</strong> via
          cron Vercel. Salva o JSON completo de todas as operações no Vercel
          Blob (privado) com nome timestampado:{" "}
          <code className="font-mono">
            backups/antecipaqui_YYYYMMDDHHmmss.json
          </code>
          .
        </p>
        <ul className="text-xs text-fg-muted space-y-1 mb-4">
          <li>
            • Retenção é manual — antigos podem ser apagados via Vercel Blob
            dashboard.
          </li>
          <li>
            • Pra disparar agora manualmente, faça GET em{" "}
            <code className="font-mono">/api/cron/backup-diario</code> com
            header <code className="font-mono">x-cron-secret</code>.
          </li>
          <li>
            • Endpoint exige <code className="font-mono">CRON_SECRET</code> +{" "}
            <code className="font-mono">BLOB_READ_WRITE_TOKEN</code> no env.
          </li>
        </ul>
      </section>
    </AdminShell>
  );
}
