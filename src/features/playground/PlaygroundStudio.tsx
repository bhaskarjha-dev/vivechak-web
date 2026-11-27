import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  Link2,
  Minus,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import { AUDITOR_PRESETS } from '@/shared/lib/auditorEngine';
import { ScopeRiskPanel } from '@/features/calibration/ScopeRiskPanel';
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
    applyScopeBridge,
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
            <h1 className="play-h1">Playground</h1>
            <p className="sec-sub mono" style={{ fontSize: '0.82rem' }}>
              Offline ADR auditor · Scope &amp; R/N/B/X · WEP ±20% · Prompt studio
            </p>
          </div>

          <div className="tab-rail" role="tablist" aria-label="Playground tools">
            {(
              [
                ['auditor', 'ADR & Gate Auditor'],
                ['scope', 'Scope & Risk'],
                ['wep', 'WEP ±20% Builder'],
                ['prompt', 'Prompt Studio'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                id={`play-tab-${id}`}
                className={`tab-rail-btn ${tab === id ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(760);
                  setDidSwitchTab(true);
                  setTab(id);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', `/playground#${id}`);
                  }
                }}
              >
                <span>{label}</span>
                {tab === id && (
                  <motion.span
                    layoutId="playTabLine"
                    className="tab-rail-indicator"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 2: LIVE SCOPE CLASSIFIER & R/N/B/X RISK PROFILER */}
        {tab === 'scope' && (
          <ScopeRiskPanel onSendToPromptStudio={applyScopeBridge} />
        )}

        {/* TAB 1: LIVE ADR, SESSION & PHASE 0 GATE AUDITOR */}
        {tab === 'auditor' && (
          <div className="play-auditor-wrap">
            <div className="play-toolbar">
              <div className="play-preset-chips">
                <span className="play-lbl">Sample:</span>
                {AUDITOR_PRESETS.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    id={`auditor-preset-${pr.id}`}
                    className={`play-preset-btn ${editorText === pr.content ? 'active' : ''}`}
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
                  className="inline-action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Open a local .md file (processed 100% offline)"
                >
                  <Upload size={12} />
                  <span>Open .md</span>
                </button>
                {needsSkeletonFix && (
                  <button
                    type="button"
                    className="inline-action-btn"
                    onClick={insertMissingSkeleton}
                  >
                    <Wand2 size={12} />
                    <span>Fix missing sections</span>
                  </button>
                )}
                <button
                  type="button"
                  className="inline-action-btn"
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
                  className={`inline-action-btn ${copiedId === 'aud-md' ? 'copied' : ''}`}
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
                      ? 'Drop local .md file to audit offline'
                      : `${audit.artifactKind} · ${audit.doorType}`}
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
                  {audit.verdict === 'PASS' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                  <div className="mono">
                    <span className="seal-sub">
                      {audit.verdict === 'PASS'
                        ? 'Mechanical audit clear'
                        : `${audit.rules.filter((r) => r.status === 'FAIL').length} blocking gate failure(s)`}
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

                <div className="play-rules-section">
                  <div className="play-section-lbl">Mechanical gate checks</div>
                  <div className="play-rules-ledger">
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
                </div>

                <div className="play-diag-section">
                  <div className="play-section-lbl">
                    Quality coach &amp; diagnostics ({audit.diagnostics.length})
                  </div>
                  {audit.diagnostics.length === 0 ? (
                    <div className="play-clean-note">
                      Zero E-*, V-*, W-*, or Q-* coaching observations detected.
                    </div>
                  ) : (
                    <div className="play-diag-ledger">
                      {audit.diagnostics.map((d) => (
                        <div key={`${d.code}-${d.message}`} className={`play-diag-row sev-${d.severity}`}>
                          <div className="play-diag-top mono">
                            <AlertTriangle size={12} />
                            <strong>{d.code}</strong>
                          </div>
                          <p>{d.message}</p>
                          <span className="mono play-diag-fix">Fix: {d.fix}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EDITABLE WEP ±20% MATRIX BUILDER */}
        {tab === 'wep' && (
          <div className="play-wep-wrap">
            <div className="play-wep-grid">
              <div className="play-editor-card play-wep-form">
                <div className="play-preset-chips">
                  <span className="play-lbl">Starter:</span>
                  {WEP_STARTERS.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`play-preset-btn ${wepTitle === st.title ? 'active' : ''}`}
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
                  <span className="setup-label">Comparison title</span>
                  <input
                    type="text"
                    value={wepTitle}
                    onChange={(e) => setWepTitle(e.target.value)}
                  />
                </label>

                <div className="play-wep-rows-head">
                  <span className="setup-label">Options ({wepOptions.length} of 2–5)</span>
                  {wepOptions.length < 5 && (
                    <button
                      type="button"
                      id="btn-wep-add-option"
                      className="inline-action-btn"
                      onClick={() => {
                        soundEngine.playTick(800);
                        addWepOption();
                      }}
                    >
                      <Plus size={11} />
                      <span>Add option</span>
                    </button>
                  )}
                </div>

                <div className="play-opt-inputs">
                  {wepOptions.map((opt, idx) => (
                    <label key={idx} className="builder-field">
                      <span className="setup-label play-opt-lbl-row">
                        <span>Option 0{idx + 1}</span>
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
                    <span className="setup-label">Criteria, weights &amp; 1–5 scores</span>
                    <div className="play-wep-rows-actions">
                      <button
                        type="button"
                        className="inline-action-btn"
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
                        <span>Add criterion</span>
                      </button>
                      <button
                        type="button"
                        className="inline-action-btn"
                        onClick={() => {
                          soundEngine.playTick(620);
                          setWepTitle(WEP_STARTERS[0].title);
                          setWepOptions([...DEFAULT_WEP_OPTIONS]);
                          setWepRows(DEFAULT_WEP_ROWS.map((r) => ({ ...r, scores: [...r.scores] })));
                        }}
                        title="Reset WEP matrix"
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
                          <div key={oIdx} className="play-score-cell">
                            <span className="play-sc-lbl" title={optName || `Option ${oIdx + 1}`}>
                              {optName || `Option ${oIdx + 1}`}
                            </span>
                            <div className="play-sc-dots mono">
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
                <div className="play-report-card play-wep-summary">
                  <div className="wep-bars-col" style={{ marginBottom: '1.15rem' }}>
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
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className={`dark-stamp ${wepResult.sensitive ? 'is-sens' : 'is-rob'}`}>
                    <span className="stamp-kicker">±20% top-2 weight sensitivity</span>
                    <strong>{wepResult.sensitive ? 'Weight-sensitive' : 'Robust winner'}</strong>
                  </div>
                </div>

                <div className="setup-right">
                  <div className="setup-code-head mono">
                    <span title="research/C-001-comparison.md">research/C-001-comparison.md</span>
                    <div className="setup-code-actions">
                      <button
                        type="button"
                        id="btn-wep-audit"
                        className="inline-action-btn"
                        onClick={auditGeneratedWep}
                      >
                        <span>Audit</span>
                        <ArrowRight size={11} />
                      </button>
                      <button
                        type="button"
                        id="btn-wep-share"
                        className="inline-action-btn"
                        onClick={() => void shareWepLink()}
                      >
                        <Link2 size={12} />
                        <span>Share</span>
                      </button>
                      <button
                        type="button"
                        className="inline-action-btn"
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
                        className={`inline-action-btn ${copiedId === 'wep-md' ? 'copied' : ''}`}
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
          </div>
        )}

        {/* TAB 3: ZERO-INSTALL PROMPT STUDIO */}
        {tab === 'prompt' && (
          <div className="setup-split">
            <div className="setup-left">
              <div className="play-preset-chips">
                <span className="play-lbl">Example:</span>
                {(
                  [
                    {
                      label: 'Compare libraries',
                      scope: 'comparison' as const,
                      door: 'two-way' as const,
                      q: 'Compare Pino vs Winston for a 15k req/sec Node.js API gateway',
                      opts: 'Pino, Winston',
                      ctx: 'Node 22; strict p99 latency budget (<2ms logging overhead); Datadog ingestion',
                    },
                    {
                      label: 'Event bus migration',
                      scope: 'decision' as const,
                      door: 'one-way' as const,
                      q: 'Should we adopt Kafka or NATS JetStream for cross-region event streaming?',
                      opts: 'Apache Kafka (Confluent), NATS JetStream, Redpanda',
                      ctx: '80k msg/s burst; 5-person platform team; strict replay window of 7 days',
                    },
                    {
                      label: 'Greenfield platform',
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
                    className={`play-preset-btn ${pQuestion === ex.q ? 'active' : ''}`}
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
                <span className="setup-label">Research scope</span>
                <div className="sieve-rail">
                  {(['comparison', 'decision', 'project'] as const).map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      className={`sieve-rail-btn ${pScope === sc ? 'active' : ''}`}
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
                  <span className="setup-label">Door classification</span>
                  <div className="sieve-rail">
                    {(['one-way', 'two-way'] as const).map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        className={`sieve-rail-btn ${pDoor === dt ? 'active' : ''}`}
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
                <span className="setup-label">Technical question or vision</span>
                <input
                  type="text"
                  value={pQuestion}
                  onChange={(e) => setPQuestion(e.target.value)}
                />
              </label>

              {pScope !== 'project' && (
                <label className="builder-field">
                  <span className="setup-label">Contender options</span>
                  <input
                    type="text"
                    value={pOptions}
                    onChange={(e) => setPOptions(e.target.value)}
                  />
                </label>
              )}

              <label className="builder-field">
                <span className="setup-label">Constraints, scale &amp; compliance</span>
                <input
                  type="text"
                  value={pContext}
                  onChange={(e) => setPContext(e.target.value)}
                />
              </label>

              <p className="builder-tip">
                Paste directly into Claude, ChatGPT, or Gemini with web search enabled — zero installation required.
              </p>
            </div>

            <div className="setup-right">
              <div className="setup-code-head mono">
                <span>Zero-install prompt · {pScope}</span>
                <div className="setup-code-actions">
                  <button
                    type="button"
                    id="btn-prompt-share"
                    className="inline-action-btn"
                    onClick={() => void sharePromptLink()}
                  >
                    <Link2 size={12} />
                    <span>Share</span>
                  </button>
                  <button
                    type="button"
                    className="inline-action-btn"
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
                    className={`inline-action-btn ${copiedId === 'studio-p' ? 'copied' : ''}`}
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
          </div>
        )}
      </div>
    </div>
  );
};
