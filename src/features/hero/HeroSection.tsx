import React, { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Copy, RotateCcw, Terminal } from 'lucide-react';
import { INSTALL_CHANNELS, SCOPE_PREVIEWS } from '@/shared/data/vivechakData';
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
// Hardware GPUs launch full Three.js WebGL2; software/non-GPU browsers run the instant 0ms-load 60fps Canvas2D forge!
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
  { id: 'sift', label: 'Sift', hint: 'Drag 360° in 3D', desktopHint: ' · outer rim rolls Z · hold to distill · pull drop' },
  { id: 'noise', label: 'Raw Chat', hint: 'Sieve parts open — unverified memory pours straight into code' },
  { id: 'sealed', label: 'Sealed', hint: 'SHA-256 red-team challenge & human TTY sign-off locked' },
];

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
  const [scopeId, setScopeId] = useState<'comparison' | 'decision' | 'project'>('comparison');
  const [scopeCopied, setScopeCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<SieveMode>('sift');
  const [siftedCount, setSiftedCount] = useState(14);
  const [impulseNonce, setImpulseNonce] = useState(0);
  const [impulseText, setImpulseText] = useState(VERIFIED_PROOFS[0]);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hoveredSculpture, setHoveredSculpture] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);
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
    setSiftedCount((c) => c + 1);
  };

  const triggerSuperDistill = () => {
    soundEngine.playGatePass();
    setHasInteracted(true);
    setImpulseText('SEALED · G1–G12 PASS · EXIT 0');
    setImpulseNonce((n) => n + 1);
    setSiftedCount((c) => c + 3);
  };

  const activeScope = SCOPE_PREVIEWS.find((s) => s.id === scopeId) ?? SCOPE_PREVIEWS[0];

  const handleScopeCopy = async () => {
    const ok = await copyText(activeScope.command);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setScopeCopied(true);
    showToast(`Copied ${activeScope.tabLabel} command`);
    window.setTimeout(() => setScopeCopied(false), 1800);
  };

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
          <span>OPEN SOURCE · GO MCP SERVER &amp; CLI · V0.1.0</span>
          <span className="hero-live-status">
            <span className={`live-dot mode-${mode}`} aria-hidden="true" />
            {mode === 'sift' && (
              <span className="odo-wrap">
                SIEVE ACTIVE ·{' '}
                <span className="odo-window" data-count={siftedCount}>
                  <motion.span
                    key={siftedCount}
                    className="odo-digit"
                    initial={siftedCount === 14 ? false : { y: 8, opacity: 0.35 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {siftedCount}
                  </motion.span>
                </span>{' '}
                CLAIMS
              </span>
            )}
            {mode === 'noise' && 'RAW RECALL · UNVERIFIED'}
            {mode === 'sealed' && 'PHASE 0 · SHA-256 SEALED'}
          </span>
        </div>

        <div className="hero-main">
          <div className="hero-copy">
            <h1 className="hero-h1">
              Sift truth
              <br />
              <span className="hero-accent">before code.</span>
            </h1>

            <p className="hero-one-liner">
              Make AI coding agents prove hard architectural decisions with cited research,
              red-team checks, and human sign-off — stored in Git.
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

          {/* Signature Interactive Optical-Prism & Magnetic-Assembly Forge (Auto WebGL2 on GPU / Instant 60fps Canvas2D on Software/Cloudtop) */}
          {heroEngine === 'webgl' ? (
            <Suspense fallback={<HeroLogoFallback />}>
              <VivechakLogoHero
                mode={mode}
                theme={theme}
                impulseNonce={impulseNonce}
                impulseText={impulseText}
                onPulseClick={triggerSculpturePulse}
                onSuperDistill={triggerSuperDistill}
                onTruthPulse={() => setSiftedCount((n) => n + 1)}
              />
            </Suspense>
          ) : heroEngine === 'canvas2d' ? (
            <div
              className={`logo-hero-stage mode-${mode}`}
              id="sculpture-pulse-btn"
              role="button"
              tabIndex={0}
              aria-label="Interactive Vivechak sieve sculpture — drag to orbit 3D, hold to distill truth, or press Enter to condense a Grade A drop"
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
                onQuickPulse={triggerSculpturePulse}
                onSuperDistill={triggerSuperDistill}
                onTruthPulse={() => setSiftedCount((n) => n + 1)}
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
                    DRAG 360° X·Y·Z · HOLD TO DISTILL
                  </span>
                )}
              </div>
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
          ) : (
            <HeroLogoFallback />
          )}
        </div>

                {/* 3-Scope Epistemic Sieve Selector Strip */}
        <div className="hero-scopes-card" id="scopes-bar">
          <div className="scope-tabs-bar">
            <span className="scope-bar-tag mono">CHOOSE SCOPE</span>
            <div className="scope-tabs" role="tablist" aria-label="Vivechak decision scope levels">
              {SCOPE_PREVIEWS.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  role="tab"
                  id={`scope-tab-${sc.id}`}
                  aria-selected={sc.id === scopeId}
                  className={`scope-tab mono ${sc.id === scopeId ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(sc.id === 'comparison' ? 680 : sc.id === 'decision' ? 740 : 800);
                    setScopeId(sc.id);
                    setScopeCopied(false);
                  }}
                >
                  {sc.id === scopeId && (
                    <motion.span
                      layoutId="scopeTabBg"
                      className="scope-tab-bg"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                    />
                  )}
                  <span className="scope-tab-content">
                    <span className="scope-tab-icon">{sc.icon}</span>
                    <span className="scope-tab-text">{sc.tabLabel}</span>
                  </span>
                </button>
              ))}
            </div>
            <span className="scope-sessions-tag mono">{activeScope.time}</span>
          </div>

          <div className="scope-preview-content">
            <div className="scope-text-col">
              <div className="scope-header-row">
                <span className="scope-badge mono">{activeScope.badge}</span>
                <span className="scope-guarantee mono">{activeScope.overhead}</span>
              </div>
              <h3 className="scope-heading">{activeScope.title}</h3>
              <p className="scope-explanation">{activeScope.desc}</p>
              <div className="scope-example-box mono">
                <span className="scope-ex-lbl">ASK IN CHAT:</span>
                <span className="scope-ex-val">&quot;{activeScope.examplePrompt}&quot;</span>
              </div>
            </div>

            <div className="scope-action-col">
              <div className="scope-cli-box mono">
                <span className="scope-cli-prompt" aria-hidden="true">$</span>
                <code className="scope-cli-code">{activeScope.command}</code>
                <motion.button
                  type="button"
                  className={`dock-copy mono ${scopeCopied ? 'copied' : ''}`}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleScopeCopy}
                  title="Copy scope invocation command"
                >
                  {scopeCopied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
                  <span>{scopeCopied ? 'Copied' : 'Copy'}</span>
                </motion.button>
              </div>

              <div className="scope-footer-row mono">
                <span className="scope-artifact-target">
                  OUTPUT: <strong>{activeScope.outputFile}</strong>
                </span>
                <a
                  href={activeScope.linkHref}
                  className="scope-jump-link"
                  onClick={() => soundEngine.playTick(720)}
                >
                  <span>{activeScope.linkLabel}</span>
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="install-dock" id="install-bar">
          <div className="dock-tabs" role="tablist" aria-label="Install methods">
            {INSTALL_CHANNELS.map((ch) => (
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
