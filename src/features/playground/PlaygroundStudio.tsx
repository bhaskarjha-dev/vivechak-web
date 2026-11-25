import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileCheck2,
  Link2,
  Minus,
  Plus,
  RotateCcw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { AUDITOR_PRESETS } from '@/shared/lib/auditorEngine';
import { copyText } from '@/shared/lib/clipboard';
import { downloadTextFile } from '@/shared/lib/download';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import {
  DEFAULT_WEP_OPTIONS,
  DEFAULT_WEP_ROWS,
  WEP_STARTERS,
  encodeSharePayload,
  usePlaygroundState,
  type PlaygroundTab,
  type PresetLaunchPayload,
} from './usePlaygroundState';

export type { PlaygroundTab, PresetLaunchPayload };

interface PlaygroundStudioProps {
  initialTab?: PlaygroundTab;
  initialPresetLaunch?: PresetLaunchPayload | null;
}

export const PlaygroundStudio: React.FC<PlaygroundStudioProps> = ({
  initialTab = 'auditor',
  initialPresetLaunch,
}) => {
  const {
    tab,
    setTab,
    didSwitchTab,
    setDidSwitchTab,
    copiedId,
    setCopiedId,
    dragActive,
    setDragActive,
    dragDepthRef,
    fileInputRef,
    editorText,
    setEditorText,
    decisionHash,
    audit,
    insertMissingSkeleton,
    wepTitle,
    setWepTitle,
    wepOptions,
    setWepOptions,
    addWepOption,
    removeWepOption,
    wepRows,
    setWepRows,
    wepResult,
    pScope,
    setPScope,
    pDoor,
    setPDoor,
    pQuestion,
    setPQuestion,
    pOptions,
    setPOptions,
    pContext,
    setPContext,
    generatedPrompt,
  } = usePlaygroundState({ initialTab, initialPresetLaunch });

  const loadLocalMarkdownFile = (file: File | null | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        soundEngine.playSieveDrop();
        setEditorText(reader.result);
        setTab('auditor');
        showToast(`Auditing local file ${file.name} (100% offline)`);
      }
    };
    reader.readAsText(file);
  };

  const shareWepLink = async () => {
    const encoded = encodeSharePayload({ title: wepTitle, options: wepOptions, rows: wepRows });
    const url = `${window.location.origin}/playground#wep=${encoded}`;
    window.history.replaceState({}, '', `/playground#wep=${encoded}`);
    const ok = await copyText(url);
    if (ok) {
      soundEngine.playSieveDrop();
      showToast('Copied shareable WEP matrix link');
    }
  };

  const sharePromptLink = async () => {
    const encoded = encodeSharePayload({
      scope: pScope,
      door: pDoor,
      question: pQuestion,
      options: pOptions,
      context: pContext,
    });
    const url = `${window.location.origin}/playground#prompt=${encoded}`;
    window.history.replaceState({}, '', `/playground#prompt=${encoded}`);
    const ok = await copyText(url);
    if (ok) {
      soundEngine.playSieveDrop();
      showToast('Copied shareable prompt link');
    }
  };

  const auditGeneratedWep = () => {
    const enriched = wepResult.markdown.replace(
      /\[B · fetched\]/g,
      '[B · fetched](https://docs.example.org/benchmark)'
    );
    soundEngine.playSieveDrop();
    setEditorText(enriched);
    setTab('auditor');
    showToast('Loaded WEP matrix into Gate Auditor');
  };

  const handleCopy = async (id: string, text: string, label: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedId(id);
    showToast(`Copied ${label}`);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const auditorDownloadName = `${(audit.frontmatter.id || 'D-001').replace(/[^A-Za-z0-9_-]/g, '')}-${audit.artifactKind}.md`;
  const needsSkeletonFix = audit.artifactKind !== 'comparison' && (audit.verdict !== 'PASS' || audit.diagnostics.length > 0);

  return (
    <div className="play-shell">
      <div className="wrap">
        <div className="play-head">
          <div>
            <a
              href="/"
              className="docs-back-home mono"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playTick(680);
                navigate('/');
              }}
            >
              <ArrowLeft size={12} />
              <span>Back to Overview</span>
            </a>
            <span className="eyebrow-dark mono" style={{ display: 'block', marginTop: '0.85rem' }}>
              LIVE IN-BROWSER WORKBENCH · 100% CLIENT-SIDE
            </span>
            <h1 className="play-h1">Vivechak Playground.</h1>
            <p className="dark-sub">
              Lint any Markdown ADR against rules G5–G12 &amp; Quality Coach Q-*, build a ±20% WEP matrix, or craft a zero-install prompt — everything runs locally in your browser.
            </p>
          </div>

          <div className="dark-seg-switch" role="tablist" aria-label="Playground tools">
            {(
              [
                ['auditor', 'ADR & Gate Auditor', FileCheck2],
                ['wep', 'WEP ±20% Builder', Scale],
                ['prompt', 'Prompt Studio', Sparkles],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                id={`play-tab-${id}`}
                className={`dark-seg-btn ${tab === id ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(760);
                  setDidSwitchTab(true);
                  setTab(id);
                }}
              >
                {tab === id && (
                  <motion.span
                    layoutId="playTabPill"
                    className="dark-seg-bg"
                    transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                  />
                )}
                <Icon size={14} className="seg-ico" />
                <span className="seg-lbl">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: LIVE ADR, SESSION & PHASE 0 GATE AUDITOR */}
        {tab === 'auditor' && (
          <motion.div
            key="auditor"
            className="play-auditor-wrap"
            initial={didSwitchTab ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="play-preset-bar">
              <div className="play-preset-chips">
                <span className="mono wep-lbl">LOAD SAMPLE:</span>
                {AUDITOR_PRESETS.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    id={`auditor-preset-${pr.id}`}
                    className={`spot-chip mono ${editorText === pr.content ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playTick(740);
                      setEditorText(pr.content);
                    }}
                  >
                    {pr.label}
                  </button>
                ))}
              </div>
              <div className="play-preset-actions">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.markdown,.txt"
                  className="sr-only"
                  aria-label="Upload local Markdown file for offline audit"
                  onChange={(e) => {
                    loadLocalMarkdownFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  id="btn-upload-local-md"
                  className="setup-dl-btn mono"
                  onClick={() => fileInputRef.current?.click()}
                  title="Open a local .md file from your repository (processed 100% in browser)"
                >
                  <Upload size={12} />
                  <span>Open .md</span>
                </button>
                {needsSkeletonFix && (
                  <button
                    type="button"
                    className="setup-dl-btn mono"
                    onClick={insertMissingSkeleton}
                  >
                    <Wand2 size={12} />
                    <span>Fix Missing Sections</span>
                  </button>
                )}
                <button
                  type="button"
                  className="setup-dl-btn mono"
                  onClick={() => {
                    downloadTextFile(auditorDownloadName, editorText);
                    showToast(`Downloaded ${auditorDownloadName}`);
                  }}
                >
                  <Download size={12} />
                  <span>.md</span>
                </button>
                <button
                  type="button"
                  className={`dock-copy mono ${copiedId === 'aud-md' ? 'copied' : ''}`}
                  onClick={() => void handleCopy('aud-md', editorText, 'Markdown artifact')}
                >
                  {copiedId === 'aud-md' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedId === 'aud-md' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="play-split">
              <div
                className={`play-editor-card ${dragActive ? 'is-drop-active' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  dragDepthRef.current += 1;
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDragLeave={() => {
                  dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
                  if (dragDepthRef.current === 0) setDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dragDepthRef.current = 0;
                  setDragActive(false);
                  loadLocalMarkdownFile(e.dataTransfer.files?.[0]);
                }}
              >
                <div className="setup-code-head mono">
                  <span>
                    {dragActive
                      ? 'DROP LOCAL .MD FILE TO AUDIT OFFLINE'
                      : `MARKDOWN ARTIFACT · ${audit.artifactKind.toUpperCase()} (${audit.doorType})`}
                  </span>
                  <span className="term-hash-pill">sha256:{decisionHash.slice(0, 12)}…</span>
                </div>
                <label htmlFor="auditor-textarea" className="sr-only">
                  Paste or edit Vivechak Markdown artifact
                </label>
                <textarea
                  id="auditor-textarea"
                  className="play-textarea mono"
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <div className="play-report-card">
                <div className={`play-verdict-banner ${audit.verdict === 'PASS' ? 'is-pass' : 'is-fail'}`}>
                  {audit.verdict === 'PASS' ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                  <div className="mono">
                    <span className="seal-sub">
                      {audit.verdict === 'PASS'
                        ? 'MECHANICAL AUDIT CLEAR'
                        : `${audit.rules.filter((r) => r.status === 'FAIL').length} BLOCKING GATE FAILURE(S)`}
                    </span>
                    <strong className="interlock-code" id="auditor-verdict-code">
                      {audit.verdict === 'PASS' ? 'EXIT 0 · PASS' : 'EXIT 1 · HOLD'}
                    </strong>
                  </div>
                  <div className="play-grade-pills mono">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((g) => (
                      <span key={g} className={`play-gp g-${g}`}>
                        {g}:{audit.gradeCounts[g]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="play-rules-list">
                  <div className="ref-group-lbl mono">MECHANICAL GATE CHECKS</div>
                  {audit.rules.map((r) => (
                    <div key={r.id} className={`play-rule-row st-${r.status.toLowerCase().replace('/', '')}`}>
                      <span className="mono play-rule-badge">
                        {r.id} · {r.status}
                      </span>
                      <div>
                        <strong>{r.name}</strong>
                        <span>{r.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="play-diag-list">
                  <div className="ref-group-lbl mono">
                    QUALITY COACH &amp; DIAGNOSTICS ({audit.diagnostics.length})
                  </div>
                  {audit.diagnostics.length === 0 ? (
                    <div className="play-clean-note mono">
                      ✓ Zero E-*, V-*, W-*, or Q-* coaching observations detected.
                    </div>
                  ) : (
                    audit.diagnostics.map((d) => (
                      <div key={`${d.code}-${d.message}`} className={`play-diag-row sev-${d.severity}`}>
                        <div className="play-diag-top mono">
                          <AlertTriangle size={12} />
                          <strong>{d.code}</strong>
                        </div>
                        <p>{d.message}</p>
                        <span className="mono play-diag-fix">Fix: {d.fix}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: EDITABLE WEP ±20% MATRIX BUILDER */}
        {tab === 'wep' && (
          <motion.div
            key="wep"
            className="play-wep-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="play-wep-grid">
              <div className="play-editor-card play-wep-form">
                <div className="play-preset-bar" style={{ marginBottom: '0.85rem' }}>
                  {WEP_STARTERS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`spot-chip mono ${wepTitle === st.title ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(740);
                        setWepTitle(st.title);
                        setWepOptions([...st.options]);
                        setWepRows(st.rows.map((r) => ({ ...r, scores: [...r.scores] })));
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <label className="builder-field">
                  <span className="setup-label mono">COMPARISON TITLE</span>
                  <input
                    type="text"
                    value={wepTitle}
                    onChange={(e) => setWepTitle(e.target.value)}
                  />
                </label>

                <div className="play-wep-rows-head">
                  <div className="setup-label mono">OPTIONS ({wepOptions.length} OF 2–5)</div>
                  {wepOptions.length < 5 && (
                    <button
                      type="button"
                      id="btn-wep-add-option"
                      className="setup-dl-btn mono"
                      onClick={() => {
                        soundEngine.playTick(800);
                        addWepOption();
                      }}
                    >
                      <Plus size={11} />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>

                <div className="play-opt-inputs">
                  {wepOptions.map((opt, idx) => (
                    <label key={idx} className="builder-field">
                      <span className="setup-label mono play-opt-lbl-row">
                        <span>OPTION 0{idx + 1}</span>
                        {wepOptions.length > 2 && (
                          <button
                            type="button"
                            className="play-opt-rm"
                            aria-label={`Remove option ${opt || idx + 1}`}
                            onClick={() => {
                              soundEngine.playTick(540);
                              removeWepOption(idx);
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...wepOptions];
                          next[idx] = e.target.value;
                          setWepOptions(next);
                        }}
                      />
                    </label>
                  ))}
                </div>

                <div className="play-wep-rows">
                  <div className="play-wep-rows-head">
                    <div className="setup-label mono">CRITERIA · WEIGHTS (AUTO-NORMALIZED) · 1–5 SCORES</div>
                    <div className="play-wep-rows-actions">
                      <button
                        type="button"
                        className="setup-dl-btn mono"
                        onClick={() => {
                          soundEngine.playTick(800);
                          setWepRows((prev) => [
                            ...prev,
                            {
                              id: `c-${Date.now()}`,
                              name: `Custom Criterion ${prev.length + 1}`,
                              weight: 15,
                              scores: wepOptions.map(() => 3),
                            },
                          ]);
                        }}
                      >
                        <Plus size={11} />
                        <span>Add Criterion</span>
                      </button>
                      <button
                        type="button"
                        className="setup-dl-btn mono"
                        onClick={() => {
                          soundEngine.playTick(620);
                          setWepTitle(WEP_STARTERS[0].title);
                          setWepOptions([...DEFAULT_WEP_OPTIONS]);
                          setWepRows(DEFAULT_WEP_ROWS.map((r) => ({ ...r, scores: [...r.scores] })));
                        }}
                        title="Reset WEP matrix to default RAG Vector DB preset"
                      >
                        <RotateCcw size={11} />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                  {wepRows.map((row, rIdx) => (
                    <div key={row.id} className="play-wep-row-card">
                      <div className="play-wep-row-top">
                        <input
                          type="text"
                          className="play-crit-input"
                          value={row.name}
                          aria-label={`Criterion ${rIdx + 1} name`}
                          onChange={(e) => {
                            const next = [...wepRows];
                            next[rIdx] = { ...row, name: e.target.value };
                            setWepRows(next);
                          }}
                        />
                        <div className="wep-w-ctrl mono">
                          <button
                            type="button"
                            aria-label={`Decrease weight for ${row.name}`}
                            onClick={() => {
                              soundEngine.playTick(620);
                              const next = [...wepRows];
                              next[rIdx] = { ...row, weight: Math.max(5, row.weight - 5) };
                              setWepRows(next);
                            }}
                          >
                            <Minus size={11} />
                          </button>
                          <span>{Math.round(wepResult.norm[rIdx].w * 100)}%</span>
                          <button
                            type="button"
                            aria-label={`Increase weight for ${row.name}`}
                            onClick={() => {
                              soundEngine.playTick(820);
                              const next = [...wepRows];
                              next[rIdx] = { ...row, weight: Math.min(80, row.weight + 5) };
                              setWepRows(next);
                            }}
                          >
                            <Plus size={11} />
                          </button>
                          {wepRows.length > 2 && (
                            <button
                              type="button"
                              aria-label={`Remove ${row.name}`}
                              title="Remove criterion"
                              onClick={() => {
                                soundEngine.playTick(540);
                                setWepRows((prev) => prev.filter((item) => item.id !== row.id));
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="play-score-trio">
                        {wepOptions.map((optName, oIdx) => (
                          <div key={oIdx} className="play-score-cell mono">
                            <span className="play-sc-lbl" title={optName || `Option ${oIdx + 1}`}>
                              {optName || `Option ${oIdx + 1}`}
                            </span>
                            <div className="play-sc-dots">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  className={`play-sc-btn ${(row.scores[oIdx] ?? 3) === val ? 'active' : ''}`}
                                  onClick={() => {
                                    soundEngine.playTick(560 + val * 70);
                                    const next = [...wepRows];
                                    const sc = [...row.scores];
                                    sc[oIdx] = val;
                                    next[rIdx] = { ...row, scores: sc };
                                    setWepRows(next);
                                  }}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="play-wep-out">
                <div className="play-report-card" style={{ padding: '1.25rem' }}>
                  <div className="wep-bars-col" style={{ marginBottom: '1.1rem' }}>
                    {wepResult.base.scores.map((item, idx) => (
                      <motion.div
                        key={item.optIdx}
                        layout
                        className={`dark-race-row ${idx === 0 ? 'is-lead' : ''}`}
                      >
                        <div className="dark-race-meta">
                          <span className="mono race-pos">0{idx + 1}</span>
                          <strong>{item.name}</strong>
                          <span className="mono race-val">{item.score.toFixed(2)} / 5.00</span>
                        </div>
                        <div className="dark-race-track">
                          <motion.div
                            className="dark-race-fill"
                            animate={{ width: `${(item.score / 5) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className={`dark-stamp mono ${wepResult.sensitive ? 'is-sens' : 'is-rob'}`}>
                    <span>±20% TOP-2 WEIGHT SENSITIVITY</span>
                    <strong>{wepResult.sensitive ? 'WEIGHT-SENSITIVE' : 'ROBUST WINNER'}</strong>
                  </div>
                </div>

                <div className="setup-right">
                  <div className="setup-code-head mono">
                    <span title="research/C-001-comparison.md">research/C-001-comparison.md</span>
                    <div className="setup-code-actions">
                      <button
                        type="button"
                        id="btn-wep-audit"
                        className="setup-dl-btn mono"
                        onClick={auditGeneratedWep}
                        title="Send generated WEP matrix directly to the Gate Auditor tab"
                      >
                        <span>Audit</span>
                        <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        id="btn-wep-share"
                        className="setup-dl-btn mono"
                        onClick={() => void shareWepLink()}
                        title="Copy stateless shareable URL for this WEP matrix"
                      >
                        <Link2 size={12} />
                        <span>Share</span>
                      </button>
                      <button
                        type="button"
                        className="setup-dl-btn mono"
                        onClick={() => {
                          downloadTextFile('C-001-comparison.md', wepResult.markdown);
                          showToast('Downloaded C-001-comparison.md');
                        }}
                      >
                        <Download size={12} />
                        <span>.md</span>
                      </button>
                      <button
                        type="button"
                        className={`dock-copy mono ${copiedId === 'wep-md' ? 'copied' : ''}`}
                        onClick={() => void handleCopy('wep-md', wepResult.markdown, 'C-001-comparison.md')}
                      >
                        {copiedId === 'wep-md' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === 'wep-md' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <pre className="dark-code-block setup-pre mono">
                    <code>{renderHighlightedCode(wepResult.markdown, 'markdown')}</code>
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: ZERO-INSTALL PROMPT STUDIO */}
        {tab === 'prompt' && (
          <motion.div
            key="prompt"
            className="setup-split"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="setup-left">
              <div className="play-preset-bar" style={{ marginBottom: '0.2rem' }}>
                <span className="mono wep-lbl">TRY EXAMPLE:</span>
                {(
                  [
                    {
                      label: 'Compare Libraries',
                      scope: 'comparison' as const,
                      door: 'two-way' as const,
                      q: 'Compare Pino vs Winston for a 15k req/sec Node.js API gateway',
                      opts: 'Pino, Winston',
                      ctx: 'Node 22; strict p99 latency budget (<2ms logging overhead); Datadog ingestion',
                    },
                    {
                      label: 'Event Bus Migration',
                      scope: 'decision' as const,
                      door: 'one-way' as const,
                      q: 'Should we adopt Kafka or NATS JetStream for cross-region event streaming?',
                      opts: 'Apache Kafka (Confluent), NATS JetStream, Redpanda',
                      ctx: '80k msg/s burst; 5-person platform team; strict replay window of 7 days',
                    },
                    {
                      label: 'Greenfield Platform',
                      scope: 'project' as const,
                      door: 'one-way' as const,
                      q: 'Architect a multi-tenant B2B observability platform with EU GDPR compliance',
                      opts: '',
                      ctx: '6-person team; 20M events/day initial scale; strict tenant isolation & audit trail',
                    },
                  ] as const
                ).map((ex) => (
                  <button
                    key={ex.label}
                    type="button"
                    className={`spot-chip mono ${pQuestion === ex.q ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playTick(740);
                      setPScope(ex.scope);
                      setPDoor(ex.door);
                      setPQuestion(ex.q);
                      setPOptions(ex.opts);
                      setPContext(ex.ctx);
                    }}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              <div className="builder-scope-row">
                <span className="setup-label mono">RESEARCH SCOPE</span>
                <div className="builder-scope-pills">
                  {(['comparison', 'decision', 'project'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      className={`spot-chip mono ${pScope === sc ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(740);
                        setPScope(sc);
                      }}
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>

              {pScope === 'decision' && (
                <div className="builder-scope-row">
                  <span className="setup-label mono">DOOR CLASSIFICATION</span>
                  <div className="builder-scope-pills">
                    {(['one-way', 'two-way'] as const).map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        className={`spot-chip mono ${pDoor === dt ? 'active' : ''}`}
                        onClick={() => {
                          soundEngine.playTick(720);
                          setPDoor(dt);
                        }}
                      >
                        {dt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="builder-field">
                <span className="setup-label mono">TECHNICAL QUESTION OR VISION</span>
                <input
                  type="text"
                  value={pQuestion}
                  onChange={(e) => setPQuestion(e.target.value)}
                />
              </label>

              {pScope !== 'project' && (
                <label className="builder-field">
                  <span className="setup-label mono">CONTENDER OPTIONS</span>
                  <input
                    type="text"
                    value={pOptions}
                    onChange={(e) => setPOptions(e.target.value)}
                  />
                </label>
              )}

              <label className="builder-field">
                <span className="setup-label mono">CONSTRAINTS, SCALE &amp; COMPLIANCE</span>
                <input
                  type="text"
                  value={pContext}
                  onChange={(e) => setPContext(e.target.value)}
                />
              </label>

              <div className="builder-tip mono">
                Paste directly into Claude, ChatGPT, or Gemini with Web Search enabled — zero installation required.
              </div>
            </div>

            <div className="setup-right">
              <div className="setup-code-head mono">
                <span>ZERO-INSTALL PROMPT · {pScope.toUpperCase()}</span>
                <div className="setup-code-actions">
                  <button
                    type="button"
                    id="btn-prompt-share"
                    className="setup-dl-btn mono"
                    onClick={() => void sharePromptLink()}
                    title="Copy stateless shareable URL for this prompt"
                  >
                    <Link2 size={12} />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    className="setup-dl-btn mono"
                    onClick={() => {
                      downloadTextFile(`vivechak-${pScope}-prompt.md`, generatedPrompt);
                      showToast(`Downloaded vivechak-${pScope}-prompt.md`);
                    }}
                  >
                    <Download size={12} />
                    <span>.md</span>
                  </button>
                  <button
                    type="button"
                    className={`dock-copy mono ${copiedId === 'studio-p' ? 'copied' : ''}`}
                    onClick={() => void handleCopy('studio-p', generatedPrompt, `${pScope} prompt`)}
                  >
                    {copiedId === 'studio-p' ? <Check size={12} /> : <Copy size={12} />}
                    <span>{copiedId === 'studio-p' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <pre className="dark-code-block setup-pre mono" style={{ maxHeight: 460 }}>
                <code>{renderHighlightedCode(generatedPrompt, 'markdown')}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
