import { useEffect, useState } from 'react';

export interface RouteState {
  pathname: string;
  hash: string;
}

export function normalizePath(raw: string): string {
  if (!raw || raw === '/') return '/';
  const cleaned = raw.replace(/\/+$/, '');
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

export function getWindowRoute(): RouteState {
  if (typeof window === 'undefined') return { pathname: '/', hash: '' };
  if (window.location.protocol === 'file:') {
    const ssr = document.getElementById('root')?.dataset.ssrRoute;
    return { pathname: normalizePath(ssr || '/'), hash: window.location.hash || '' };
  }
  return {
    pathname: normalizePath(window.location.pathname),
    hash: window.location.hash || '',
  };
}

// Resilient cross-route hash scroller (deterministic offset under sticky 62px navbar)
function scrollToHashElement(id: string, smooth: boolean, maxMs = 1400): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const start = performance.now();
  const scrollNow = (el: HTMLElement, behavior: ScrollBehavior) => {
    const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - 68));
    window.scrollTo({ top, behavior });
  };
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) {
      scrollNow(el, smooth ? 'smooth' : 'instant');
      // Guard against async layout settlement when jumping across routes into Home
      if (!smooth) {
        window.setTimeout(() => {
          const fresh = document.getElementById(id);
          if (fresh) scrollNow(fresh, 'instant');
        }, 120);
      }
      return;
    }
    if (performance.now() - start < maxMs) {
      requestAnimationFrame(attempt);
    }
  };
  requestAnimationFrame(attempt);
}

export function navigate(to: string): void {
  if (typeof window === 'undefined') return;
  const [rawPath, rawHash] = to.split('#');
  const nextPath = normalizePath(rawPath || '/');
  const nextHash = rawHash ? `#${rawHash}` : '';
  const targetUrl = nextPath + nextHash;

  const currentPath =
    window.location.protocol === 'file:' ? '/' : normalizePath(window.location.pathname);
  const samePath = currentPath === nextPath;

  if (!samePath) {
    window.history.pushState({}, '', targetUrl);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else if (nextHash && window.location.hash !== nextHash) {
    window.history.pushState({}, '', targetUrl);
  } else if (!nextHash && window.location.hash) {
    window.history.pushState({}, '', nextPath);
  }

  if (nextHash) {
    scrollToHashElement(nextHash.slice(1), samePath);
  } else {
    window.scrollTo({ top: 0, behavior: samePath ? 'smooth' : ('instant' as ScrollBehavior) });
  }
}

export function useRoute(initialPath = '/'): RouteState {
  const [route, setRoute] = useState<RouteState>(() =>
    typeof window === 'undefined'
      ? { pathname: normalizePath(initialPath), hash: '' }
      : getWindowRoute()
  );

  useEffect(() => {
    const sync = () => setRoute(getWindowRoute());
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  return route;
}
