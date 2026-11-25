import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildCustomPrompt } from '@/shared/data/vivechakData';
import { AUDITOR_PRESETS, auditArtifact } from '@/shared/lib/auditorEngine';
import { sha256Hex } from '@/shared/lib/sha256';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

export type PlaygroundTab = 'auditor' | 'wep' | 'prompt';

export interface CustomWepRow {
  id: string;
  name: string;
  weight: number;
  scores: number[];
}

export interface PresetLaunchPayload {
  id: string;
  nonce: number;
}

export const WEP_STARTERS: {
  id: string;
  label: string;
  title: string;
  options: string[];
  rows: CustomWepRow[];
}[] = [
  {
    id: 'rag',
    label: 'RAG Vector DB (±20% Flip)',
    title: 'Hybrid AI RAG Retrieval Engine (10M Vectors)',
    options: ['Qdrant', 'Postgres + pgvector', 'Pinecone Serverless'],
    rows: [
      { id: 'r1', name: '10M-Vector Recall & p99 Latency', weight: 34, scores: [5, 3, 5] },
      { id: 'r2', name: 'Unified SQL Joins & Small-Team Ops', weight: 32, scores: [3, 5, 4] },
      { id: 'r3', name: 'Predictable Monthly Infra Cost', weight: 20, scores: [5, 4, 2] },
      { id: 'r4', name: 'Portability & Zero Lock-In', weight: 14, scores: [5, 5, 2] },
    ],
  },
  {
    id: 'logger',
    label: 'Pino vs Winston (2-Option)',
    title: 'High-Throughput Node.js Microservice Logger',
    options: ['Pino', 'Winston'],
    rows: [
      { id: 'l1', name: 'Event-Loop Latency Overhead', weight: 35, scores: [5, 2] },
      { id: 'l2', name: 'Memory & GC Allocation Pressure', weight: 25, scores: [5, 3] },
      { id: 'l3', name: 'Transport & SIEM Ecosystem', weight: 22, scores: [4, 5] },
      { id: 'l4', name: 'Maintenance Velocity & CVEs', weight: 18, scores: [5, 4] },
    ],
  },
  {
    id: 'analytics',
    label: 'Event Analytics (3-Option)',
    title: 'Analytical Event Storage Engine (25M/day)',
    options: ['ClickHouse Cloud', 'Postgres + Timescale', 'DynamoDB + Athena'],
    rows: [
      { id: 'c1', name: '30-Day Analytical p95 Latency', weight: 35, scores: [5, 3, 2] },
      { id: 'c2', name: 'Operational Burden (Small Team)', weight: 30, scores: [3, 5, 4] },
      { id: 'c3', name: 'Storage Cost & Compression', weight: 20, scores: [5, 3, 4] },
      { id: 'c4', name: 'Exit Path & Portability', weight: 15, scores: [4, 5, 2] },
    ],
  },
];

export const DEFAULT_WEP_OPTIONS: string[] = WEP_STARTERS[0].options;
export const DEFAULT_WEP_ROWS: CustomWepRow[] = WEP_STARTERS[0].rows;

export function encodeSharePayload(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSharePayload<T>(raw: string): T | null {
  try {
    const pad = raw.length % 4 === 0 ? '' : '='.repeat(4 - (raw.length % 4));
    const bin = atob(raw.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export interface UsePlaygroundStateOptions {
  initialTab?: PlaygroundTab;
  initialPresetLaunch?: PresetLaunchPayload | null;
}

export function usePlaygroundState({
  initialTab = 'auditor',
  initialPresetLaunch,
}: UsePlaygroundStateOptions) {
  const [tab, setTab] = useState<PlaygroundTab>(initialTab);
  const [didSwitchTab, setDidSwitchTab] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Tab 1: Live ADR / Session Auditor
  const [editorText, setEditorText] = useState<string>(AUDITOR_PRESETS[0].content);
  const [decisionHash, setDecisionHash] = useState<string>('calculating…');

  useEffect(() => {
    if (!initialPresetLaunch) return;
    const found = AUDITOR_PRESETS.find((p) => p.id === initialPresetLaunch.id);
    if (found) {
      setEditorText(found.content);
      setTab('auditor');
    }
  }, [initialPresetLaunch]);

  const audit = useMemo(() => auditArtifact(editorText), [editorText]);

  useEffect(() => {
    let alive = true;
    void sha256Hex(audit.outcomeText).then((h) => {
      if (alive) setDecisionHash(h);
    });
    return () => {
      alive = false;
    };
  }, [audit.outcomeText]);

  const insertMissingSkeleton = useCallback(() => {
    soundEngine.playSieveDrop();
    let updated = editorText.trim();
    const added: string[] = [];

    if (audit.artifactKind === 'decision' && !/^review_trigger:/m.test(updated) && /^---\r?\n/.test(updated)) {
      updated = updated.replace(
        /^---\r?\n([\s\S]*?)\r?\n---/,
        '---\n$1\nreview_trigger: "Traffic > 100k req/s or monthly infra spend > $2,500"\n---'
      );
      added.push('review_trigger');
    }
    if (audit.artifactKind !== 'comparison' && !/##\s+(Rejected\s+Alternatives|Alternatives\s+Considered)/i.test(updated)) {
      updated +=
        '\n\n## Rejected Alternatives\n- Contender B: Rejected due to higher operational overhead and tail-latency regressions under load [B · fetched](https://docs.example.org/benchmark).';
      added.push('Rejected Alternatives');
    }
    if (audit.artifactKind !== 'comparison' && !/##\s+Discovered\s+Concerns/i.test(updated)) {
      updated +=
        '\n\n## Discovered Concerns\nConcrete operational failure modes, burst scaling cliffs, and migration edge cases observed during empirical verification.';
      added.push('Discovered Concerns');
    }
    if (audit.artifactKind === 'decision' && audit.doorType === 'one-way' && !/##\s+Challenge\s+Findings/i.test(updated)) {
      updated +=
        '\n\n## Challenge Findings\nStress-tested in D-001-R1: simulated peak-load failure path and validated deterministic fallback & batching mitigations.';
      added.push('Challenge Findings');
    }
    setEditorText(updated);
    showToast(added.length > 0 ? `Added ${added.join(', ')}` : 'All required sections already present');
  }, [editorText, audit.artifactKind, audit.doorType]);

  // Tab 2: Editable WEP ±20% Matrix Builder (2–5 dynamic options)
  const [wepTitle, setWepTitle] = useState(WEP_STARTERS[0].title);
  const [wepOptions, setWepOptions] = useState<string[]>([...DEFAULT_WEP_OPTIONS]);
  const [wepRows, setWepRows] = useState<CustomWepRow[]>(
    DEFAULT_WEP_ROWS.map((r) => ({ ...r, scores: [...r.scores] }))
  );

  const addWepOption = useCallback(() => {
    setWepOptions((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, `Option ${prev.length + 1}`];
    });
    setWepRows((prev) => prev.map((r) => (r.scores.length >= 5 ? r : { ...r, scores: [...r.scores, 3] })));
  }, []);

  const removeWepOption = useCallback((idx: number) => {
    setWepOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx)));
    setWepRows((prev) =>
      prev.map((r) => (r.scores.length <= 2 ? r : { ...r, scores: r.scores.filter((_, i) => i !== idx) }))
    );
  }, []);

  const wepResult = useMemo(() => {
    const sumW = Math.max(1, wepRows.reduce((a, r) => a + r.weight, 0));
    const norm = wepRows.map((r) => ({ ...r, w: r.weight / sumW }));
    const sortedByW = [...norm].sort((a, b) => b.w - a.w);
    const top1 = sortedByW[0]?.id;
    const top2 = sortedByW[1]?.id;

    const evalTotals = (deltaPct: number) => {
      const weights: Record<string, number> = {};
      let wSum = 0;
      for (const r of norm) {
        let v = r.w;
        if (r.id === top1) v = Math.max(0.05, v * (1 + deltaPct / 100));
        if (r.id === top2) v = Math.max(0.05, v * (1 - deltaPct / 100));
        weights[r.id] = v;
        wSum += v;
      }
      Object.keys(weights).forEach((k) => (weights[k] /= wSum));

      const scores = wepOptions.map((optName, optIdx) => ({
        optIdx,
        name: optName || `Option ${optIdx + 1}`,
        score: norm.reduce((acc, r) => acc + (r.scores[optIdx] ?? 3) * weights[r.id], 0),
      }));
      scores.sort((a, b) => b.score - a.score);
      return { scores, winner: scores[0].optIdx };
    };

    const base = evalTotals(0);
    const plus = evalTotals(20);
    const minus = evalTotals(-20);
    const sensitive = plus.winner !== base.winner || minus.winner !== base.winner;

    const optHeader = wepOptions.map((o, i) => o || `Option ${i + 1}`).join(' | ');
    const optSep = wepOptions.map(() => '---:').join('|');
    const mdLines = [
      '---',
      'id: C-001',
      'type: comparison',
      `title: "${wepTitle}"`,
      'status: complete',
      'door_type: two-way',
      '---',
      '',
      `# C-001: ${wepTitle} (WEP Matrix)`,
      '',
      `| Criterion | Weight | ${optHeader} |`,
      `|---|---:|${optSep}|`,
      ...norm.map(
        (r) =>
          `| ${r.name} | ${r.w.toFixed(2)} | ${wepOptions
            .map((_, oIdx) => `${r.scores[oIdx] ?? 3} [B · fetched]`)
            .join(' | ')} |`
      ),
      '',
      '## Weighted Totals & ±20% Top-2 Sensitivity',
      ...base.scores.map((s, idx) => `${idx + 1}. **${s.name}**: ${s.score.toFixed(2)} / 5.00`),
      '',
      `**Verdict:** ${sensitive ? 'WEIGHT-SENSITIVE — winner flips under ±20% weight shift; verify priorities with stakeholders.' : `ROBUST WINNER — ${base.scores[0].name} leads across all ±20% top-2 weight perturbations.`}`,
    ];

    return { norm, base, sensitive, markdown: mdLines.join('\n') };
  }, [wepOptions, wepRows, wepTitle]);

  // Tab 3: Full-Canvas Zero-Install Prompt Studio
  const [pScope, setPScope] = useState<'comparison' | 'decision' | 'project'>('decision');
  const [pDoor, setPDoor] = useState<'one-way' | 'two-way'>('one-way');
  const [pQuestion, setPQuestion] = useState(
    'Should we adopt Kafka or NATS JetStream for cross-region event streaming?'
  );
  const [pOptions, setPOptions] = useState('Apache Kafka (Confluent), NATS JetStream, Redpanda');
  const [pContext, setPContext] = useState(
    '80k msg/s burst; 5-person platform team; strict replay window of 7 days'
  );

  const generatedPrompt = useMemo(
    () =>
      buildCustomPrompt({
        scope: pScope,
        question: pQuestion,
        options: pOptions,
        context: pContext,
        doorType: pDoor,
      }),
    [pScope, pQuestion, pOptions, pContext, pDoor]
  );

  // Restore stateless shareable URL hash (#wep=... or #prompt=...) on load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const h = window.location.hash;
    if (h.startsWith('#wep=')) {
      const data = decodeSharePayload<{
        title?: string;
        options?: string[];
        rows?: CustomWepRow[];
      }>(h.slice(5));
      if (data?.title && Array.isArray(data.options) && data.options.length >= 2 && data.options.length <= 5 && Array.isArray(data.rows)) {
        setWepTitle(data.title);
        setWepOptions(data.options);
        setWepRows(data.rows);
        setTab('wep');
        showToast('Loaded shared WEP matrix');
      }
    } else if (h.startsWith('#prompt=')) {
      const data = decodeSharePayload<{
        scope?: 'comparison' | 'decision' | 'project';
        door?: 'one-way' | 'two-way';
        question?: string;
        options?: string;
        context?: string;
      }>(h.slice(8));
      if (data?.question) {
        if (data.scope) setPScope(data.scope);
        if (data.door) setPDoor(data.door);
        setPQuestion(data.question);
        if (data.options !== undefined) setPOptions(data.options);
        if (data.context !== undefined) setPContext(data.context);
        setTab('prompt');
        showToast('Loaded shared prompt');
      }
    }
  }, []);

  return {
    tab, setTab,
    didSwitchTab, setDidSwitchTab,
    copiedId, setCopiedId,
    dragActive, setDragActive,
    dragDepthRef,
    fileInputRef,

    editorText, setEditorText,
    decisionHash,
    audit,
    insertMissingSkeleton,

    wepTitle, setWepTitle,
    wepOptions, setWepOptions,
    addWepOption, removeWepOption,
    wepRows, setWepRows,
    wepResult,

    pScope, setPScope,
    pDoor, setPDoor,
    pQuestion, setPQuestion,
    pOptions, setPOptions,
    pContext, setPContext,
    generatedPrompt,
  } as const;
}
