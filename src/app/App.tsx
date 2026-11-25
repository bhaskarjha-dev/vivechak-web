import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { ArchitectureStage } from '@/features/architecture/ArchitectureStage';
import { CalibrationLab, type PromptBridgePayload } from '@/features/calibration/CalibrationLab';
import { Footer } from '@/shared/components/Footer';
import { GateChamber } from '@/features/gate/GateChamber';
import { HeroSection } from '@/features/hero/HeroSection';
import { Navbar } from '@/shared/components/Navbar';
import type { DocsPortal as DocsPortalType } from '@/features/docs/DocsPortal';
import type { PlaygroundStudio as PlaygroundStudioType, PlaygroundTab } from '@/features/playground/PlaygroundStudio';
import type { ReferenceTab } from '@/features/docs/ReferenceDrawer';
import { SetupSection } from '@/features/setup/SetupSection';
import { ShiftShowcase } from '@/features/shift/ShiftShowcase';
import { ToastHost } from '@/shared/components/ToastHost';
import { findDocMeta, hasDocPage } from '@/features/docs/docsManifest';
import { navigate, useRoute } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { applyTheme, getInitialTheme, type ThemeMode } from '@/shared/lib/theme';
import { showToast } from '@/shared/lib/toast';

const CommandPalette = lazy(() =>
  import('@/features/command-palette/CommandPalette').then((m) => ({ default: m.CommandPalette }))
);
const ReferenceDrawer = lazy(() =>
  import('@/features/docs/ReferenceDrawer').then((m) => ({ default: m.ReferenceDrawer }))
);
const DocsPortal = lazy(() =>
  import('@/features/docs/DocsPortal').then((m) => ({ default: m.DocsPortal }))
);
const PlaygroundStudio = lazy(() =>
  import('@/features/playground/PlaygroundStudio').then((m) => ({ default: m.PlaygroundStudio }))
);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

interface AppProps {
  initialPath?: string;
  preloadedDocs?: typeof DocsPortalType;
  preloadedPlayground?: typeof PlaygroundStudioType;
}

export const App: React.FC<AppProps> = ({
  initialPath = '/',
  preloadedDocs: SyncDocs,
  preloadedPlayground: SyncPlayground,
}) => {
  const { pathname } = useRoute(initialPath);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [soundOn, setSoundOn] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const [refTab, setRefTab] = useState<ReferenceTab>('cli');
  const [bridgedPrompt, setBridgedPrompt] = useState<PromptBridgePayload | null>(null);
  const [selectedHostBridge, setSelectedHostBridge] = useState<{ hostId: string; nonce: number } | null>(null);
  const [playgroundTab, setPlaygroundTab] = useState<PlaygroundTab>('auditor');
  const [auditorPresetLaunch, setAuditorPresetLaunch] = useState<{ id: string; nonce: number } | null>(null);

  const isHome = pathname === '/';
  const isDocsIndex = pathname === '/docs';
  const rawDocSlug = pathname.startsWith('/docs/') ? pathname.replace(/^\/docs\//, '') : '';
  const isValidDocs = isDocsIndex || (pathname.startsWith('/docs/') && hasDocPage(rawDocSlug));
  const isPlayground = pathname === '/playground';
  const isNotFound = !isHome && !isValidDocs && !isPlayground;
  const docSlug = isDocsIndex ? 'quickstart' : rawDocSlug || 'quickstart';

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial, false);
  }, []);

  // Route-accurate browser tab title, meta description & canonical URL
  useEffect(() => {
    let title = 'Vivechak — Prove Decisions Before Code';
    let desc =
      'Make AI coding agents prove hard architectural decisions with cited research (Grade A-E), red-team SHA-256 checks, and human sign-off — stored locally in plain Git Markdown.';
    let canonical = 'https://vivechak.bhaskarjha.dev/';

    if (isValidDocs) {
      const p = findDocMeta(docSlug);
      title = `${p.shortTitle} — Vivechak Docs`;
      desc = p.description;
      canonical = `https://vivechak.bhaskarjha.dev/docs/${p.slug}`;
    } else if (isPlayground) {
      title = 'Playground & ADR Auditor — Vivechak';
      desc =
        'Live in-browser Vivechak ADR & Session Gate Auditor (G5–G12 + Q-* quality coaching), editable WEP ±20% matrix builder, and zero-install prompt studio.';
      canonical = 'https://vivechak.bhaskarjha.dev/playground';
    } else if (isNotFound) {
      title = '404 Route Not Found — Vivechak';
      desc = 'The requested route does not exist on vivechak.bhaskarjha.dev.';
      canonical = 'https://vivechak.bhaskarjha.dev/';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
    const linkCan = document.querySelector('link[rel="canonical"]');
    if (linkCan) linkCan.setAttribute('href', canonical);
  }, [isValidDocs, isPlayground, isNotFound, docSlug]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
      soundEngine.playTick(next === 'light' ? 840 : 620);
      showToast(next === 'light' ? 'Archival Paper (Light Theme)' : 'Obsidian Instrument (Dark Theme)');
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      soundEngine.setEnabled(next);
      return next;
    });
  }, []);

  const openReference = useCallback((tab: ReferenceTab = 'cli') => {
    setRefTab(tab);
    setRefOpen(true);
  }, []);

  const launchAuditorPreset = useCallback((presetId: string) => {
    setPlaygroundTab('auditor');
    setAuditorPresetLaunch({ id: presetId, nonce: Date.now() });
    navigate('/playground');
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        soundEngine.playTick(820);
        setRefOpen(false);
        setPaletteOpen((open) => !open);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return;

      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
      } else if (e.key === '?') {
        e.preventDefault();
        soundEngine.playTick(780);
        setPaletteOpen(false);
        setRefOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleTheme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <a href="#main-content" className="sr-only">
          Skip to content
        </a>

        <Navbar
          pathname={pathname}
          theme={theme}
          onToggleTheme={toggleTheme}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onOpenPalette={() => {
            setRefOpen(false);
            setPaletteOpen(true);
          }}
          onOpenReference={() => {
            setPaletteOpen(false);
            openReference('cli');
          }}
        />

        <main id="main-content">
          {isValidDocs ? (
            SyncDocs ? (
              <SyncDocs
                slug={docSlug}
                onLaunchAuditorPreset={launchAuditorPreset}
                onOpenPalette={() => {
                  setRefOpen(false);
                  setPaletteOpen(true);
                }}
              />
            ) : (
              <Suspense fallback={<div className="page-loading mono">Loading documentation…</div>}>
                <DocsPortal
                  slug={docSlug}
                  onLaunchAuditorPreset={launchAuditorPreset}
                  onOpenPalette={() => {
                    setRefOpen(false);
                    setPaletteOpen(true);
                  }}
                />
              </Suspense>
            )
          ) : isPlayground ? (
            SyncPlayground ? (
              <SyncPlayground initialTab={playgroundTab} initialPresetLaunch={auditorPresetLaunch} />
            ) : (
              <Suspense fallback={<div className="page-loading mono">Loading playground…</div>}>
                <PlaygroundStudio initialTab={playgroundTab} initialPresetLaunch={auditorPresetLaunch} />
              </Suspense>
            )
          ) : isNotFound ? (
            <section className="notfound-shell" aria-labelledby="notfound-heading">
              <div className="wrap notfound-card">
                <span className="eyebrow-dark mono">404 · E-ROUTE-NOT-FOUND</span>
                <h1 id="notfound-heading" className="notfound-h1">
                  Unverified path.
                </h1>
                <p className="dark-sub">
                  No Vivechak guide or workbench exists at <code className="mono">{pathname}</code>.
                  Jump straight into the live interactive gate, documentation portal, or press{' '}
                  <kbd className="mono">⌘K</kbd> to search all 11 release guides.
                </p>
                <div className="notfound-actions">
                  <a
                    href="/"
                    className="btn-saffron"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/');
                    }}
                  >
                    <span>Return to Overview</span>
                  </a>
                  <a
                    href="/docs/quickstart"
                    className="btn-glass"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/docs/quickstart');
                    }}
                  >
                    <span>Read Quickstart Docs</span>
                  </a>
                  <a
                    href="/playground"
                    className="btn-glass"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/playground');
                    }}
                  >
                    <span>Open Live Playground</span>
                  </a>
                </div>
              </div>
            </section>
          ) : (
            <>
              <HeroSection
                theme={theme}
                onSelectHost={(hostId) => {
                  setSelectedHostBridge({ hostId, nonce: Date.now() });
                  document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
              <ShiftShowcase />
              <CalibrationLab onSendToPromptBuilder={(p) => setBridgedPrompt(p)} />
              <GateChamber />
              <ArchitectureStage />
              <SetupSection bridgedPrompt={bridgedPrompt} bridgedHost={selectedHostBridge} />
            </>
          )}
        </main>

        <Footer theme={theme} onOpenReference={() => openReference('cli')} />
        <ToastHost />

        {paletteOpen && (
          <Suspense fallback={null}>
            <CommandPalette
              open={paletteOpen}
              onClose={() => setPaletteOpen(false)}
              theme={theme}
              onToggleTheme={toggleTheme}
              soundOn={soundOn}
              onToggleSound={toggleSound}
              onOpenReference={openReference}
            />
          </Suspense>
        )}

        {refOpen && (
          <Suspense fallback={null}>
            <ReferenceDrawer
              open={refOpen}
              initialTab={refTab}
              onClose={() => setRefOpen(false)}
            />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
};

export default App;
