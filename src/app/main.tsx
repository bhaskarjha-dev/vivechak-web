import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@/styles/tokens.css';
import '@/styles/base.css';
import '@/shared/components/navbar.css';
import '@/features/hero/hero.css';
import '@/features/home/home-bands.css';
import '@/features/shift/shift.css';
import '@/features/calibration/calibration.css';
import '@/features/gate/gate.css';
import '@/features/architecture/architecture.css';
import '@/features/setup/setup.css';
import '@/shared/components/footer.css';
import '@/features/command-palette/command-palette.css';
import '@/shared/components/toast.css';
import '@/features/docs/reference-drawer.css';
import '@/styles/pages.css';
import '@/styles/responsive.css';
import '@/styles/theme-light.css';
import { App } from '@/app/App';
import { normalizePath } from '@/shared/lib/router';
import type { ArchitecturePage as ArchitecturePageType } from '@/features/architecture/ArchitecturePage';
import type { SetupPage as SetupPageType } from '@/features/setup/SetupPage';
import type { DocsPortal as DocsPortalType } from '@/features/docs/DocsPortal';
import type { PlaygroundStudio as PlaygroundStudioType } from '@/features/playground/PlaygroundStudio';

async function boot() {
  const path = normalizePath(window.location.pathname);
  let preloadedArchitecture: typeof ArchitecturePageType | undefined;
  let preloadedSetup: typeof SetupPageType | undefined;
  let preloadedDocs: typeof DocsPortalType | undefined;
  let preloadedPlayground: typeof PlaygroundStudioType | undefined;

  if (path === '/architecture') {
    preloadedArchitecture = (await import('@/features/architecture/ArchitecturePage')).ArchitecturePage;
  } else if (path === '/setup') {
    preloadedSetup = (await import('@/features/setup/SetupPage')).SetupPage;
  } else if (path === '/docs' || path.startsWith('/docs/')) {
    preloadedDocs = (await import('@/features/docs/DocsPortal')).DocsPortal;
  } else if (path === '/playground') {
    preloadedPlayground = (await import('@/features/playground/PlaygroundStudio')).PlaygroundStudio;
  }

  const rootEl = document.getElementById('root')!;
  const ssrRoute = rootEl.dataset.ssrRoute ? normalizePath(rootEl.dataset.ssrRoute) : null;
  const canHydrate = rootEl.firstElementChild !== null && ssrRoute === path;
  const appNode = (
    <StrictMode>
      <App
        initialPath={path}
        preloadedArchitecture={preloadedArchitecture}
        preloadedSetup={preloadedSetup}
        preloadedDocs={preloadedDocs}
        preloadedPlayground={preloadedPlayground}
      />
    </StrictMode>
  );

  if (canHydrate) {
    hydrateRoot(rootEl, appNode);
  } else {
    createRoot(rootEl).render(appNode);
  }
}

void boot();
