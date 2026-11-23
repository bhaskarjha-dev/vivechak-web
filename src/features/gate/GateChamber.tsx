import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Lock, Play, RotateCcw, ShieldAlert, ShieldCheck, Unlock } from 'lucide-react';
import { navigate } from '@/shared/lib/router';
import { sha256Hex } from '@/shared/lib/sha256';
import { soundEngine } from '@/shared/lib/sound';
import { GateVaultVisual } from './GateVaultVisual';
import { Magnetic } from '@/shared/components/Magnetic';

interface GateState {
  evidenceGrounded: boolean;
  placeholdersFixed: boolean;
  redTeamRan: boolean;
  redTeamHash: string;
  signedOff: boolean;
  reviewerName: string;
  reviewedHash: string;
  outcomeTampered: boolean;
}

interface TermLine {
  id: number;
  kind: 'cmd' | 'pass' | 'fail' | 'warn' | 'hash' | 'muted';
  text: string;
}

const INITIAL_STATE: GateState = {
  evidenceGrounded: false,
  placeholdersFixed: false,
  redTeamRan: false,
  redTeamHash: '',
  signedOff: false,
  reviewerName: 'Jane Doe',
  reviewedHash: '',
  outcomeTampered: false,
};

async function computeHashes(s: Pick<GateState, 'evidenceGrounded' | 'placeholdersFixed' | 'outcomeTampered'>) {
  const outcomeBody = s.outcomeTampered
    ? `## Decision Outcome\nAdopt ClickHouse WITHOUT Vector batching buffer.\n## Rejected\n${s.placeholdersFixed ? 'TimescaleDB; DynamoDB' : '[Stub]'}`
    : `## Decision Outcome\nAdopt ClickHouse Cloud + Vector >=10k buffer [A · fetched].\n## Rejected\n${s.placeholdersFixed ? 'TimescaleDB; DynamoDB' : '[Stub]'}`;
  const fullAdr = `id:D-001|ev:${s.evidenceGrounded}|ph:${s.placeholdersFixed}|${outcomeBody}`;
  const [outcomeHash, adrHash] = await Promise.all([sha256Hex(outcomeBody), sha256Hex(fullAdr)]);
  return { outcomeHash, adrHash };
}

export const GateChamber: React.FC = () => {
  const [state, setState] = useState<GateState>(INITIAL_STATE);
  const stateRef = useRef<GateState>(INITIAL_STATE);
  stateRef.current = state;

  const [outcomeHash, setOutcomeHash] = useState('4b91e0a3c2f8d714a09b3e12f8c67120e4d91a0f');
  const [adrHash, setAdrHash] = useState('9a72c5e81f4d03b6e91c4a20d87f31b5c0a42e11');
  const [activeRuleId, setActiveRuleId] = useState('G10');
  const [ttyOpen, setTtyOpen] = useState(false);
  const [reviewerInput, setReviewerInput] = useState('Jane Doe');
  const [ttyConfirmInput, setTtyConfirmInput] = useState('');
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [termLines, setTermLines] = useState<TermLine[]>([
    { id: 1, kind: 'cmd', text: '$ vck gate --decision D-001' },
    { id: 2, kind: 'fail', text: 'FAIL (exit 1) · 6 blocking Track B rules: G6 G7 G8 G9 G10 G11' },
    { id: 3, kind: 'muted', text: 'Click Auto-Play Demo or toggle steps 01–04 to verify live SHA-256.' },
  ]);

  const termBodyRef = useRef<HTMLDivElement | null>(null);
  const nextId = useRef(20);
  const didMount = useRef(false);
  const timersRef = useRef<number[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  };

  const cancelAutoPlay = () => {
    if (timersRef.current.length > 0) {
      clearTimers();
      setAutoPlaying(false);
    }
  };

  useEffect(() => () => clearTimers(), []);

  const pushLines = (entries: Omit<TermLine, 'id'>[]) => {
    setTermLines((prev) => [
      ...prev.slice(-18),
      ...entries.map((e) => ({ ...e, id: nextId.current++ })),
    ]);
  };

  const { evidenceGrounded, placeholdersFixed, outcomeTampered } = state;
  useEffect(() => {
    let alive = true;
    void computeHashes({ evidenceGrounded, placeholdersFixed, outcomeTampered }).then(
      ({ outcomeHash: oh, adrHash: ah }) => {
        if (!alive) return;
        setOutcomeHash(oh);
        setAdrHash(ah);
      }
    );
    return () => {
      alive = false;
    };
  }, [evidenceGrounded, placeholdersFixed, outcomeTampered]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    if (termBodyRef.current) {
      termBodyRef.current.scrollTop = termBodyRef.current.scrollHeight;
    }
  }, [termLines, ttyOpen]);

  const rules = useMemo(() => {
    const g10 = state.redTeamRan && state.redTeamHash === outcomeHash;
    const g11 = state.signedOff && state.reviewedHash === adrHash;
    return [
      { id: 'G1', status: 'PASS' as const, note: 'Acyclic yaml vivechak-plan DAG verified.' },
      { id: 'G2', status: 'PASS' as const, note: 'Planned sessions D-001-S1 & S2 complete.' },
      { id: 'G3', status: 'N/A' as const, note: 'Decision scope target (FAD applies to Project scope).' },
      { id: 'G4', status: 'PASS' as const, note: 'research/D-001-decision.md materialized.' },
      { id: 'G5', status: 'PASS' as const, note: 'ADR frontmatter status: accepted.' },
      { id: 'G6', status: state.evidenceGrounded ? ('PASS' as const) : ('FAIL' as const), note: state.evidenceGrounded ? '3 Grade A/B primary https:// anchors.' : 'Need >=2 Grade A/B primary URLs.' },
      { id: 'G7', status: state.evidenceGrounded ? ('PASS' as const) : ('FAIL' as const), note: state.evidenceGrounded ? '3 claims labeled fetched.' : 'Grade D recalled memory blocked.' },
      { id: 'G8', status: state.placeholdersFixed ? ('PASS' as const) : ('FAIL' as const), note: state.placeholdersFixed ? 'Zero stubs; rejected alternatives cited.' : 'Template placeholders remain.' },
      { id: 'G9', status: state.placeholdersFixed ? ('PASS' as const) : ('FAIL' as const), note: state.placeholdersFixed ? 'Trigger: ingest > 150k/s or > $2.5k/mo.' : 'Missing quantitative review_trigger.' },
      { id: 'G10', status: g10 ? ('PASS' as const) : ('FAIL' as const), note: g10 ? `D-001-R1 hash verified (${outcomeHash.slice(0, 12)}…).` : state.redTeamRan ? 'STALE: decision_hash mismatch after tamper.' : 'Missing D-001-R1.md red-team hash.' },
      { id: 'G11', status: g11 ? ('PASS' as const) : ('FAIL' as const), note: g11 ? `TTY attested by ${state.reviewerName} (${adrHash.slice(0, 12)}…).` : state.signedOff ? 'STALE: ADR edited after human sign-off.' : 'Needs human TTY `vck signoff D-001`.' },
      { id: 'G12', status: 'PASS' as const, note: 'Track A two-way reversibility confirmed.' },
    ];
  }, [state, outcomeHash, adrHash]);

  const failCount = rules.filter((r) => r.status === 'FAIL').length;
  const passed = failCount === 0;
  const inspected = rules.find((r) => r.id === activeRuleId) ?? rules[9];
  const hashDiverged = state.redTeamRan && state.redTeamHash !== outcomeHash;

  const clearedSteps =
    (state.evidenceGrounded ? 1 : 0) +
    (state.placeholdersFixed ? 1 : 0) +
    (state.redTeamRan && state.redTeamHash === outcomeHash ? 1 : 0) +
    (state.signedOff && state.reviewedHash === adrHash ? 1 : 0);

  const handleGround = (fromAuto = false) => {
    if (!fromAuto) cancelAutoPlay();
    soundEngine.playSieveDrop();
    const next = { ...stateRef.current, evidenceGrounded: true, outcomeTampered: false };
    stateRef.current = next;
    setState(next);
    setActiveRuleId('G6');
    pushLines([
      { kind: 'cmd', text: '$ vivechak_save(kind="session", id="D-001-S1")' },
      { kind: 'pass', text: '✓ Grounded 3 Grade A/B fetched URLs → G6 · G7 PASS' },
    ]);
  };

  const handleFixStubs = (fromAuto = false) => {
    if (!fromAuto) cancelAutoPlay();
    soundEngine.playSieveDrop();
    const next = { ...stateRef.current, placeholdersFixed: true, outcomeTampered: false };
    stateRef.current = next;
    setState(next);
    setActiveRuleId('G8');
    pushLines([
      { kind: 'cmd', text: '$ vivechak_record_decision(id="D-001", status="accepted")' },
      { kind: 'pass', text: '✓ Locked rejected alts & >150k/s trigger → G8 · G9 PASS' },
    ]);
  };

  const handleRedTeam = async (fromAuto = false) => {
    if (!fromAuto) cancelAutoPlay();
    soundEngine.playSieveDrop();
    const { outcomeHash: oh } = await computeHashes(stateRef.current);
    const next = { ...stateRef.current, redTeamRan: true, redTeamHash: oh };
    stateRef.current = next;
    setState(next);
    setOutcomeHash(oh);
    setActiveRuleId('G10');
    pushLines([
      { kind: 'cmd', text: '$ vivechak_review(mode="red_team", id="D-001")' },
      { kind: 'hash', text: `  decision_hash: sha256:${oh.slice(0, 28)}…` },
      { kind: 'pass', text: '✓ Wrote research/D-001-R1.md → G10 PASS' },
    ]);
  };

  const handleAgentSelfSign = (fromAuto = false) => {
    if (!fromAuto) cancelAutoPlay();
    soundEngine.playReject();
    setActiveRuleId('G11');
    pushLines([
      { kind: 'cmd', text: '$ [Agent] vivechak_record_decision(human_reviewed=true)' },
      { kind: 'fail', text: '✗ E-HUMAN-ONLY-FIELD: agents cannot self-attest One-Way Doors.' },
    ]);
  };

  const finalizeSignoff = async (rev: string) => {
    const snap = stateRef.current;
    const { outcomeHash: oh, adrHash: ah } = await computeHashes(snap);
    const willPass = snap.evidenceGrounded && snap.placeholdersFixed && snap.redTeamRan && snap.redTeamHash === oh;
    if (willPass) soundEngine.playGatePass();
    else soundEngine.playSieveDrop();

    const next = { ...snap, signedOff: true, reviewerName: rev, reviewedHash: ah };
    stateRef.current = next;
    setState(next);
    setOutcomeHash(oh);
    setAdrHash(ah);
    setActiveRuleId('G11');
    setTtyOpen(false);
    setTtyConfirmInput('');
    pushLines([
      { kind: 'cmd', text: `$ vck signoff D-001 --reviewer "${rev}"  # /dev/tty` },
      { kind: 'hash', text: `  reviewed_hash: sha256:${ah.slice(0, 28)}…` },
      { kind: willPass ? 'pass' : 'warn', text: willPass ? '✓ Phase 0 Gate: PASS (exit 0) — Ready to code.' : '✓ G11 PASS (clear remaining red rules).' },
    ]);
  };

  const handleSignoff = async (e: React.FormEvent) => {
    e.preventDefault();
    const typed = ttyConfirmInput.trim().toUpperCase();
    const rev = reviewerInput.trim() || 'Jane Doe';
    if (typed !== 'D-001' && typed !== 'CONFIRM') {
      soundEngine.playReject();
      pushLines([{ kind: 'fail', text: '✗ Cancelled: type "D-001" to attest.' }]);
      return;
    }
    await finalizeSignoff(rev);
  };

  const handleTamper = () => {
    clearTimers();
    setAutoPlaying(false);
    soundEngine.playReject();
    const nextTampered = !stateRef.current.outcomeTampered;
    const next = { ...stateRef.current, outcomeTampered: nextTampered };
    stateRef.current = next;
    setState(next);
    setActiveRuleId('G10');
    if (nextTampered) {
      pushLines([
        { kind: 'warn', text: '! Silently edited D-001 Decision Outcome...' },
        { kind: 'fail', text: '✗ SHA-256 mismatch → G10 & G11 invalidated (EXIT 1)' },
      ]);
    } else {
      pushLines([{ kind: 'pass', text: '✓ Restored canonical ADR — hashes valid again.' }]);
    }
  };

  const handleReset = () => {
    clearTimers();
    setAutoPlaying(false);
    soundEngine.playTick(540);
    stateRef.current = INITIAL_STATE;
    setState(INITIAL_STATE);
    setTtyOpen(false);
    setTtyConfirmInput('');
    setActiveRuleId('G10');
    setTermLines([
      { id: nextId.current++, kind: 'cmd', text: '$ vck gate --decision D-001' },
      { id: nextId.current++, kind: 'fail', text: 'FAIL (exit 1) · Reset to unverified draft ADR.' },
    ]);
  };

  const handleAutoPlay = () => {
    clearTimers();
    stateRef.current = INITIAL_STATE;
    setState(INITIAL_STATE);
    setTtyOpen(false);
    setAutoPlaying(true);
    setTermLines([{ id: nextId.current++, kind: 'cmd', text: '$ vck gate --decision D-001  # guided demo' }]);

    const schedule = (ms: number, fn: () => void) => {
      timersRef.current.push(window.setTimeout(fn, ms));
    };

    schedule(260, () => handleAgentSelfSign(true));
    schedule(900, () => handleGround(true));
    schedule(1550, () => handleFixStubs(true));
    schedule(2200, () => void handleRedTeam(true));
    schedule(2950, () => {
      void finalizeSignoff('Jane Doe');
      setAutoPlaying(false);
    });
  };

  return (
    <section className="band-chamber" id="gate">
      <div className="wrap">
        <motion.div
          className="sec-head-split"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <span className="eyebrow-dark mono">03 · MECHANICAL PHASE 0 GATE</span>
            <h2 className="dark-title">Nothing ships unchallenged.</h2>
            <p className="dark-sub">
              Run the 3-second demo or operate every SHA-256 check manually — then tamper with the ADR.
            </p>
          </div>

          <div className="gate-head-right">
            <Magnetic>
              <motion.button
                type="button"
                id="gate-autoplay-btn"
                className="autoplay-btn mono"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleAutoPlay}
                disabled={autoPlaying}
              >
                <Play size={12} fill="currentColor" />
                <span>{autoPlaying ? 'Running…' : 'Auto-Play Demo'}</span>
              </motion.button>
            </Magnetic>

            <motion.div
              layout
              className={`gate-seal ${passed ? 'is-pass' : 'is-fail'}`}
              animate={{ scale: passed ? [1, 1.04, 1] : 1 }}
              transition={{ duration: 0.35 }}
            >
              {passed ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
              <div className="mono">
                <span className="seal-sub">{passed ? 'CLEAR TO CODE' : `${failCount} BLOCKING`}</span>
                <strong className="interlock-code">{passed ? 'EXIT 0 · PASS' : 'EXIT 1 · HOLD'}</strong>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <div className="gate-strip-wrap">
          <div className="gate-12-strip" role="tablist" aria-label="Phase 0 Gate Rules G1 to G12">
            {rules.map((r) => {
              const linked =
                (hoveredStep === 0 && (r.id === 'G6' || r.id === 'G7')) ||
                (hoveredStep === 1 && (r.id === 'G8' || r.id === 'G9')) ||
                (hoveredStep === 2 && r.id === 'G10') ||
                (hoveredStep === 3 && r.id === 'G11');
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={r.id === activeRuleId}
                  className={`g-chip mono st-${r.status.toLowerCase().replace('/', '')} ${r.id === activeRuleId ? 'sel' : ''} ${linked ? 'is-linked' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(r.status === 'PASS' ? 800 : 540);
                    setActiveRuleId(r.id);
                  }}
                >
                  <span className="g-led" aria-hidden="true" />
                  <span>{r.id}</span>
                </button>
              );
            })}
          </div>
          <div className="gate-12-note mono">
            <span className={`g-note-id st-${inspected.status.toLowerCase().replace('/', '')}`}>
              {inspected.id} · {inspected.status}
            </span>
            <span>{inspected.note}</span>
          </div>
        </div>

        <div className="gate-cockpit">
          <div className="gate-switches">
            {[
              {
                id: 'gate-step-evidence',
                num: '01',
                title: 'Ground ≥2 Grade A/B URLs',
                rules: 'G6 · G7',
                done: state.evidenceGrounded,
                onClick: () => handleGround(false),
              },
              {
                id: 'gate-step-placeholders',
                num: '02',
                title: 'Lock Rejected Alts & Trigger',
                rules: 'G8 · G9',
                done: state.placeholdersFixed,
                onClick: () => handleFixStubs(false),
              },
              {
                id: 'gate-step-redteam',
                num: '03',
                title: 'Run Red-Team SHA-256 Hash',
                rules: 'G10',
                done: state.redTeamRan && state.redTeamHash === outcomeHash,
                onClick: () => void handleRedTeam(false),
              },
              {
                id: 'gate-step-signoff',
                num: '04',
                title: 'Human TTY Sign-Off',
                rules: 'G11',
                done: state.signedOff && state.reviewedHash === adrHash,
                onClick: () => {
                  cancelAutoPlay();
                  soundEngine.playTick(760);
                  setTtyOpen(true);
                },
              },
            ].map((step, sIdx) => (
              <motion.button
                key={step.id}
                type="button"
                id={step.id}
                className={`g-step-btn ${step.done ? 'done' : ''}`}
                whileTap={{ scale: 0.99 }}
                onMouseEnter={() => setHoveredStep(sIdx)}
                onMouseLeave={() => setHoveredStep(null)}
                onFocus={() => setHoveredStep(sIdx)}
                onBlur={() => setHoveredStep(null)}
                onClick={step.onClick}
              >
                <span className="mono g-step-num">
                  {step.done ? <Check size={14} strokeWidth={2.5} /> : step.num}
                </span>
                <span className="g-step-title">{step.title}</span>
                <span className="mono g-step-tag">{step.rules}</span>
              </motion.button>
            ))}

            <div className="gate-attack-row">
              <button
                type="button"
                id="gate-probe-selfsign"
                className="attack-pill mono"
                onClick={() => handleAgentSelfSign(false)}
              >
                <Lock size={12} />
                <span>Test Agent Self-Sign</span>
              </button>
              <button
                type="button"
                id="gate-probe-tamper"
                className={`attack-pill mono ${state.outcomeTampered ? 'is-tampered' : ''}`}
                disabled={!state.redTeamRan && !state.signedOff}
                onClick={handleTamper}
              >
                <Unlock size={12} />
                <span>{state.outcomeTampered ? 'Restore ADR' : 'Tamper Outcome'}</span>
              </button>
              <a
                href="/playground"
                id="gate-open-auditor"
                className="attack-pill gate-auditor-link mono"
                onClick={(e) => {
                  e.preventDefault();
                  soundEngine.playSieveDrop();
                  navigate('/playground');
                }}
              >
                <span>Audit .md</span>
                <ArrowRight size={11} />
              </a>
              <button
                type="button"
                id="gate-reset"
                className="attack-pill attack-reset mono"
                onClick={handleReset}
                aria-label="Reset gate simulator"
              >
                <RotateCcw size={12} />
                <span>Reset Gate</span>
              </button>
            </div>
          </div>

          <GateVaultVisual
            steps={[
              state.evidenceGrounded,
              state.placeholdersFixed,
              state.redTeamRan && state.redTeamHash === outcomeHash,
              state.signedOff && state.reviewedHash === adrHash,
            ]}
            passed={passed}
            diverged={hashDiverged}
            highlightedStep={hoveredStep}
            onAdvanceStep={() => {
              if (state.outcomeTampered) {
                handleTamper();
              } else if (!state.evidenceGrounded) {
                handleGround(false);
              } else if (!state.placeholdersFixed) {
                handleFixStubs(false);
              } else if (!state.redTeamRan || state.redTeamHash !== outcomeHash) {
                void handleRedTeam(false);
              } else if (!state.signedOff || state.reviewedHash !== adrHash) {
                cancelAutoPlay();
                soundEngine.playTick(760);
                setTtyOpen(true);
              } else {
                handleTamper();
              }
            }}
          />

          <div className={`gate-term ${hashDiverged ? 'is-diverged' : ''}`} aria-live="polite">
            {/* Animated Step Progress Hairline */}
            <div className="gate-progress-track" aria-hidden="true">
              <motion.div
                className={`gate-progress-fill ${passed ? 'is-pass' : hashDiverged ? 'is-fail' : ''}`}
                animate={{ width: `${(clearedSteps / 4) * 100}%` }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              />
            </div>

            <div className="gate-term-head mono">
              <span>vck gate · D-001</span>
              {hashDiverged ? (
                <span className="hash-mismatch-badge">
                  {state.redTeamHash.slice(0, 8)}… ≠ {outcomeHash.slice(0, 8)}…
                </span>
              ) : (
                <span className="term-hash-pill">sha256:{outcomeHash.slice(0, 12)}…</span>
              )}
            </div>

            <div className={`gate-watched-diff mono ${state.outcomeTampered ? 'is-tampered' : ''}`}>
              <span className="gwd-lbl">{state.outcomeTampered ? 'TAMPERED DIFF' : 'HASHED OUTCOME'}</span>
              {state.outcomeTampered ? (
                <span className="gwd-text">
                  <del>+ Vector 10k buffer</del> <ins>NO batch buffer</ins>
                </span>
              ) : (
                <span className="gwd-text">ClickHouse Cloud + Vector ≥10k buffer [A · fetched]</span>
              )}
            </div>

            <div className="gate-term-body mono" ref={termBodyRef}>
              {termLines.map((l) => (
                <div key={l.id} className={`tl tl-${l.kind}`}>
                  {l.text}
                </div>
              ))}

              {ttyOpen && (
                <motion.form
                  className="tty-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={(e) => void handleSignoff(e)}
                >
                  <div className="tty-head">/dev/tty · Human Attestation</div>
                  <div className="tty-grid">
                    <label>
                      <span>Reviewer</span>
                      <input
                        id="tty-reviewer-input"
                        type="text"
                        value={reviewerInput}
                        onChange={(e) => setReviewerInput(e.target.value)}
                      />
                    </label>
                    <label>
                      <span>Type D-001</span>
                      <input
                        id="tty-confirm-input"
                        type="text"
                        value={ttyConfirmInput}
                        onChange={(e) => {
                          soundEngine.playKey();
                          setTtyConfirmInput(e.target.value);
                        }}
                        placeholder="D-001"
                        autoFocus
                      />
                    </label>
                  </div>
                  <div className="tty-foot">
                    <button type="submit" id="tty-submit-btn" className="btn-saffron btn-sm">
                      Attest &amp; Seal
                    </button>
                    {ttyConfirmInput.trim().toUpperCase() !== 'D-001' && (
                      <button
                        type="button"
                        className="attack-pill mono"
                        onClick={() => {
                          soundEngine.playKey();
                          setTtyConfirmInput('D-001');
                        }}
                      >
                        Fill D-001
                      </button>
                    )}
                    <button type="button" className="attack-pill mono" onClick={() => setTtyOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}
            </div>
            <div className="gate-term-boundary mono">
              Boundary: Vivechak verifies structure, SHA-256 parity &amp; typed /dev/tty sign-off — it never calls LLMs or fetches external URLs.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
