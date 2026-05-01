import Link from "next/link";

export function EditarDadosLink() {
  return (
    <Link
      href="/painel/perfil"
      title="Editar dados do meu cadastro"
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-bg-elev text-fg-muted hover:border-accent hover:text-accent text-xs font-semibold transition-colors"
    >
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
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
      Editar dados
    </Link>
  );
}
