import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  Copy,
  Cpu,
  Download,
  GitPullRequest,
  ShieldCheck,
  Sparkles,
  WifiOff,
} from 'lucide-react';
import {
  AGENTS_MD_SNIPPET,
  GITHUB_ACTIONS_SNIPPET,
  HOST_PRESETS,
  SEVEN_STEP_LADDER,
  buildCustomPrompt,
} from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { downloadTextFile } from '@/shared/lib/download';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import type { PromptBridgePayload } from '@/features/calibration/CalibrationLab';

type OutputMode = 'cli' | 'manual' | 'agents' | 'ci';
type PromptScope = 'comparison' | 'decision' | 'project';

interface SetupSectionProps {
  bridgedPrompt?: PromptBridgePayload | null;
  bridgedHost?: { hostId: string; nonce: number } | null;
}

const TRUST_PILLARS = [
  { id: 'osroot', icon: ShieldCheck, title: 'Go 1.26 os.Root Jailed', desc: 'Writes strictly inside research/.' },
  { id: 'ladder', icon: Cpu, title: '7-Step Fail-Closed ▾', desc: 'Inspect workspace confinement rules.' },
  { id: 'local', icon: WifiOff, title: '0 Telemetry · 0 Cloud', desc: '~9 MB local static Go binary.' },
  { id: 'ci', icon: GitPullRequest, title: 'CI Merge Gate', desc: 'vck gate exits 1 on Track B fail.' },
];

const FAQ_ITEMS = [
  {
    q: 'When should I NOT use Vivechak?',
    a: 'Skip Vivechak for routine coding, bug fixes, syntax questions, and local refactors. Invoke it only for hard-to-reverse choices: datastores, protocols, security boundaries, or greenfield architecture.',
  },
  {
    q: 'Does Vivechak call external LLMs or send telemetry?',
    a: 'Never. It is a ~9 MB local static Go binary with zero outbound network requests, zero telemetry, and zero hidden databases. Your existing coding agent researches; Vivechak structures, hashes, and gates files in research/.',
  },
  {
    q: 'How does human sign-off stop AI rubber-stamping?',
    a: 'One-Way Door ADRs require Grade A/B primary URLs, rejected alternatives, a SHA-256 red-team record (G10), and interactive human /dev/tty attestation (G11). Agents setting human_reviewed: true are rejected with E-HUMAN-ONLY-FIELD. Note: Vivechak checks structure, hash parity, and typed attestation — it never fetches external URLs itself.',
  },
  {
    q: 'Can I try Vivechak without installing anything?',
    a: 'Yes — run ephemerally via `npx -y vivechak serve` or `uvx vck serve`, or use the Prompt Builder tab above to generate a custom ready-to-paste prompt for Claude, ChatGPT, or Gemini web chat.',
  },
  {
    q: 'Can Vivechak modify my application source code?',
    a: 'No. Every write is strictly confined to research/ via Go 1.26 os.Root and a 7-step fail-closed workspace ladder that refuses /, $HOME, and system directories.',
  },
];

function handleGlowMove(e: React.PointerEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export const SetupSection: React.FC<SetupSectionProps> = ({ bridgedPrompt, bridgedHost }) => {
  const [hostId, setHostId] = useState(HOST_PRESETS[0].id);
  const [outputMode, setOutputMode] = useState<OutputMode>('cli');
  const [cliDryRun, setCliDryRun] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ladderOpen, setLadderOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Live Prompt Builder state (auto-populated from Calibration Lab bridge or directly editable!)
  const [builderScope, setBuilderScope] = useState<PromptScope>('decision');
  const [builderQuestion, setBuilderQuestion] = useState(
    'Should we adopt PostgreSQL + pgvector or Qdrant for 10M-vector hybrid RAG search?'
  );
  const [builderOptions, setBuilderOptions] = useState(
    'Qdrant, PostgreSQL + pgvector, Pinecone Serverless'
  );
  const [builderContext, setBuilderContext] = useState(
    '5-person backend team; strict tenant ACL joins; <40ms p99 under $900/mo'
  );
  const [builderDoor, setBuilderDoor] = useState<'one-way' | 'two-way'>('one-way');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vck_host_preset');
      if (saved && HOST_PRESETS.some((h) => h.id === saved)) {
        setHostId(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!bridgedHost) return;
    if (HOST_PRESETS.some((h) => h.id === bridgedHost.hostId)) {
      setHostId(bridgedHost.hostId);
      setOutputMode('cli');
      try {
        localStorage.setItem('vck_host_preset', bridgedHost.hostId);
      } catch {
        // ignore
      }
    }
  }, [bridgedHost]);

  useEffect(() => {
    if (!bridgedPrompt) return;
    setBuilderScope(bridgedPrompt.scope);
    setBuilderQuestion(bridgedPrompt.question);
    setBuilderDoor(bridgedPrompt.doorType);
    // Smartly extract contender options from "A vs B" or "from A to B" prompts so stale defaults never leak
    const vsMatch = bridgedPrompt.question.match(
      /(?:compare|choose|evaluate|between)?\s*([A-Za-z0-9.+_-]+(?:\s+[A-Za-z0-9.+_-]+)?)\s+(?:vs\.?|versus|or|→|to)\s+([A-Za-z0-9.+_-]+(?:\s+[A-Za-z0-9.+_-]+)?)/i
    );
    if (vsMatch) {
      setBuilderOptions(`${vsMatch[1].trim()}, ${vsMatch[2].trim()}`);
    }
    setOutputMode('manual');
    document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`Prompt Builder pre-filled (${bridgedPrompt.scope.toUpperCase()})`);
  }, [bridgedPrompt]);

  const selectHost = (id: string) => {
    soundEngine.playTick(740);
    setHostId(id);
    try {
      localStorage.setItem('vck_host_preset', id);
    } catch {
      // ignore
    }
  };

  const activeHost = HOST_PRESETS.find((h) => h.id === hostId) ?? HOST_PRESETS[0];

  const customPromptText = useMemo(
    () =>
      buildCustomPrompt({
        scope: builderScope,
        question: builderQuestion,
        options: builderOptions,
        context: builderContext,
        doorType: builderDoor,
      }),
    [builderScope, builderQuestion, builderOptions, builderContext, builderDoor]
  );

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
[dry-run] Backup strategy      : ${activeHost.configPath}.bak.<timestamp>
[dry-run] Merge action         : upsert "${activeHost.serverKey}.vivechak" (preserves existing servers)
[dry-run] Binary resolved      : /usr/local/bin/vck serve
[dry-run] Status               : SAFE TO APPLY — 0 files modified in dry-run`,
    [activeHost]
  );

  const rightHeader =
    outputMode === 'cli'
      ? cliDryRun
        ? `DRY-RUN PREVIEW · vck setup ${activeHost.shortcut} --dry-run`
        : `${activeHost.format.toUpperCase()} · key: ${activeHost.serverKey}`
      : outputMode === 'manual'
        ? `READY-TO-PASTE PROMPT · ${builderScope.toUpperCase()}`
        : outputMode === 'agents'
          ? 'DROP-IN REPO RULE · AGENTS.md / CLAUDE.md'
          : 'GITHUB ACTIONS · .github/workflows/vivechak-gate.yml';

  const rightCode =
    outputMode === 'cli'
      ? cliDryRun
        ? dryRunPreview
        : activeHost.snippet
      : outputMode === 'manual'
        ? customPromptText
        : outputMode === 'agents'
          ? AGENTS_MD_SNIPPET
          : GITHUB_ACTIONS_SNIPPET;

  const rightLang: 'json' | 'yaml' | 'markdown' =
    outputMode === 'cli'
      ? cliDryRun
        ? 'markdown'
        : activeHost.format
      : outputMode === 'ci'
        ? 'yaml'
        : 'markdown';

  const downloadFilename =
    outputMode === 'cli'
      ? `vivechak-${activeHost.id}.${activeHost.format}`
      : outputMode === 'manual'
        ? `vivechak-${builderScope}-prompt.md`
        : outputMode === 'agents'
          ? 'AGENTS.md'
          : 'vivechak-gate.yml';

  return (
    <section className="band-obsidian" id="setup">
      <div className="wrap">
        <motion.div
          className="sec-intro-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow-dark mono">05 · SETUP &amp; PROMPT WORKBENCH</span>
          <h2 className="dark-title">Wire your editor — or paste now.</h2>
          <p className="dark-sub">
            Auto-merge into 10 verified MCP hosts, generate a bespoke zero-install prompt, or drop the CI gate into GitHub Actions.
          </p>
        </motion.div>

        <div className="host-pills-bar" role="tablist" aria-label="10 Verified MCP Hosts">
          {HOST_PRESETS.map((h) => (
            <button
              key={h.id}
              type="button"
              role="tab"
              aria-selected={h.id === hostId}
              id={`host-preset-${h.id}`}
              className={`host-pill-btn ${h.id === hostId ? 'active' : ''}`}
              onClick={() => {
                selectHost(h.id);
                setOutputMode('cli');
              }}
            >
              {h.id === hostId && (
                <motion.span
                  layoutId="hostPillBg"
                  className="host-pill-bg"
                  transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                />
              )}
              <span className="host-pill-lbl">{h.name}</span>
            </button>
          ))}
        </div>

        <div className="setup-split">
          <div className="setup-left ambient-glow" onPointerMove={handleGlowMove}>
            <div className="setup-mode-tabs" role="tablist" aria-label="Output format">
              {(
                [
                  ['cli', 'CLI Setup'],
                  ['manual', 'Prompt Builder'],
                  ['agents', 'AGENTS.md'],
                  ['ci', 'GitHub Actions'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={outputMode === id}
                  id={`setup-mode-${id}`}
                  className={`setup-mini-tab mono ${outputMode === id ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(760);
                    setOutputMode(id);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {outputMode === 'manual' ? (
              <div className="prompt-builder-form">
                <div className="builder-scope-row">
                  <span className="setup-label mono">
                    <Sparkles size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }} />
                    SCOPE
                  </span>
                  <div className="builder-scope-pills">
                    {(['comparison', 'decision', 'project'] as const).map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        className={`spot-chip mono ${builderScope === sc ? 'active' : ''}`}
                        onClick={() => {
                          soundEngine.playTick(740);
                          setBuilderScope(sc);
                        }}
                      >
                        {sc}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="builder-field">
                  <span className="setup-label mono">YOUR TECHNICAL QUESTION</span>
                  <input
                    id="builder-question-input"
                    type="text"
                    value={builderQuestion}
                    onChange={(e) => setBuilderQuestion(e.target.value)}
                    placeholder="e.g. Redis vs Valkey for session store?"
                  />
                </label>

                {builderScope !== 'project' && (
                  <label className="builder-field">
                    <span className="setup-label mono">CONTENDER OPTIONS</span>
                    <input
                      id="builder-options-input"
                      type="text"
                      value={builderOptions}
                      onChange={(e) => setBuilderOptions(e.target.value)}
                      placeholder="Option A, Option B, Option C"
                    />
                  </label>
                )}

                <label className="builder-field">
                  <span className="setup-label mono">CONSTRAINTS &amp; SCALE</span>
                  <input
                    id="builder-context-input"
                    type="text"
                    value={builderContext}
                    onChange={(e) => setBuilderContext(e.target.value)}
                    placeholder="Team size, SLA, compliance, budget ceiling"
                  />
                </label>

                <div className="builder-tip mono">
                  Paste into Claude, ChatGPT, or Gemini with Web Search ON — zero installation required.
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="setup-label mono">1-COMMAND AUTO-MERGE · {activeHost.name.toUpperCase()}</div>
                  <div className="setup-cmd-row">
                    <span className="dock-prompt mono">$</span>
                    <code className="mono">vck setup {activeHost.shortcut}</code>
                    <button
                      type="button"
                      className={`dock-copy mono ${copiedKey === 'cmd' ? 'copied' : ''}`}
                      onClick={() => copy('cmd', `vck setup ${activeHost.shortcut}`, `vck setup ${activeHost.shortcut}`)}
                    >
                      {copiedKey === 'cmd' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'cmd' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="setup-meta mono">
                  <span>PATH</span>
                  <strong>{activeHost.configPath}</strong>
                </div>

                <div className="setup-ci-box">
                  <div className="setup-label mono">GITHUB ACTIONS / CI MERGE GATE</div>
                  <div className="setup-cmd-row">
                    <span className="dock-prompt mono">$</span>
                    <code className="mono">vck doctor &amp;&amp; vck gate --track all</code>
                    <button
                      type="button"
                      className={`dock-copy mono ${copiedKey === 'ci' ? 'copied' : ''}`}
                      onClick={() => copy('ci', 'CI gate command', 'vck doctor && vck gate --track all')}
                    >
                      {copiedKey === 'ci' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'ci' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="setup-right ambient-glow" onPointerMove={handleGlowMove}>
            <div className="setup-code-head mono">
              <span>{rightHeader}</span>
              <div className="setup-code-actions">
                {outputMode === 'cli' && (
                  <button
                    type="button"
                    id="btn-cli-dryrun"
                    className={`setup-dl-btn mono ${cliDryRun ? 'is-active' : ''}`}
                    onClick={() => {
                      soundEngine.playTick(760);
                      setCliDryRun((v) => !v);
                    }}
                    title="Toggle non-destructive vck setup --dry-run terminal output"
                  >
                    <span>{cliDryRun ? 'Config' : '--dry-run'}</span>
                  </button>
                )}
                <button
                  type="button"
                  id="btn-download-artifact"
                  className="setup-dl-btn mono"
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
                  className={`dock-copy mono ${copiedKey === 'cfg' ? 'copied' : ''}`}
                  onClick={() =>
                    copy(
                      'cfg',
                      outputMode === 'cli'
                        ? `${activeHost.name} config`
                        : outputMode === 'manual'
                          ? `custom ${builderScope} prompt`
                          : outputMode === 'agents'
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

        <div className="trust-ribbon" id="security">
          {TRUST_PILLARS.map((p, i) => {
            const isLadder = p.id === 'ladder';
            return (
              <motion.div
                key={p.id}
                className={`trust-item ${isLadder ? 'is-interactive' : ''} ${isLadder && ladderOpen ? 'is-open' : ''}`}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 'some' }}
                transition={{ delay: i * 0.05, duration: 0.38 }}
                onClick={
                  isLadder
                    ? () => {
                        soundEngine.playTick(ladderOpen ? 640 : 800);
                        setLadderOpen((v) => !v);
                      }
                    : undefined
                }
                role={isLadder ? 'button' : undefined}
                tabIndex={isLadder ? 0 : undefined}
                aria-expanded={isLadder ? ladderOpen : undefined}
                onKeyDown={
                  isLadder
                    ? (ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          setLadderOpen((v) => !v);
                        }
                      }
                    : undefined
                }
              >
                <p.icon size={17} className="trust-ico" strokeWidth={1.8} />
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {ladderOpen && (
            <motion.div
              className="ladder-drawer"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="ladder-mini-grid">
                {SEVEN_STEP_LADDER.map((st) => (
                  <div key={st.step} className={`ladder-mini-card ${st.step === '07' ? 'is-stop' : ''}`}>
                    <div className="ladder-mini-top mono">
                      <span>{st.step}</span>
                      <span>{st.rule}</span>
                    </div>
                    <strong>{st.title}</strong>
                    <span>{st.detail}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="faq-wrap" id="faq">
          <div className="faq-label mono">COMMON QUESTIONS</div>
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
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
  );
};
