"use client";

import { useEffect, useRef, ReactNode, Children, isValidElement } from "react";

type Props = {
  children: ReactNode;
  delayMs?: number;
  threshold?: number;
  className?: string;
};

function flatten(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return flatten(node.props.children);
  return "";
}

function splitWords(node: ReactNode, base: string[] = []): { text: string; styled: boolean }[] {
  const out: { text: string; styled: boolean }[] = [];
  Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      String(child)
        .split(/(\s+)/)
        .forEach((part) => {
          if (part === "") return;
          out.push({ text: part, styled: base.length > 0 });
        });
    } else if (isValidElement<{ children?: ReactNode; className?: string }>(child)) {
      const inner = flatten(child.props.children);
      inner.split(/(\s+)/).forEach((part) => {
        if (part === "") return;
        out.push({ text: part, styled: true });
      });
    }
  });
  return out;
}

/**
 * TextReveal — splits children into words and reveals them with stagger
 * once the heading scrolls into view.
 *
 * For mixed content (e.g. <span className="text-gradient-amber">…</span>) we
 * flatten into plain words and rely on CSS for any color highlighting via
 * a `data-highlight` attribute when the parent had a className.
 */
export function TextReveal({
  children,
  delayMs = 0,
  threshold = 0.2,
  className = "",
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ("IntersectionObserver" in window === false) {
      el.classList.add("is-revealed");
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            el.classList.add("is-revealed");
            obs.unobserve(el);
          }
        });
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  // Build word array preserving any styled (highlighted) sections
  const wordsBuckets: { text: string; styled: boolean }[] = [];

  Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      String(child)
        .split(/(\s+)/)
        .forEach((part) => {
          if (part === "") return;
          wordsBuckets.push({ text: part, styled: false });
        });
    } else if (isValidElement<{ children?: ReactNode; className?: string }>(child)) {
      const cls = child.props.className ?? "";
      flatten(child.props.children)
        .split(/(\s+)/)
        .forEach((part) => {
          if (part === "") return;
          wordsBuckets.push({ text: part, styled: !!cls });
        });
    }
  });

  return (
    <span
      ref={ref}
      className={`text-reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delayMs}ms` }}
    >
      {wordsBuckets.map((w, i) => {
        if (/^\s+$/.test(w.text)) return <span key={i}>{w.text}</span>;
        return (
          <span
            key={i}
            className={`word ${w.styled ? "text-gradient-amber" : ""}`}
            style={{ ["--i" as string]: i }}
          >
            {w.text}
          </span>
        );
      })}
    </span>
  );
}
