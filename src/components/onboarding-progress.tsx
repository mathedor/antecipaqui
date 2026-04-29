type Props = {
  step: 1 | 2 | 3;
  total?: number;
};

const STEPS = [
  { num: 1, label: "Tipo de cadastro" },
  { num: 2, label: "Dados da empresa" },
  { num: 3, label: "Documentos KYC" },
];

export function OnboardingProgress({ step, total = 3 }: Props) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">
          onboarding · etapa {step} de {total}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          {Math.round((step / total) * 100)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {STEPS.slice(0, total).map((s) => (
          <div
            key={s.num}
            className="rounded-full h-1 bg-bg-soft overflow-hidden relative"
          >
            <div
              className={`h-full transition-all duration-700 ease-out ${
                s.num <= step ? "w-full bg-accent" : "w-0 bg-accent"
              }`}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {STEPS.slice(0, total).map((s) => (
          <div
            key={s.num}
            className={`text-[11px] ${
              s.num <= step ? "text-fg" : "text-fg-dim"
            }`}
          >
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
