import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { copyText } from '@/shared/lib/clipboard';
import { classifyPrompt, evaluateRnbx, type RnbxProfile, type ScopeResult } from '@/shared/lib/scopeEngine';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import { RiskDoorVisual } from './RiskDoorVisual';

export interface PromptBridgePayload {
  scope: 'comparison' | 'decision' | 'project';
  question: string;
  doorType: 'one-way' | 'two-way';
}

interface ScopeRiskPanelProps {
  onSendToPromptStudio?: (payload: PromptBridgePayload) => void;
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
    label: 'Bug fix (skip)',
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

const ZONES: { id: ScopeResult; code: string; name: string; speed: string }[] = [
  { id: 'comparison', code: 'C-NNN', name: 'Comparison', speed: '1 session · ~5 min' },
  { id: 'decision', code: 'D-NNN', name: 'Decision ADR', speed: '1–3 sessions · ~30 min' },
  { id: 'project', code: 'FAD', name: 'Project DAG', speed: '4–30 sessions · Full gate' },
  { id: 'out_of_scope', code: 'Skip', name: 'Code directly', speed: '0 MCP tools' },
];

const RNBX_LABELS: Record<keyof RnbxProfile, { code: string; label: string; hint: string }> = {
  r: { code: 'R', label: 'Reversal cost', hint: '0 Feature flag → 3 Full rewrite' },
  n: { code: 'N', label: 'Novelty', hint: '0 Known → 3 Unproven' },
  b: { code: 'B', label: 'Blast radius', hint: '0 Single module → 3 Entire product' },
  x: { code: 'X', label: 'Regulatory / security', hint: '3 triggers mandatory hard override' },
};

export const ScopeRiskPanel: React.FC<ScopeRiskPanelProps> = ({ onSendToPromptStudio }) => {
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[1].text);
  const [rnbx, setRnbx] = useState<RnbxProfile>({ r: 2, n: 2, b: 2, x: 1 });
  const [copied, setCopied] = useState(false);

  const cls = useMemo(() => classifyPrompt(prompt), [prompt]);
  const route = useMemo(() => evaluateRnbx(rnbx), [rnbx]);

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
    <div className="cal-sheet">
      <div className="cal-pane">
        <div className="cal-pane-head">
          <span className="cal-pane-title">1. Describe what you&rsquo;re deciding</span>
          <span className={`cal-signal mono ${cls.scope === 'out_of_scope' ? 'is-skip' : ''}`}>
            {cls.matchedSignal}
          </span>
        </div>

        <div className="cal-input-wrap">
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

        <div className="cal-presets">
          <span className="cal-presets-lbl">Try:</span>
          {PRESET_PROMPTS.map((sp) => (
            <button
              key={sp.label}
              type="button"
              className={`cal-preset-link ${prompt === sp.text ? 'active' : ''}`}
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
        </div>

        <div className="spec-strip" role="radiogroup" aria-label="Inferred research scope">
          {ZONES.map((z, zIdx) => {
            const isAct = z.id === cls.scope;
            return (
              <button
                key={z.id}
                type="button"
                className={`spec-cell ${isAct ? 'active' : ''} ${z.id === 'out_of_scope' ? 'is-skip' : ''}`}
                onClick={() => {
                  const sp = PRESET_PROMPTS[zIdx];
                  if (!sp) return;
                  if (sp.rnbx.x === 3) soundEngine.playReject();
                  else soundEngine.playTick(760);
                  setPrompt(sp.text);
                  setRnbx(sp.rnbx);
                }}
              >
                {isAct && (
                  <motion.span
                    layoutId="specActiveBar"
                    className={`spec-active-bar ${z.id === 'out_of_scope' ? 'is-skip' : ''}`}
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="spec-cell-code mono">{z.code}</span>
                <strong>{z.name}</strong>
                <span className="spec-cell-speed">{z.speed}</span>
              </button>
            );
          })}
        </div>

        {cls.mcpCall ? (
          <div className="spec-call mono">
            <code>{cls.mcpCall}</code>
            <div className="spec-call-actions">
              <button type="button" className={`inline-action-btn ${copied ? 'copied' : ''}`} onClick={copyCall}>
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {onSendToPromptStudio && cls.scope !== 'out_of_scope' && (
                <button
                  type="button"
                  id="btn-send-to-prompt"
                  className="btn-primary btn-sm"
                  onClick={() => {
                    soundEngine.playSieveDrop();
                    onSendToPromptStudio({
                      scope: cls.scope as 'comparison' | 'decision' | 'project',
                      question: prompt,
                      doorType: route.doorType,
                    });
                  }}
                >
                  <span>Build prompt</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="spec-skip-note">
            Routine implementation — skip Vivechak and write code directly.
          </div>
        )}
      </div>

      <div className="cal-pane cal-pane-risk">
        <div className="cal-pane-head">
          <span className="cal-pane-title">2. Profile reversal risk (R / N / B / X)</span>
          <span className="cal-pane-sub">Determines fast spike vs. red-team and human sign-off</span>
        </div>

        <div className="rnbx-layout">
          <div className="rnbx-grid">
            {(Object.keys(RNBX_LABELS) as Array<keyof RnbxProfile>).map((k) => {
              const meta = RNBX_LABELS[k];
              return (
                <div key={k} className="rnbx-row" title={meta.hint}>
                  <span className="rnbx-label">
                    <span className="mono rnbx-code">{meta.code}</span>
                    <span>{meta.label}</span>
                  </span>
                  <div className="rnbx-seg" role="radiogroup" aria-label={meta.label}>
                    {[0, 1, 2, 3].map((v) => (
                      <button
                        key={v}
                        type="button"
                        id={`rnbx-${k}-${v}`}
                        aria-label={`${meta.label} level ${v}`}
                        className={`rnbx-val mono ${rnbx[k] === v ? 'active' : ''} ${
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

          <div className={`rnbx-verdict ${route.hardOverride ? 'is-override' : ''}`}>
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
            <div className="rnbx-verdict-copy">
              <div className="rnbx-verdict-kicker">
                <span>{route.doorType === 'one-way' ? 'One-Way Door' : 'Two-Way Door'}</span>
                {route.hardOverride && <span className="rnbx-override-tag">X=3 override</span>}
              </div>
              <strong>{route.lane}</strong>
              <span className="rnbx-verdict-meta">{route.sessions}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
