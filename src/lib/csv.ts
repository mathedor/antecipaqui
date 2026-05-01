/**
 * CSV export helper — client-side.
 * Gera um arquivo CSV a partir de headers + rows e dispara download
 * via blob + anchor click (sem dependência externa).
 */

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Escape apenas se tiver vírgula, aspas, quebra de linha
  if (/[",\r\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadCSV(args: {
  filename: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
}) {
  const { filename, headers, rows } = args;
  const lines = [
    headers.map(escapeCSV).join(";"),
    ...rows.map((row) => row.map(escapeCSV).join(";")),
  ];
  // BOM pra abrir certo no Excel BR
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
