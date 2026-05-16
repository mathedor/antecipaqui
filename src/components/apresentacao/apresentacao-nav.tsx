"use client";

import { useEffect, useState } from "react";

type NavItem = { href: string; label: string };

/**
 * Top nav sticky com âncoras pras seções da landing.
 * Destaca o item ativo conforme o scroll passa pelas seções.
 */
export function ApresentacaoNav({
  brand,
  items,
  ctaLabel = "Cadastrar",
  ctaHref = "/cadastre-se",
}: {
  brand: string;
  items: NavItem[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const [active, setActive] = useState<string>(items[0]?.href ?? "");

  useEffect(() => {
    const ids = items
      .map((i) => i.href.replace(/^#/, ""))
      .filter((id) => id.length > 0);
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pega a seção mais visível com top mais próximo do header
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          )[0];
        if (visible) {
          setActive(`#${visible.target.id}`);
        }
      },
      {
        rootMargin: "-80px 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [items]);

  const onClick = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) {
      const top =
        el.getBoundingClientRect().top + window.scrollY - 72; // compensa header
      window.scrollTo({ top, behavior: "smooth" });
      setActive(href);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-[#0a0e1a]/85 backdrop-blur-xl border-b border-white/10 no-print">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center gap-3 md:gap-6">
        <a
          href="#topo"
          onClick={onClick("#topo")}
          className="font-mono text-[11px] md:text-xs uppercase tracking-[0.25em] text-blue-200 font-bold whitespace-nowrap"
        >
          {brand}
        </a>
        <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {items.map((item) => {
            const isActive = active === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={onClick(item.href)}
                className={`px-2.5 md:px-3 h-9 inline-flex items-center text-[12px] md:text-sm font-medium rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? "text-white bg-white/10"
                    : "text-blue-100/70 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <a
          href={ctaHref}
          className="hidden md:inline-flex h-9 px-4 rounded-lg bg-white text-[#0a0e1a] font-bold text-xs items-center hover:bg-blue-50 transition whitespace-nowrap"
        >
          {ctaLabel} →
        </a>
      </div>
    </div>
  );
}
