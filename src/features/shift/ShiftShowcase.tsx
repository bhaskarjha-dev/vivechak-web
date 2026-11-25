import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  FileCheck2,
  Flame,
  LayoutGrid,
  MoveHorizontal,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { copyText } from '@/shared/lib/clipboard';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

type ShiftMode = 'without' | 'curtain' | 'with';

const FLOW_STEPS = [
  { num: '01', kind: 'sieve' as const, href: '#architecture', icon: SearchCheck, title: 'Research', file: 'sessions/*.md', desc: 'Cite live URLs; memory caps at D.' },
  { num: '02', kind: 'hash' as const, href: '#calibrate', icon: ShieldAlert, title: 'Challenge', file: 'D-001-R1.md', desc: 'Red-team bets with SHA-256 hash.' },
  { num: '03', kind: 'lock' as const, href: '#gate', icon: ShieldCheck, title: 'Exit Gate', file: 'PHASE-0-GATE.md', desc: 'Human sign-off; CI blocks drift.' },
];

const FlowGlyph: React.FC<{ kind: 'sieve' | 'hash' | 'lock' }> = ({ kind }) => {
  if (kind === 'sieve') {
    return (
      <svg viewBox="0 0 64 28" className="flow-glyph" aria-hidden="true">
        <path d="M 6 5 H 58 L 36 18 H 28 Z" fill="none" stroke="rgba(244,240,232,0.35)" strokeWidth="1.4" strokeLinejoin="round" />
        {/* Rejected red noise bouncing off left rim */}
        <circle r="2.2" fill="#e1524a">
          <animate attributeName="cx" values="16;14;7" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="cy" values="2;6;12" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0.95;0" dur="2.2s" repeatCount="indefinite" />
        </circle>
        {/* Verified Grade A gold drop passing through */}
        <circle cx="32" r="2.6" fill="#f2a33a">
          <animate attributeName="cy" values="3;14;24" dur="1.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.2;1;0.9" dur="1.9s" repeatCount="indefinite" />
        </circle>
        <circle cx="32" cy="24" r="3.4" fill="none" stroke="#3ce3a8" strokeWidth="1.1">
          <animate attributeName="r" values="3;8" dur="1.9s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.85;0" dur="1.9s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }
  if (kind === 'hash') {
    return (
      <svg viewBox="0 0 64 28" className="flow-glyph" aria-hidden="true">
        <rect x="6" y="7" width="22" height="14" rx="2.5" fill="rgba(242,163,58,0.12)" stroke="#f2a33a" strokeWidth="1.2" />
        <line x1="10" y1="12" x2="24" y2="12" stroke="#ffd57a" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="10" y1="16" x2="20" y2="16" stroke="rgba(244,240,232,0.45)" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="28" y1="14" x2="40" y2="14" stroke="rgba(242,163,58,0.5)" strokeWidth="1.2" strokeDasharray="2 2" />
        <circle r="2" cy="14" fill="#f2a33a">
          <animate attributeName="cx" values="28;41" dur="1.7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0" dur="1.7s" repeatCount="indefinite" />
        </circle>
        <polygon points="49,5 57,9 57,17 49,23 41,17 41,9" fill="rgba(60,227,168,0.14)" stroke="#3ce3a8" strokeWidth="1.3" />
        <circle cx="49" cy="14" r="2.5" fill="#3ce3a8">
          <animate attributeName="r" values="2;3.2;2" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 28" className="flow-glyph" aria-hidden="true">
      <circle cx="32" cy="14" r="10.5" fill="none" stroke="rgba(60,227,168,0.28)" strokeWidth="1.2" />
      <circle cx="32" cy="14" r="7" fill="none" stroke="#3ce3a8" strokeWidth="1.5" strokeDasharray="16 8">
        <animateTransform attributeName="transform" type="rotate" from="0 32 14" to="360 32 14" dur="7s" repeatCount="indefinite" />
      </circle>
      <path d="M 28.5 14 L 31 16.6 L 36 11.4" fill="none" stroke="#6ce8bb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const STATS = [
  { num: 'A–E', label: 'Evidence Grades', note: 'Memory capped at Grade D' },
  { num: '9,063 B', label: 'Total MCP Context', note: '9 tools · <10 KB budget' },
  { num: '0', label: 'Hidden Databases', note: 'No SQLite · no telemetry' },
  { num: '100%', label: 'Git Markdown', note: 'Diffable ADRs in PRs' },
];

interface ShiftScenario {
  id: string;
  chip: string;
  prompt: string;
  rawQuote: string;
  defects: { icon: typeof XCircle; title: string; sub: string }[];
  filePath: string;
  badge: string;
  outcome: string;
  signals: { icon: typeof CheckCircle2; k: string; v: string; meta: string }[];
  rawMd: string;
}

const SCENARIOS: ShiftScenario[] = [
  {
    id: 'clickhouse',
    chip: 'ClickHouse Migration',
    prompt: 'Should we migrate 25M events/day from PostgreSQL to ClickHouse?',
    rawQuote:
      'Yes! ClickHouse handles millions of rows per second effortlessly. Stream your webhook events directly into MergeTree for instant 100× speedups with minimal operational overhead.',
    defects: [
      { icon: XCircle, title: 'Zero live citations', sub: 'Pure parametric probability' },
      { icon: AlertTriangle, title: 'Hidden prod outage', sub: 'Misses MergeTree "Too many parts"' },
      { icon: Flame, title: 'Zero audit trail', sub: 'Lost when chat tab closes' },
    ],
    filePath: 'research/D-001-decision.md',
    badge: 'ONE-WAY DOOR · VERIFIED',
    outcome: 'Adopt ClickHouse Cloud + Vector ≥10k-row buffer; retain PostgreSQL for OLTP.',
    signals: [
      { icon: CheckCircle2, k: 'EVIDENCE', v: 'Grade A · Fetched', meta: 'clickhouse.com/docs · ClickBench' },
      { icon: AlertTriangle, k: 'RED-TEAM (D-001-R1)', v: 'Mitigated MergeTree collapse', meta: 'Vector 10k-row batch + async_insert=1' },
      { icon: ShieldCheck, k: 'REJECTED & TRIGGER', v: 'TimescaleDB · DynamoDB', meta: 'Review if ingest > 150k/s or > $2.5k/mo' },
      { icon: FileCheck2, k: 'HUMAN ATTESTATION', v: 'Signed by Jane Doe', meta: 'sha256:8c3f9e41b2a7d018…' },
    ],
    rawMd: `---
id: D-001
status: accepted
door_type: one-way
review_trigger: "Ingest > 150k/s or storage > $2,500/mo"
human_reviewed: true
reviewed_by: "Jane Doe"
reviewed_hash: "8c3f9e41b2a7d018f5e9a3102b77d4c1..."
---
# D-001: Analytical Event Storage Engine

## Decision Outcome
Adopt ClickHouse Cloud + Vector >=10k-row batch buffer for 30-day
analytics; retain PostgreSQL for OLTP [A · corroborated · fetched](https://clickhouse.com/docs/...)

## Rejected Alternatives
- PostgreSQL + TimescaleDB: ad-hoc filters exceed 2.4s p95 [B · fetched](https://benchmark.clickhouse.com/)
- DynamoDB + Athena: 1.5–6s cold Parquet scan latency [A · fetched](https://docs.aws.amazon.com/athena/)

## Challenge Findings (D-001-R1 · SHA-256 verified)
Direct micro-inserts (<1k rows) trigger MergeTree "Too many parts" failure;
mitigated via Vector 10k-row batching + async_insert=1.`,
  },
  {
    id: 'auth',
    chip: 'B2B Auth & SSO',
    prompt: 'Should we build custom JWT auth or adopt Auth0 / Clerk for B2B SSO?',
    rawQuote:
      'Rolling your own JWT authentication in Go or Node is lightweight and avoids vendor lock-in. Just sign HS256 tokens in a cookie and add SAML later when enterprise customers ask.',
    defects: [
      { icon: XCircle, title: 'Ignores SAML / SCIM cliff', sub: 'Enterprise IdP edge cases take months' },
      { icon: AlertTriangle, title: 'Security footgun', sub: 'No key rotation, revocation, or SOC 2 audit' },
      { icon: Flame, title: 'No cost break-even', sub: 'Unverified MAU pricing assumptions' },
    ],
    filePath: 'research/D-004-decision.md',
    badge: 'COMPLIANCE LOCK · X=3',
    outcome: 'Compose WorkOS / Clerk for SSO & session tokens; keep RBAC policy in local Postgres.',
    signals: [
      { icon: CheckCircle2, k: 'EVIDENCE', v: 'Grade A · Fetched', meta: 'RFC 7519 · OWASP ASVS · Pricing docs' },
      { icon: AlertTriangle, k: 'RED-TEAM (D-004-R1)', v: 'Zero-downtime exit path', meta: 'Standard OIDC sub mapping + local org table' },
      { icon: ShieldCheck, k: 'REJECTED & TRIGGER', v: 'Custom JWT · Self-hosted Keycloak', meta: 'Review if MAU > 50k or SSO bill > $1.8k/mo' },
      { icon: FileCheck2, k: 'HUMAN ATTESTATION', v: 'Signed by Security Lead', meta: 'sha256:41f0c82e7b19a5d3…' },
    ],
    rawMd: `---
id: D-004
status: accepted
door_type: one-way
review_trigger: "Active orgs > 250 or auth vendor spend > $1,800/mo"
human_reviewed: true
reviewed_by: "Security Lead"
reviewed_hash: "41f0c82e7b19a5d390e2c44a1f66b8e0..."
---
# D-004: B2B Authentication & Enterprise SSO Boundary

## Decision Outcome
Compose managed OIDC/SAML identity with local PostgreSQL RBAC tables per Principle P5
[A · corroborated · fetched](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Rejected Alternatives
- Custom JWT + hand-rolled SAML: fails SOC 2 timeline & revocation rigor [A · fetched](https://datatracker.ietf.org/doc/html/rfc8725)
- Self-hosted Keycloak: JVM cluster ops overhead unjustified for 6-person team [B · fetched](https://www.keycloak.org/high-availability/concepts-memory-and-cpu-sizing)

## Challenge Findings (D-004-R1 · SHA-256 verified)
Vendor lock-in mitigated by isolating provider IDs behind an internal user_identities table.`,
  },
  {
    id: 'pino',
    chip: 'Pino vs Winston',
    prompt: 'Compare Pino vs Winston for our 15k req/sec Node.js API gateway',
    rawQuote:
      'Winston is the most popular Node.js logging library with rich transports and formatting. Use Winston with JSON format — both libraries are fast enough for modern servers.',
    defects: [
      { icon: XCircle, title: 'Outdated popularity bias', sub: 'Conflates npm downloads with p99 safety' },
      { icon: AlertTriangle, title: 'Event-loop saturation', sub: '1.8ms synchronous formatting at 15k rps' },
      { icon: Flame, title: 'Zero sensitivity check', sub: 'No weighted matrix or failure modes' },
    ],
    filePath: 'research/C-001-comparison.md',
    badge: 'COMPARISON · ROBUST',
    outcome: 'Select Pino (4.82 / 5.00) with sonic-boom worker transports + graceful flushSync hook.',
    signals: [
      { icon: CheckCircle2, k: 'WEP SCORE', v: 'Pino 4.82 vs Winston 3.16', meta: '±20% sensitivity check: ROBUST WINNER' },
      { icon: AlertTriangle, k: 'FAILURE MODE', v: 'SIGKILL log drop guarded', meta: 'Wire pino.final() on SIGTERM / SIGINT' },
      { icon: ShieldCheck, k: 'SCOPE SPEED', v: '1 Session · ~5 Minutes', meta: 'Zero DAG · Zero Phase 0 Gate ceremony' },
      { icon: FileCheck2, k: 'VERIFICATION', v: 'Grade A & B Fetched', meta: 'getpino.io · Node 22 V8 flamegraphs' },
    ],
    rawMd: `---
id: C-001
type: comparison
status: complete
door_type: two-way
---
# C-001: High-Throughput Node.js Logger Comparison (WEP)

| Criterion | Weight | Pino | Winston | Bunyan |
|---|---:|---:|---:|---:|
| Event-Loop Latency | 0.35 | 5 [B · fetched] | 2 [B · fetched] | 3 [B · fetched] |
| GC & Heap Pressure | 0.25 | 5 [A · fetched] | 3 [B · fetched] | 4 [A · fetched] |
| Transport Ecosystem | 0.22 | 4 [A · fetched] | 5 [A · fetched] | 2 [C · fetched] |
| Maintenance & CVEs | 0.18 | 5 [A · fetched] | 4 [A · fetched] | 1 [A · fetched] |

## Sensitivity (±20% Top-2): ROBUST WINNER — Pino (4.82 vs 3.16)
Failure mode: async worker buffer can drop tail logs on SIGKILL unless flushSync is wired.`,
  },
  {
    id: 'katha',
    chip: 'New Platform (Katha)',
    prompt: 'Architect Katha: collaborative AI novel-writing platform with story graph & EU GDPR',
    rawQuote:
      'Use Neo4j for the character knowledge graph, build a custom WebSocket OT engine for real-time chapter editing, add Redis pub/sub, and run a separate Pinecone cluster for AI plot recall.',
    defects: [
      { icon: XCircle, title: '4 stateful clusters on Day 1', sub: 'Violates Principle P5 (Commodity Composition)' },
      { icon: AlertTriangle, title: 'Unchallenged graph bias', sub: 'Assumes Neo4j without benchmarking 50k-node CTEs' },
      { icon: Flame, title: 'GDPR erasure nightmare', sub: 'User data scattered across 4 incompatible stores' },
    ],
    filePath: 'research/FAD.md',
    badge: 'FULL PROJECT · 4 SESSIONS',
    outcome: 'PostgreSQL 16 (recursive CTEs + pgvector) + Yjs CRDT; eliminated Neo4j & custom OT.',
    signals: [
      { icon: CheckCircle2, k: 'BELIEF DELTA', v: 'Neo4j assumption contradicted', meta: 'PG16 CTEs traverse 50k nodes <50ms p95 [A]' },
      { icon: AlertTriangle, k: 'SYNC ENGINE', v: 'Yjs CRDT (Two-Way Door)', meta: 'Offline-first flights + zero custom OT bugs' },
      { icon: ShieldCheck, k: 'GDPR COMPLIANCE', v: 'Single ACID erasure boundary', meta: 'Relational + vector rows deleted atomically' },
      { icon: FileCheck2, k: 'SYNTHESIS', v: 'research/FAD.md sealed', meta: '4 DAG sessions → Track A + Track B PASS' },
    ],
    rawMd: `---
id: FAD
type: fad
title: "Katha — Founding Architecture Document"
status: complete
vivechak: 1
---
# Founding Architecture Document: Katha

## Locked Decision Registry
- **D-001 (One-Way · Accepted):** PostgreSQL 16 + pgvector + recursive CTEs for 50k-node story graph [A · fetched](https://www.postgresql.org/docs/16/queries-with.html).
  *Rejected:* Neo4j (unjustified 2nd stateful cluster & GDPR sync split).
- **D-002 (Two-Way · Accepted):** Yjs CRDT over WebSocket provider for offline-capable chapter co-editing.
  *Rejected:* Custom WebSocket OT server (high edge-case complexity).

## Belief Evolution (## Delta)
Initial assumption that a dedicated graph database was mandatory was empirically refuted in T1-01.`,
  },
];

export const ShiftShowcase: React.FC = () => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [view, setView] = useState<ShiftMode>('curtain');
  const [splitPct, setSplitPct] = useState(50);
  const [draggingCurtain, setDraggingCurtain] = useState(false);
  const [rawMarkdown, setRawMarkdown] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [pairedIdx, setPairedIdx] = useState<number | null>(null);
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{ x: number; armed: boolean; moved: boolean }>({ x: 0, armed: false, moved: false });

  const sc = SCENARIOS[scenarioIdx];

  const updateCurtainFromClientX = (clientX: number) => {
    const el = curtainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = Math.max(20, Math.min(80, ((clientX - rect.left) / rect.width) * 100));
    setSplitPct(next);
  };

  const copyRawAdr = async () => {
    const ok = await copyText(sc.rawMd);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedRaw(true);
    showToast(`Copied ${sc.filePath}`);
    window.setTimeout(() => setCopiedRaw(false), 1600);
  };

  return (
    <section className="band-paper" id="shift">
      <div className="wrap">
        {/* Slim 3-Stage Architectural Spine — Instant Mental Model Without Fold Bloat */}
        <div className="flow-loop" aria-label="How Vivechak works in 3 steps">
          {FLOW_STEPS.map((st, i) => (
            <React.Fragment key={st.num}>
              <motion.a
                href={st.href}
                className="flow-step"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 'some' }}
                transition={{ delay: i * 0.06, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => soundEngine.playTick(740)}
              >
                <div className="flow-step-main">
                  <div className="flow-step-copy">
                    <div className="flow-step-top">
                      <span className="mono flow-num">{st.num}</span>
                      <strong>{st.title}</strong>
                      <span className="mono flow-file">{st.file}</span>
                    </div>
                    <span className="flow-desc">{st.desc}</span>
                  </div>
                  <FlowGlyph kind={st.kind} />
                </div>
              </motion.a>

              {i < FLOW_STEPS.length - 1 && (
                <div className="flow-connector" aria-hidden="true">
                  <svg viewBox="0 0 34 14" width="34" height="14">
                    <line x1="2" y1="7" x2="28" y2="7" className="flow-conn-line" strokeWidth="1.2" />
                    <path d="M 24 3.8 L 30 7 L 24 10.2" fill="none" className="flow-conn-arrow" strokeWidth="1.35" />
                    <circle r="2.1" cy="7" fill="#f2a33a">
                      <animate attributeName="cx" values="2;28" dur="2.4s" begin={`${i * 0.65}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0;1;1;0" dur="2.4s" begin={`${i * 0.65}s`} repeatCount="indefinite" />
                    </circle>
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <motion.div
          className="sec-intro-center shift-intro"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="eyebrow-light mono">01 · BEFORE VS. AFTER</span>
          <h2 className="paper-title">Stop guessing architecture from memory.</h2>
          <p className="paper-sub">
            Drag the divider to compare a raw AI guess against verified Git proof.
          </p>
        </motion.div>

        <div className="shift-stage">
          <div className="shift-toolbar">
            <div className="shift-scenario-pills" role="tablist" aria-label="Example scenarios">
              {SCENARIOS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === scenarioIdx}
                  className={`shift-scen-pill mono ${idx === scenarioIdx ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(740);
                    setScenarioIdx(idx);
                  }}
                >
                  {item.chip}
                </button>
              ))}
            </div>

            <div className="shift-toggle" role="tablist" aria-label="Compare without versus with Vivechak">
              {(
                [
                  ['without', 'Without'],
                  ['curtain', 'Side-by-Side'],
                  ['with', 'Full .md'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  id={`shift-tab-${id}`}
                  className={`shift-tab-btn ${view === id ? 'active' : ''}`}
                  onClick={() => {
                    if (id === 'with') soundEngine.playSieveDrop();
                    else if (id === 'curtain') soundEngine.playTick(760);
                    else soundEngine.playReject();
                    setView(id);
                    if (id === 'curtain') setSplitPct(50);
                    if (id === 'with') setRawMarkdown(true);
                  }}
                >
                  {view === id && (
                    <motion.span
                      layoutId="shiftTogglePill"
                      className={`shift-tab-bg is-${id}`}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <span className="shift-tab-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="shift-prompt-bar mono">
            <span className="prompt-chip">PROMPT</span>
            <span>&ldquo;{sc.prompt}&rdquo;</span>
          </div>

          {view === 'curtain' ? (
            <div
              ref={curtainRef}
              id="shift-curtain-stage"
              className={`shift-split-shell ${draggingCurtain ? 'is-dragging' : ''}`}
              style={{ ['--split' as string]: `${splitPct}%` }}
              onPointerDown={(e) => {
                const targetEl = e.target as HTMLElement;
                if (targetEl.closest('button')) return;
                const onBlade = Boolean(targetEl.closest('.shift-curtain-blade'));
                dragOriginRef.current = { x: e.clientX, armed: true, moved: onBlade };
                if (onBlade) {
                  setDraggingCurtain(true);
                  soundEngine.playTick(720);
                  updateCurtainFromClientX(e.clientX);
                }
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore synthetic events
                }
              }}
              onPointerMove={(e) => {
                if (!dragOriginRef.current.armed) return;
                if (!dragOriginRef.current.moved) {
                  if (Math.abs(e.clientX - dragOriginRef.current.x) < 6) return;
                  dragOriginRef.current.moved = true;
                  setDraggingCurtain(true);
                  soundEngine.playTick(720);
                }
                updateCurtainFromClientX(e.clientX);
              }}
              onPointerUp={(e) => {
                if (!dragOriginRef.current.armed) return;
                dragOriginRef.current.armed = false;
                dragOriginRef.current.moved = false;
                setDraggingCurtain(false);
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {
                  // ignore
                }
              }}
              onPointerCancel={() => {
                dragOriginRef.current.armed = false;
                dragOriginRef.current.moved = false;
                setDraggingCurtain(false);
              }}
            >
              {/* Left Pane: Raw AI Chat Recall (zero clipped words, smoothly resizes with drag) */}
              <div className={`split-pane split-raw ${splitPct < 34 ? 'is-narrow' : ''}`}>
                <div className="split-head mono">
                  <span className="split-title-fail">WITHOUT VIVECHAK · RAW CHAT</span>
                  <span className="pill-fail">MEMORY ONLY · GRADE D</span>
                </div>
                <blockquote className="split-raw-quote">&ldquo;{sc.rawQuote}&rdquo;</blockquote>
                <div className="split-list">
                  {sc.defects.map((d, idx) => (
                    <div
                      key={d.title}
                      className={`split-item split-item-fail ${pairedIdx === idx ? 'is-paired' : ''}`}
                      onMouseEnter={() => setPairedIdx(idx)}
                      onMouseLeave={() => setPairedIdx(null)}
                    >
                      <d.icon size={15} className="pin-icon-fail" />
                      <div className="split-item-copy">
                        <strong>{d.title}</strong>
                        <span>{d.sub}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Pane: Verified Vivechak Git Artifact (zero clipped words, expands into full proof deck) */}
              <div className={`split-pane split-with ${splitPct > 66 ? 'is-narrow' : ''}`}>
                <div className="split-head mono">
                  <span className="adr-path" title={sc.filePath}>
                    <FileCheck2 size={13} /> {sc.filePath.replace(/^research\//, '')}
                  </span>
                  <div className="split-head-right">
                    <span className="pill-pass">{sc.badge}</span>
                    <button
                      type="button"
                      className="split-md-btn mono"
                      title="Inspect full Git Markdown file"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundEngine.playTick(760);
                        setView('with');
                        setRawMarkdown(true);
                      }}
                    >
                      <Code2 size={11} />
                      <span>.md</span>
                    </button>
                  </div>
                </div>
                <h3 className="split-outcome">{sc.outcome}</h3>
                <div className="split-list">
                  {sc.signals.map((sig, idx) => (
                    <div
                      key={sig.k}
                      className={`split-item split-item-pass ${pairedIdx === idx ? 'is-paired' : ''}`}
                      onMouseEnter={() => setPairedIdx(idx < 3 ? idx : null)}
                      onMouseLeave={() => setPairedIdx(null)}
                    >
                      <sig.icon size={15} className="pin-icon-pass" />
                      <div className="split-item-copy">
                        <div className="split-sig-line">
                          <span className="mono split-sig-k">{sig.k}</span>
                          <strong>{sig.v}</strong>
                        </div>
                        <span className="mono split-sig-meta">{sig.meta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center Draggable Golden Sieve Blade (double-click to reset 50/50) */}
              <div
                className="shift-curtain-blade"
                style={{ left: `${splitPct}%` }}
                role="slider"
                tabIndex={0}
                aria-label="Drag left or right to resize Raw Chat versus Vivechak Verified ADR"
                aria-valuemin={20}
                aria-valuemax={80}
                aria-valuenow={Math.round(splitPct)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playSieveDrop();
                  setSplitPct(50);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    soundEngine.playTick(680);
                    setSplitPct((v) => Math.max(20, v - 6));
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    soundEngine.playTick(760);
                    setSplitPct((v) => Math.min(80, v + 6));
                  }
                }}
              >
                <span className="curtain-puck" title="Drag to resize · double-click to center">
                  <MoveHorizontal size={14} strokeWidth={2.3} />
                </span>
                <span className="curtain-drag-tag mono">DRAG TO COMPARE</span>
              </div>
            </div>
          ) : view === 'without' ? (
            <motion.div
              key={`without-${sc.id}`}
              className="shift-canvas shift-raw"
              initial={{ opacity: 0.45, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="raw-bubble">
                <div className="bubble-head mono">
                  <span>AI CHAT · TRAINING RECALL</span>
                  <span className="pill-fail">MEMORY ONLY · GRADE D</span>
                </div>
                <blockquote>&ldquo;{sc.rawQuote}&rdquo;</blockquote>
              </div>

              <div className="defect-pins">
                {sc.defects.map((d, i) => (
                  <motion.div
                    key={d.title}
                    className="defect-pin"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 + i * 0.04, duration: 0.2 }}
                  >
                    <d.icon size={16} className="pin-icon-fail" />
                    <div>
                      <strong>{d.title}</strong>
                      <span>{d.sub}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`with-${sc.id}`}
              className="shift-canvas shift-grounded"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="adr-visual-card">
                <div className="adr-card-top mono">
                  <span className="adr-path">
                    <FileCheck2 size={14} /> {sc.filePath}
                  </span>
                  <div className="adr-top-right">
                    {rawMarkdown && (
                      <button
                        type="button"
                        className={`adr-peek-btn mono ${copiedRaw ? 'is-copied' : ''}`}
                        onClick={copyRawAdr}
                      >
                        {copiedRaw ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedRaw ? 'Copied' : 'Copy File'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      id="btn-adr-raw-toggle"
                      className="adr-peek-btn mono"
                      onClick={() => {
                        soundEngine.playTick(760);
                        setRawMarkdown((v) => !v);
                      }}
                    >
                      {rawMarkdown ? <LayoutGrid size={12} /> : <Code2 size={12} />}
                      <span>{rawMarkdown ? 'Summary View' : 'Inspect Git Markdown'}</span>
                    </button>
                    <span className="pill-pass">{sc.badge}</span>
                  </div>
                </div>

                {rawMarkdown ? (
                  <motion.pre
                    key={`raw-md-${sc.id}`}
                    className="dark-code-block adr-raw-pre mono"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <code>{renderHighlightedCode(sc.rawMd, 'markdown')}</code>
                  </motion.pre>
                ) : (
                  <motion.div
                    key={`visual-adr-${sc.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <h3 className="adr-outcome-title">{sc.outcome}</h3>

                    <div className="adr-signal-grid">
                      {sc.signals.map((sig, i) => (
                        <motion.div
                          key={sig.k}
                          className="adr-signal"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.03 + i * 0.03, duration: 0.18 }}
                        >
                          <div className="adr-sig-head mono">
                            <sig.icon size={13} />
                            <span>{sig.k}</span>
                          </div>
                          <strong>{sig.v}</strong>
                          <span className="mono adr-sig-meta">{sig.meta}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="proof-strip">
          {STATS.map((s) => (
            <div key={s.label} className="proof-item">
              <span className="proof-num">{s.num}</span>
              <span className="proof-label mono">{s.label}</span>
              <span className="proof-note">{s.note}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
