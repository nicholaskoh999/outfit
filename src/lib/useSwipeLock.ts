import { useCallback, useEffect, useRef } from "react";

/** Ignore sub-threshold movement so taps still open the card. */
const TAP_SLOP = 8;

/**
 * Clamps one touch gesture to at most one card of travel.
 *
 * `scroll-snap-stop: always` handles ordinary swipes, but a hard flick on
 * Chrome/Samsung Internet can still carry past a snap point. This pins the
 * scroll position to the adjacent card once the fling reaches it.
 *
 * Returns a callback ref, so it attaches whenever the carousel mounts — the
 * rail only renders once an occasion is picked.
 */
export function useSwipeLock<T extends HTMLElement>() {
  const detach = useRef<(() => void) | null>(null);

  useEffect(() => () => detach.current?.(), []);

  return useCallback((el: T | null) => {
    detach.current?.();
    detach.current = null;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startIndex = 0;
    let tracking = false;

    const cards = () => Array.from(el.children) as HTMLElement[];

    /** Distance between consecutive card origins — card width plus the gap. */
    const pitch = () => {
      const c = cards();
      return c.length > 1 ? c[1].offsetLeft - c[0].offsetLeft : el.clientWidth;
    };

    const scrollLeftFor = (index: number) => {
      const c = cards();
      const padding = parseFloat(getComputedStyle(el).paddingLeft) || 0;
      const target = (c[index]?.offsetLeft ?? 0) - padding;
      return Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || el.scrollWidth <= el.clientWidth) return;
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startIndex = Math.round(el.scrollLeft / pitch());
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Leave taps and vertical page scrolls alone.
      if (Math.abs(dx) < TAP_SLOP || Math.abs(dx) <= Math.abs(dy)) return;

      const forward = dx < 0;
      const index = Math.max(0, Math.min(cards().length - 1, startIndex + (forward ? 1 : -1)));
      const limit = scrollLeftFor(index);

      // The fling runs on the compositor, so neither a smooth scrollTo nor a single
      // scrollLeft assignment stops it — both get overridden on the next frame.
      // Re-asserting the position every frame does hold it, so pin scrollLeft to the
      // adjacent card until the momentum is spent. A fling that stops short of the
      // next card never triggers this and settles natively.
      let frames = 0;
      let settled = 0;
      const clampFling = () => {
        if (++frames > 40) return; // ~650ms safety valve
        if (forward ? el.scrollLeft >= limit : el.scrollLeft <= limit) {
          if (Math.abs(el.scrollLeft - limit) < 0.5) {
            if (++settled >= 3) return; // held steady — the fling is dead
          } else {
            settled = 0;
          }
          el.scrollLeft = limit;
        }
        requestAnimationFrame(clampFling);
      };
      requestAnimationFrame(clampFling);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    detach.current = () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);
}
