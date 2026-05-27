"use client";

import { useEffect } from "react";

/**
 * No mobile, tabelas com a classe `table-cards` viram cards (uma linha = um
 * card). Este componente só preenche `data-label` em cada <td> a partir do
 * <th> correspondente — o visual de card está no globals.css (@media mobile).
 *
 * Usa MutationObserver porque algumas tabelas são preenchidas/atualizadas
 * depois do render. Renderiza `null`; basta montar uma vez no layout.
 */
export function TableCards() {
  useEffect(() => {
    const SEL = "table.table-cards";

    function label(table: Element) {
      const heads = table.querySelectorAll(
        "thead tr:first-child th, thead tr:first-child td",
      );
      if (!heads.length) return;
      const labels = Array.from(heads).map((h) =>
        (h.textContent || "").replace(/\s+/g, " ").trim(),
      );
      table.querySelectorAll("tbody > tr").forEach((tr) => {
        let ci = 0;
        Array.from(tr.children).forEach((cell) => {
          if (cell.tagName !== "TD") return;
          const span = parseInt(cell.getAttribute("colspan") || "1", 10) || 1;
          if (span < labels.length && !cell.hasAttribute("data-label")) {
            cell.setAttribute("data-label", labels[ci] ?? "");
          }
          ci += span;
        });
      });
    }

    function scan(root: ParentNode = document) {
      root.querySelectorAll(SEL).forEach(label);
    }

    scan();

    const obs = new MutationObserver((muts) => {
      const set = new Set<Element>();
      muts.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          const t = n.closest(SEL);
          if (t) set.add(t);
          n.querySelectorAll?.(SEL).forEach((tt) => set.add(tt));
        }),
      );
      set.forEach(label);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return null;
}
