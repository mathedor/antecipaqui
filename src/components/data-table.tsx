"use client";

import { useMemo, useState } from "react";

export type DataTableColumn<T> = {
  /** Identificador único da coluna (usado pra controlar sort). */
  key: string;
  /** Cabeçalho. */
  header: React.ReactNode;
  /** Alinhamento do conteúdo (default: left). */
  align?: "left" | "right" | "center";
  /** Se true, header é clicável e ordena. Use sortValue pra extrair valor numérico/string. */
  sortable?: boolean;
  /** Valor numérico ou string usado pra ordenação. Default: o que `render` retornar (se string/number). */
  sortValue?: (row: T) => number | string | boolean | null | undefined;
  /** Render da célula. */
  render: (row: T, index: number) => React.ReactNode;
  /** Conteúdo do tfoot. Pode ser:
   *  - função (rows) => ReactNode (totais customizados)
   *  - "sum:NOMEDOCAMPO" — pega o valor numérico via sortValue e soma, formatador externo
   *  - undefined — sem footer pra essa coluna (mostra "—")
   */
  footer?: (rows: T[]) => React.ReactNode;
  /** Classes extras. */
  className?: string;
  /** Esconde em mobile (md:). */
  hideOnMobile?: boolean;
  /** Min-width em px da coluna (pra colunas com conteúdo longo). */
  minWidth?: number;
};

type Props<T> = {
  rows: T[];
  columns: DataTableColumn<T>[];
  /** Função pra extrair key única de cada row. */
  getKey: (row: T) => string;
  /** Coluna inicial pra ordenar. */
  initialSort?: { key: string; dir: "asc" | "desc" };
  /** Mensagem quando sem dados. */
  emptyLabel?: React.ReactNode;
  /** Min-width total da tabela (px). Default 760. */
  minWidth?: number;
  /** Mostra footer com totais? Default: true se algum coluna tiver footer. */
  showFooter?: boolean;
  /** Classe extra do wrapper. */
  className?: string;
  /** Render de linha customizado (envolve o conteúdo). Útil pra tornar a row clicável. */
  rowHref?: (row: T) => string | null;
  /** Conteúdo da última coluna por linha (sem header). Útil pra ações. */
  rowActions?: (row: T) => React.ReactNode;
  /** Header da coluna de ações. */
  actionsHeader?: React.ReactNode;
};

export function DataTable<T>({
  rows,
  columns,
  getKey,
  initialSort,
  emptyLabel = "Nenhum resultado.",
  minWidth = 760,
  showFooter,
  className = "",
  rowHref,
  rowActions,
  actionsHeader,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(
    initialSort?.key ?? null,
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    initialSort?.dir ?? "desc",
  );

  function handleSort(col: DataTableColumn<T>) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      // numérico: default desc; string: default asc
      const sample = rows[0];
      const v = sample && col.sortValue ? col.sortValue(sample) : null;
      setSortDir(typeof v === "number" || typeof v === "boolean" ? "desc" : "asc");
    }
  }

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.sortable) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : null;
      const bv = col.sortValue ? col.sortValue(b) : null;
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else if (typeof av === "boolean" && typeof bv === "boolean")
        cmp = av === bv ? 0 : av ? 1 : -1;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""), "pt-BR");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
        <p className="text-fg-muted">{emptyLabel}</p>
      </div>
    );
  }

  const hasFooter = showFooter ?? columns.some((c) => c.footer);

  const mobileCols = columns.filter((c) => !c.hideOnMobile);
  const footerCols = columns.filter((c) => c.footer);

  return (
    <>
      {/* Desktop: tabela */}
      <div
        className={`hidden lg:block rounded-2xl border border-border bg-bg-elev overflow-x-auto ${className}`}
      >
      <table className="w-full text-sm" style={{ minWidth: `${minWidth}px` }}>
        <thead className="bg-bg-card border-b border-border">
          <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
            {columns.map((col) => (
              <Th
                key={col.key}
                col={col}
                active={sortKey === col.key}
                dir={sortDir}
                onSort={() => handleSort(col)}
              />
            ))}
            {rowActions && (
              <th className="px-3 md:px-4 py-3 text-right whitespace-nowrap">
                {actionsHeader ?? "Ações"}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr
              key={getKey(row)}
              className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 md:px-4 py-3 ${alignClass(col.align)} ${
                    col.hideOnMobile ? "hidden md:table-cell" : ""
                  } ${col.className ?? ""}`}
                  style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                >
                  {col.render(row, i)}
                </td>
              ))}
              {rowActions && (
                <td className="px-3 md:px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {rowActions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {hasFooter && (
          <tfoot>
            <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              {columns.map((col, i) => (
                <td
                  key={col.key}
                  className={`px-3 md:px-4 py-3 ${alignClass(col.align)} ${
                    col.hideOnMobile ? "hidden md:table-cell" : ""
                  }`}
                >
                  {i === 0 && !col.footer ? (
                    <span className="text-fg-muted">Totais</span>
                  ) : col.footer ? (
                    <span className="text-fg font-bold">
                      {col.footer(sortedRows)}
                    </span>
                  ) : null}
                </td>
              ))}
              {rowActions && <td className="px-3 md:px-4 py-3" />}
            </tr>
          </tfoot>
        )}
      </table>
      </div>

      {/* Mobile: cards */}
      <div className={`lg:hidden space-y-3 ${className}`}>
        {sortedRows.map((row, i) => {
          const href = rowHref?.(row) ?? null;
          const fields = (
            <div className="space-y-1.5">
              {mobileCols.map((col) => (
                <div
                  key={col.key}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    {col.header}
                  </span>
                  <span
                    className={`min-w-0 text-sm text-fg ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {col.render(row, i)}
                  </span>
                </div>
              ))}
            </div>
          );
          return (
            <div
              key={getKey(row)}
              className="rounded-2xl border border-border bg-bg-elev p-4"
            >
              {href ? (
                <a href={href} className="block">
                  {fields}
                </a>
              ) : (
                fields
              )}
              {rowActions && (
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 [&>*]:flex-1">
                  {rowActions(row)}
                </div>
              )}
            </div>
          );
        })}
        {hasFooter && footerCols.length > 0 && (
          <div className="space-y-1.5 rounded-2xl border border-border-strong bg-bg-card p-4 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            {footerCols.map((col) => (
              <div
                key={col.key}
                className="flex items-center justify-between gap-3"
              >
                <span>{col.header}</span>
                <span className="font-bold text-fg">
                  {col.footer!(sortedRows)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function alignClass(align: DataTableColumn<unknown>["align"]) {
  return align === "right"
    ? "text-right"
    : align === "center"
      ? "text-center"
      : "text-left";
}

function Th<T>({
  col,
  active,
  dir,
  onSort,
}: {
  col: DataTableColumn<T>;
  active: boolean;
  dir: "asc" | "desc";
  onSort: () => void;
}) {
  const align = alignClass(col.align);
  const hide = col.hideOnMobile ? "hidden md:table-cell" : "";
  if (!col.sortable) {
    return (
      <th
        className={`px-3 md:px-4 py-3 ${align} ${hide} whitespace-nowrap`}
        style={col.minWidth ? { minWidth: col.minWidth } : undefined}
      >
        {col.header}
      </th>
    );
  }
  return (
    <th
      onClick={onSort}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort();
        }
      }}
      className={`px-3 md:px-4 py-3 ${align} ${hide} whitespace-nowrap cursor-pointer select-none hover:text-fg transition-colors`}
      style={col.minWidth ? { minWidth: col.minWidth } : undefined}
    >
      <span
        className={`inline-flex items-center gap-1 ${
          col.align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-fg" : ""}`}
      >
        {col.header}
        <span
          className={`text-[8px] leading-none transition-opacity ${
            active ? "opacity-100" : "opacity-30"
          }`}
          aria-hidden
        >
          {active ? (dir === "desc" ? "▼" : "▲") : "▼"}
        </span>
      </span>
    </th>
  );
}

/** Helper pra somar números. Use em column.footer. */
export function sumBy<T>(
  rows: T[],
  pick: (row: T) => number,
  format: (n: number) => string,
) {
  const total = rows.reduce((s, r) => s + (pick(r) || 0), 0);
  return format(total);
}

/** Helper pra contar. Use em column.footer. */
export function countOf<T>(rows: T[], suffix?: string) {
  return suffix ? `${rows.length} ${suffix}` : String(rows.length);
}
