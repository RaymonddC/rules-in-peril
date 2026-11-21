import { useEffect, useRef, useState } from "react";

/** True when the user asked the OS for less motion. Updates live. */
export function useReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduce, setReduce] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

// Strong ease-out, the same curve as --ease-out in styles.css.
function easeOut(t: number): number {
  // cubic-bezier(0.23, 1, 0.32, 1), approximated by solving for x with Newton steps.
  const x1 = 0.23, y1 = 1, x2 = 0.32, y2 = 1;
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let s = t;
  for (let i = 0; i < 6; i++) {
    const x = bez(x1, x2, s) - t;
    const dx = 3 * x1 * (1 - s) ** 2 + 6 * (x2 - x1) * s * (1 - s) + 3 * (1 - x2) * s * s;
    if (Math.abs(dx) < 1e-6) break;
    s -= x / dx;
  }
  return bez(y1, y2, Math.min(Math.max(s, 0), 1));
}

/**
 * Counts from the previous value to `target`. Retargets mid-flight, so rapid
 * changes never restart from zero. Instant under reduced motion.
 */
export function useCountUp(target: number, durationMs = 250): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const shown = useRef(target);
  useEffect(() => {
    if (reduce) {
      shown.current = target;
      setValue(target);
      return;
    }
    from.current = shown.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      const v = from.current + (target - from.current) * easeOut(t);
      shown.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduce]);
  return Math.round(value);
}

/**
 * Linear progress 0..1 over `durationMs` while `running` is true.
 * Calls onDone once at the end. Used for the attack run, whose progress is
 * time, not a feeling, so it stays linear.
 */
export function useProgress(running: boolean, durationMs: number, onDone: () => void): number {
  const [p, setP] = useState(running ? 0 : 1);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!running) {
      setP(1);
      return;
    }
    setP(0);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setP(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else done.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, durationMs]);
  return p;
}
