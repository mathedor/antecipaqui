"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Scene = {
  id: string;
  /** Duração em segundos. */
  duration: number;
  /** Eyebrow curto no topo (ex: "cena 3 · CRM"). */
  eyebrow?: string;
  /** Título grande da cena. */
  titulo: string;
  /** Subtítulo / 1 linha de copy. */
  legenda?: string;
  /** Conteúdo principal — geralmente um mockup ou ilustração. */
  conteudo: ReactNode;
  /** Transição de entrada do conteúdo (default: 'fade-up'). */
  transicao?: "fade-up" | "fade-zoom" | "slide-left" | "slide-right" | "fade";
  /** Cor de fundo da cena (CSS color ou Tailwind class). */
  fundo?: string;
  /** Quando true, texto fica em cima do mockup (overlay). Default: lado-a-lado. */
  overlay?: boolean;
};

/**
 * Player cinematográfico — cenas que trocam automaticamente com transições suaves.
 * Controles: pause/play, seek pela barra, setas pra cena anterior/próxima.
 *
 * Cada cena define sua duração; o player avança automaticamente ao fim.
 * Loop opcional volta pro início depois da última cena.
 */
export function PresentationPlayer({
  scenes,
  loop = false,
  className = "",
}: {
  scenes: Scene[];
  loop?: boolean;
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [elapsedInScene, setElapsedInScene] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const cur = scenes[currentIndex];
  const totalDuration = scenes.reduce((s, sc) => s + sc.duration, 0);
  const elapsedTotal =
    scenes.slice(0, currentIndex).reduce((s, sc) => s + sc.duration, 0) +
    elapsedInScene;

  const advance = useCallback(() => {
    if (currentIndex < scenes.length - 1) {
      setCurrentIndex((i) => i + 1);
      setElapsedInScene(0);
    } else if (loop) {
      setCurrentIndex(0);
      setElapsedInScene(0);
    } else {
      setIsPlaying(false);
    }
  }, [currentIndex, scenes.length, loop]);

  // Loop de animação — incrementa elapsedInScene em tempo real
  useEffect(() => {
    if (!isPlaying) return;
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setElapsedInScene((e) => {
        const next = e + dt;
        if (next >= cur.duration) {
          // Avança fora desse setState pra não bagunçar render
          queueMicrotask(advance);
          return cur.duration;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, currentIndex, cur.duration, advance]);

  const togglePlay = () => {
    if (!isPlaying && currentIndex === scenes.length - 1 && !loop) {
      // No fim — replay
      setCurrentIndex(0);
      setElapsedInScene(0);
    }
    setIsPlaying((p) => !p);
  };

  const goPrev = () => {
    setElapsedInScene(0);
    setCurrentIndex((i) => Math.max(0, i - 1));
    setIsPlaying(true);
  };

  const goNext = () => {
    setElapsedInScene(0);
    setCurrentIndex((i) => Math.min(scenes.length - 1, i + 1));
    setIsPlaying(true);
  };

  const seekTo = (totalSeconds: number) => {
    let acc = 0;
    for (let i = 0; i < scenes.length; i++) {
      if (acc + scenes[i].duration > totalSeconds) {
        setCurrentIndex(i);
        setElapsedInScene(totalSeconds - acc);
        return;
      }
      acc += scenes[i].duration;
    }
    setCurrentIndex(scenes.length - 1);
    setElapsedInScene(scenes[scenes.length - 1].duration);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seekTo(Math.max(0, Math.min(1, pct)) * totalDuration);
  };

  // Mapping transição → CSS classes (entrada da cena)
  const transitionClass = (() => {
    switch (cur.transicao ?? "fade-up") {
      case "fade-zoom":
        return "animate-scene-fade-zoom";
      case "slide-left":
        return "animate-scene-slide-left";
      case "slide-right":
        return "animate-scene-slide-right";
      case "fade":
        return "animate-scene-fade";
      default:
        return "animate-scene-fade-up";
    }
  })();

  return (
    <div
      className={`relative w-full rounded-3xl border border-border bg-bg overflow-hidden shadow-2xl ${className}`}
      style={{ aspectRatio: "16 / 10" }}
    >
      {/* Background da cena */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ background: cur.fundo ?? "linear-gradient(180deg, #0a0e1a 0%, #0c1a2c 100%)" }}
      />

      {/* Conteúdo da cena */}
      <div
        key={cur.id}
        className={`absolute inset-0 flex ${cur.overlay ? "flex-col" : "flex-col md:flex-row"} items-center justify-center gap-6 md:gap-10 p-6 md:p-12 ${transitionClass}`}
      >
        {/* Texto */}
        <div
          className={`${cur.overlay ? "text-center max-w-2xl" : "flex-1 max-w-md"} text-white z-10`}
        >
          {cur.eyebrow && (
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-300 mb-3 animate-text-stagger" style={{ animationDelay: "0.1s" }}>
              {cur.eyebrow}
            </div>
          )}
          <h2
            className="text-2xl md:text-4xl font-bold tracking-tight mb-3 leading-tight animate-text-stagger"
            style={{ animationDelay: "0.25s" }}
          >
            {cur.titulo}
          </h2>
          {cur.legenda && (
            <p
              className="text-sm md:text-base text-blue-100/80 leading-relaxed animate-text-stagger"
              style={{ animationDelay: "0.45s" }}
            >
              {cur.legenda}
            </p>
          )}
        </div>

        {/* Mockup */}
        <div
          className={`${cur.overlay ? "w-full max-w-2xl" : "flex-1 max-w-md md:max-w-lg"} flex items-center justify-center animate-mockup-pop`}
          style={{ animationDelay: "0.4s" }}
        >
          {cur.conteudo}
        </div>
      </div>

      {/* Controles na base */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-4 px-4 md:px-6">
        {/* Barra de progresso (cenas) */}
        <div className="flex gap-1 mb-3">
          {scenes.map((s, i) => {
            const isPast = i < currentIndex;
            const isCurrent = i === currentIndex;
            const pct = isPast ? 100 : isCurrent ? (elapsedInScene / s.duration) * 100 : 0;
            return (
              <div
                key={s.id}
                className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:bg-white/30 transition-colors"
                onClick={() => {
                  const startOfScene = scenes
                    .slice(0, i)
                    .reduce((sum, sc) => sum + sc.duration, 0);
                  seekTo(startOfScene);
                }}
                title={`Cena ${i + 1}: ${s.titulo}`}
              >
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${pct}%`, transitionDuration: isCurrent ? "100ms" : "300ms" }}
                />
              </div>
            );
          })}
        </div>

        {/* Linha de controles */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="size-8 inline-flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Cena anterior"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="size-9 inline-flex items-center justify-center rounded-lg bg-white/90 text-black hover:bg-white transition text-sm"
              aria-label={isPlaying ? "Pausar" : "Tocar"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex === scenes.length - 1 && !loop}
              className="size-8 inline-flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
              aria-label="Próxima cena"
            >
              ⏭
            </button>
          </div>
          <div
            className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer mx-2"
            onClick={handleSeekClick}
            title="Clique pra avançar"
          >
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-100"
              style={{ width: `${(elapsedTotal / totalDuration) * 100}%` }}
            />
          </div>
          <div className="text-[10px] font-mono text-white/70 tabular-nums">
            {fmtTime(elapsedTotal)} / {fmtTime(totalDuration)}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
