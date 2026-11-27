import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUpRight, Menu, Moon, Search, Sun, Volume2, VolumeX, X } from 'lucide-react';
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
  { id: 'architecture', href: '/architecture', label: 'Architecture' },
  { id: 'setup', href: '/setup', label: 'Setup' },
  { id: 'playground', href: '/playground', label: 'Playground' },
  { id: 'docs', href: '/docs/quickstart', label: 'Docs' },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  pathname,
  theme,
  onToggleTheme,
  soundOn,
  onToggleSound,
  onOpenPalette,
  onOpenReference,
}) => {
  const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
  const isPlayground = pathname === '/playground';
  const isArchitecture = pathname === '/architecture';
  const isSetup = pathname === '/setup';

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 34,
    restDelta: 0.001,
  });

  useEffect(() => {
    setMobileOpen(false);
    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        setScrolled(window.scrollY > 14);
      });
    };
    setScrolled(window.scrollY > 14);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
    };
  }, [pathname]);

  const go = (to: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    soundEngine.playTick(760);
    setMobileOpen(false);
    navigate(to);
  };

  return (
    <header className={`nav-bar ${scrolled ? 'is-scrolled' : ''}`} id="site-header">
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
            width={22}
            height={22}
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
          <img
            src="/assets/wordmark-dark.svg"
            alt="विवेचक"
            width={36}
            height={13}
            className="nav-devanagari brand-for-dark"
          />
          <img
            src="/assets/wordmark-light.svg"
            alt="विवेचक"
            width={36}
            height={13}
            className="nav-devanagari brand-for-light"
          />
        </a>

        <nav className="nav-links" aria-label="Primary navigation">
          {PRIMARY_LINKS.map((l) => {
            const isAct =
              l.id === 'architecture'
                ? isArchitecture
                : l.id === 'setup'
                  ? isSetup
                  : l.id === 'playground'
                    ? isPlayground
                    : isDocs;
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
              </a>
            );
          })}
        </nav>

        <div className="nav-actions">
          <button
            type="button"
            id="btn-command-palette"
            className="nav-ghost-btn nav-search-btn"
            onClick={() => {
              soundEngine.playTick(820);
              onOpenPalette();
            }}
            aria-label="Search documentation and commands"
            title="Search (⌘K)"
          >
            <Search size={14} strokeWidth={1.85} />
            <span className="nav-kbd mono">⌘K</span>
          </button>

          <button
            type="button"
            id="btn-theme-toggle"
            className="nav-ghost-btn"
            onClick={onToggleTheme}
            aria-pressed={theme === 'light'}
            aria-label={theme === 'light' ? 'Switch to dark theme (T)' : 'Switch to light theme (T)'}
            title={theme === 'light' ? 'Dark theme (T)' : 'Light theme (T)'}
          >
            {theme === 'light' ? <Moon size={15} strokeWidth={1.8} /> : <Sun size={15} strokeWidth={1.8} />}
          </button>

          <button
            type="button"
            id="btn-sound-toggle"
            className={`nav-ghost-btn ${soundOn ? 'is-on' : ''}`}
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound effects' : 'Enable subtle sound effects'}
            title={soundOn ? 'Mute audio' : 'Enable subtle tactile audio'}
          >
            {soundOn ? <Volume2 size={15} strokeWidth={1.8} /> : <VolumeX size={15} strokeWidth={1.8} />}
          </button>

          <span className="nav-divider" aria-hidden="true" />

          <a
            href="https://github.com/bhaskarjha-dev/vivechak"
            target="_blank"
            rel="noreferrer"
            className="nav-gh-link"
            id="nav-github"
            onClick={() => soundEngine.playTick(700)}
          >
            <span>GitHub</span>
            <ArrowUpRight size={13} strokeWidth={1.9} />
          </a>

          <button
            type="button"
            className="nav-ghost-btn nav-mobile-btn"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => {
              soundEngine.playTick(720);
              setMobileOpen((v) => !v);
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            className="mobile-drawer"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
          >
            <div className="wrap mobile-drawer-inner">
              <a
                href="/"
                className={`mobile-nav-link ${pathname === '/' ? 'is-active' : ''}`}
                onClick={go('/')}
              >
                Overview
              </a>
              <a
                href="/architecture"
                className={`mobile-nav-link ${isArchitecture ? 'is-active' : ''}`}
                onClick={go('/architecture')}
              >
                Architecture &amp; Security
              </a>
              <a
                href="/setup"
                className={`mobile-nav-link ${isSetup ? 'is-active' : ''}`}
                onClick={go('/setup')}
              >
                Install &amp; Setup
              </a>
              <a
                href="/playground"
                className={`mobile-nav-link ${isPlayground ? 'is-active' : ''}`}
                onClick={go('/playground')}
              >
                Playground
              </a>
              <a
                href="/docs/quickstart"
                className={`mobile-nav-link ${isDocs ? 'is-active' : ''}`}
                onClick={go('/docs/quickstart')}
              >
                Documentation
              </a>
              <button
                type="button"
                className="mobile-nav-link mobile-nav-action"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenReference();
                }}
              >
                Quick Reference (?)
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
