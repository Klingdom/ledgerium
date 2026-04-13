'use client';

import { useEffect, useState } from 'react';

/**
 * useScrollSpy — returns the ID of the section most visible in the viewport.
 *
 * Uses IntersectionObserver with a generous rootMargin so that sections
 * near the top of the page are caught early. The active ID is updated as
 * the user scrolls.
 *
 * @param sectionIds  Array of element IDs to observe.
 * @returns           The ID of the currently most visible section, or null.
 */
export function useScrollSpy(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(
    sectionIds.length > 0 ? (sectionIds[0] ?? null) : null,
  );

  useEffect(() => {
    if (sectionIds.length === 0) return;

    // Track intersection ratio for each section so we can pick the most visible
    const ratioMap = new Map<string, number>();
    sectionIds.forEach((id) => ratioMap.set(id, 0));

    function pickActive() {
      let best: string | null = null;
      let bestRatio = -1;
      ratioMap.forEach((ratio, id) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = id;
        }
      });
      if (best !== null) setActiveId(best);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ratioMap.set(entry.target.id, entry.intersectionRatio);
        });
        pickActive();
      },
      {
        // Slightly negative top margin so sections activate just before reaching top
        rootMargin: '-10% 0px -60% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
