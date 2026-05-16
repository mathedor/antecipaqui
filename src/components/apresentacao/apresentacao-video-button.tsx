"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botão discreto que abre modal com vídeo MP4 fullscreen.
 * O vídeo só carrega quando o modal abre (preload=none).
 */
export function ApresentacaoVideoButton({
  src,
  label = "▶ Ver em 60s",
  className = "",
}: {
  src: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      videoRef.current?.play().catch(() => {});
    } else if (!open && d.open) {
      videoRef.current?.pause();
      d.close();
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/10 transition ${className}`}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // fecha quando clica no backdrop (fora do video)
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="bg-transparent p-0 backdrop:bg-black/90 backdrop:backdrop-blur-sm rounded-2xl m-auto"
      >
        <div className="relative w-[min(90vw,400px)] max-h-[90vh] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 z-10 size-9 rounded-full bg-black/60 text-white text-base font-bold flex items-center justify-center hover:bg-black/80 transition"
            aria-label="Fechar"
          >
            ×
          </button>
          {open && (
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            >
              Seu navegador não suporta vídeo HTML5.
            </video>
          )}
        </div>
      </dialog>
    </>
  );
}
