"use client";

import { useState } from "react";

export function ApiEndpointCard({
  method,
  path,
  desc,
  example,
}: {
  method: "GET" | "POST";
  path: string;
  desc: string;
  example: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(example);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
            method === "GET"
              ? "bg-blue-100 text-accent"
              : "bg-yellow-100 text-warn"
          }`}
        >
          {method}
        </span>
        <code className="font-mono text-sm text-fg">{path}</code>
        <button
          type="button"
          onClick={copiar}
          className="ml-auto text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-border text-fg-muted hover:border-accent hover:text-accent"
        >
          {copied ? "✓ copiado" : "📋 copiar curl"}
        </button>
      </div>
      <p className="text-xs text-fg-muted mb-2">{desc}</p>
      <pre className="rounded-lg bg-bg-soft border border-border-strong p-3 text-[11px] font-mono text-fg overflow-x-auto whitespace-pre">
        {example}
      </pre>
    </div>
  );
}
