/** Frames CSS pra mostrar telas do sistema na apresentação.
 *  Mobile: simula iPhone (notch, status bar). Desktop: simula janela macOS. */

import type { ReactNode } from "react";

export function MobileFrame({
  children,
  label,
  tilt = 0,
}: {
  children: ReactNode;
  label?: string;
  tilt?: number;
}) {
  const tiltStyle =
    tilt !== 0
      ? { transform: `rotate(${tilt}deg)`, transformOrigin: "center center" }
      : undefined;
  return (
    <div className="flex flex-col items-center gap-3" style={tiltStyle}>
      <div className="relative w-[280px] h-[570px] rounded-[44px] bg-[#0a0e1a] p-[10px] shadow-2xl ring-1 ring-black/30">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[110px] h-[28px] rounded-full bg-[#0a0e1a] z-20" />
        {/* Screen */}
        <div className="relative w-full h-full rounded-[36px] bg-white overflow-hidden">
          {/* Status bar */}
          <div className="absolute top-0 left-0 right-0 h-7 px-7 flex items-center justify-between text-[11px] font-semibold text-black z-10 pt-1">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <span>●●●</span>
              <span>📶</span>
              <span className="border border-black/60 rounded-sm w-5 h-2.5 relative">
                <span className="absolute inset-0.5 bg-black rounded-[1px]" />
              </span>
            </div>
          </div>
          {/* Content */}
          <div className="absolute inset-0 pt-8 overflow-hidden">{children}</div>
        </div>
      </div>
      {label && (
        <div className="text-xs text-fg-muted text-center max-w-[260px] font-mono">
          {label}
        </div>
      )}
    </div>
  );
}

export function DesktopFrame({
  children,
  label,
  url = "antecipaqui.digital/painel",
}: {
  children: ReactNode;
  label?: string;
  url?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full max-w-[760px] rounded-2xl bg-[#0f172a] shadow-2xl overflow-hidden ring-1 ring-black/20">
        {/* Title bar */}
        <div className="h-9 px-4 flex items-center gap-2 bg-[#1e293b] border-b border-black/20">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-[#334155] rounded-md px-3 py-1 text-[11px] text-slate-300 font-mono max-w-[280px] truncate">
              🔒 {url}
            </div>
          </div>
        </div>
        {/* Window content */}
        <div className="bg-[#f8fafc] aspect-[16/10] overflow-hidden">
          {children}
        </div>
      </div>
      {label && (
        <div className="text-xs text-fg-muted text-center max-w-[640px]">
          {label}
        </div>
      )}
    </div>
  );
}
