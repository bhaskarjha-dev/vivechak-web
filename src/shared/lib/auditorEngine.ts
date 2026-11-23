/**
 * Deterministic client-side Vivechak Artifact & Phase 0 Gate Auditor.
 * Mirrors Vivechak v0.1.0 mechanical checks (G5–G12, V-*, W-*, Q-*) for
 * interactive in-browser linting of ADRs, Sessions, and WEP Comparisons.
 */

export interface AuditRuleResult {
  id: string;
  name: string;
  track: 'Track A' | 'Track B' | 'Structure';
  status: 'PASS' | 'FAIL' | 'N/A';
  detail: string;
}

export interface AuditDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'coach';
  message: string;
  fix: string;
}

export interface AuditReport {
  artifactKind: 'decision' | 'session' | 'comparison';
  doorType: 'one-way' | 'two-way';
  status: string;
  verdict: 'PASS' | 'HOLD';
  frontmatter: Record<string, string>;
  gradeCounts: Record<'A' | 'B' | 'C' | 'D' | 'E', number>;
  groundedABUrlCount: number;
  verifiedFetchedHumanCount: number;
  recalledHighGradeCount: number;
  placeholdersFound: string[];
  rules: AuditRuleResult[];
  diagnostics: AuditDiagnostic[];
  outcomeText: string;
}

function parseFrontmatter(md: string): { fm: Record<string, string>; body: string; hasFm: boolean } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: md, hasFm: false };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (k) fm[k] = v;
    }
  }
  return { fm, body: m[2], hasFm: true };
}

function extractSection(body: string, headingPattern: RegExp): string {
  const lines = body.split(/\r?\n/);
  let capturing = false;
  const out: string[] = [];
  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (capturing) break;
      if (headingPattern.test(line)) {
        capturing = true;
        continue;
      }
    } else if (capturing) {
      out.push(line);
    }
  }
  return out.join('\n').trim();
}

export function auditArtifact(markdown: string): AuditReport {
  const { fm, body, hasFm } = parseFrontmatter(markdown.trim());
  const rawType = (fm.type || '').toLowerCase();
  const artifactKind: 'decision' | 'session' | 'comparison' =
    rawType === 'session' || fm.session_id
      ? 'session'
      : rawType === 'comparison' || /^C-\d+/i.test(fm.id || '')
        ? 'comparison'
        : 'decision';

  const doorType: 'one-way' | 'two-way' =
    (fm.door_type || '').toLowerCase() === 'two-way' ? 'two-way' : 'one-way';
  const status = (fm.status || 'proposed').toLowerCase();

  const diagnostics: AuditDiagnostic[] = [];
  if (!hasFm) {
    diagnostics.push({
      code: 'V-MISSING-FRONTMATTER',
      severity: 'error',
      message: 'Missing opening --- YAML frontmatter block.',
      fix: 'Start the artifact with --- containing id, type, title, status, door_type, and date.',
    });
  }

  // Scan evidence tags & URLs line by line
  const gradeCounts: Record<'A' | 'B' | 'C' | 'D' | 'E', number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  let groundedABUrlCount = 0;
  let verifiedFetchedHumanCount = 0;
  let recalledHighGradeCount = 0;

  const lines = body.split(/\r?\n/);
  const tagRegex = /\[(?:Grade\s+)?([A-E])(?:\s*[·:|][^\]]*)?\]|\(Grade\s+([A-E])[^)]*\)/gi;

  for (const line of lines) {
    const matches = Array.from(line.matchAll(tagRegex));
    if (matches.length === 0) continue;

    const hasUrl = /https?:\/\/[^\s)>]+/i.test(line);
    const hasFetchedOrHuman = /\b(fetched|human|human-provided)\b/i.test(line);
    const hasRecalled = /\b(recalled|parametric)\b/i.test(line);

    let lineCountedAB = false;
    for (const m of matches) {
      const g = (m[1] || m[2] || '').toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
      if (g in gradeCounts) gradeCounts[g]++;
      if ((g === 'A' || g === 'B' || g === 'C') && hasRecalled) {
        recalledHighGradeCount++;
      }
      if ((g === 'A' || g === 'B') && !lineCountedAB) {
        lineCountedAB = true;
        if (hasUrl) {
          groundedABUrlCount++;
          if (hasFetchedOrHuman && !hasRecalled) {
            verifiedFetchedHumanCount++;
          }
        }
      }
    }
  }

  // Detect unexpanded template placeholders
  const placeholderRegex = /\[(TBD|TODO|INSERT[^\]]*|PASTE[^\]]*|Condition[^\]]*|Option[^\]]*|Stub|Reasoning[^\]]*|Placeholder[^\]]*)\]/gi;
  const placeholdersFound = Array.from(new Set(Array.from(markdown.matchAll(placeholderRegex)).map((m) => m[0])));

  const outcomeSection = extractSection(body, /^##\s+(Decision\s+Outcome|Recommendation)/i);
  const rejectedSection = extractSection(body, /^##\s+(Rejected\s+Alternatives|Alternatives\s+Considered)/i);
  const concernsSection = extractSection(body, /^##\s+Discovered\s+Concerns/i);
  const challengeSection = extractSection(body, /^##\s+Challenge\s+Findings/i);
  const priorSection = extractSection(body, /^##\s+Prior/i);
  const deltaSection = extractSection(body, /^##\s+Delta/i);

  // Warnings & Coaching (Q-* & W-*)
  if (recalledHighGradeCount > 0) {
    diagnostics.push({
      code: 'W-RECALLED-GRADE-CAP',
      severity: 'warning',
      message: `${recalledHighGradeCount} claim(s) tagged recalled/parametric are graded above Grade D.`,
      fix: 'Cap model-recall claims at Grade D or verify via live web search with a primary URL.',
    });
  }

  const totalGraded = gradeCounts.A + gradeCounts.B + gradeCounts.C + gradeCounts.D + gradeCounts.E;
  if (totalGraded === 0) {
    diagnostics.push({
      code: 'V-NO-GRADED-CLAIM',
      severity: 'error',
      message: 'Artifact contains zero inline evidence grade tags (A–E).',
      fix: 'Attach inline grades such as [A · corroborated · fetched](https://...).',
    });
  }

  if ((gradeCounts.A + gradeCounts.B) > groundedABUrlCount) {
    diagnostics.push({
      code: 'V-OWD-VAGUE-PROVENANCE',
      severity: 'warning',
      message: 'One or more Grade A/B claims lack an explicit https:// URL anchor on the claim line.',
      fix: 'Include the canonical primary documentation or benchmark URL directly alongside the grade tag.',
    });
  }

  if (placeholdersFound.length > 0) {
    diagnostics.push({
      code: 'E-PLACEHOLDER-REMAINS',
      severity: 'error',
      message: `Unexpanded placeholder(s) found: ${placeholdersFound.slice(0, 3).join(', ')}.`,
      fix: 'Replace every bracketed stub with concrete empirical content before locking.',
    });
  }

  if (concernsSection.length < 50 && artifactKind !== 'comparison') {
    diagnostics.push({
      code: 'Q-CONCERNS',
      severity: 'coach',
      message: '## Discovered Concerns is missing or shorter than 50 characters.',
      fix: 'Document concrete failure modes, scaling limits, and disconfirming evidence (>=50 chars).',
    });
  }

  if (artifactKind === 'session') {
    if (!priorSection || !deltaSection) {
      diagnostics.push({
        code: 'Q-STRUCTURE',
        severity: 'coach',
        message: 'Session omits ## Prior or ## Delta belief-tracking sections.',
        fix: 'Add ## Prior and ## Delta to show how live evidence updated initial assumptions.',
      });
    } else if (!/\b(contradicted|updated|revised|changed|refuted|eliminated)\b/i.test(deltaSection)) {
      diagnostics.push({
        code: 'Q-BIAS',
        severity: 'coach',
        message: '## Delta lists no contradicted or updated beliefs — potential confirmation bias.',
        fix: 'Actively search for disconfirming evidence and note at least one revised assumption.',
      });
    }
    if (totalGraded < 4) {
      diagnostics.push({
        code: 'Q-DEPTH',
        severity: 'coach',
        message: `Only ${totalGraded} graded claim(s) found (recommended 4–7 empirical findings).`,
        fix: 'Expand ## Key Findings with additional primary-URL citations.',
      });
    }
  }

  if (rejectedSection.length < 24 && artifactKind !== 'comparison') {
    diagnostics.push({
      code: 'Q-RIGOR',
      severity: 'coach',
      message: 'Missing substantive ## Rejected Alternatives / ## Alternatives Considered section.',
      fix: 'Document each rejected candidate and the empirical reason it lost.',
    });
  }

  const staleYears = Array.from(body.matchAll(/\b(201[5-9]|202[0-3])\b/g)).map((m) => m[1]);
  if (staleYears.length > 0) {
    diagnostics.push({
      code: 'Q-FRESHNESS',
      severity: 'coach',
      message: `Found potentially stale year reference(s): ${Array.from(new Set(staleYears)).slice(0, 3).join(', ')}.`,
      fix: 'Verify version-sensitive benchmarks against current 2025/2026 upstream docs.',
    });
  }

  // Mechanical Gate Rules Evaluation (G5–G12)
  const triggerVal = fm.review_trigger || '';
  const hasRealTrigger = triggerVal.length >= 8 && !/\[.*\]|TBD|TODO/i.test(triggerVal);
  const hasChallengeRef = /D-\d+-R\d+/i.test(challengeSection) && challengeSection.length >= 50;
  const hasHumanReview =
    fm.human_reviewed === 'true' &&
    Boolean(fm.reviewed_by || fm.signed_off_by) &&
    Boolean(fm.reviewed_hash);

  const rules: AuditRuleResult[] = [];

  if (artifactKind === 'comparison') {
    const hasTable = /^\|.+\|$/m.test(body);
    const hasSensitivity = /±\s*20%|sensitivity|robust\s+winner|weight-sensitive/i.test(body);
    rules.push(
      {
        id: 'WEP-1',
        name: 'Weighted Evaluation Matrix Table',
        track: 'Structure',
        status: hasTable ? 'PASS' : 'FAIL',
        detail: hasTable ? 'Markdown criterion-by-option WEP table detected.' : 'Missing WEP Markdown table (V-CMP-NO-MATRIX).',
      },
      {
        id: 'WEP-2',
        name: '±20% Top-2 Sensitivity Check',
        track: 'Structure',
        status: hasSensitivity ? 'PASS' : 'FAIL',
        detail: hasSensitivity ? 'Sensitivity robustness verdict declared.' : 'Include ±20% weight sensitivity check.',
      },
      {
        id: 'G6',
        name: 'Graded Citations with URLs',
        track: 'Structure',
        status: groundedABUrlCount >= 2 ? 'PASS' : 'FAIL',
        detail: `${groundedABUrlCount} Grade A/B claim(s) anchored with https:// URLs.`,
      },
      {
        id: 'G8',
        name: 'Zero Template Placeholders',
        track: 'Structure',
        status: placeholdersFound.length === 0 ? 'PASS' : 'FAIL',
        detail: placeholdersFound.length === 0 ? 'No unexpanded stubs detected.' : `Found: ${placeholdersFound.join(', ')}`,
      }
    );
  } else {
    const isLocked = ['accepted', 'superseded', 'rejected', 'complete'].includes(status);
    rules.push({
      id: 'G5',
      name: 'Locked ADR / Complete Status',
      track: 'Track B',
      status: isLocked ? 'PASS' : 'FAIL',
      detail: isLocked ? `Frontmatter status: ${status}.` : `Status is "${status}" (must be accepted/complete).`,
    });

    if (doorType === 'one-way') {
      rules.push(
        {
          id: 'G6',
          name: 'Grade A/B Primary URL Depth',
          track: 'Track B',
          status: groundedABUrlCount >= 2 ? 'PASS' : 'FAIL',
          detail: `${groundedABUrlCount}/2 required Grade A/B claims with https:// URLs.`,
        },
        {
          id: 'G7',
          name: 'Fetched / Human Provenance',
          track: 'Track B',
          status: verifiedFetchedHumanCount >= 2 ? 'PASS' : 'FAIL',
          detail: `${verifiedFetchedHumanCount}/2 claims labeled fetched or human (recalled blocked).`,
        },
        {
          id: 'G8',
          name: 'No Placeholders & Rejected Alts',
          track: 'Track B',
          status: placeholdersFound.length === 0 && rejectedSection.length >= 24 ? 'PASS' : 'FAIL',
          detail:
            placeholdersFound.length > 0
              ? `Unexpanded placeholders remain (${placeholdersFound.length}).`
              : rejectedSection.length >= 24
                ? 'Zero stubs; rejected alternatives documented.'
                : 'Missing substantive ## Rejected Alternatives section.',
        },
        {
          id: 'G9',
          name: 'Measurable Review Trigger',
          track: 'Track B',
          status: hasRealTrigger ? 'PASS' : 'FAIL',
          detail: hasRealTrigger ? `Trigger: "${triggerVal}".` : 'Add concrete quantitative review_trigger in frontmatter.',
        },
        {
          id: 'G10',
          name: 'Red-Team Challenge Record',
          track: 'Track B',
          status: artifactKind === 'session' ? 'N/A' : hasChallengeRef ? 'PASS' : 'FAIL',
          detail:
            artifactKind === 'session'
              ? 'Applies to ADR decisions.'
              : hasChallengeRef
                ? 'Cites D-NNN-R<k> with >=50 chars under ## Challenge Findings.'
                : 'Run vivechak_review(mode="red_team") and cite D-NNN-R1 (>=50 chars).',
        },
        {
          id: 'G11',
          name: 'Human TTY Sign-Off Attestation',
          track: 'Track B',
          status: artifactKind === 'session' ? 'N/A' : hasHumanReview ? 'PASS' : 'FAIL',
          detail:
            artifactKind === 'session'
              ? 'Applies to One-Way Door ADRs.'
              : hasHumanReview
                ? `Attested by ${fm.reviewed_by || fm.signed_off_by} with reviewed_hash.`
                : 'Run interactive `vck signoff <D-id> --reviewer "<name>"` in TTY.',
        },
        {
          id: 'G12',
          name: 'Two-Way Door Reversibility',
          track: 'Track A',
          status: 'N/A',
          detail: 'One-Way Door governed by Track B (G5–G11).',
        }
      );
    } else {
      rules.push(
        {
          id: 'G8',
          name: 'Zero Template Placeholders',
          track: 'Track A',
          status: placeholdersFound.length === 0 ? 'PASS' : 'FAIL',
          detail: placeholdersFound.length === 0 ? 'Clean non-stub content.' : 'Remove remaining template placeholders.',
        },
        {
          id: 'G12',
          name: 'Two-Way Door Reversibility & Trigger',
          track: 'Track A',
          status: hasRealTrigger && placeholdersFound.length === 0 ? 'PASS' : 'FAIL',
          detail: hasRealTrigger
            ? `Velocity-calibrated Track A passed (trigger: "${triggerVal}").`
            : 'Declare review_trigger and reversibility note in frontmatter.',
        }
      );
    }
  }

  const hasFail = rules.some((r) => r.status === 'FAIL') || !hasFm;
  return {
    artifactKind,
    doorType,
    status,
    verdict: hasFail ? 'HOLD' : 'PASS',
    frontmatter: fm,
    gradeCounts,
    groundedABUrlCount,
    verifiedFetchedHumanCount,
    recalledHighGradeCount,
    placeholdersFound,
    rules,
    diagnostics,
    outcomeText: `${outcomeSection}\n${rejectedSection}`.trim() || body.slice(0, 400),
  };
}

export const AUDITOR_PRESETS: { id: string; label: string; kind: string; content: string }[] = [
  {
    id: 'broken-draft',
    label: 'Broken AI Draft (FAIL)',
    kind: 'One-Way ADR',
    content: `---
id: D-001
type: decision
title: "Analytical Event Storage Engine"
status: proposed
door_type: one-way
review_trigger: "[Condition or date for mandatory re-evaluation]"
---
# D-001: Analytical Event Storage Engine

## Decision Outcome
Adopt ClickHouse Cloud because it handles millions of events per second easily [A · recalled].

## Rejected Alternatives & Tradeoffs
- [TBD: compare PostgreSQL and DynamoDB]

## Challenge Findings
None yet.`,
  },
  {
    id: 'passing-adr',
    label: 'Sealed ClickHouse ADR (PASS)',
    kind: 'One-Way ADR',
    content: `---
id: D-001
type: decision
title: "Analytical Event Storage Engine"
status: accepted
door_type: one-way
date: 2026-11-18
review_trigger: "Sustained ingest > 150k events/s or monthly storage > $2,500"
human_reviewed: true
reviewed_by: "Jane Doe"
reviewed_hash: "8c3f9e41b2a7d018f5e9a3102b77d4c19a0e4f28"
---
# D-001: Analytical Event Storage Engine

## Decision Outcome
Adopt **ClickHouse Cloud** (MergeTree partitioned monthly) with a Vector >=10k-row batching buffer for 30-day event analytics, retaining PostgreSQL for OLTP [A · corroborated · fresh · direct · fetched](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree).

## Rejected Alternatives & Tradeoffs
- **PostgreSQL + TimescaleDB:** Rejected — ad-hoc 30-day multi-column filters over 750M rows exceed 500ms p95 [B · corroborated · fresh · direct · fetched](https://benchmark.clickhouse.com/).
- **DynamoDB + Athena:** Rejected — Athena cold Parquet scan startup (1.5–6s) violates dashboard SLA [A · single · fresh · direct · fetched](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html).

## Discovered Concerns
Direct micro-batch inserts (<1,000 rows) cause MergeTree part-merge exhaustion; GDPR right-to-erasure requires partition-level key shredding instead of synchronous row UPDATEs.

## Challenge Findings
Stress-tested in D-001-R1: simulated bursty webhook traffic (6x spike at top of hour) confirms MergeTree "Too many parts" collapse without buffering; mitigated via Vector 10k-row disk buffer + async_insert=1.`,
  },
  {
    id: 'two-way',
    label: 'Two-Way Door ADR (Track A)',
    kind: 'Two-Way ADR',
    content: `---
id: D-002
type: decision
title: "Webhook Ingestion Buffer Tier"
status: accepted
door_type: two-way
date: 2026-11-18
review_trigger: "Webhook burst drops > 0.01% or queue lag > 15 seconds"
---
# D-002: Webhook Ingestion Buffer Tier

## Decision Outcome
Deploy **Vector** with local disk-backed buffer flushing >=10k-row batches to ClickHouse [A · single · fresh · direct · fetched](https://vector.dev/docs/reference/configuration/sinks/clickhouse/).

## Rejected Alternatives & Tradeoffs
- **Managed Kafka / MSK:** Rejected for v1 — heavy cluster ops for a two-way buffering layer that sits cleanly behind an HTTP collector interface.

## Discovered Concerns
Disk buffer requires EBS volume monitoring so prolonged downstream outages do not fill collector node storage beyond 80%.`,
  },
  {
    id: 'session-bias',
    label: 'Session with Q-BIAS Warning',
    kind: 'Session',
    content: `---
session_id: T1-01
type: session
title: "Graph Persistence Landscape"
status: complete
door_type: one-way
date: 2026-11-18
---
# T1-01: Graph Persistence Landscape

## Prior
- I believe PostgreSQL 16 recursive CTEs can traverse 50k story graph nodes under 50ms.

## Key Findings
- PostgreSQL 16 recursive CTEs support cycle detection and indexed traversal [A · fetched](https://www.postgresql.org/docs/16/queries-with.html).
- 2021 blog post claimed Neo4j is harder to host [D · recalled].

## Discovered Concerns
Short note.

## Delta
Confirmed all of my initial assumptions without any issues.`,
  },
  {
    id: 'comparison-wep',
    label: 'Comparison WEP (C-001)',
    kind: 'Comparison',
    content: `---
id: C-001
type: comparison
title: "Node.js High-Throughput Logger Shootout"
status: complete
door_type: two-way
date: 2026-11-18
---
# C-001: Pino vs Winston vs Bunyan (WEP Matrix)

| Criterion | Weight | Pino | Winston | Bunyan |
|---|---:|---:|---:|---:|
| Event-Loop Latency | 0.35 | 5 [B · fetched](https://getpino.io/docs/benchmarks/) | 2 [B · fetched](https://github.com/winstonjs/winston) | 3 [B · fetched](https://github.com/trentm/node-bunyan) |
| GC & Heap Pressure | 0.25 | 5 [A · fetched](https://github.com/pinojs/pino/blob/master/lib/proto.js) | 3 [B · fetched](https://github.com/winstonjs/winston) | 4 [A · fetched](https://github.com/trentm/node-bunyan) |
| Transport Ecosystem | 0.22 | 4 [A · fetched](https://getpino.io/docs/transports/) | 5 [A · fetched](https://github.com/winstonjs/winston#transports) | 2 [C · fetched](https://www.npmjs.com/package/bunyan) |
| Maintenance Velocity | 0.18 | 5 [A · fetched](https://github.com/pinojs/pino/releases) | 4 [A · fetched](https://github.com/winstonjs/winston/releases) | 1 [A · fetched](https://github.com/trentm/node-bunyan/commits) |

## Sensitivity Check (±20% Top-2)
ROBUST WINNER — **Pino (4.82 vs 3.16)** holds #1 across all ±20% weight shifts.
Failure mode: async worker buffer drops tail logs on SIGKILL unless \`pino.final()\` is wired.`,
  },
  {
    id: 'dogfood-mcp',
    label: 'Vivechak Dogfood ADR (13→9 Tools)',
    kind: 'Two-Way ADR',
    content: `---
id: D-001
type: decision
title: "Consolidate MCP Tool Surface from 13 to 9 Tools"
status: accepted
door_type: two-way
date: 2026-10-24
review_trigger: "Re-evaluate if frontier LLMs show zero tool-confusion on >12 distinct MCP tool schemas"
---
# D-001: Consolidate MCP Tool Surface from 13 to 9 Tools

## Decision Outcome
Consolidate Vivechak from 13 granular MCP tools to **9 high-cohesion tools** with polymorphic \`vivechak_save(kind, id, content)\` and Guided Worker \`next\` hints. Measured binary \`tools/list\` dropped from **19,419 bytes → 6,115 bytes** (9,063 bytes total always-loaded context) [A · single · fresh · direct · fetched](https://github.com/bhaskarjha-dev/vivechak/blob/main/examples/dogfood/research/D-001.md).

## Rejected Alternatives & Tradeoffs
- **Retain 13 fine-grained tools:** Caused smaller models in multi-harness runs to hesitate on \`init\` ordering and misroute comparison IDs [C · corroborated · fetched](https://github.com/bhaskarjha-dev/vivechak/blob/main/tests/harness/DEFECTS.md).
- **Consolidate into 3 mega-tools:** Hides parameters behind deep polymorphic sub-schemas, degrading tool-calling accuracy.

## Discovered Concerns
Host agents occasionally omit \`kind\` on \`vivechak_save\`; mitigated via strict enum validation with actionable error guidance listing valid kinds.`,
  },
];
