"use client";

export function PrintButton({
  label = "📄 Baixar PDF",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ||
        "h-11 px-5 rounded-xl bg-white text-[#1c6dd0] font-semibold text-sm border border-white/40 hover:bg-blue-50 transition"
      }
    >
      {label}
    </button>
  );
}
