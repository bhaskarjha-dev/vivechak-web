import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, Download } from 'lucide-react';
import {
  AGENTS_MD_SNIPPET,
  GITHUB_ACTIONS_SNIPPET,
  HOST_PRESETS,
  INSTALL_CHANNELS,
} from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { downloadTextFile } from '@/shared/lib/download';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

type SetupTab = 'cli' | 'agents' | 'ci';

const MCP_CHANNEL_ORDER = [
  'shell',
  'brew',
  'powershell',
  'winget',
  'npx',
  'uvx',
  'docker',
  'scoop',
  'pip',
  'linux-pkg',
  'nix',
  'go',
] as const;

const MCP_INSTALL_CHANNELS = MCP_CHANNEL_ORDER.map((id) =>
  INSTALL_CHANNELS.find((c) => c.id === id)
).filter((c): c is (typeof INSTALL_CHANNELS)[number] => Boolean(c));

const SHORT_LABELS: Record<string, string> = {
  shell: 'macOS / Linux',
  brew: 'Homebrew',
  powershell: 'Windows',
  winget: 'WinGet',
  npx: 'npx',
  uvx: 'uvx',
  docker: 'Docker',
  scoop: 'Scoop',
  pip: 'pip',
  'linux-pkg': 'deb / rpm',
  nix: 'Nix',
  go: 'Go',
};

const FAQ_ITEMS = [
  {
    q: 'When should I NOT use Vivechak?',
    a: 'Skip it for bug fixes, syntax help, and routine refactors. Use it only for hard-to-reverse bets: datastores, protocols, security boundaries, or greenfield design.',
  },
  {
    q: 'Does Vivechak call external LLMs or send telemetry?',
    a: 'Never. It is a ~9 MB local Go binary with zero outbound calls, zero telemetry, and zero hidden databases. Your agent researches; Vivechak structures, hashes, and gates research/.',
  },
  {
    q: 'How does human sign-off stop AI rubber-stamping?',
    a: 'One-Way Door ADRs require Grade A/B URLs, rejected alternatives, a SHA-256 red-team file (G10), and typed human /dev/tty sign-off (G11). Agents trying to set human_reviewed: true are rejected with E-HUMAN-ONLY-FIELD.',
  },
  {
    q: 'Can I try Vivechak without installing the binary?',
    a: 'Yes — install the standalone Agent Skill (npx skills add bhaskarjha-dev/vivechak), run ephemerally via npx -y vivechak serve / uvx vck serve, or build a ready-to-paste prompt in the Playground Prompt Studio.',
  },
  {
    q: 'Can Vivechak modify my application source code?',
    a: 'No. Writes are jailed strictly inside research/ via Go 1.26 os.Root and a 7-step fail-closed ladder that blocks /, $HOME, and system directories.',
  },
];

interface SetupPageProps {
  initialHostId?: string | null;
  initialTab?: SetupTab | null;
}

export const SetupPage: React.FC<SetupPageProps> = ({ initialHostId, initialTab }) => {
  const [channelId, setChannelId] = useState(MCP_INSTALL_CHANNELS[0].id);
  const [hostId, setHostId] = useState(HOST_PRESETS[0].id);
  const [tab, setTab] = useState<SetupTab>('cli');
  const [cliDryRun, setCliDryRun] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    if (initialTab && (initialTab === 'cli' || initialTab === 'agents' || initialTab === 'ci')) {
      setTab(initialTab);
    }
    if (initialHostId && HOST_PRESETS.some((h) => h.id === initialHostId)) {
      setHostId(initialHostId);
      setTab('cli');
      try {
        localStorage.setItem('vck_host_preset', initialHostId);
      } catch {
        // ignore
      }
      return;
    }
    try {
      const savedHost = localStorage.getItem('vck_host_preset');
      if (savedHost && HOST_PRESETS.some((h) => h.id === savedHost)) {
        setHostId(savedHost);
      }
      const savedCh = localStorage.getItem('vck_install_channel');
      if (savedCh && MCP_INSTALL_CHANNELS.some((c) => c.id === savedCh)) {
        setChannelId(savedCh);
      } else if (navigator.userAgent && /Windows/i.test(navigator.userAgent)) {
        setChannelId('powershell');
      }
    } catch {
      // ignore
    }
  }, [initialHostId, initialTab]);

  const activeChannel =
    MCP_INSTALL_CHANNELS.find((c) => c.id === channelId) ?? MCP_INSTALL_CHANNELS[0];
  const activeHost = HOST_PRESETS.find((h) => h.id === hostId) ?? HOST_PRESETS[0];

  const selectChannel = (id: string) => {
    soundEngine.playTick(720);
    setChannelId(id);
    try {
      localStorage.setItem('vck_install_channel', id);
    } catch {
      // ignore
    }
  };

  const selectHost = (id: string) => {
    soundEngine.playTick(740);
    setHostId(id);
    try {
      localStorage.setItem('vck_host_preset', id);
    } catch {
      // ignore
    }
  };

  const copy = async (key: string, label: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedKey(key);
    showToast(`Copied ${label}`);
    window.setTimeout(() => setCopiedKey(null), 1600);
  };

  const dryRunPreview = useMemo(
    () =>
      `$ vck setup ${activeHost.shortcut} --dry-run
[dry-run] Detected host preset : ${activeHost.name} (${activeHost.format.toUpperCase()})
[dry-run] Target config path   : ${activeHost.configPath}
[dry-run] Backup strategy      : ${activeHost.configPath}.vivechak-bak-<timestamp>
[dry-run] Merge action         : upsert "${activeHost.serverKey}.vivechak" (preserves existing servers)
[dry-run] Binary resolved      : /usr/local/bin/vck serve
[dry-run] Status               : SAFE TO APPLY — 0 files modified in dry-run`,
    [activeHost]
  );

  const rightHeader =
    tab === 'cli'
      ? cliDryRun
        ? `vck setup ${activeHost.shortcut} --dry-run`
        : `${activeHost.format.toUpperCase()} · ${activeHost.serverKey}`
      : tab === 'agents'
        ? 'AGENTS.md / CLAUDE.md'
        : '.github/workflows/vivechak-gate.yml';

  const rightCode =
    tab === 'cli'
      ? cliDryRun
        ? dryRunPreview
        : activeHost.snippet
      : tab === 'agents'
        ? AGENTS_MD_SNIPPET
        : GITHUB_ACTIONS_SNIPPET;

  const rightLang: 'json' | 'yaml' | 'markdown' =
    tab === 'cli' ? (cliDryRun ? 'markdown' : activeHost.format) : tab === 'ci' ? 'yaml' : 'markdown';

  const downloadFilename =
    tab === 'cli'
      ? `vivechak-${activeHost.id}.${activeHost.format}`
      : tab === 'agents'
        ? 'AGENTS.md'
        : 'vivechak-gate.yml';

  return (
    <div className="subpage-shell">
      <div className="wrap subpage-hero">
        <a
          href="/"
          className="docs-back-home"
          onClick={(e) => {
            e.preventDefault();
            soundEngine.playTick(680);
            navigate('/');
          }}
        >
          <ArrowLeft size={13} />
          <span>Overview</span>
        </a>
        <h1 className="subpage-h1">Setup</h1>
        <p className="sec-sub mono" style={{ fontSize: '0.82rem' }}>
          12 MCP server channels · 10 verified hosts · Agent Skill &amp; AGENTS.md · GitHub Actions CI
        </p>
      </div>

      <section className="subpage-band" id="setup">
        <div className="wrap">
          {/* Step 1: 12 MCP Server & CLI Install Channels */}
          <div className="setup-channels-strip">
            <div className="setup-channels-head">
              <span className="setup-channels-title">1. Install MCP server &amp; CLI</span>
              <span className="setup-channels-sub mono">v0.1.0 · ~9 MB static Go binary · 12 channels</span>
            </div>

            <div className="hero-install-tabs" role="tablist" aria-label="12 MCP server install methods">
              {MCP_INSTALL_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  role="tab"
                  aria-selected={ch.id === channelId}
                  className={`hero-ch-tab ${ch.id === channelId ? 'active' : ''}`}
                  onClick={() => selectChannel(ch.id)}
                >
                  {SHORT_LABELS[ch.id] ?? ch.label}
                </button>
              ))}
            </div>

            <div className="hero-cmd-bar setup-channels-bar">
              <span className="hero-cmd-prompt mono" aria-hidden="true">$</span>
              <code className="hero-cmd-code mono" id="setup-install-cmd">
                {activeChannel.command}
              </code>
              <button
                type="button"
                className={`inline-action-btn ${copiedKey === 'inst' ? 'copied' : ''}`}
                onClick={() => copy('inst', `${SHORT_LABELS[activeChannel.id] ?? activeChannel.label} install`, activeChannel.command)}
              >
                {copiedKey === 'inst' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'inst' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="setup-channel-note">{activeChannel.note}</p>
          </div>

          {/* Step 2: Configure Editor, AGENTS.md, or CI */}
          <div className="sec-head-split" style={{ marginBottom: '1.5rem' }}>
            <div>
              <span className="setup-channels-title" style={{ display: 'block', marginBottom: '0.25rem' }}>
                2. Wire your editor, agent rules, or CI pipeline
              </span>
              <span className="setup-channels-sub">
                Every config write preserves existing MCP servers and stores a timestamped <code className="code-tag-light">.vivechak-bak</code> backup.
              </span>
            </div>

            <div className="tab-rail" role="tablist" aria-label="Adoption method">
              {(
                [
                  ['cli', 'MCP Hosts (10)'],
                  ['agents', 'AGENTS.md & Skill'],
                  ['ci', 'GitHub Actions'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  id={`setup-mode-${id}`}
                  className={`tab-rail-btn ${tab === id ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(760);
                    setTab(id);
                  }}
                >
                  <span>{label}</span>
                  {tab === id && (
                    <motion.span
                      layoutId="setupPageTabLine"
                      className="tab-rail-indicator"
                      transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {tab === 'cli' && (
            <div className="host-tabs-bar" role="tablist" aria-label="10 Verified MCP Hosts">
              {HOST_PRESETS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="tab"
                  aria-selected={h.id === hostId}
                  id={`host-preset-${h.id}`}
                  className={`host-tab-btn ${h.id === hostId ? 'active' : ''}`}
                  onClick={() => selectHost(h.id)}
                >
                  {h.name}
                </button>
              ))}
            </div>
          )}

          <div className="setup-split">
            <div className="setup-left">
              {tab === 'agents' ? (
                <>
                  <div>
                    <div className="setup-label">Drop-in repository rule</div>
                    <p className="setup-info-copy">
                      Add to <code className="mono">AGENTS.md</code> or <code className="mono">CLAUDE.md</code> so coding agents invoke Vivechak on one-way bets and skip routine implementation.
                    </p>
                  </div>

                  <div>
                    <div className="setup-label">Dual-mode Agent Skill</div>
                    <div className="setup-cmd-row">
                      <span className="hero-cmd-prompt mono">$</span>
                      <code className="mono">npx skills add bhaskarjha-dev/vivechak</code>
                      <button
                        type="button"
                        className={`inline-action-btn ${copiedKey === 'skill' ? 'copied' : ''}`}
                        onClick={() => copy('skill', 'Agent Skill install', 'npx skills add bhaskarjha-dev/vivechak')}
                      >
                        {copiedKey === 'skill' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedKey === 'skill' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="builder-tip" style={{ marginTop: '0.55rem' }}>
                      Works standalone without installing a binary, or upgrades automatically when local <code className="mono">vck</code> MCP is connected.
                    </p>
                  </div>
                </>
              ) : tab === 'ci' ? (
                <>
                  <div>
                    <div className="setup-label">Headless CI merge gate</div>
                    <div className="setup-cmd-row">
                      <span className="hero-cmd-prompt mono">$</span>
                      <code className="mono">vck doctor &amp;&amp; vck gate --track all</code>
                      <button
                        type="button"
                        className={`inline-action-btn ${copiedKey === 'ci' ? 'copied' : ''}`}
                        onClick={() => copy('ci', 'CI gate command', 'vck doctor && vck gate --track all')}
                      >
                        {copiedKey === 'ci' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedKey === 'ci' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="setup-meta">
                    <span>Workflow path</span>
                    <strong className="mono">.github/workflows/vivechak-gate.yml</strong>
                  </div>

                  <div className="setup-exit-grid">
                    <div className="setup-exit-row is-pass">
                      <strong className="mono">EXIT 0</strong>
                      <span>All Track A &amp; B rules, primary citations, and SHA-256 hashes verified.</span>
                    </div>
                    <div className="setup-exit-row is-fail">
                      <strong className="mono">EXIT 1</strong>
                      <span>Blocks PR on missing URLs, unchallenged ADR, tamper, or missing sign-off.</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="setup-label">One-command auto-merge · {activeHost.name}</div>
                    <div className="setup-cmd-row">
                      <span className="hero-cmd-prompt mono">$</span>
                      <code className="mono">vck setup {activeHost.shortcut}</code>
                      <button
                        type="button"
                        className={`inline-action-btn ${copiedKey === 'cmd' ? 'copied' : ''}`}
                        onClick={() => copy('cmd', `vck setup ${activeHost.shortcut}`, `vck setup ${activeHost.shortcut}`)}
                      >
                        {copiedKey === 'cmd' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedKey === 'cmd' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {['shell', 'brew', 'powershell', 'winget', 'scoop', 'go'].includes(activeChannel.id) && (() => {
                    const joiner = activeChannel.id === 'powershell' ? '; ' : ' && ';
                    const combined = `${activeChannel.command}${joiner}vck setup ${activeHost.shortcut}`;
                    return (
                      <div>
                        <div className="setup-label">Install + wire in one command</div>
                        <div className="setup-cmd-row">
                          <span className="hero-cmd-prompt mono">$</span>
                          <code className="mono">{combined}</code>
                          <button
                            type="button"
                            id="btn-copy-combined"
                            className={`inline-action-btn ${copiedKey === 'combo' ? 'copied' : ''}`}
                            onClick={() =>
                              copy('combo', `install + ${activeHost.name} setup`, combined)
                            }
                          >
                            {copiedKey === 'combo' ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedKey === 'combo' ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="setup-meta">
                    <span>Config</span>
                    <strong className="mono">{activeHost.configPath}</strong>
                  </div>
                  <div className="setup-meta">
                    <span>Merge mode</span>
                    <strong className="mono">upsert · .vivechak-bak</strong>
                  </div>
                </>
              )}
            </div>

            <div className="setup-right">
              <div className="setup-code-head mono">
                <span>{rightHeader}</span>
                <div className="setup-code-actions">
                  {tab === 'cli' && (
                    <button
                      type="button"
                      id="btn-cli-dryrun"
                      className={`inline-action-btn ${cliDryRun ? 'is-active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(760);
                        setCliDryRun((v) => !v);
                      }}
                    >
                      <span>{cliDryRun ? 'Config' : '--dry-run'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    id="btn-download-artifact"
                    className="inline-action-btn"
                    onClick={() => {
                      soundEngine.playSieveDrop();
                      downloadTextFile(downloadFilename, rightCode);
                      showToast(`Downloaded ${downloadFilename}`);
                    }}
                    aria-label={`Download ${downloadFilename}`}
                  >
                    <Download size={12} />
                    <span>{downloadFilename.slice(downloadFilename.lastIndexOf('.'))}</span>
                  </button>
                  <button
                    type="button"
                    className={`inline-action-btn ${copiedKey === 'cfg' ? 'copied' : ''}`}
                    onClick={() =>
                      copy(
                        'cfg',
                        tab === 'cli'
                          ? `${activeHost.name} config`
                          : tab === 'agents'
                            ? 'AGENTS.md rule'
                            : 'GitHub Actions workflow',
                        rightCode
                      )
                    }
                  >
                    {copiedKey === 'cfg' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedKey === 'cfg' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <pre className="dark-code-block setup-pre mono">
                <code>{renderHighlightedCode(rightCode, rightLang)}</code>
              </pre>
            </div>
          </div>

          <div className="setup-prompt-handoff">
            <span>Prefer zero-install browser chat (Claude, ChatGPT, Gemini) before installing locally?</span>
            <a
              href="/playground#prompt"
              className="editorial-link is-compact"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playTick(760);
                navigate('/playground#prompt');
              }}
            >
              <span>Open Prompt Studio in Playground</span>
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </section>

      <section className="subpage-band is-alt" id="faq">
        <div className="wrap">
          <div className="faq-wrap" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <h2 className="faq-heading">Frequently asked questions</h2>
            <div className="faq-list">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button
                      type="button"
                      className="faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => {
                        soundEngine.playTick(isOpen ? 620 : 780);
                        setOpenFaq(isOpen ? null : idx);
                      }}
                    >
                      <span>{item.q}</span>
                      <ChevronDown size={16} className="faq-chev" />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          className="faq-body-clip"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <p className="faq-answer">{item.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
