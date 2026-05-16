type Conquista = {
  key: string;
  titulo: string;
  descricao: string;
  emoji: string;
  unlocked: boolean;
  progresso: number;
  unlockedAt?: string | null;
  extra?: string;
};

type StreakInfo = {
  atual: number;
  recorde: number;
  passadoBateu: boolean;
};

export function ConquistasGrid({
  conquistas,
  streak,
  compact = false,
}: {
  conquistas: Conquista[];
  streak: StreakInfo;
  /** modo compacto pro dashboard — mostra só as desbloqueadas + próximas 2 */
  compact?: boolean;
}) {
  const unlocked = conquistas.filter((c) => c.unlocked);
  const locked = conquistas.filter((c) => !c.unlocked);

  // No modo compacto, mostra todas as unlocked + 2 mais próximas
  const lockedToShow = compact
    ? [...locked]
        .sort((a, b) => b.progresso - a.progresso)
        .slice(0, 2)
    : locked;
  const display = compact
    ? [...unlocked.slice(-4), ...lockedToShow]
    : [...unlocked, ...lockedToShow];

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            conquistas
          </div>
          <h2 className="font-bold tracking-tight text-lg">
            {unlocked.length}{" "}
            <span className="text-fg-muted font-normal text-base">
              de {conquistas.length} desbloqueadas
            </span>
          </h2>
        </div>
        {streak.atual > 0 && (
          <div className="rounded-xl border border-warn/30 bg-yellow-50 px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-wider text-warn mb-0.5">
              streak meta
            </div>
            <div className="font-mono tabular text-lg font-bold text-warn flex items-center gap-1">
              🔥 {streak.atual}{" "}
              <span className="text-xs font-normal">
                {streak.atual === 1 ? "mês" : "meses"}
              </span>
            </div>
            {streak.recorde > streak.atual && (
              <div className="text-[9px] text-fg-muted">
                recorde: {streak.recorde}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress bar geral */}
      <div className="mb-4">
        <div className="h-2 bg-bg-card rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{
              width: `${(unlocked.length / conquistas.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {display.map((c) => (
          <BadgeCard key={c.key} c={c} />
        ))}
      </ul>

      {compact && locked.length > lockedToShow.length && (
        <p className="text-[11px] text-fg-muted mt-3 text-center">
          +{locked.length - lockedToShow.length} conquista(s) bloqueadas.
        </p>
      )}
    </section>
  );
}

function BadgeCard({ c }: { c: Conquista }) {
  return (
    <li
      className={`rounded-xl border p-3 text-center transition-all ${
        c.unlocked
          ? "border-success/40 bg-green-50"
          : "border-border bg-bg-card opacity-70 grayscale"
      }`}
      title={c.descricao}
    >
      <div className={`text-2xl mb-1 ${c.unlocked ? "" : "opacity-40"}`}>
        {c.emoji}
      </div>
      <div
        className={`text-[11px] font-semibold leading-tight ${
          c.unlocked ? "text-success" : "text-fg-muted"
        }`}
      >
        {c.titulo}
      </div>
      {!c.unlocked && c.progresso > 0 && (
        <div className="mt-1.5 h-1 bg-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full"
            style={{ width: `${c.progresso * 100}%` }}
          />
        </div>
      )}
      {c.extra && (
        <div className="text-[9px] font-mono text-fg-dim mt-1 truncate">
          {c.extra}
        </div>
      )}
    </li>
  );
}
