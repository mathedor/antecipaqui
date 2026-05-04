"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type Option = {
  value: string;
  label: string;
  /** Texto auxiliar pequeno abaixo do label. */
  sub?: string;
};

type Props = {
  name?: string;
  required?: boolean;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
};

/**
 * Combobox com busca por texto (filtra labels + sub).
 * - mostra opção selecionada como botão
 * - ao focar, abre dropdown e foca um input de busca
 * - tecla seta cima/baixo navega; enter seleciona; esc fecha
 * - hidden input com `name` carrega o `value` no form submit
 */
export function SearchableSelect({
  name,
  required,
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  emptyLabel = "Nenhum resultado.",
}: Props) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sub ?? "").toLowerCase().includes(q),
    );
  }, [query, options]);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Foca input quando abre
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setHighlight(0);
    }
  }, [open]);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) handleSelect(opt.value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden input pra form submit */}
      <input type="hidden" name={name} value={value} required={required} />

      {/* Botão / display */}
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-left text-fg focus:border-accent outline-none transition-colors flex items-center justify-between gap-2"
      >
        <span
          className={`truncate ${selected ? "text-fg" : "text-fg-dim"}`}
        >
          {selected
            ? `${selected.label}${selected.sub ? ` · ${selected.sub}` : ""}`
            : placeholder}
        </span>
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
          className={`shrink-0 text-fg-dim transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-border bg-bg-elev shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border bg-bg-card">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={handleKey}
              placeholder="Digite pra buscar..."
              className="w-full h-10 rounded-lg bg-bg border border-border px-3 text-sm text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors"
            />
          </div>
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto"
            aria-labelledby={id}
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-sm text-fg-muted text-center">
                {emptyLabel}
              </li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => handleSelect(o.value)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                    i === highlight ? "bg-accent-soft" : "hover:bg-bg-card"
                  } ${o.value === value ? "border-l-2 border-accent" : ""}`}
                >
                  <div
                    className={`truncate ${o.value === value ? "font-semibold text-accent" : "text-fg"}`}
                  >
                    {o.label}
                  </div>
                  {o.sub && (
                    <div className="text-[11px] font-mono text-fg-dim truncate">
                      {o.sub}
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
