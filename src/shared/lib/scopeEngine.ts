/**
 * Authentic TypeScript port of Vivechak's InferScope (internal/core/scope.go),
 * Out-of-Scope guardrail detection (AGENTS.md §2.4), and R/N/B/X Decision Router (FRAMEWORK.md §9.3).
 */

export type ScopeResult = 'comparison' | 'decision' | 'project' | 'out_of_scope';

export interface ScopeClassification {
  scope: ScopeResult;
  label: string;
  matchedSignal: string;
  sessions: string;
  timeEstimate: string;
  dagOverhead: string;
  gateTrack: string;
  outputArtifact: string;
  mcpCall: string | null;
  rationale: string;
}

const OUT_OF_SCOPE_SIGNALS = [
  'fix this', 'fix the bug', 'type error', 'nil pointer', 'stack trace',
  'write a function', 'write a unit test', 'refactor this', 'rename variable',
  'syntax error', 'regex for', 'css center', 'format this', 'debug ',
  'compiler error', 'null pointer', 'segmentation fault',
];

const EXPLICIT_DECISION_SIGNALS = [
  'strategic decision', 'architectural decision', 'business decision',
  'adr:', 'adr for', 'decision:',
];

const FULL_ARCH_SIGNALS = [
  'full architecture', 'entire architecture', 'system design', 'system architecture',
  'founding architecture', 'fad', 'research pipeline', 'complete stack', 'tech stack for',
  'market entry pipeline', 'market entry plan', 'market entry research', 'go-to-market plan',
];

const COMP_QUESTIONS = [
  'compare ', 'comparison between', 'comparison of',
  'which is better', 'which one is better', 'which is faster', 'which one is faster',
  'which one should', 'which one shud', 'which should', 'which shud',
  'confused between', 'confused bw',
  'which library', 'which tool', 'which model', 'which algorithm',
  'which approach', 'which option', 'which strategy', 'which vendor', 'which provider',
  'shootout', 'benchmark between',
];

const DECISION_SIGNALS = [
  'should we use', 'should i use', 'should we adopt', 'should i adopt',
  'should we pick', 'should i pick', 'should we choose', 'should i choose',
  'should we migrate', 'should i migrate', 'migrate from', 'migration from',
  'migrate to', 'migration to', 'migrate our',
  'choose between', 'decision between', 'trade-off between', 'tradeoffs between',
  'architectural fork', 'architectural dilemma',
];

const COMP_OPERATORS = [' vs ', ' vs. ', ' versus '];

const PROJECT_SIGNALS = [
  'startup idea', 'new startup', 'build a ', 'build an ', 'building a ', 'building an ',
  'uber for', 'pipeline for', 'new business', 'new venture', 'new product',
  'business plan', 'venture research', 'launching a', 'launching an', 'business project',
  'architect ', 'design a ', 'design an ', 'greenfield', 'platform from scratch', 'from scratch',
];

export function classifyPrompt(raw: string): ScopeClassification {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const cleanLower = lower.replace(/:/g, ' ').replace(/\s+/g, ' ');
  const safeQ = trimmed.replace(/"/g, '\\"') || 'Your technical question';

  // Out-of-scope guardrail first (Principle P4: Zero-Tooling Boundary)
  for (const sig of OUT_OF_SCOPE_SIGNALS) {
    if (lower.includes(sig)) {
      return {
        scope: 'out_of_scope',
        label: 'OUT OF SCOPE — Skip Vivechak',
        matchedSignal: `Matched routine coding/debug signal: "${sig}"`,
        sessions: '0 sessions',
        timeEstimate: 'Immediate',
        dagOverhead: 'None',
        gateTrack: 'None — invoke zero MCP tools',
        outputArtifact: 'Direct code edit or explanation',
        mcpCall: null,
        rationale:
          'Principle P4 (Zero-Tooling Boundary): Vivechak never runs on bug fixes, syntax questions, or local implementation. Ask your coding agent directly.',
      };
    }
  }

  // Explicit schema keys from generator templates (exact match to internal/core/scope.go)
  if (trimmed.includes('OPTIONS:') && (trimmed.includes('CRITERIA:') || !trimmed.includes('DECISION:'))) {
    return buildComparison(safeQ, 'Generator schema key ("OPTIONS:")');
  }
  if (trimmed.includes('DECISION:') && (trimmed.includes('STAGE:') || trimmed.includes('LEANING:'))) {
    return buildDecision(safeQ, 'Generator schema key ("DECISION:")');
  }

  // Command shorthands
  if (
    cleanLower.startsWith('vck compare') ||
    cleanLower.startsWith('vck vs') ||
    cleanLower.startsWith('vivechak compare') ||
    cleanLower.startsWith('vivechak vs')
  ) {
    return buildComparison(safeQ, 'Command shorthand trigger ("compare / vs")');
  }
  if (
    cleanLower.startsWith('vck decide') ||
    cleanLower.startsWith('vck adr') ||
    cleanLower.startsWith('vivechak decide') ||
    cleanLower.startsWith('vivechak adr')
  ) {
    return buildDecision(safeQ, 'Command shorthand trigger ("decide / adr")');
  }
  if (
    cleanLower.startsWith('vck plan') ||
    cleanLower.startsWith('vck project') ||
    cleanLower.startsWith('vivechak plan') ||
    cleanLower.startsWith('vivechak project')
  ) {
    return buildProject(safeQ, 'Command shorthand trigger ("plan / project")');
  }

  for (const sig of EXPLICIT_DECISION_SIGNALS) {
    if (lower.includes(sig)) return buildDecision(safeQ, `Explicit decision signal: "${sig}"`);
  }
  for (const sig of FULL_ARCH_SIGNALS) {
    if (lower.includes(sig)) return buildProject(safeQ, `Full architecture signal: "${sig}"`);
  }
  for (const sig of COMP_QUESTIONS) {
    if (lower.includes(sig)) return buildComparison(safeQ, `Comparison question signal: "${sig.trim()}"`);
  }
  for (const sig of DECISION_SIGNALS) {
    if (lower.includes(sig)) return buildDecision(safeQ, `Decision fork signal: "${sig.trim()}"`);
  }
  for (const sig of COMP_OPERATORS) {
    if (lower.includes(sig)) return buildComparison(safeQ, `Bounded operator: "${sig.trim()}"`);
  }
  for (const sig of PROJECT_SIGNALS) {
    if (lower.includes(sig)) return buildProject(safeQ, `Greenfield/platform signal: "${sig.trim()}"`);
  }

  return buildProject(safeQ, 'Default fallback to Project Scope for open architectural vision');
}

function buildComparison(question: string, signal: string): ScopeClassification {
  return {
    scope: 'comparison',
    label: 'Comparison Scope (C-NNN)',
    matchedSignal: signal,
    sessions: '1 session',
    timeEstimate: '~5 minutes',
    dagOverhead: 'Zero DAG',
    gateTrack: 'Zero Gate overhead',
    outputArtifact: 'research/C-001-comparison.md (WEP Matrix)',
    mcpCall: `vivechak_start(scope="comparison", question="${question}")`,
    rationale:
      'Bounded evaluation of 2–5 named contenders. Produces a Weighted Evaluation Protocol matrix with ±20% weight sensitivity check in a single session.',
  };
}

function buildDecision(question: string, signal: string): ScopeClassification {
  return {
    scope: 'decision',
    label: 'Decision Scope (D-NNN)',
    matchedSignal: signal,
    sessions: '1–3 sessions (L / C / F)',
    timeEstimate: '~30 minutes',
    dagOverhead: 'Zero project DAG',
    gateTrack: 'Track A (Two-Way) or Track B (One-Way + Sign-off)',
    outputArtifact: 'research/D-001-decision.md + research/DECISIONS.md',
    mcpCall: `vivechak_start(scope="decision", question="${question}")`,
    rationale:
      'Focused architectural fork or migration in an active codebase. Profiles R/N/B/X, runs up to 3 scoped sessions, and locks a traceable ADR.',
  };
}

function buildProject(question: string, signal: string): ScopeClassification {
  return {
    scope: 'project',
    label: 'Project Scope (Full Pipeline → FAD)',
    matchedSignal: signal,
    sessions: '4–30 DAG sessions',
    timeEstimate: 'Hours–Days (Tier 0–3)',
    dagOverhead: 'Topological DAG (yaml vivechak-plan)',
    gateTrack: 'Mandatory Phase 0 Gate (G1–G12)',
    outputArtifact: 'research/RESEARCH-PIPELINE.md → sessions/*.md → research/FAD.md',
    mcpCall: `vivechak_start(scope="project", question="${question}")`,
    rationale:
      'Greenfield platform or multi-subsystem rewrite. Scores 8 complexity dimensions, decomposes coupled unknowns into a DAG, and synthesizes a sealed FAD.',
  };
}

export interface RnbxProfile {
  r: number; // 0-3 Reversal cost
  n: number; // 0-3 Novelty
  b: number; // 0-3 Blast radius
  x: number; // 0-3 Regulatory exposure
}

export interface RnbxRouting {
  doorType: 'one-way' | 'two-way';
  isNovel: boolean;
  hardOverride: boolean;
  lane: 'SKIP' | 'FAST SPIKE' | 'CONFIRM & COMMIT' | 'DEEP RESEARCH';
  sessions: string;
  roles: string[];
  gateTrack: 'Track A (G12)' | 'Track B (G1–G11 + vck signoff)';
  summary: string;
}

/** Exact routing formula from FRAMEWORK.md §9.3 & GENERATOR-DECISION.md */
export function evaluateRnbx(p: RnbxProfile): RnbxRouting {
  const hardOverride = p.x === 3;
  const oneWay = p.r >= 2 || p.b === 3 || hardOverride;
  const isNovel = p.n >= 2;

  if (hardOverride) {
    return {
      doorType: 'one-way',
      isNovel,
      hardOverride: true,
      lane: 'DEEP RESEARCH',
      sessions: '2–3 sessions (Forced Tier 3 Rigor)',
      roles: ['L · Landscape', 'C · WEP Comparison', 'F · Falsify & Premortem'],
      gateTrack: 'Track B (G1–G11 + vck signoff)',
      summary:
        'Regulatory Exposure X=3 (HIPAA / PCI-DSS / KYC / SEC / children) triggers the Hard Override: full falsification, red-team challenge, and human sign-off mandatory regardless of other scores.',
    };
  }

  if (!oneWay && !isNovel) {
    return {
      doorType: 'two-way',
      isNovel: false,
      hardOverride: false,
      lane: 'SKIP',
      sessions: '0–1 optional session',
      roles: ['Convention ADR skeleton'],
      gateTrack: 'Track A (G12)',
      summary:
        'Low reversal cost and established pattern. Decide by convention in minutes; log reversibility rationale and a review trigger.',
    };
  }

  if (!oneWay && isNovel) {
    return {
      doorType: 'two-way',
      isNovel: true,
      hardOverride: false,
      lane: 'FAST SPIKE',
      sessions: '1 timeboxed session',
      roles: ['C · Comparison / Spike'],
      gateTrack: 'Track A (G12)',
      summary:
        'Reversible decision in an unfamiliar space. Run a single focused session (~70% confidence), capture failure modes, and ship fast.',
    };
  }

  if (oneWay && !isNovel) {
    return {
      doorType: 'one-way',
      isNovel: false,
      hardOverride: false,
      lane: 'CONFIRM & COMMIT',
      sessions: '1 rigorous session + Red-Team',
      roles: ['C · Verify & Falsify'],
      gateTrack: 'Track B (G1–G11 + vck signoff)',
      summary:
        'High reversal cost with known contenders. Ground ≥2 Grade A/B fetched claims, run D-NNN-R1 adversarial challenge, and require human TTY sign-off.',
    };
  }

  return {
    doorType: 'one-way',
    isNovel: true,
    hardOverride: false,
    lane: 'DEEP RESEARCH',
    sessions: '2–3 sessions (Capped at 3)',
    roles: ['L · Landscape', 'C · WEP Comparison', 'F · Falsify & Premortem'],
    gateTrack: 'Track B (G1–G11 + vck signoff)',
    summary:
      'Irreversible choice in novel territory. Run Landscape → parallel Comparison & 12-month Klein Premortem → red-team record → interactive human sign-off.',
  };
}
