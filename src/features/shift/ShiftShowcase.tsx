import React, { useRef, useState } from 'react';
import { Check, Code2, Copy, FileText, MoveHorizontal, X } from 'lucide-react';
import { copyText } from '@/shared/lib/clipboard';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

type ShiftView = 'split' | 'markdown';

interface ShiftScenario {
  id: string;
  chip: string;
  prompt: string;
  rawPrefix: string;
  rawTrap: string;
  rawTrapTag: string;
  rawSuffix: string;
  fails: string[];
  filePath: string;
  badge: string;
  outcome: string;
  specs: { k: string; v: string; tag?: string }[];
  rawMd: string;
}

const SCENARIOS: ShiftScenario[] = [
  {
    id: 'clickhouse',
    chip: 'ClickHouse',
    prompt: 'Migrate 25M events/day from PostgreSQL to ClickHouse?',
    rawPrefix: 'Yes — ClickHouse handles millions of rows/sec. ',
    rawTrap: 'Stream webhook events directly into MergeTree',
    rawTrapTag: 'Too many parts outage',
    rawSuffix: ' for 100× speedups.',
    fails: ['0 primary URLs (Grade D memory)', 'Misses MergeTree micro-batch collapse', 'Lost when chat closes'],
    filePath: 'research/D-001-decision.md',
    badge: 'One-Way · Verified',
    outcome: 'ClickHouse Cloud + Vector ≥10k-row batch buffer; keep PostgreSQL for OLTP.',
    specs: [
      { k: 'Evidence', v: 'clickhouse.com/docs · ClickBench', tag: 'A · fetched' },
      { k: 'Red-team', v: 'Vector 10k buffer + async_insert=1', tag: 'D-001-R1' },
      { k: 'Rejected', v: 'TimescaleDB · DynamoDB + Athena' },
      { k: 'Trigger', v: 'Ingest > 150k/s or storage > $2.5k/mo' },
      { k: 'Attested', v: 'Jane Doe · /dev/tty', tag: 'sha256:8c3f9e…' },
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
    chip: 'B2B Auth',
    prompt: 'Build custom JWT auth or adopt WorkOS / Clerk for B2B SSO?',
    rawPrefix: 'Avoid vendor lock-in: ',
    rawTrap: 'sign HS256 tokens in a cookie and add SAML later',
    rawTrapTag: 'SOC 2 / IdP trap',
    rawSuffix: ' when enterprise accounts ask.',
    fails: ['Ignores SAML / SCIM IdP edge cases', 'Omits rotation & revocation audit', '0 vendor cost math'],
    filePath: 'research/D-004-decision.md',
    badge: 'X=3 Lock · Verified',
    outcome: 'Managed OIDC/SAML identity + local PostgreSQL RBAC indirection table.',
    specs: [
      { k: 'Evidence', v: 'RFC 8725 · OWASP ASVS · pricing docs', tag: 'A · fetched' },
      { k: 'Red-team', v: 'user_identities exit-path indirection', tag: 'D-004-R1' },
      { k: 'Rejected', v: 'Custom JWT · Self-hosted Keycloak' },
      { k: 'Trigger', v: '> 250 orgs or auth spend > $1.8k/mo' },
      { k: 'Attested', v: 'Security Lead · /dev/tty', tag: 'sha256:41f0c8…' },
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
    prompt: 'Compare Pino vs Winston for 15k req/s Node.js gateway',
    rawPrefix: 'Use Winston — ',
    rawTrap: 'most popular logger, fast enough for modern servers',
    rawTrapTag: '1.8ms event-loop block',
    rawSuffix: ' with rich JSON transports.',
    fails: ['Confuses npm downloads with p99 safety', 'Misses sync formatting backpressure', 'No ±20% weight check'],
    filePath: 'research/C-001-comparison.md',
    badge: 'WEP · Robust',
    outcome: 'Pino (4.82 / 5.00) + worker transports + pino.final() flush on SIGTERM.',
    specs: [
      { k: 'WEP Score', v: 'Pino 4.82 vs Winston 3.16', tag: '±20% robust' },
      { k: 'Evidence', v: 'getpino.io · Node 22 V8 flamegraphs', tag: 'A/B · fetched' },
      { k: 'Failure mode', v: 'SIGKILL tail drop → wired flushSync' },
      { k: 'Overhead', v: '1 session (~5m) · 0 DAG · 0 Gate' },
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
    chip: 'Katha (FAD)',
    prompt: 'Architect collaborative AI writing platform with EU GDPR',
    rawPrefix: 'Run ',
    rawTrap: 'Neo4j + custom WebSocket OT + Redis + Pinecone',
    rawTrapTag: '4 stateful clusters Day 1',
    rawSuffix: ' for story graph and AI recall.',
    fails: ['4 stateful stores on Day 1', 'Never tested PG16 CTEs at 50k edges', 'Breaks atomic GDPR erasure'],
    filePath: 'research/FAD.md',
    badge: 'Project · 4 Sessions',
    outcome: 'PostgreSQL 16 (recursive CTEs + pgvector) + Yjs CRDT. Zero Neo4j, zero custom OT.',
    specs: [
      { k: 'Delta', v: 'PG16 CTEs <50ms p95 @ 50k edges', tag: 'Neo4j refuted' },
      { k: 'Sync', v: 'Yjs CRDT offline co-editing', tag: 'Two-Way' },
      { k: 'GDPR', v: 'Single ACID relational + vector delete' },
      { k: 'Gate', v: '4 DAG sessions → SYN-01 → G1–G12 pass', tag: 'EXIT 0' },
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
  const [view, setView] = useState<ShiftView>('split');
  const [splitPct, setSplitPct] = useState(44);
  const [draggingCurtain, setDraggingCurtain] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const curtainRef = useRef<HTMLDivElement | null>(null);
  const dragOriginRef = useRef<{ x: number; armed: boolean; moved: boolean }>({ x: 0, armed: false, moved: false });

  const sc = SCENARIOS[scenarioIdx];

  const updateCurtainFromClientX = (clientX: number) => {
    const el = curtainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = Math.max(24, Math.min(76, ((clientX - rect.left) / rect.width) * 100));
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
        <div className="sec-head-split shift-head">
          <h2 className="sec-title">Guess vs. proof</h2>
          <span className="shift-drag-cue mono">Drag divider · inspect raw Git file</span>
        </div>

        <div className="shift-sheet">
          {/* Unified Window Chrome: Scenarios + View Toggle */}
          <div className="shift-chrome-bar">
            <div className="shift-chrome-tabs" role="tablist" aria-label="Real architectural scenarios">
              {SCENARIOS.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === scenarioIdx}
                  className={`shift-chrome-btn ${idx === scenarioIdx ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(740);
                    setScenarioIdx(idx);
                  }}
                >
                  {item.chip}
                </button>
              ))}
            </div>

            <div className="shift-view-seg" role="tablist" aria-label="Comparison view mode">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'split'}
                id="shift-tab-split"
                className={`shift-seg-btn ${view === 'split' ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(720);
                  setView('split');
                }}
              >
                Diff
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'markdown'}
                id="shift-tab-markdown"
                className={`shift-seg-btn mono ${view === 'markdown' ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(780);
                  setView('markdown');
                }}
              >
                <Code2 size={12} />
                <span>.md</span>
              </button>
            </div>
          </div>

          <div className="shift-prompt-row">
            <span className="shift-prompt-lbl mono">PROMPT</span>
            <span className="shift-prompt-text">{sc.prompt}</span>
          </div>

          {view === 'split' ? (
            <div
              ref={curtainRef}
              id="shift-curtain-stage"
              className={`shift-split ${draggingCurtain ? 'is-dragging' : ''}`}
              style={{ ['--split' as string]: `${splitPct}%` }}
              onPointerDown={(e) => {
                const targetEl = e.target as HTMLElement;
                if (targetEl.closest('button')) return;
                const onBlade = Boolean(targetEl.closest('.shift-divider'));
                dragOriginRef.current = { x: e.clientX, armed: true, moved: onBlade };
                if (onBlade) {
                  setDraggingCurtain(true);
                  soundEngine.playTick(720);
                  updateCurtainFromClientX(e.clientX);
                }
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                  // ignore
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
              {/* Left: Raw AI Chat with Inline X-Ray Trap Highlight */}
              <div className={`shift-col shift-col-raw ${splitPct < 32 ? 'is-dim' : ''}`}>
                <div className="shift-col-head">
                  <span className="shift-col-label">Raw AI chat</span>
                  <span className="shift-tag is-fail mono">Grade D · Recall</span>
                </div>

                <p className="shift-raw-quote">
                  &ldquo;{sc.rawPrefix}
                  <mark className="xray-trap">
                    {sc.rawTrap}
                    <span className="xray-tag mono">{sc.rawTrapTag}</span>
                  </mark>
                  {sc.rawSuffix}&rdquo;
                </p>

                <ul className="shift-fail-list">
                  {sc.fails.map((f) => (
                    <li key={f} className="shift-fail-item">
                      <X size={13} strokeWidth={2.2} className="shift-fail-ico" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Verified Git Markdown Spec */}
              <div className={`shift-col shift-col-with ${splitPct > 68 ? 'is-dim' : ''}`}>
                <div className="shift-col-head">
                  <span className="shift-file-path mono" title={sc.filePath}>
                    <FileText size={13} />
                    <span>{sc.filePath}</span>
                  </span>
                  <span className="shift-tag is-pass mono">{sc.badge}</span>
                </div>

                <p className="shift-outcome">{sc.outcome}</p>

                <dl className="shift-spec-dl">
                  {sc.specs.map((row) => (
                    <div key={row.k} className="shift-spec-row">
                      <dt className="mono">{row.k}</dt>
                      <dd>
                        <span className="shift-spec-val">{row.v}</span>
                        {row.tag && <span className="shift-spec-chip mono">{row.tag}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Tactile Hairline Divider */}
              <div
                className="shift-divider"
                style={{ left: `${splitPct}%` }}
                role="slider"
                tabIndex={0}
                aria-label="Drag to resize Raw Chat versus Vivechak Git artifact"
                aria-valuemin={24}
                aria-valuemax={76}
                aria-valuenow={Math.round(splitPct)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playSieveDrop();
                  setSplitPct(44);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    soundEngine.playTick(680);
                    setSplitPct((v) => Math.max(24, v - 6));
                  } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    soundEngine.playTick(760);
                    setSplitPct((v) => Math.min(76, v + 6));
                  }
                }}
              >
                <span className="shift-handle" title="Drag to compare · double-click to center">
                  <MoveHorizontal size={13} strokeWidth={2} />
                </span>
              </div>
            </div>
          ) : (
            <div className="shift-md-view">
              <div className="shift-md-head">
                <span className="shift-file-path mono">
                  <FileText size={13} />
                  <span>{sc.filePath}</span>
                </span>
                <button
                  type="button"
                  className={`inline-action-btn ${copiedRaw ? 'copied' : ''}`}
                  onClick={copyRawAdr}
                >
                  {copiedRaw ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedRaw ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="dark-code-block shift-md-pre mono">
                <code>{renderHighlightedCode(sc.rawMd, 'markdown')}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
