"use client";

import { useEffect, useState } from "react";

type Props = {
  texts: string[];
  speed?: number;
  pause?: number;
  className?: string;
  cursorClassName?: string;
};

export function TypeText({
  texts,
  speed = 38,
  pause = 1800,
  className = "",
  cursorClassName = "",
}: Props) {
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  useEffect(() => {
    const current = texts[idx];
    let t: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (shown.length < current.length) {
        t = setTimeout(() => setShown(current.slice(0, shown.length + 1)), speed + Math.random() * 30);
      } else {
        t = setTimeout(() => setPhase("pausing"), pause);
      }
    } else if (phase === "pausing") {
      t = setTimeout(() => setPhase("deleting"), 250);
    } else {
      if (shown.length > 0) {
        t = setTimeout(() => setShown(current.slice(0, shown.length - 1)), 24);
      } else {
        setIdx((i) => (i + 1) % texts.length);
        setPhase("typing");
        return;
      }
    }
    return () => clearTimeout(t);
  }, [shown, phase, idx, texts, speed, pause]);

  return (
    <span className={className}>
      {shown}
      <span className={`cursor-blink inline-block ${cursorClassName}`}>▍</span>
    </span>
  );
}
