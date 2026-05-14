/** Helpers de animação reutilizáveis nas cenas. */

import { interpolate, spring, type SpringConfig } from "remotion";

export function fadeIn(frame: number, start = 0, durationFrames = 15): number {
  return interpolate(frame, [start, start + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function fadeOut(
  frame: number,
  start: number,
  durationFrames = 15,
): number {
  return interpolate(frame, [start, start + durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function slideY(
  frame: number,
  start: number,
  durationFrames = 20,
  from = 40,
  to = 0,
): number {
  return interpolate(frame, [start, start + durationFrames], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3), // cubic ease-out
  });
}

export function slideX(
  frame: number,
  start: number,
  durationFrames = 20,
  from = -50,
  to = 0,
): number {
  return interpolate(frame, [start, start + durationFrames], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
}

export function popIn(
  frame: number,
  start: number,
  fps: number,
  config?: Partial<SpringConfig>,
): number {
  return spring({
    frame: frame - start,
    fps,
    config: { damping: 12, stiffness: 100, mass: 0.6, ...config },
  });
}
