import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Pause, Play, RotateCcw } from 'lucide-react';
import { copyText } from '@/shared/lib/clipboard';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import type { ThemeMode } from '@/shared/lib/theme';
import { VivechakLogoCanvas2D } from './VivechakLogoCanvas2D';
import type { SieveMode } from './VivechakLogoHero';

const loadVivechakLogoHero = () =>
  import('@/features/hero/VivechakLogoHero').then((m) => ({ default: m.VivechakLogoHero }));

function detectHardwareWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.search.includes('force3d=1')) return true;
  if (window.location.search.includes('force2d=1')) return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true }) ||
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })) as WebGLRenderingContext | null;
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
      if (/swiftshader|llvmpipe|software|basic render|subzero/i.test(renderer)) {
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return false;
      }
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

const VivechakLogoHero = lazy(loadVivechakLogoHero);

const HeroLogoFallback = () => (
  <div className="logo-hero-stage" aria-hidden="true">
    <div className="logo-prelude-svg">
      <svg viewBox="0 0 512 512" className="logo-hero-svg">
        <path
          d="M 112 116.25 H 400 A 18 18 0 0 1 400 152.25 H 375.8 A 10.8 10.8 0 0 0 366.45 157.65 L 271.59 321.96 A 18 18 0 0 1 240.41 321.96 L 145.55 157.65 A 10.8 10.8 0 0 0 136.2 152.25 H 112 A 18 18 0 0 1 112 116.25 Z M 315.53 152.25 H 196.47 A 7.2 7.2 0 0 0 190.24 163.05 L 249.76 266.16 A 7.2 7.2 0 0 0 262.24 266.16 L 321.76 163.05 A 7.2 7.2 0 0 0 315.53 152.25 Z"
          fillRule="evenodd"
          className="vck-mark-body"
        />
        <circle cx="256" cy="374.16" r="34.5" fill="none" stroke="#F2A33A" strokeOpacity="0.34" strokeWidth="1.5" />
        <circle cx="256" cy="374.16" r="21.6" fill="#F2A33A" />
      </svg>
    </div>
  </div>
);

interface HeroSectionProps {
  theme: ThemeMode;
  onSelectHost?: (hostId: string) => void;
}

const VERIFIED_PROOFS = [
  'Grade A · clickhouse.com/docs',
  'D-001-R1 · SHA-256 bound',
  'PG16 CTE <50ms · Neo4j refuted',
  'WEP ±20% · flip caught',
  '/dev/tty · Exit 0 sealed',
];

const MODES: { id: SieveMode; label: string; topSig: string; botSig: string; tone: 'sift' | 'raw' | 'sealed' }[] = [
  { id: 'sift', label: 'Sift', topSig: 'IN · RECALL + URLS', botSig: 'OUT · [A · FETCHED]', tone: 'sift' },
  { id: 'noise', label: 'Raw', topSig: 'UNFILTERED MEMORY', botSig: 'GRADE D · BYPASSED', tone: 'raw' },
  { id: 'sealed', label: 'Sealed', topSig: 'G1–G12 VERIFIED', botSig: 'EXIT 0 · /DEV/TTY', tone: 'sealed' },
];

interface HeroInstallTab {
  id: 'shell' | 'brew' | 'powershell' | 'npx' | 'uvx';
  label: string;
  primaryCmd: string;
  wireCmd?: string;
  wireComment?: string;
  ephemeralHint?: string;
}

const HERO_INSTALL_TABS: HeroInstallTab[] = [
  {
    id: 'shell',
    label: 'macOS / Linux',
    primaryCmd: 'curl -fsSL https://vivechak.bhaskarjha.dev/install.sh | bash',
    wireCmd: 'vck setup',
    wireComment: '# auto-wires your AI editor',
  },
  {
    id: 'brew',
    label: 'Homebrew',
    primaryCmd: 'brew install --cask bhaskarjha-dev/tap/vivechak',
    wireCmd: 'vck setup',
    wireComment: '# auto-wires your AI editor',
  },
  {
    id: 'powershell',
    label: 'Windows',
    primaryCmd: 'irm https://vivechak.bhaskarjha.dev/install.ps1 | iex',
    wireCmd: 'vck setup',
    wireComment: '# auto-wires your AI editor',
  },
  {
    id: 'npx',
    label: 'npx',
    primaryCmd: 'npx -y vivechak serve',
    ephemeralHint: 'Zero-install Node.js MCP server · add to mcp.json',
  },
  {
    id: 'uvx',
    label: 'uvx',
    primaryCmd: 'uvx vck serve',
    ephemeralHint: 'Zero-install Python/uv MCP server · add to mcp.json',
  },
];

const HERO_QUICK_HOSTS = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'zed', label: 'Zed' },
  { id: 'antigravity', label: 'Antigravity' },
] as const;

export const HeroSection: React.FC<HeroSectionProps> = ({ theme, onSelectHost }) => {
  const [channelId, setChannelId] = useState<HeroInstallTab['id']>('shell');
  const [copiedKey, setCopiedKey] = useState<'primary' | 'wire' | null>(null);
  const [mode, setMode] = useState<SieveMode>('sift');
  const [impulseNonce, setImpulseNonce] = useState(0);
  const [impulseText, setImpulseText] = useState(VERIFIED_PROOFS[0]);
  const [hasCustomSpin, setHasCustomSpin] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
  const [resetAxisNonce, setResetAxisNonce] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [heroEngine, setHeroEngine] = useState<'ssr' | 'webgl' | 'canvas2d'>('ssr');

  useEffect(() => {
    const hwGl = detectHardwareWebGL();
    if (hwGl) {
      void loadVivechakLogoHero();
      setHeroEngine('webgl');
    } else {
      setHeroEngine('canvas2d');
    }
    try {
      const saved = localStorage.getItem('vck_hero_channel') as HeroInstallTab['id'] | null;
      if (saved && HERO_INSTALL_TABS.some((c) => c.id === saved)) {
        setChannelId(saved);
      } else if (navigator.userAgent && /Windows/i.test(navigator.userAgent)) {
        setChannelId('powershell');
      }
    } catch {
      // ignore
    }
  }, []);

  const triggerSculpturePulse = () => {
    soundEngine.playSieveDrop();
    setImpulseNonce((n) => {
      const next = n + 1;
      setImpulseText(VERIFIED_PROOFS[(next - 1) % VERIFIED_PROOFS.length]);
      return next;
    });
  };

  const triggerSuperDistill = () => {
    soundEngine.playGatePass();
    setImpulseText('Sealed · G1–G12 · Exit 0');
    setImpulseNonce((n) => n + 1);
  };

  const activeChannel =
    HERO_INSTALL_TABS.find((c) => c.id === channelId) ?? HERO_INSTALL_TABS[0];
  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  const selectHeroChannel = (id: HeroInstallTab['id']) => {
    soundEngine.playTick(740);
    setChannelId(id);
    setCopiedKey(null);
    try {
      localStorage.setItem('vck_hero_channel', id);
    } catch {
      // ignore
    }
  };

  const handleCopy = async (key: 'primary' | 'wire', cmd: string, toastLabel: string) => {
    const ok = await copyText(cmd);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedKey(key);
    showToast(`Copied ${toastLabel}`);
    window.setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleHostClick = (hostId: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    soundEngine.playTick(760);
    if (onSelectHost) {
      onSelectHost(hostId);
    } else {
      navigate(`/setup?host=${encodeURIComponent(hostId)}`);
    }
  };

  return (
    <section className="hero-stage" id="top">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker mono">
            <span className="hero-kicker-seg">v0.1.0</span>
            <span className="hero-kicker-sep">·</span>
            <span className="hero-kicker-seg">Local MCP server</span>
            <span className="hero-kicker-sep">·</span>
            <span className="hero-kicker-seg">9 MB Go</span>
            <span className="hero-kicker-sep">·</span>
            <span className="hero-kicker-seg">0 telemetry</span>
          </p>

          <h1 className="hero-h1">
            Prove decisions
            <br />
            <span className="hero-h1-muted">before code</span>
          </h1>

          <p className="hero-lead">
            Cited research, SHA-256 red-teaming, and human sign-off — in Git Markdown.
          </p>

          <div className="hero-actions">
            <a
              href="#gate"
              id="hero-cta-gate"
              className="btn-primary"
              onClick={() => soundEngine.playSieveDrop()}
            >
              <span>Try the live gate</span>
              <ArrowRight size={15} strokeWidth={2} />
            </a>
            <a
              href="/playground"
              id="hero-cta-playground"
              className="btn-secondary"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playTick(740);
                navigate('/playground');
              }}
            >
              <span>Open Playground</span>
            </a>
          </div>

          <div className="hero-install" id="install-bar">
            <div className="hero-term-card">
              <div className="hero-term-head">
                <div className="hero-term-tabs" role="tablist" aria-label="Install MCP server">
                  {HERO_INSTALL_TABS.map((tab) => {
                    const isAct = tab.id === activeChannel.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isAct}
                        id={`hero-ch-${tab.id}`}
                        className={`hero-term-tab ${isAct ? 'active' : ''}`}
                        onClick={() => selectHeroChannel(tab.id)}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <a
                  href="/setup"
                  className="hero-term-more mono"
                  onClick={(e) => {
                    e.preventDefault();
                    soundEngine.playTick(740);
                    navigate('/setup');
                  }}
                >
                  All 12 + Skill →
                </a>
              </div>

              <div className="hero-term-body">
                <div className="hero-term-row">
                  <span className="hero-cmd-prompt mono" aria-hidden="true">$</span>
                  <code className="hero-cmd-code mono" id="install-command-text">
                    {activeChannel.primaryCmd}
                  </code>
                  <button
                    type="button"
                    id="btn-copy-install"
                    className={`inline-action-btn ${copiedKey === 'primary' ? 'copied' : ''}`}
                    onClick={() =>
                      handleCopy('primary', activeChannel.primaryCmd, `${activeChannel.label} command`)
                    }
                  >
                    {copiedKey === 'primary' ? (
                      <Check size={12} strokeWidth={2.3} />
                    ) : (
                      <Copy size={12} strokeWidth={1.9} />
                    )}
                    <span>{copiedKey === 'primary' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {activeChannel.wireCmd ? (
                  <div className="hero-term-row is-step2">
                    <span className="hero-cmd-prompt mono" aria-hidden="true">$</span>
                    <code className="hero-cmd-code mono" id="wire-command-text">
                      {activeChannel.wireCmd}
                      {activeChannel.wireComment && (
                        <span className="hero-cmd-comment"> {activeChannel.wireComment}</span>
                      )}
                    </code>
                    <button
                      type="button"
                      id="btn-copy-wire"
                      className={`inline-action-btn ${copiedKey === 'wire' ? 'copied' : ''}`}
                      onClick={() =>
                        handleCopy('wire', activeChannel.wireCmd!, 'vck setup command')
                      }
                    >
                      {copiedKey === 'wire' ? (
                        <Check size={12} strokeWidth={2.3} />
                      ) : (
                        <Copy size={12} strokeWidth={1.9} />
                      )}
                      <span>{copiedKey === 'wire' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="hero-term-row is-ephemeral">
                    <span className="hero-cmd-prompt is-muted mono" aria-hidden="true">#</span>
                    <span className="hero-ephemeral-note mono">{activeChannel.ephemeralHint}</span>
                    <a
                      href="/setup"
                      className="hero-ephemeral-link mono"
                      onClick={(e) => {
                        e.preventDefault();
                        soundEngine.playTick(740);
                        navigate('/setup');
                      }}
                    >
                      Host JSON →
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="hero-hosts-bar mono" aria-label="Verified MCP hosts">
              <span className="hero-hosts-lbl">MCP hosts</span>
              {HERO_QUICK_HOSTS.map((h) => (
                <a
                  key={h.id}
                  href={`/setup?host=${h.id}`}
                  className="hero-host-chip"
                  onClick={handleHostClick(h.id)}
                >
                  {h.label}
                </a>
              ))}
              <a
                href="/setup"
                className="hero-meta-link"
                onClick={(e) => {
                  e.preventDefault();
                  soundEngine.playTick(740);
                  navigate('/setup');
                }}
              >
                +5 more →
              </a>
            </div>
          </div>
        </div>

        <div className="hero-sculpture-col">
          <div className={`hero-optical-field tone-${activeMode.tone}`}>
            {/* Subtle Architectural Reticle — Dieter Rams Optical Instrument */}
            <svg className="optical-reticle" viewBox="0 0 420 420" aria-hidden="true">
              <circle cx="210" cy="210" r="184" className="reticle-ring" />
              <circle cx="210" cy="210" r="132" className="reticle-ring is-dashed" />
              <line x1="210" y1="12" x2="210" y2="34" className="reticle-tick" />
              <line x1="210" y1="386" x2="210" y2="408" className="reticle-tick" />
              <line x1="12" y1="210" x2="34" y2="210" className="reticle-tick" />
              <line x1="386" y1="210" x2="408" y2="210" className="reticle-tick" />
            </svg>

            <span className="optical-tag is-top mono" aria-hidden="true">
              {activeMode.topSig}
            </span>

            {heroEngine === 'webgl' ? (
              <Suspense fallback={<HeroLogoFallback />}>
                <VivechakLogoHero
                  mode={mode}
                  theme={theme}
                  impulseNonce={impulseNonce}
                  impulseText={impulseText}
                  rotationPaused={rotationPaused}
                  onPulseClick={triggerSculpturePulse}
                  onSuperDistill={triggerSuperDistill}
                />
              </Suspense>
            ) : heroEngine === 'canvas2d' ? (
              <div
                className={`logo-hero-stage mode-${mode}`}
                data-engine="canvas2d"
                id="sculpture-pulse-btn"
                role="button"
                tabIndex={0}
                aria-label="Interactive Vivechak sieve sculpture — drag to orbit 3D, hold to distill, pull the saffron drop, or press Enter"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerSculpturePulse();
                  }
                }}
              >
                <VivechakLogoCanvas2D
                  mode={mode}
                  theme={theme}
                  impulseNonce={impulseNonce}
                  replayNonce={replayNonce}
                  resetAxisNonce={resetAxisNonce}
                  rotationPaused={rotationPaused}
                  onQuickPulse={triggerSculpturePulse}
                  onSuperDistill={triggerSuperDistill}
                  onCustomSpinChange={setHasCustomSpin}
                />
                <div className="logo-pulse-layer" aria-hidden="true">
                  <AnimatePresence>
                    {impulseNonce > 0 && (
                      <motion.span
                        key={impulseNonce}
                        className={`sculpture-pulse-tag mono ${impulseText.includes('Exit 0') ? 'is-super' : ''}`}
                        initial={{ opacity: 0.96, y: 10, scale: 0.95 }}
                        animate={{ opacity: 0, y: -32, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {impulseText}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="logo-corner-controls">
                  {hasCustomSpin && (
                    <button
                      type="button"
                      id="btn-reset-axis"
                      className="logo-replay-btn is-visible"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playSieveDrop();
                        setResetAxisNonce((n) => n + 1);
                      }}
                      title="Reset upright orientation"
                      aria-label="Reset 3D orientation"
                    >
                      <RotateCcw size={11} />
                      <span>Reset</span>
                    </button>
                  )}
                  <button
                    type="button"
                    id="btn-replay-logo"
                    className="logo-replay-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playTick(760);
                      setReplayNonce((n) => n + 1);
                    }}
                    title="Replay distillation animation"
                    aria-label="Replay Vivechak animation"
                  >
                    <RotateCcw size={11} />
                    <span>Replay</span>
                  </button>
                </div>
              </div>
            ) : (
              <HeroLogoFallback />
            )}

            <span className={`optical-tag is-bottom mono tone-${activeMode.tone}`} aria-hidden="true">
              {activeMode.botSig}
            </span>
          </div>

          <div className="sieve-mode-bar">
            <div className="sieve-controls-row">
              <div className="sieve-rail" role="group" aria-label="Epistemic sieve state">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    id={`sieve-mode-${m.id}`}
                    className={`sieve-rail-btn ${mode === m.id ? 'active' : ''}`}
                    onClick={() => {
                      if (m.id === 'sealed') soundEngine.playGatePass();
                      else if (m.id === 'noise') soundEngine.playReject();
                      else soundEngine.playSieveDrop();
                      setMode(m.id);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                id="btn-toggle-rotation"
                className={`sieve-pause-icon ${rotationPaused ? 'is-paused' : ''}`}
                aria-pressed={rotationPaused}
                aria-label={rotationPaused ? 'Resume subtle motion' : 'Pause motion'}
                title={rotationPaused ? 'Resume motion' : 'Pause motion'}
                onClick={() => {
                  soundEngine.playTick(rotationPaused ? 780 : 540);
                  setRotationPaused((p) => !p);
                }}
              >
                {rotationPaused ? <Play size={12} /> : <Pause size={12} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
