/** Blob de cor com blur — gradient mesh manual.
 *  Use 2-3 blobs sobrepostos pra criar gradient mesh dinâmico. */
export function Blob({
  color,
  x,
  y,
  size,
  opacity = 0.55,
}: {
  color: string;
  /** % horizontal do centro */
  x: number;
  /** % vertical do centro */
  y: number;
  /** % do width/height do container (1 lado) */
  size: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: `${size}%`,
        aspectRatio: "1 / 1",
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle at center, ${color} 0%, transparent 65%)`,
        filter: "blur(50px)",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}
