"use client";

import { useEffect, useRef, ReactNode, createElement } from "react";

type AsTag = "div" | "section" | "ul" | "ol" | "li" | "article" | "header" | "footer" | "main" | "aside" | "nav";

type Props = {
  children: ReactNode;
  as?: AsTag;
  className?: string;
  stagger?: boolean;
  threshold?: number;
};

export function Reveal({
  children,
  as = "div",
  className = "",
  stagger = false,
  threshold = 0.18,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if ("IntersectionObserver" in window === false) {
      el.classList.add("is-visible");
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            obs.unobserve(el);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const cls = `reveal ${stagger ? "reveal-stagger" : ""} ${className}`.trim();

  return createElement(as, { ref, className: cls }, children);
}
