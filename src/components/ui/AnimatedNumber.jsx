import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Smoothly animates a number whenever `value` changes.
 */
export default function AnimatedNumber({ value = 0, duration = 600, format }) {
  const toNumber = (v) => {
    if (v == null) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const target = useMemo(() => toNumber(value), [value]);
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;
    fromRef.current = to;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (duration <= 0 || from === to) {
      setDisplay(to);
      return;
    }

    const start = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = from + (to - from) * eased;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  const out = format ? format(display) : Math.round(display).toString();
  return <>{out}</>;
}