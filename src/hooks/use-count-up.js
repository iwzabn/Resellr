import { useEffect, useRef, useState } from "react";

// Renders the final value on the server and first client paint (so hydration
// matches), then counts up from zero when motion is welcome.
export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(target);
  const frame = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) return undefined;
    let start = null;
    setValue(0);
    const step = (ts) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => frame.current && cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}