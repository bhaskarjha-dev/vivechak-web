import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight, BookOpen, Command, Menu, Moon, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import type { ThemeMode } from '@/shared/lib/theme';

interface NavbarProps {
  pathname: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenPalette: () => void;
  onOpenReference: () => void;
}

const PRIMARY_LINKS = [
  { id: 'overview', href: '/', label: 'Overview', kind: 'overview' as const },
  { id: 'shift', href: '/#shift', label: 'The Shift', kind: 'section' as const },
  { id: 'calibrate', href: '/#calibrate', label: 'Calibrate', kind: 'section' as const },
  { id: 'gate', href: '/#gate', label: 'Gate', kind: 'section' as const },
  { id: 'playground', href: '/playground', label: 'Playground', kind: 'playground' as const },
  { id: 'docs', href: '/docs/quickstart', label: 'Docs', kind: 'docs' as const },
];

export const Navbar: React.FC<NavbarProps> = ({
  pathname,
  theme,
  onToggleTheme,
  soundOn,
  onToggleSound,
  onOpenPalette,
  onOpenReference,
}) => {
  const isHome = pathname === '/';
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const isPlayground = pathname === '/playground';

  const [activeHomeSection, setActiveHomeSection] = useState<string>('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  useEffect(() => {
    setMobileOpen(false);
    if (!isHome) {
      setActiveHomeSection('');
      return;
    }

    const ids = ['shift', 'calibrate', 'gate', 'architecture', 'setup'] as const;
    let rafId = 0;

    const computeActive = () => {
      rafId = 0;
      if (window.scrollY < 160) {
        setActiveHomeSection('');
        return;
      }
      const probeY = Math.min(280, Math.max(140, Math.round(window.innerHeight * 0.28)));
      let current = '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= probeY) {
          current = id;
        }
      }
      // If a user clicked a hash link directly, keep it honored while its top sits near the viewport header
      const hashId = window.location.hash.replace(/^#/, '');
      if (hashId && (ids as readonly string[]).includes(hashId)) {
        const target = document.getElementById(hashId);
        if (target) {
          const top = target.getBoundingClientRect().top;
          if (top >= -24 && top <= Math.min(340, window.innerHeight * 0.36)) {
            current = hashId;
          }
        }
      }
      setActiveHomeSection(current);
    };

    const schedule = () => {
      if (!rafId) rafId = window.requestAnimationFrame(computeActive);
    };

    computeActive();
    const settleTimer = window.location.hash ? window.setTimeout(computeActive, 90) : 0;
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (settleTimer) window.clearTimeout(settleTimer);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  }, [isHome]);

  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    soundEngine.playTick(760);
    setMobileOpen(false);
    const [, hash] = to.split('#');
    if (to === '/') setActiveHomeSection('');
    else if (hash && ['shift', 'calibrate', 'gate', 'architecture', 'setup'].includes(hash)) {
      setActiveHomeSection(hash);
    }
    navigate(to);
  };

  return (
    <header className="nav-bar" id="site-header">
      <motion.div className="scroll-thread" style={{ scaleX }} aria-hidden="true" />

      <div className="wrap nav-inner">
        <a
          href="/"
          className="nav-brand"
          id="nav-brand"
          aria-label="Vivechak home"
          onClick={go('/')}
        >
          <svg
            viewBox="0 0 512 512"
            width={24}
            height={24}
            className="nav-logo-svg"
            aria-hidden="true"
          >
            <path
              className="nav-logo-funnel"
              fillRule="evenodd"
              d="M 112 116.25 H 400 A 18 18 0 0 1 400 152.25 H 375.8 A 10.8 10.8 0 0 0 366.45 157.65 L 271.59 321.96 A 18 18 0 0 1 240.41 321.96 L 145.55 157.65 A 10.8 10.8 0 0 0 136.2 152.25 H 112 A 18 18 0 0 1 112 116.25 Z M 315.53 152.25 H 196.47 A 7.2 7.2 0 0 0 190.24 163.05 L 249.76 266.16 A 7.2 7.2 0 0 0 262.24 266.16 L 321.76 163.05 A 7.2 7.2 0 0 0 315.53 152.25 Z"
            />
            <circle cx="256" cy="374.16" r="21.6" fill="#F2A33A" className="nav-logo-drop" />
          </svg>
          <span className="nav-latin">Vivechak</span>
          <span className="nav-sep" aria-hidden="true" />
          <img
            src="/assets/wordmark-dark.svg"
            alt="Vivechak calligraphy wordmark"
            width={40}
            height={14}
            className="nav-devanagari brand-for-dark"
          />
          <img
            src="/assets/wordmark-light.svg"
            alt="Vivechak calligraphy wordmark"
            width={40}
            height={14}
            className="nav-devanagari brand-for-light"
          />
        </a>

        {/* Consistent 6-item navigation across EVERY route — never collapses or jumps when switching pages */}
        <nav className="nav-links" aria-label="Primary navigation">
          {PRIMARY_LINKS.map((l) => {
            const isAct =
              l.kind === 'playground'
                ? isPlayground
                : l.kind === 'docs'
                  ? isDocs
                  : l.kind === 'overview'
                    ? isHome && activeHomeSection === ''
                    : isHome && activeHomeSection === l.id;
            return (
              <a
                key={l.id}
                href={l.href}
                id={`nav-link-${l.id}`}
                className={`nav-link ${isAct ? 'is-active' : ''}`}
                aria-current={isAct ? 'page' : undefined}
                onClick={go(l.href)}
              >
                <span>{l.label}</span>
                {isAct && (
                  <motion.span
                    layoutId="navActiveLine"
                    className="nav-active-line"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  />
                )}
              </a>
            );
          })}
        </nav>

        <div className="nav-actions">
          <motion.button
            type="button"
            id="btn-field-manual"
            className="nav-icon-btn nav-docs-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundEngine.playTick(780);
              onOpenReference();
            }}
            aria-label="Open Quick Reference Drawer (?)"
            title="Quick Reference Cheat Sheet (?)"
          >
            <BookOpen size={13} strokeWidth={2} />
            <span className="mono">Ref</span>
          </motion.button>

          <motion.button
            type="button"
            id="btn-theme-toggle"
            className="nav-icon-btn"
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTheme}
            aria-pressed={theme === 'light'}
            aria-label={theme === 'light' ? 'Switch to Obsidian dark theme (T)' : 'Switch to Archival Paper light theme (T)'}
            title={theme === 'light' ? 'Switch to Dark Theme (T)' : 'Switch to Light Theme (T)'}
          >
            {theme === 'light' ? <Moon size={14} strokeWidth={1.9} /> : <Sun size={14} strokeWidth={1.9} />}
          </motion.button>

          <motion.button
            type="button"
            id="btn-command-palette"
            className="nav-icon-btn"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              soundEngine.playTick(820);
              onOpenPalette();
            }}
            aria-label="Open global search & command index"
            title="Global Search & Command Index (⌘K)"
          >
            <Command size={13} strokeWidth={2} />
            <span className="mono">K</span>
          </motion.button>

          <motion.button
            type="button"
            id="btn-sound-toggle"
            className={`nav-icon-btn ${soundOn ? 'is-on' : ''}`}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute synthesized audio' : 'Enable synthesized audio'}
            title={soundOn ? 'Mute sound' : 'Enable subtle tactile audio'}
          >
            {soundOn ? <Volume2 size={14} strokeWidth={1.8} /> : <VolumeX size={14} strokeWidth={1.8} />}
          </motion.button>

          <motion.a
            href="https://github.com/bhaskarjha-dev/vivechak"
            target="_blank"
            rel="noreferrer"
            className="nav-gh-btn"
            id="nav-github"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => soundEngine.playTick(700)}
          >
            <span>GitHub</span>
            <ArrowUpRight size={13} strokeWidth={2} />
          </motion.a>

          <button
            type="button"
            className="nav-icon-btn nav-mobile-btn"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => {
              soundEngine.playTick(720);
              setMobileOpen((v) => !v);
            }}
          >
            {mobileOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </div>

      {/* Sleek Opaque Mobile Dropdown Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            className="mobile-drawer"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="wrap mobile-drawer-inner">
              <a href="/" className={`mobile-nav-link ${isHome && activeHomeSection === '' ? 'is-active' : ''}`} onClick={go('/')}>
                Overview
              </a>
              <a href="/#shift" className={`mobile-nav-link ${isHome && activeHomeSection === 'shift' ? 'is-active' : ''}`} onClick={go('/#shift')}>
                The Shift (Raw Chat vs. Git ADR)
              </a>
              <a href="/#calibrate" className={`mobile-nav-link ${isHome && activeHomeSection === 'calibrate' ? 'is-active' : ''}`} onClick={go('/#calibrate')}>
                Calibrate (Scope &amp; WEP ±20%)
              </a>
              <a href="/#gate" className={`mobile-nav-link ${isHome && activeHomeSection === 'gate' ? 'is-active' : ''}`} onClick={go('/#gate')}>
                Interactive Phase 0 Gate
              </a>
              <a href="/#setup" className="mobile-nav-link" onClick={go('/#setup')}>
                10-Host Setup &amp; Prompt Builder
              </a>
              <a
                href="/playground"
                className={`mobile-nav-link ${isPlayground ? 'is-active' : ''}`}
                onClick={go('/playground')}
              >
                Live Playground (ADR Auditor · WEP · Prompt Studio)
              </a>
              <a
                href="/docs/quickstart"
                className={`mobile-nav-link ${isDocs ? 'is-active' : ''}`}
                onClick={go('/docs/quickstart')}
              >
                Documentation Portal (11 Guides)
              </a>
              <button
                type="button"
                className="mobile-nav-link mobile-nav-action"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenReference();
                }}
              >
                Quick Reference Cheat Sheet (?)
              </button>
              <a
                href="https://github.com/bhaskarjha-dev/vivechak"
                target="_blank"
                rel="noreferrer"
                className="mobile-nav-link mobile-nav-gh"
                onClick={() => setMobileOpen(false)}
              >
                GitHub Repository ↗
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};
