// =============================================================================
// useFillHeight — how tall an element can be before the window runs out.
//
// Added for the Dashboard's two column stacks: on a wide screen they should
// end where the window ends, so panels can share the space instead of each
// stopping at a hard cap while the page scrolls past the bottom. The answer
// is window height − the element's top − <main>'s bottom padding, floored at
// `min` so a short window degrades to a little page scroll rather than a
// column of one-row panels. Returns null while disabled.
//
// Re-measures on resize, when anything above the element inside its own
// parent changes size (a collapsed lead panel, inline search results, a
// font-changing theme) and when <main> gains or loses a child (the loading
// bar mounts above every view).
// =============================================================================
import { useLayoutEffect, useState } from 'react';

export function useFillHeight(ref, { enabled = true, min = 0 } = {}) {
  const [height, setHeight] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof window === 'undefined') {
      setHeight(null);
      return undefined;
    }
    const main = el.closest('main');
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY + (main?.scrollTop || 0);
      const padBottom = main ? parseFloat(window.getComputedStyle(main).paddingBottom) || 0 : 0;
      const available = Math.floor(window.innerHeight - top - padBottom);
      setHeight(Math.max(min, available));
    };
    measure();

    window.addEventListener('resize', measure);
    const ro =
      typeof ResizeObserver !== 'undefined' && el.parentElement
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el.parentElement);
    const mo =
      main && typeof MutationObserver !== 'undefined' ? new MutationObserver(measure) : null;
    mo?.observe(main, { childList: true });

    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [ref, enabled, min]);

  return enabled ? height : null;
}
