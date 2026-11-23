import React from 'react';
import { ArrowUp, ArrowUpRight, BookOpen } from 'lucide-react';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import type { ThemeMode } from '@/shared/lib/theme';

interface FooterProps {
  theme: ThemeMode;
  onOpenReference: () => void;
}

const INTERNAL_LINKS = [
  { label: 'Quickstart', to: '/docs/quickstart' },
  { label: '3 Scopes', to: '/docs/scopes' },
  { label: 'Examples', to: '/docs/examples' },
  { label: 'MCP Reference', to: '/docs/mcp-reference' },
  { label: 'Playground', to: '/playground' },
];

const EXTERNAL_LINKS = [
  { label: 'Releases', href: 'https://github.com/bhaskarjha-dev/vivechak/releases' },
  { label: 'GitHub', href: 'https://github.com/bhaskarjha-dev/vivechak' },
];

export const Footer: React.FC<FooterProps> = ({ onOpenReference }) => {
  return (
    <footer className="colophon-footer" id="footer">
      <div className="wrap">
        <div className="colophon-row">
          <div className="colophon-id">
            <svg
              viewBox="0 0 512 512"
              width={36}
              height={36}
              className="nav-logo-svg colophon-logo-svg"
              aria-hidden="true"
            >
              <path
                className="nav-logo-funnel"
                fillRule="evenodd"
                d="M 112 116.25 H 400 A 18 18 0 0 1 400 152.25 H 375.8 A 10.8 10.8 0 0 0 366.45 157.65 L 271.59 321.96 A 18 18 0 0 1 240.41 321.96 L 145.55 157.65 A 10.8 10.8 0 0 0 136.2 152.25 H 112 A 18 18 0 0 1 112 116.25 Z M 315.53 152.25 H 196.47 A 7.2 7.2 0 0 0 190.24 163.05 L 249.76 266.16 A 7.2 7.2 0 0 0 262.24 266.16 L 321.76 163.05 A 7.2 7.2 0 0 0 315.53 152.25 Z"
              />
              <circle cx="256" cy="374.16" r="21.6" fill="#F2A33A" className="nav-logo-drop" />
            </svg>
            <div>
              <div className="colophon-lockup-line">
                <span className="colophon-name">Vivechak</span>
                <img
                  src="/assets/wordmark-dark.svg"
                  alt="Vivechak calligraphy wordmark"
                  width={48}
                  height={17}
                  className="colophon-wm brand-for-dark"
                />
                <img
                  src="/assets/wordmark-light.svg"
                  alt="Vivechak calligraphy wordmark"
                  width={48}
                  height={17}
                  className="colophon-wm brand-for-light"
                />
              </div>
              <span className="colophon-etym">
                Sanskrit <em>vivechaka</em> — &ldquo;the discerning analyst&rdquo; (vi- apart + √vic to sift)
              </span>
            </div>
          </div>

          <nav className="colophon-links" aria-label="Footer links">
            {INTERNAL_LINKS.map((l) => (
              <a
                key={l.to}
                href={l.to}
                className="colophon-link"
                onClick={(e) => {
                  e.preventDefault();
                  soundEngine.playTick(740);
                  navigate(l.to);
                }}
              >
                <span>{l.label}</span>
              </a>
            ))}
            <button
              type="button"
              className="colophon-link colophon-btn"
              onClick={() => {
                soundEngine.playTick(760);
                onOpenReference();
              }}
            >
              <BookOpen size={12} />
              <span>Quick Ref</span>
            </button>
            {EXTERNAL_LINKS.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="colophon-link">
                <span>{l.label}</span>
                <ArrowUpRight size={12} />
              </a>
            ))}
            <button
              type="button"
              className="colophon-link colophon-btn"
              onClick={() => {
                soundEngine.playTick(680);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Back to top"
            >
              <span>Top</span>
              <ArrowUp size={12} />
            </button>
          </nav>
        </div>

        <div className="colophon-meta mono">
          <span>MIT LICENSE · © 2026 BHASKAR JHA · SHORTCUTS: ⌘K · T (THEME) · ? (QUICK REF)</span>
          <span>VIVECHAK.BHASKARJHA.DEV · V0.1.0</span>
        </div>
      </div>
    </footer>
  );
};
