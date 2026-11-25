import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Copy, RotateCcw, Terminal } from 'lucide-react';
import { INSTALL_CHANNELS } from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import type { ThemeMode } from '@/shared/lib/theme';
import { Magnetic } from '@/shared/components/Magnetic';
import { VivechakLogoCanvas2D } from './VivechakLogoCanvas2D';
import type { SieveMode } from './VivechakLogoHero';

const loadVivechakLogoHero = () =>
  import('@/features/hero/VivechakLogoHero').then((m) => ({ default: m.VivechakLogoHero }));

// Detect real hardware-accelerated WebGL vs software-emulated / disabled GPU (Cloudtop, CRD, VMs).
// Hardware GPUs launch full Three.js WebGL2; software/non-GPU browsers run the instant 0ms-load 60fps Canvas2D forge.
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
        <circle cx="256" cy="374.16" r="34.5" fill="none" stroke="#F2A33A" strokeOpacity="0.38" strokeWidth="1.6" />
        <circle cx="256" cy="374.16" r="21.6" fill="#F2A33A" />
      </svg>
    </div>
  </div>
);

interface HeroSectionProps {
  theme: ThemeMode;
  onSelectHost?: (hostId: string) => void;
}

const QUICK_HOSTS = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'vscode', label: 'VS Code' },
  { id: 'antigravity', label: 'Antigravity' },
  { id: 'zed', label: 'Zed' },
  { id: 'windsurf', label: 'Windsurf' },
];

const VERIFIED_PROOFS = [
  'GRADE A · clickhouse.com/docs · MERGETREE VERIFIED',
  'RED-TEAM · D-001-R1 · SHA-256 BOUND',
  'DELTA · PG16 CTE <50ms · NEO4J REFUTED',
  'WEP ±20% · WEIGHT-SENSITIVE FLIP CAUGHT',
  'HUMAN TTY · vck signoff · EXIT 0 SEALED',
];

const MODES: { id: SieveMode; label: string; hint: string; desktopHint?: string }[] = [
  { id: 'sift', label: 'Sift', hint: 'Drag to spin · flick sets axis', desktopHint: ' · hold to distill · dbl-click resets' },
  { id: 'noise', label: 'Raw Chat', hint: 'Ungated AI guesses straight into code' },
  { id: 'sealed', label: 'Sealed', hint: 'Red-teamed & human-signed · Exit 0' },
];

const PRIMARY_CHANNEL_IDS = new Set(['shell', 'brew', 'powershell', 'npx', 'uvx', 'skill']);

const SHORT_LABELS: Record<string, string> = {
  shell: 'curl',
  brew: 'brew',
  winget: 'winget',
  scoop: 'scoop',
  powershell: 'win',
  npx: 'npx',
  uvx: 'uvx',
  pip: 'pip',
  'linux-pkg': 'deb/rpm',
  docker: 'docker',
  skill: 'skill',
  nix: 'nix',
  go: 'go',
};

export const HeroSection: React.FC<HeroSectionProps> = ({ theme, onSelectHost }) => {
  const [channelId, setChannelId] = useState(INSTALL_CHANNELS[0].id);
  const [showAllChannels, setShowAllChannels] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<SieveMode>('sift');
  const [distilledCount, setDistilledCount] = useState(0);
  const [impulseNonce, setImpulseNonce] = useState(0);
  const [impulseText, setImpulseText] = useState(VERIFIED_PROOFS[0]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasCustomSpin, setHasCustomSpin] = useState(false);
  const [hoveredSculpture, setHoveredSculpture] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
  const [resetAxisNonce, setResetAxisNonce] = useState(0);
  const [scrolled, setScrolled] = useState(false);
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
      const saved = localStorage.getItem('vck_install_channel');
      if (saved && INSTALL_CHANNELS.some((c) => c.id === saved)) {
        setChannelId(saved);
        if (!PRIMARY_CHANNEL_IDS.has(saved)) setShowAllChannels(true);
      } else if (navigator.userAgent && /Windows/i.test(navigator.userAgent)) {
        setChannelId('powershell');
      }
    } catch {
      // ignore
    }

    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const selectChannel = (id: string) => {
    soundEngine.playTick(720);
    setChannelId(id);
    setCopied(false);
    try {
      localStorage.setItem('vck_install_channel', id);
    } catch {
      // ignore
    }
  };

  const triggerSculpturePulse = () => {
    soundEngine.playSieveDrop();
    setHasInteracted(true);
    setImpulseNonce((n) => {
      const next = n + 1;
      setImpulseText(VERIFIED_PROOFS[(next - 1) % VERIFIED_PROOFS.length]);
      return next;
    });
    setDistilledCount((c) => c + 1);
  };

  const triggerSuperDistill = () => {
    soundEngine.playGatePass();
    setHasInteracted(true);
    setImpulseText('SEALED · G1–G12 PASS · EXIT 0');
    setImpulseNonce((n) => n + 1);
    setDistilledCount((c) => c + 1);
  };

  const primaryChannels = INSTALL_CHANNELS.filter((c) => PRIMARY_CHANNEL_IDS.has(c.id));
  const extraChannels = INSTALL_CHANNELS.filter((c) => !PRIMARY_CHANNEL_IDS.has(c.id));
  const visibleChannels = showAllChannels ? INSTALL_CHANNELS : primaryChannels;
  const activeChannel =
    INSTALL_CHANNELS.find((c) => c.id === channelId) ?? INSTALL_CHANNELS[0];
  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  const handleCopy = async () => {
    const ok = await copyText(activeChannel.command);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopied(true);
    showToast(`Copied ${SHORT_LABELS[activeChannel.id] ?? activeChannel.label} install command`);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="hero-stage" id="top">
      <div className="wrap hero-overlay">
        <div className="hero-top-meta mono">
          <span>OPEN-SOURCE GO MCP SERVER &amp; CLI · V0.1.0</span>
          <span className="hero-live-status">
            <span className={`live-dot mode-${mode}`} aria-hidden="true" />
            {mode === 'sift' &&
              (distilledCount > 0 ? (
                <span className="odo-wrap">
                  SIEVE ACTIVE ·{' '}
                  <span className="odo-window" data-count={distilledCount}>
                    <motion.span
                      key={distilledCount}
                      className="odo-digit"
                      initial={{ y: 8, opacity: 0.35 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      +{distilledCount}
                    </motion.span>
                  </span>{' '}
                  DISTILLED
                </span>
              ) : (
                'EPISTEMIC SIEVE · 30° APERTURE'
              ))}
            {mode === 'noise' && 'RAW RECALL · UNGATED'}
            {mode === 'sealed' && 'PHASE 0 · SHA-256 SEALED'}
          </span>
        </div>

        <div className="hero-main">
          <div className="hero-copy">
            <h1 className="hero-h1">
              Prove decisions{' '}
              <br />
              <span className="hero-accent">before code.</span>
            </h1>

            <p className="hero-one-liner">
              Force AI coding agents to cite proof, stress-test tradeoffs, and earn human sign-off — in plain Git Markdown.
            </p>

            <div className="hero-actions">
              <Magnetic>
                <motion.a
                  href="#gate"
                  id="hero-cta-gate"
                  className="btn-saffron"
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => soundEngine.playSieveDrop()}
                >
                  <Terminal size={15} strokeWidth={2.2} />
                  <span>Try Live Gate</span>
                </motion.a>
              </Magnetic>
              <motion.a
                href="#setup"
                id="hero-cta-setup"
                className="btn-glass"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => soundEngine.playTick(740)}
              >
                <span>Wire Your Editor</span>
                <ArrowRight size={15} strokeWidth={2} />
              </motion.a>
            </div>

            <div className="hero-quiet-proof mono" aria-label="Core architectural guarantees">
              <span className="hqp-item">0 hidden DBs</span>
              <span className="hqp-item">0 telemetry</span>
              <span className="hqp-item">9 MCP tools (&lt;10 KB)</span>
            </div>
          </div>

          <div className="hero-sculpture-col">
            {/* Signature Interactive Optical-Prism Monument (WebGL2 on GPU / 60fps True-3D Canvas2D Fallback) */}
            {heroEngine === 'webgl' ? (
              <Suspense fallback={<HeroLogoFallback />}>
                <VivechakLogoHero
                  mode={mode}
                  theme={theme}
                  impulseNonce={impulseNonce}
                  impulseText={impulseText}
                  onPulseClick={triggerSculpturePulse}
                  onSuperDistill={triggerSuperDistill}
                  onTruthPulse={() => setDistilledCount((n) => n + 1)}
                />
              </Suspense>
            ) : heroEngine === 'canvas2d' ? (
              <div
                className={`logo-hero-stage mode-${mode}`}
                data-engine="canvas2d"
                id="sculpture-pulse-btn"
                role="button"
                tabIndex={0}
                aria-label="Interactive Vivechak sieve sculpture — drag to orbit 360° across X, Y, and Z, hold to distill truth, pull the drop, or press Enter"
                onPointerEnter={() => setHoveredSculpture(true)}
                onPointerLeave={() => setHoveredSculpture(false)}
                onPointerDown={() => setHasInteracted(true)}
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
                  onQuickPulse={triggerSculpturePulse}
                  onSuperDistill={triggerSuperDistill}
                  onTruthPulse={() => setDistilledCount((n) => n + 1)}
                  onCustomSpinChange={setHasCustomSpin}
                />
                <div className="logo-pulse-layer" aria-hidden="true">
                  <AnimatePresence>
                    {impulseNonce > 0 && (
                      <motion.span
                        key={impulseNonce}
                        className={`sculpture-pulse-tag mono ${impulseText.includes('EXIT 0') ? 'is-super' : ''}`}
                        initial={{ opacity: 0.98, y: 12, scale: 0.92 }}
                        animate={{ opacity: 0, y: -38, scale: 1.02 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {impulseText}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {hoveredSculpture && !hasInteracted && mode === 'sift' && (
                    <span className="logo-first-whisper mono">
                      DRAG TO SPIN · FLICK SETS AXIS · HOLD TO DISTILL
                    </span>
                  )}
                </div>
                <div className="logo-corner-controls">
                  {hasCustomSpin && (
                    <button
                      type="button"
                      id="btn-reset-axis"
                      className="logo-replay-btn is-visible mono"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playSieveDrop();
                        setResetAxisNonce((n) => n + 1);
                      }}
                      title="Reset rotation axis & upright angle"
                      aria-label="Reset 3D rotation axis"
                    >
                      <RotateCcw size={11} />
                      <span>Reset Axis</span>
                    </button>
                  )}
                  <button
                    type="button"
                    id="btn-replay-logo"
                    className="logo-replay-btn mono"
                    onClick={(e) => {
                      e.stopPropagation();
                      soundEngine.playTick(760);
                      setReplayNonce((n) => n + 1);
                    }}
                    title="Replay entrance & liquid condensation"
                    aria-label="Replay Vivechak logo animation"
                  >
                    <RotateCcw size={11} />
                    <span>Replay</span>
                  </button>
                </div>
              </div>
            ) : (
              <HeroLogoFallback />
            )}

            {/* Instrument Lens Controls — Anchored Directly Below the Physical Sieve */}
            <div className="sieve-mode-bar">
              <div className="sieve-pills" role="group" aria-label="3D Epistemic Sieve mode">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    id={`sieve-mode-${m.id}`}
                    className={`sieve-pill mono ${mode === m.id ? 'active' : ''}`}
                    onClick={() => {
                      if (m.id === 'sealed') soundEngine.playGatePass();
                      else if (m.id === 'noise') soundEngine.playReject();
                      else soundEngine.playSieveDrop();
                      setMode(m.id);
                    }}
                  >
                    {mode === m.id && (
                      <motion.span
                        layoutId="sieveModePill"
                        className="sieve-pill-bg"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      />
                    )}
                    <span className="sieve-pill-label">{m.label}</span>
                  </button>
                ))}
              </div>
              <span key={mode} className="sieve-hint mono">
                {activeMode.hint}
                {activeMode.desktopHint && (
                  <span className="desktop-only-inline">{activeMode.desktopHint}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="install-dock" id="install-bar">
          <div className="dock-tabs" role="tablist" aria-label="Install methods">
            {visibleChannels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                role="tab"
                aria-selected={ch.id === channelId}
                className={`dock-tab mono ${ch.id === channelId ? 'active' : ''}`}
                onClick={() => selectChannel(ch.id)}
              >
                {ch.id === channelId && (
                  <motion.span
                    layoutId="installTabBg"
                    className="dock-tab-bg"
                    transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="dock-tab-text">{SHORT_LABELS[ch.id] ?? ch.label}</span>
              </button>
            ))}

            <button
              type="button"
              id="btn-toggle-more-channels"
              className={`dock-tab dock-more-btn mono ${showAllChannels ? 'is-open' : ''}`}
              aria-expanded={showAllChannels}
              onClick={() => {
                soundEngine.playTick(740);
                setShowAllChannels((v) => !v);
              }}
            >
              <span>{showAllChannels ? 'Less' : `+${extraChannels.length} more`}</span>
              <ChevronDown size={11} className={`dock-more-chev ${showAllChannels ? 'is-open' : ''}`} />
            </button>
          </div>

          <div className="dock-cmd">
            <span className="dock-prompt mono" aria-hidden="true">$</span>
            <code className="dock-code mono" id="install-command-text">
              {activeChannel.command}
            </code>
            <motion.button
              type="button"
              id="btn-copy-install"
              className={`dock-copy mono ${copied ? 'copied' : ''}`}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
            >
              {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </motion.button>
          </div>

          {activeChannel.id === 'skill' && (
            <div className="dock-skill-note mono">
              Dual-mode SKILL.md — works standalone (zero binary) or auto-upgrades with local vck MCP tools.
            </div>
          )}

          <div className="hero-hosts-strip mono" aria-label="Supported MCP editors">
            <span className="hero-hosts-lbl">WORKS IN</span>
            <div className="hero-hosts-list">
              {QUICK_HOSTS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="hero-host-chip mono"
                  onClick={() => {
                    soundEngine.playTick(760);
                    onSelectHost?.(h.id);
                  }}
                >
                  {h.label}
                </button>
              ))}
              <a
                href="#setup"
                className="hero-host-more mono"
                onClick={() => soundEngine.playTick(720)}
              >
                +4 hosts →
              </a>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#shift"
        className={`scroll-cue mono ${scrolled ? 'is-gone' : ''}`}
        aria-label="Scroll to see how Vivechak works"
      >
        <span>SCROLL</span>
        <span className="scroll-cue-track" aria-hidden="true">
          <span className="scroll-cue-drop" />
        </span>
      </a>
    </section>
  );
};
