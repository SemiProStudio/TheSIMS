// ============================================================================
// useMediaQuery — subscribe to a CSS media query from React.
// Added for ItemDetail's section layout: the two-column split must collapse
// to ONE list in the user's configured order at the same breakpoint where
// the CSS stacks the columns (stacking two independent column divs scrambled
// the order to 0,2,4,…,1,3,5 on phones).
// ============================================================================
import { useEffect, useState } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
