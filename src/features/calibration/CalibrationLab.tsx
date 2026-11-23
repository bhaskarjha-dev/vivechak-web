import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Copy, Minus, Plus, RotateCcw, Scale, Sliders, Sparkles } from 'lucide-react';
import { WEP_PRESETS } from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { classifyPrompt, evaluateRnbx, type RnbxProfile, type ScopeResult } from '@/shared/lib/scopeEngine';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import { RiskDoorVisual } from './RiskDoorVisual';

type LabTab = 'scope' | 'wep';

export interface PromptBridgePayload {
  scope: 'comparison' | 'decision' | 'project';
  question: string;
  doorType: 'one-way' | 'two-way';
  nonce: number;
}

interface CalibrationLabProps {
  onSendToPromptBuilder?: (payload: PromptBridgePayload) => void;
}

const PRESET_PROMPTS: { label: string; text: string; rnbx: RnbxProfile }[] = [
  {
    label: 'Zod vs Valibot',
    text: 'Compare Zod vs Valibot vs ArkType for our TypeScript API validation',
    rnbx: { r: 0, n: 0, b: 1, x: 0 },
  },
  {
    label: 'RabbitMQ → NATS',
    text: 'Should we migrate our internal event bus from RabbitMQ to NATS JetStream?',
    rnbx: { r: 2, n: 2, b: 2, x: 1 },
  },
  {
    label: 'Architect Katha (GDPR)',
    text: 'Architect Katha: collaborative AI novel-writing platform with story graph & GDPR',
    rnbx: { r: 3, n: 2, b: 3, x: 3 },
  },
  {
    label: 'Bug Fix (Skip)',
    text: 'Fix this nil pointer dereference stack trace in auth_handler.go',
    rnbx: { r: 0, n: 0, b: 0, x: 0 },
  },
];

function inferRnbxFromText(text: string): RnbxProfile {
  const lower = text.toLowerCase();
  if (/hipaa|pci|gdpr|soc\s*2|auth|sso|payment|medical|compliance/i.test(lower)) {
    return { r: 3, n: 2, b: 3, x: 3 };
  }
  if (/fix this|bug|stack trace|nil pointer|refactor|syntax|type error/i.test(lower)) {
    return { r: 0, n: 0, b: 0, x: 0 };
  }
  if (/migrate|database|datastore|event bus|kafka|nats|clickhouse|architect/i.test(lower)) {
    return { r: 2, n: 2, b: 2, x: 1 };
  }
  return { r: 0, n: 1, b: 1, x: 0 };
}

const ZONES: { id: ScopeResult; code: string; name: string; speed: string; pos: number }[] = [
  { id: 'comparison', code: 'C-NNN', name: 'Comparison', speed: '~5 min · Matrix', pos: 12.5 },
  { id: 'decision', code: 'D-NNN', name: 'Decision', speed: '~30 min · ADR', pos: 37.5 },
  { id: 'project', code: 'FAD', name: 'Project', speed: 'Full DAG · FAD', pos: 62.5 },
  { id: 'out_of_scope', code: 'SKIP', name: 'Code Directly', speed: '0 MCP tools', pos: 87.5 },
];

const RNBX_LABELS: Record<keyof RnbxProfile, { code: string; label: string; hint: string }> = {
  r: { code: 'R', label: 'Reversal', hint: '0 Flag → 3 Rewrite' },
  n: { code: 'N', label: 'Novelty', hint: '0 Known → 3 Unproven' },
  b: { code: 'B', label: 'Blast', hint: '0 Module → 3 Product' },
  x: { code: 'X', label: 'Compliance', hint: '3 = HIPAA / PCI Override' },
};

function handleSpotlightMove(e: React.PointerEvent<HTMLDivElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
}

export const CalibrationLab: React.FC<CalibrationLabProps> = ({ onSendToPromptBuilder }) => {
  const [labTab, setLabTab] = useState<LabTab>('scope');
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[1].text);
  const [rnbx, setRnbx] = useState<RnbxProfile>({ r: 2, n: 2, b: 2, x: 1 });
  const [copied, setCopied] = useState(false);

  const [presetIdx, setPresetIdx] = useState(0);
  const [shift, setShift] = useState<0 | 20 | -20>(0);
  const [weightOverrides, setWeightOverrides] = useState<Record<string, number>>({});
  const [showMatrix, setShowMatrix] = useState(false);
  const preset = WEP_PRESETS[presetIdx];

  const cls = useMemo(() => classifyPrompt(prompt), [prompt]);
  const route = useMemo(() => evaluateRnbx(rnbx), [rnbx]);
  const activeZone = ZONES.find((z) => z.id === cls.scope) ?? ZONES[1];

  const adjustWeight = (critId: string, delta: number) => {
    soundEngine.playTick(delta > 0 ? 820 : 620);
    setWeightOverrides((prev) => {
      const def = Math.round((preset.criteria.find((c) => c.id === critId)?.weight ?? 0.25) * 100);
      const cur = prev[critId] ?? def;
      return { ...prev, [critId]: Math.max(5, Math.min(85, cur + delta)) };
    });
  };

  const wep = useMemo(() => {
    const rawList = preset.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      raw: weightOverrides[c.id] ?? Math.round(c.weight * 100),
    }));
    const rawSum = rawList.reduce((a, b) => a + b.raw, 0);
    const baseW: Record<string, number> = {};
    rawList.forEach((c) => (baseW[c.id] = c.raw / rawSum));

    const sorted = [...rawList].sort((a, b) => b.raw - a.raw);
    const top1 = sorted[0]?.id;
    const top2 = sorted[1]?.id;

    const scoreFor = (pct: number) => {
      const weights: Record<string, number> = {};
      let sum = 0;
      for (const c of rawList) {
        let v = baseW[c.id];
        if (c.id === top1) v = Math.max(0.05, v * (1 + pct / 100));
        if (c.id === top2) v = Math.max(0.05, v * (1 - pct / 100));
        weights[c.id] = v;
        sum += v;
      }
      Object.keys(weights).forEach((k) => (weights[k] /= sum));

      const totals: Record<string, number> = {};
      for (const o of preset.options) {
        totals[o.id] = preset.criteria.reduce(
          (acc, crit) => acc + (crit.scores[o.id]?.score ?? 0) * weights[crit.id],
          0
        );
      }
      const ranking = [...preset.options].sort((a, b) => totals[b.id] - totals[a.id]);
      return { weights, totals, ranking, winner: ranking[0].id };
    };

    const base = scoreFor(0);
    const plus = scoreFor(20);
    const minus = scoreFor(-20);
    const active = scoreFor(shift);
    const sensitive = plus.winner !== base.winner || minus.winner !== base.winner;
    // Keep tuning controls in canonical preset order so chips never jump under the cursor while clicking
    const pinnedTopTwo = rawList.slice(0, 2);
    return { base, active, sensitive, topTwo: pinnedTopTwo };
  }, [preset, shift, weightOverrides]);

  const copyCall = async () => {
    if (!cls.mcpCall) return;
    const ok = await copyText(cls.mcpCall);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopied(true);
    showToast('Copied MCP vivechak_start call');
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="band-obsidian" id="calibrate">
      <div className="wrap">
        <motion.div
          className="sec-head-split"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <span className="eyebrow-dark mono">02 · REVERSIBILITY-CALIBRATED RIGOR</span>
            <h2 className="dark-title">Match rigor to reversal cost.</h2>
            <p className="dark-sub">
              Fast for reversible choices. Relentless for one-way bets. Zero overhead for routine code.
            </p>
          </div>

          <div className="dark-seg-switch" role="tablist" aria-label="Calibration lab views">
            {(
              [
                ['scope', 'Auto-Scope & Risk', Sliders],
                ['wep', 'Weighted Matrix (±20%)', Scale],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={labTab === id}
                id={`cal-tab-${id}`}
                className={`dark-seg-btn ${labTab === id ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(760);
                  setLabTab(id);
                }}
              >
                {labTab === id && (
                  <motion.span
                    layoutId="calTabPill"
                    className="dark-seg-bg"
                    transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                  />
                )}
                <Icon size={14} className="seg-ico" />
                <span className="seg-lbl">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {labTab === 'scope' ? (
          <motion.div
            key="scope"
            className="cal-stage ambient-glow"
            onPointerMove={handleSpotlightMove}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
              <div className="spotlight-box">
                <div className="spotlight-row">
                  <Sparkles size={15} className="spotlight-ico" />
                  <label htmlFor="scope-prompt-input" className="sr-only">
                    Test scope inference
                  </label>
                  <input
                    id="scope-prompt-input"
                    type="text"
                    value={prompt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrompt(val);
                      setRnbx(inferRnbxFromText(val));
                    }}
                    placeholder="Type any decision, comparison, rewrite, or bug fix..."
                  />
                </div>
                <div className="spotlight-chips">
                  {PRESET_PROMPTS.map((sp) => (
                    <button
                      key={sp.label}
                      type="button"
                      className={`spot-chip mono ${prompt === sp.text ? 'active' : ''}`}
                      onClick={() => {
                        if (sp.rnbx.x === 3) soundEngine.playReject();
                        else soundEngine.playTick(760);
                        setPrompt(sp.text);
                        setRnbx(sp.rnbx);
                      }}
                    >
                      {sp.label}
                    </button>
                  ))}
                  <span className={`scope-signal-pill mono ${cls.scope === 'out_of_scope' ? 'is-skip' : ''}`}>
                    {cls.matchedSignal}
                  </span>
                </div>
              </div>

              <div className="spec-beam-wrap">
                <div className="spec-beam" aria-hidden="true">
                  <motion.div
                    className={`spec-needle ${cls.scope === 'out_of_scope' ? 'is-skip' : ''}`}
                    animate={{ left: `${activeZone.pos}%` }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  />
                </div>
                <div className="spec-cols">
                  {ZONES.map((z) => (
                    <div
                      key={z.id}
                      className={`spec-col ${z.id === cls.scope ? 'active' : ''} ${z.id === 'out_of_scope' ? 'is-skip' : ''}`}
                    >
                      <span className="mono spec-code">{z.code}</span>
                      <strong>{z.name}</strong>
                      <span className="mono spec-speed">{z.speed}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="spec-output">
                {cls.mcpCall ? (
                  <div className="spec-call mono">
                    <code>{cls.mcpCall}</code>
                    <div className="spec-call-actions">
                      <button type="button" className="dock-copy mono" onClick={copyCall}>
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                      {onSendToPromptBuilder && cls.scope !== 'out_of_scope' && (
                        <button
                          type="button"
                          id="btn-send-to-prompt"
                          className="spec-bridge-btn mono"
                          onClick={() => {
                            soundEngine.playSieveDrop();
                            onSendToPromptBuilder({
                              scope: cls.scope as 'comparison' | 'decision' | 'project',
                              question: prompt,
                              doorType: route.doorType,
                              nonce: Date.now(),
                            });
                          }}
                        >
                          <span>Build Ready Prompt</span>
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="spec-skip-bar mono">
                    ZERO CEREMONY · SKIP VIVECHAK &amp; WRITE CODE DIRECTLY
                  </div>
                )}
              </div>

              <div className="rnbx-compact">
                <div className="rnbx-mini-grid">
                  {(Object.keys(RNBX_LABELS) as Array<keyof RnbxProfile>).map((k) => {
                    const meta = RNBX_LABELS[k];
                    return (
                      <div key={k} className="rnbx-mini-item" title={meta.hint}>
                        <span className="mono rnbx-k">
                          <b>{meta.code}</b> {meta.label}
                        </span>
                        <div className="rnbx-dots" role="radiogroup" aria-label={meta.label}>
                          {[0, 1, 2, 3].map((v) => (
                            <button
                              key={v}
                              type="button"
                              id={`rnbx-${k}-${v}`}
                              aria-label={`${meta.label} level ${v}`}
                              className={`rnbx-dot mono ${rnbx[k] === v ? 'active' : ''} ${
                                k === 'x' && v === 3 && rnbx.x === 3 ? 'is-override' : ''
                              }`}
                              onClick={() => {
                                if (k === 'x' && v === 3) soundEngine.playReject();
                                else soundEngine.playTick(560 + v * 110);
                                setRnbx((prev) => ({ ...prev, [k]: v }));
                              }}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={`rnbx-pill-verdict ${route.hardOverride ? 'is-override' : ''}`}>
                  <RiskDoorVisual
                    rnbx={rnbx}
                    doorType={route.doorType}
                    hardOverride={route.hardOverride}
                    onCycleMode={() => {
                      if (route.hardOverride) {
                        soundEngine.playSieveDrop();
                        setRnbx({ r: 0, n: 1, b: 1, x: 0 });
                      } else if (route.doorType === 'two-way') {
                        soundEngine.playTick(760);
                        setRnbx({ r: 2, n: 2, b: 2, x: 1 });
                      } else {
                        soundEngine.playReject();
                        setRnbx({ r: 2, n: 2, b: 2, x: 3 });
                      }
                    }}
                  />
                  <div className="rnbx-v-body">
                    <div className="mono rnbx-v-meta">
                      <span>{route.doorType === 'one-way' ? 'ONE-WAY DOOR' : 'TWO-WAY DOOR'}</span>
                      {route.hardOverride && <span className="override-chip">X=3 OVERRIDE</span>}
                    </div>
                    <div className="rnbx-v-main">
                      <strong>{route.lane}</strong>
                      <span className="mono">{route.sessions}</span>
                    </div>
                  </div>
                </div>
              </div>
          </motion.div>
        ) : (
          <motion.div
            key="wep"
            className="wep-compact-stage ambient-glow"
            onPointerMove={handleSpotlightMove}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
              <div className="wep-top-bar">
                <div className="wep-preset-pills">
                  {WEP_PRESETS.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`spot-chip mono ${i === presetIdx ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(740);
                        setPresetIdx(i);
                        setShift(0);
                        setWeightOverrides({});
                      }}
                    >
                      {i === 0
                        ? 'RAG Vector DB (±20% Flip)'
                        : i === 1
                          ? 'Pino vs Winston'
                          : 'ClickHouse vs Postgres'}
                    </button>
                  ))}
                </div>

                <div className="wep-stress-pills" role="group" aria-label="Weight sensitivity perturbation">
                  <span className="mono wep-lbl">STRESS TEST TOP-2:</span>
                  {([-20, 0, 20] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      id={`wep-shift-${s}`}
                      className={`spot-chip mono ${shift === s ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(s === 0 ? 700 : 860);
                        setShift(s);
                      }}
                    >
                      {s === 0 ? 'Base' : s > 0 ? '+20%' : '-20%'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wep-visual-race">
                <div className="wep-bars-col">
                  {wep.active.ranking.map((opt, idx) => {
                    const score = wep.active.totals[opt.id];
                    const baseRank = wep.base.ranking.findIndex((o) => o.id === opt.id);
                    const delta = baseRank - idx; // positive = moved UP!
                    return (
                      <motion.div
                        key={opt.id}
                        layout
                        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                        className={`dark-race-row ${idx === 0 ? 'is-lead' : ''}`}
                      >
                        <div className="dark-race-meta">
                          <span className="mono race-pos">0{idx + 1}</span>
                          <strong>{opt.name}</strong>
                          {delta > 0 && <span className="mono race-delta is-up">▲ FLIPPED #{idx + 1}</span>}
                          {delta < 0 && <span className="mono race-delta is-down">▼ #{idx + 1}</span>}
                          <span className="mono race-val">{score.toFixed(2)} / 5.00</span>
                        </div>
                        <div className="dark-race-track">
                          <motion.div
                            className="dark-race-fill"
                            animate={{ width: `${(score / 5) * 100}%` }}
                            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                          />
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Interactive Top-2 Weight Tuning Chips — stable order, push weights to watch live rank flip */}
                  <div className="wep-weight-row">
                    {wep.topTwo.map((c) => {
                      const pct = Math.round((wep.active.weights[c.id] ?? 0) * 100);
                      return (
                        <div key={c.id} className="wep-weight-chip mono">
                          <span className="wep-w-name">{c.name}</span>
                          <div className="wep-w-ctrl">
                            <button
                              type="button"
                              aria-label={`Decrease ${c.name} weight`}
                              onClick={() => adjustWeight(c.id, -10)}
                            >
                              <Minus size={11} />
                            </button>
                            <span>{pct}%</span>
                            <button
                              type="button"
                              aria-label={`Increase ${c.name} weight`}
                              onClick={() => adjustWeight(c.id, 10)}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {Object.keys(weightOverrides).length > 0 && (
                      <button
                        type="button"
                        className="wep-reset-btn mono"
                        aria-label="Reset criteria weights"
                        onClick={() => {
                          soundEngine.playTick(600);
                          setWeightOverrides({});
                        }}
                      >
                        <RotateCcw size={11} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                <motion.div
                  layout
                  className={`dark-stamp mono ${wep.sensitive ? 'is-sens' : 'is-rob'}`}
                >
                  <span>±20% SENSITIVITY CHECK</span>
                  <strong>{wep.sensitive ? 'WEIGHT-SENSITIVE' : 'ROBUST WINNER'}</strong>
                  <p>{preset.failureModes[wep.active.winner]}</p>
                </motion.div>
              </div>

              <div className="wep-matrix-toggle-row">
                <button
                  type="button"
                  id="btn-wep-matrix-toggle"
                  className="wep-matrix-btn mono"
                  aria-expanded={showMatrix}
                  onClick={() => {
                    soundEngine.playTick(740);
                    setShowMatrix((v) => !v);
                  }}
                >
                  <span>{showMatrix ? 'Hide Criterion Evidence Matrix' : `Inspect ${preset.criteria.length}×${preset.options.length} Criterion Scores & Grades`}</span>
                  <ChevronDown size={13} className={`wep-matrix-chev ${showMatrix ? 'is-open' : ''}`} />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {showMatrix && (
                  <motion.div
                    className="wep-matrix-drawer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="wep-matrix-scroll">
                      <table className="wep-mini-table mono">
                        <thead>
                          <tr>
                            <th>CRITERION</th>
                            <th>WT</th>
                            {preset.options.map((o) => (
                              <th key={o.id}>{o.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preset.criteria.map((crit) => {
                            const wPct = Math.round((wep.active.weights[crit.id] ?? crit.weight) * 100);
                            return (
                              <tr key={crit.id}>
                                <td className="wmt-name">{crit.name}</td>
                                <td className="wmt-wt">{wPct}%</td>
                                {preset.options.map((o) => {
                                  const cell = crit.scores[o.id];
                                  return (
                                    <td key={o.id} title={cell?.note}>
                                      <strong>{cell?.score ?? '–'}/5</strong>{' '}
                                      <span className={`wmt-grade g-${cell?.grade ?? 'B'}`}>[{cell?.grade ?? 'B'}]</span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
      </div>
    </section>
  );
};
