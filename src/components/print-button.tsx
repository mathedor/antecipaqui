"use client";

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-ghost !h-10 !px-4 print:hidden"
    >
      {children}
    </button>
  );
}
