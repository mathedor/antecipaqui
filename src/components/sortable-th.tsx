"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** Chave da coluna — vai pra query string `?sort=key`. */
  field: string;
  children: React.ReactNode;
  /** Tipo de alinhamento */
  align?: "left" | "right" | "center";
  /** Classes adicionais */
  className?: string;
};

/**
 * Header clicável que alterna sort: asc → desc → off.
 * Lê `?sort=campo&dir=asc|desc` da URL atual e atualiza ao clicar.
 *
 * Use dentro de uma <thead><tr>. A página deve ler os params no server
 * e aplicar orderBy na query.
 */
export function SortableTh({
  field,
  children,
  align = "left",
  className = "",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const currentField = params.get("sort");
  const currentDir = params.get("dir") === "asc" ? "asc" : "desc";
  const active = currentField === field;

  function handleClick() {
    const qs = new URLSearchParams(params.toString());
    if (!active) {
      // Primeira vez clicando nessa coluna → desc
      qs.set("sort", field);
      qs.set("dir", "desc");
    } else if (currentDir === "desc") {
      qs.set("sort", field);
      qs.set("dir", "asc");
    } else {
      // Estava asc → remove o sort
      qs.delete("sort");
      qs.delete("dir");
    }
    const query = qs.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  const alignCls =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <th
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`px-3 md:px-4 py-3 ${alignCls} whitespace-nowrap select-none cursor-pointer hover:text-fg transition-colors ${className}`}
    >
      <span
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-fg" : ""}`}
      >
        {children}
        <span
          className={`text-[8px] leading-none transition-opacity ${
            active ? "opacity-100" : "opacity-30"
          }`}
          aria-hidden
        >
          {active ? (currentDir === "desc" ? "▼" : "▲") : "▼"}
        </span>
      </span>
    </th>
  );
}

/**
 * Helper pra ler sort da searchParams server-side.
 * Retorna { sort, dir } com defaults.
 */
export function parseSortParams(
  params: { sort?: string; dir?: string },
  fallback: { sort: string; dir: "asc" | "desc" } = {
    sort: "createdAt",
    dir: "desc",
  },
) {
  const sort = params.sort || fallback.sort;
  const dir = params.dir === "asc" ? "asc" : "desc";
  return { sort, dir: params.dir ? dir : fallback.dir };
}
