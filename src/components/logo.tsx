import Image from "next/image";

type Props = {
  className?: string;
  size?: number;
};

export function Logo({ className = "", size = 36 }: Props) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        aria-hidden
        className="block shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: "url(/brand/logo.png)",
          backgroundSize: "auto 200%",
          backgroundPosition: "center 25%",
          backgroundRepeat: "no-repeat",
        }}
      />
      <span className="flex flex-col leading-none">
        <span className="font-sans font-bold text-[16px] tracking-tight text-fg">
          ANTECIPA<span className="text-accent">QUI</span>
        </span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-fg-dim mt-0.5">
          comissões imobiliárias
        </span>
      </span>
    </span>
  );
}
