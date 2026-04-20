import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number; // ms, défaut 1200
  start?: number;    // défaut 0
  decimals?: number; // défaut 0
  separator?: string; // milliers, défaut ' '
}

export function useCountUp({ end, duration = 1200, start = 0, decimals = 0, separator = ' ' }: UseCountUpOptions) {
  // Sanitize end: guard against NaN, Infinity, null, undefined
  const safeEnd = typeof end === 'number' && isFinite(end) ? end : 0;
  const safeStart = typeof start === 'number' && isFinite(start) ? start : 0;

  const [value, setValue] = useState(safeStart);
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = undefined;
    setValue(safeStart);

    // easing: easeOutCubic
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const current = safeStart + (safeEnd - safeStart) * easeOut(progress);
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [safeEnd, duration, safeStart]);

  // Format avec séparateur milliers
  const formatted = value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return formatted;
}
