import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Copy, Play } from 'lucide-react';
import { DAG_NODES, EVIDENCE_GRADES, MCP_PROMPTS, MCP_RESOURCES, MCP_TOOLS, WORKSPACE_FILES } from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

type ArchTab = 'dag' | 'files' | 'mcp' | 'grades';
type McpViewKind = 'tools' | 'prompts' | 'resources';

const NODE_POS: Record<string, { x: number; y: number }> = {
  'T0-01': { x: 128, y: 184 },
  'T1-01': { x: 470, y: 84 },
  'T1-02': { x: 470, y: 184 },
  'T1-03': { x: 470, y: 284 },
  'SYN-01': { x: 812, y: 184 },
};
const NODE_W = 228;
const NODE_H = 68;
const EDGES = [
  { from: 'T0-01', to: 'T1-01' },
  { from: 'T0-01', to: 'T1-02' },
  { from: 'T0-01', to: 'T1-03' },
  { from: 'T1-01', to: 'SYN-01' },
  { from: 'T1-02', to: 'SYN-01' },
  { from: 'T1-03', to: 'SYN-01' },
];
const L1_IDS = ['T1-01', 'T1-02', 'T1-03'] as const;

interface ArchitectureStageProps {
  asPageSection?: boolean;
}

export const ArchitectureStage: React.FC<ArchitectureStageProps> = ({ asPageSection = false }) => {
  const [tab, setTab] = useState<ArchTab>('dag');
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({
    'T0-01': true,
    'T1-01': true,
    'T1-02': true,
    'T1-03': false,
  });
  const [activeDagId, setActiveDagId] = useState('SYN-01');
  const [activeFilePath, setActiveFilePath] = useState(WORKSPACE_FILES[1].path);
  const [activeToolName, setActiveToolName] = useState(MCP_TOOLS[0].name);
  const [mcpKind, setMcpKind] = useState<McpViewKind>('tools');
  const [activePromptName, setActivePromptName] = useState(MCP_PROMPTS[0].name);
  const [activeResourceUri, setActiveResourceUri] = useState(MCP_RESOURCES[0].uri);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [swarmRunning, setSwarmRunning] = useState(false);
  const [runningMap, setRunningMap] = useState<Record<string, boolean>>({});
  const swarmTimersRef = useRef<number[]>([]);

  const clearSwarmTimers = () => {
    swarmTimersRef.current.forEach((id) => window.clearTimeout(id));
    swarmTimersRef.current = [];
  };

  useEffect(() => () => clearSwarmTimers(), []);

  const runSwarmDemo = () => {
    clearSwarmTimers();
    setSwarmRunning(true);
    soundEngine.playTick(760);
    setDoneMap({ 'T0-01': true, 'T1-01': false, 'T1-02': false, 'T1-03': false });
    setRunningMap({ 'T1-01': true, 'T1-02': true, 'T1-03': true });
    setActiveDagId('T0-01');

    const at = (ms: number, fn: () => void) => {
      swarmTimersRef.current.push(window.setTimeout(fn, ms));
    };
    at(860, () => {
      soundEngine.playSieveDrop();
      setRunningMap((prev) => ({ ...prev, 'T1-02': false }));
      setDoneMap((prev) => ({ ...prev, 'T1-02': true }));
      setActiveDagId('T1-02');
    });
    at(1340, () => {
      soundEngine.playSieveDrop();
      setRunningMap((prev) => ({ ...prev, 'T1-01': false }));
      setDoneMap((prev) => ({ ...prev, 'T1-01': true }));
      setActiveDagId('T1-01');
    });
    at(1820, () => {
      soundEngine.playGatePass();
      setRunningMap({});
      setDoneMap({ 'T0-01': true, 'T1-01': true, 'T1-02': true, 'T1-03': true });
      setActiveDagId('SYN-01');
      setSwarmRunning(false);
    });
  };

  const completedCount = 1 + L1_IDS.filter((id) => doneMap[id]).length;
  const allL1Done = L1_IDS.every((id) => doneMap[id]);

  const toggleL1Node = (id: string) => {
    setDoneMap((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      const nowUnlocked = L1_IDS.every((k) => next[k]);
      if (nowUnlocked) soundEngine.playGatePass();
      else soundEngine.playTick(700);
      return next;
    });
  };

  const liveNodes = useMemo(
    () =>
      DAG_NODES.map((n) => {
        if (n.layer === 1) {
          const st = runningMap[n.id] ? ('running' as const) : doneMap[n.id] ? ('complete' as const) : ('ready' as const);
          return { ...n, status: st };
        }
        if (n.id === 'SYN-01') {
          if (allL1Done) {
            return {
              ...n,
              status: 'ready' as const,
              injectedSnippet: `<upstream-findings source="T0-01, T1-01, T1-02, T1-03" trust="untrusted-data">
- D-001 (One-Way): PostgreSQL 16 + pgvector CTEs (<50ms p95; rejected Neo4j) [Grade A]
- D-002 (Two-Way): Yjs CRDT offline-capable sync (rejected custom OT) [Grade A]
- D-003 (Two-Way): SSE token streaming with sliding story-graph window [Grade A]
</upstream-findings>`,
            };
          }
          const missing = L1_IDS.filter((id) => !doneMap[id]).join(', ');
          return {
            ...n,
            status: 'held' as const,
            injectedSnippet: `// TERMINAL SYNTHESIS GUARD (internal/core/dag.go)
// Held back until 100% of non-synthesis sessions reach status: complete.
// Missing: ${missing} — click any Layer 1 node above to toggle completion.`,
          };
        }
        return n;
      }),
    [doneMap, runningMap, allL1Done]
  );

  const activeNode = liveNodes.find((n) => n.id === activeDagId) ?? liveNodes[0];
  const activeFile = WORKSPACE_FILES.find((f) => f.path === activeFilePath) ?? WORKSPACE_FILES[0];
  const activeTool = MCP_TOOLS.find((t) => t.name === activeToolName) ?? MCP_TOOLS[0];
  const activePrompt = MCP_PROMPTS.find((p) => p.name === activePromptName) ?? MCP_PROMPTS[0];
  const activeResource = MCP_RESOURCES.find((r) => r.uri === activeResourceUri) ?? MCP_RESOURCES[0];

  const copySnippet = async (id: string, label: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedId(id);
    showToast(`Copied ${label}`);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <section className={asPageSection ? 'subpage-band subpage-band-first' : 'band-paper'} id="architecture">
      <div className="wrap">
        <div className="sec-head-split">
          <div>
            {asPageSection ? (
              <>
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
                <h1 className="subpage-h1">Architecture</h1>
              </>
            ) : (
              <h2 className="sec-title">Architecture</h2>
            )}
            <p className="sec-sub mono" style={{ fontSize: '0.82rem' }}>
              Topological DAG · research/ Markdown · 9 MCP tools (9 KB) · Grades A–E
            </p>
          </div>

          <div className="tab-rail" role="tablist" aria-label="Architecture views">
            {(
              [
                ['dag', 'Session DAG'],
                ['files', 'Git Files'],
                ['mcp', 'MCP Surface'],
                ['grades', 'Grades A–E'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                id={`arch-tab-${id}`}
                className={`tab-rail-btn ${tab === id ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(740);
                  setTab(id);
                }}
              >
                <span>{label}</span>
                {tab === id && (
                  <motion.span
                    layoutId="archTabLine"
                    className="tab-rail-indicator"
                    transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === 'dag' && (
          <div className="arch-card">
            <div className="arch-bar">
              <span className="mono arch-bar-status">
                {swarmRunning
                  ? 'Parallel subagents running Layer 1…'
                  : allL1Done
                    ? '4/4 sessions complete · SYN-01 unlocked'
                    : `${completedCount}/4 complete · SYN-01 held by sink guard`}
              </span>
              <div className="arch-bar-actions">
                <button
                  type="button"
                  id="btn-run-swarm"
                  className="inline-action-btn"
                  disabled={swarmRunning}
                  onClick={runSwarmDemo}
                >
                  <Play size={11} fill="currentColor" />
                  <span>{swarmRunning ? 'Running…' : 'Simulate swarm'}</span>
                </button>
                <button
                  type="button"
                  id="btn-toggle-syn"
                  className={`btn-primary btn-sm ${allL1Done ? 'is-unlocked' : ''}`}
                  onClick={() => {
                    clearSwarmTimers();
                    setSwarmRunning(false);
                    setRunningMap({});
                    if (!allL1Done) {
                      soundEngine.playGatePass();
                      setDoneMap({ 'T0-01': true, 'T1-01': true, 'T1-02': true, 'T1-03': true });
                    } else {
                      soundEngine.playTick(620);
                      setDoneMap({ 'T0-01': true, 'T1-01': true, 'T1-02': true, 'T1-03': false });
                    }
                    setActiveDagId('SYN-01');
                  }}
                >
                  {allL1Done ? 'Reset SYN-01' : 'Unlock SYN-01'}
                </button>
              </div>
            </div>

            <div className="dag-svg-wrap">
              <svg
                viewBox="0 0 940 336"
                className="dag-svg"
                role="img"
                aria-label="Topological DAG from T0-01 through parallel Layer 1 sessions into SYN-01"
              >
                <defs>
                  <marker id="arr-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" className="dag-arrow-ok" />
                  </marker>
                  <marker id="arr-wait" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" className="dag-arrow-wait" />
                  </marker>
                </defs>

                <g>
                  <text x="128" y="24" textAnchor="middle" className="dag-col-label">LAYER 0 · ROOT</text>
                  <text x="470" y="24" textAnchor="middle" className="dag-col-label">LAYER 1 · PARALLEL (CLICK TO TOGGLE)</text>
                  <text x="812" y="24" textAnchor="middle" className="dag-col-label">LAYER 2 · SINK GUARD</text>
                </g>

                {EDGES.map((e) => {
                  const a = NODE_POS[e.from];
                  const b = NODE_POS[e.to];
                  const x1 = a.x + NODE_W / 2;
                  const x2 = b.x - NODE_W / 2 - 4;
                  const mx = (x1 + x2) / 2;
                  const d = `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`;
                  const ok = liveNodes.find((n) => n.id === e.from)?.status === 'complete';
                  const foc = e.from === activeDagId || e.to === activeDagId;

                  return (
                    <g key={`${e.from}-${e.to}`}>
                      <path
                        d={d}
                        fill="none"
                        className={`dag-edge ${ok ? 'is-satisfied' : 'is-held'} ${foc ? 'is-focused' : ''}`}
                        markerEnd={ok ? 'url(#arr-ok)' : 'url(#arr-wait)'}
                      />
                      {ok && (
                        <circle r="3" className="dag-flow-dot">
                          <animateMotion dur="2.8s" repeatCount="indefinite" path={d} />
                        </circle>
                      )}
                    </g>
                  );
                })}

                {liveNodes.map((n) => {
                  const p = NODE_POS[n.id];
                  const sel = n.id === activeDagId;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
                      className={`dag-svg-node state-${n.status} ${sel ? 'is-selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`${n.id} ${n.title} (${n.status})`}
                      onClick={() => {
                        setActiveDagId(n.id);
                        if (n.layer === 1) toggleL1Node(n.id);
                        else soundEngine.playTick(760);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          setActiveDagId(n.id);
                          if (n.layer === 1) toggleL1Node(n.id);
                        }
                      }}
                    >
                      <rect width={NODE_W} height={NODE_H} rx="6" className="dag-node-box" />
                      <rect width="3.5" height={NODE_H} rx="1.5" className="dag-node-accent" />
                      {n.status === 'running' && (
                        <rect x="4" y={NODE_H - 3} width={NODE_W - 4} height="3" rx="1" className="dag-node-progress">
                          <animate attributeName="width" values="18;224;18" dur="1.15s" repeatCount="indefinite" />
                        </rect>
                      )}
                      <text x="16" y="23" className="dag-svg-id">{n.id}</text>
                      <text x={NODE_W - 12} y="23" textAnchor="end" className="dag-svg-status">
                        {n.status === 'running' ? 'RUNNING' : n.status.toUpperCase()}
                      </text>
                      <text x="16" y="43" className="dag-svg-title">{n.title}</text>
                      <text x="16" y="58" className="dag-svg-meta">
                        {n.door} · informs {n.informs}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="dag-inject-strip">
              <div className="dag-inject-head mono">
                <span>vivechak_next(session_id=&quot;{activeNode.id}&quot;)</span>
                <span className="status-saffron">informs {activeNode.informs}</span>
              </div>
              <pre className="dark-code-block mono">
                <code>{renderHighlightedCode(activeNode.injectedSnippet, 'markdown')}</code>
              </pre>
            </div>
          </div>
        )}

        {tab === 'files' && (
          <div className="ws-card">
            <div className="ws-sidebar" role="tablist" aria-label="research files">
              <div className="ws-root mono">your-repo/research/</div>
              {WORKSPACE_FILES.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  role="tab"
                  aria-selected={f.path === activeFilePath}
                  className={`ws-btn ${f.path === activeFilePath ? 'active' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(740);
                    setActiveFilePath(f.path);
                  }}
                >
                  <span className="mono ws-fname">{f.name}</span>
                  <span className="ws-fbadge">{f.badge}</span>
                </button>
              ))}
            </div>
            <div className="ws-code-wrap">
              <div className="ws-code-bar mono">
                <span>{activeFile.path}</span>
                <button
                  type="button"
                  className={`inline-action-btn ${copiedId === 'ws-file' ? 'copied' : ''}`}
                  onClick={() => copySnippet('ws-file', activeFile.name, activeFile.content)}
                >
                  {copiedId === 'ws-file' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedId === 'ws-file' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="dark-code-block ws-pre mono">
                <code>{renderHighlightedCode(activeFile.content, 'markdown')}</code>
              </pre>
            </div>
          </div>
        )}

        {tab === 'mcp' && (
          <div className="mcp-compact-wrap">
            <div className="mcp-triumvirate-bar">
              <div className="sieve-rail" role="tablist" aria-label="MCP Protocol Surface">
                {[
                  { id: 'tools', label: '9 Tools' },
                  { id: 'prompts', label: '4 Prompts' },
                  { id: 'resources', label: '8 Resources' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={mcpKind === item.id}
                    className={`sieve-rail-btn ${mcpKind === item.id ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playTick(740);
                      setMcpKind(item.id as McpViewKind);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="mcp-spec-tag mono">9,063 B always-loaded wire payload · MCP 2024-11-05</span>
            </div>

            {mcpKind === 'tools' && (
              <div className="mcp-compact-grid">
                <div className="mcp-pill-col" role="listbox" aria-label="9 MCP Tools">
                  {MCP_TOOLS.map((t, idx) => (
                    <button
                      key={t.name}
                      type="button"
                      role="option"
                      aria-selected={t.name === activeToolName}
                      className={`mcp-tool-btn mono ${t.name === activeToolName ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(700 + idx * 18);
                        setActiveToolName(t.name);
                      }}
                    >
                      <span>{t.name}</span>
                      <span className={`rw-dot ${t.readOnly ? 'ro' : ''}`}>{t.readOnly ? 'RO' : 'RW'}</span>
                    </button>
                  ))}
                </div>

                <div className="mcp-preview-col">
                  <div className="mcp-preview-head mono">
                    <strong>{activeTool.name}</strong>
                    <button
                      type="button"
                      className={`inline-action-btn ${copiedId === 'mcp-json' ? 'copied' : ''}`}
                      onClick={() => copySnippet('mcp-json', `${activeTool.name} payload`, activeTool.sampleCall)}
                    >
                      {copiedId === 'mcp-json' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === 'mcp-json' ? 'Copied call' : 'Copy call'}</span>
                    </button>
                  </div>
                  <p className="mcp-preview-desc">{activeTool.description}</p>
                  <pre className="dark-code-block mcp-pre mono">
                    <code>{renderHighlightedCode(activeTool.sampleEnvelope, 'json')}</code>
                  </pre>
                </div>
              </div>
            )}

            {mcpKind === 'prompts' && (
              <div className="mcp-compact-grid">
                <div className="mcp-pill-col" role="listbox" aria-label="4 MCP Prompts">
                  {MCP_PROMPTS.map((p, idx) => (
                    <button
                      key={p.name}
                      type="button"
                      role="option"
                      aria-selected={p.name === activePromptName}
                      className={`mcp-tool-btn mono ${p.name === activePromptName ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(720 + idx * 24);
                        setActivePromptName(p.name);
                      }}
                    >
                      <span>{p.name}</span>
                      <span className="rw-dot">PROMPT</span>
                    </button>
                  ))}
                </div>

                <div className="mcp-preview-col">
                  <div className="mcp-preview-head mono">
                    <strong>{activePrompt.name} — {activePrompt.title}</strong>
                    <button
                      type="button"
                      className={`inline-action-btn ${copiedId === 'prompt-name' ? 'copied' : ''}`}
                      onClick={() => copySnippet('prompt-name', `${activePrompt.name} JSON-RPC`, activePrompt.sampleRequest)}
                    >
                      {copiedId === 'prompt-name' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === 'prompt-name' ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <div className="mcp-prompt-details">
                    <div className="mcp-prompt-row">
                      <span className="mcp-pr-tag">Arguments</span>
                      <code className="mono">{activePrompt.args}</code>
                    </div>
                    <div className="mcp-prompt-row">
                      <span className="mcp-pr-tag">Flow</span>
                      <span>{activePrompt.flow}</span>
                    </div>
                  </div>
                  <pre className="dark-code-block mcp-pre mono">
                    <code>{renderHighlightedCode(activePrompt.sampleRequest, 'json')}</code>
                  </pre>
                </div>
              </div>
            )}

            {mcpKind === 'resources' && (
              <div className="mcp-compact-grid">
                <div className="mcp-pill-col" role="listbox" aria-label="8 MCP Resources">
                  {MCP_RESOURCES.map((r, idx) => (
                    <button
                      key={r.uri}
                      type="button"
                      role="option"
                      aria-selected={r.uri === activeResourceUri}
                      className={`mcp-tool-btn mono ${r.uri === activeResourceUri ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(700 + idx * 16);
                        setActiveResourceUri(r.uri);
                      }}
                    >
                      <span>{r.uri.replace('vivechak://', '')}</span>
                      <span className="rw-dot ro">URI</span>
                    </button>
                  ))}
                </div>

                <div className="mcp-preview-col">
                  <div className="mcp-preview-head mono">
                    <strong>{activeResource.uri}</strong>
                    <button
                      type="button"
                      className={`inline-action-btn ${copiedId === 'resource-uri' ? 'copied' : ''}`}
                      onClick={() => copySnippet('resource-uri', activeResource.uri, activeResource.uri)}
                    >
                      {copiedId === 'resource-uri' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === 'resource-uri' ? 'Copied URI' : 'Copy URI'}</span>
                    </button>
                  </div>
                  <p className="mcp-preview-desc">{activeResource.desc}</p>
                  <pre className="dark-code-block mcp-pre mono">
                    <code>{renderHighlightedCode(`{
  "method": "resources/read",
  "params": {
    "uri": "${activeResource.uri}"
  }
}`, 'json')}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'grades' && (
          <div className="grades-ledger-card">
            <div className="arch-bar">
              <span className="arch-bar-status">Evidentiary Grounding Scale (Principle P3)</span>
              <span className="grades-cap-note">Model training recall caps permanently at Grade D</span>
            </div>
            <div className="grades-ledger">
              {EVIDENCE_GRADES.map((g) => (
                <div key={g.grade} className="grade-row">
                  <div className={`grade-badge mono g-${g.grade}`}>{g.grade}</div>
                  <div className="grade-row-main">
                    <div className="grade-row-top">
                      <strong>{g.label}</strong>
                      <span className="grade-row-impact">{g.gateImpact}</span>
                    </div>
                    <p>{g.description}</p>
                  </div>
                  <code className="grade-row-ex mono">{g.example}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
