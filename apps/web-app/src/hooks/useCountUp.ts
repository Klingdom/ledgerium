'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — animates a number from 0 to `target` over `durationMs`.
 *
 * Respects prefers-reduced-motion: if the user has reduced motion enabled,
 * the value jumps directly to `target` with no animation.
 *
 * Starts the animation when the element with the given ref enters the viewport
 * via IntersectionObserver. Pass the returned ref to the container element.
 *
 * @param target    The final value to count up to.
 * @param durationMs  Animation duration in milliseconds. Default 800.
 * @param options   Optional delay before starting and number of decimals.
 * @returns         [displayValue, ref] — attach ref to container element.
 */
export function useCountUp(
  target: number,
  durationMs = 800,
  options: { delay?: number; decimals?: number } = {},
): [number, React.RefObject<HTMLElement | null>] {
  const { delay = 0, decimals = 0 } = options;
  const [value, setValue] = useState(0);
  const containerRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setValue(target);
      return;
    }

    const factor = Math.pow(10, decimals);

    function runAnimation(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased * factor) / factor;
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(runAnimation);
      } else {
        setValue(target);
      }
    }

    function startAnimation() {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;
      if (delay > 0) {
        setTimeout(() => {
          rafRef.current = requestAnimationFrame(runAnimation);
        }, delay);
      } else {
        rafRef.current = requestAnimationFrame(runAnimation);
      }
    }

    const el = containerRef.current;
    if (!el) {
      // No ref attached — start immediately
      startAnimation();
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, delay, decimals]);

  return [value, containerRef];
}
