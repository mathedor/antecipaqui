import Link from "next/link";

/**
 * Conjunto de ícones de ação pra rows da listagem admin.
 * - Visualizar (olho) → detalhe
 * - Editar (lápis) → form de edição
 *
 * Pra cobrar documentação use <AdminCobrarButton variant="icon" /> à parte
 * (precisa ser client por causa do confirm/transition).
 */
export function AdminRowActions({
  viewHref,
  editHref,
  children,
}: {
  viewHref?: string;
  editHref?: string;
  /** Slot pra ações extras (ex: AdminCobrarButton) */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 justify-end">
      {viewHref && (
        <Link
          href={viewHref}
          title="Visualizar"
          aria-label="Visualizar"
          className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-accent hover:text-accent transition-colors"
        >
          <EyeIcon />
        </Link>
      )}
      {editHref && (
        <Link
          href={editHref}
          title="Editar"
          aria-label="Editar"
          className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-accent hover:text-accent transition-colors"
        >
          <PencilIcon />
        </Link>
      )}
      {children}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}
