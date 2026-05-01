"use client";

import { downloadCSV } from "@/lib/csv";

type Props = {
  filename: string;
  headers: string[];
  /** Função pra extrair a row do dado original (pra evitar passar tudo). */
  getRows: () => (string | number | boolean | null | undefined)[][];
  /** Label opcional. */
  label?: string;
};

export function ExportCsvButton({
  filename,
  headers,
  getRows,
  label = "Export CSV",
}: Props) {
  function handleClick() {
    const rows = getRows();
    if (rows.length === 0) return;
    downloadCSV({ filename, headers, rows });
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-bg-elev text-fg-muted hover:border-accent hover:text-accent text-xs font-semibold transition-colors"
      title="Baixar resultado atual como CSV"
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
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {label}
    </button>
  );
}
