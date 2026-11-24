import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Cpu, FileCode2, GitBranch, Play } from 'lucide-react';
import { DAG_NODES, EVIDENCE_GRADES, MCP_PROMPTS, MCP_RESOURCES, MCP_TOOLS, WORKSPACE_FILES } from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

type ArchTab = 'dag' | 'files' | 'mcp';
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

export const ArchitectureStage: React.FC = () => {
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
  const [mcpKind, setMcpKind] = useState<'tools' | 'prompts' | 'resources'>('tools');
  const [activePromptName, setActivePromptName] = useState(MCP_PROMPTS[0].name);
  const [activeResourceUri, setActiveResourceUri] = useState(MCP_RESOURCES[0].uri);
  const [selectedGrade, setSelectedGrade] = useState<string>('A');
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
    // Launch ALL THREE Layer 1 subagents concurrently (true parallel DAG execution!)
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
  const activeGrade = EVIDENCE_GRADES.find((g) => g.grade === selectedGrade) ?? EVIDENCE_GRADES[0];

  const copySnippet = async (id: string, label: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedId(id);
    showToast(`Copied ${label}`);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <section className="band-paper" id="architecture">
      <div className="wrap">
        <motion.div
          className="sec-head-split"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 'some' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <span className="eyebrow-light mono">04 · ARCHITECTURE IN MOTION</span>
            <h2 className="paper-title">Plain Markdown. Zero lock-in.</h2>
            <p className="paper-sub">
              Topological DAG scheduling and a 9-tool MCP surface over ordinary files in{' '}
              <code className="code-tag-light">research/</code>.
            </p>
          </div>

          <div className="paper-seg-switch" role="tablist" aria-label="Architecture views">
            {(
              [
                ['dag', 'Live DAG', GitBranch],
                ['files', 'Git Files', FileCode2],
                ['mcp', 'MCP & Grades', Cpu],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                id={`arch-tab-${id}`}
                className={`paper-seg-btn ${tab === id ? 'active' : ''}`}
                onClick={() => {
                  soundEngine.playTick(740);
                  setTab(id);
                }}
              >
                {tab === id && (
                  <motion.span
                    layoutId="archTabPill"
                    className="paper-seg-bg"
                    transition={{ type: 'spring', stiffness: 440, damping: 34 }}
                  />
                )}
                <Icon size={14} className="seg-ico" />
                <span className="seg-lbl">{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {tab === 'dag' && (
          <motion.div
            key="dag"
            className="arch-card"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
              <div className="arch-bar mono">
                <span>
                  {swarmRunning
                    ? 'PARALLEL SUBAGENTS EXECUTING LAYER 1…'
                    : allL1Done
                      ? '4/4 SESSIONS COMPLETE · SYN-01 UNLOCKED'
                      : `${completedCount}/4 COMPLETE · SYN-01 HELD BY SINK GUARD`}
                </span>
                <div className="arch-bar-actions">
                  <motion.button
                    type="button"
                    id="btn-run-swarm"
                    className="syn-btn syn-swarm-btn mono"
                    whileTap={{ scale: 0.96 }}
                    disabled={swarmRunning}
                    onClick={runSwarmDemo}
                  >
                    <Play size={11} fill="currentColor" />
                    <span>{swarmRunning ? 'Swarm Running…' : 'Simulate Swarm'}</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    id="btn-toggle-syn"
                    className={`syn-btn mono ${allL1Done ? 'unlocked' : ''}`}
                    whileTap={{ scale: 0.96 }}
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
                    {allL1Done ? '✓ Unlocked (Reset)' : 'Unlock SYN-01'}
                  </motion.button>
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
                          <circle r="3.4" fill="#F2A33A">
                            <animateMotion dur="2.6s" repeatCount="indefinite" path={d} />
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
                        <rect width={NODE_W} height={NODE_H} rx="4" className="dag-node-box" />
                        <rect width="4" height={NODE_H} rx="1" className="dag-node-accent" />
                        {n.status === 'running' && (
                          <rect x="4" y={NODE_H - 3} width={NODE_W - 4} height="3" rx="1" className="dag-node-progress">
                            <animate attributeName="width" values="18;224;18" dur="1.15s" repeatCount="indefinite" />
                          </rect>
                        )}
                        <text x="16" y="23" className="dag-svg-id">{n.id}</text>
                        <text x={NODE_W - 12} y="23" textAnchor="end" className="dag-svg-status">
                          {n.status === 'running' ? 'SUBAGENT ●' : n.status.toUpperCase()}
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
            </motion.div>
          )}

        {tab === 'files' && (
          <motion.div
            key="files"
            className="ws-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
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
                    <span className="mono ws-fbadge">{f.badge}</span>
                  </button>
                ))}
              </div>
              <div className="ws-code-wrap">
                <div className="ws-code-bar mono">
                  <span>{activeFile.path}</span>
                  <button
                    type="button"
                    className={`dock-copy mono ${copiedId === 'ws-file' ? 'copied' : ''}`}
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
            </motion.div>
          )}

        {tab === 'mcp' && (
          <motion.div
            key="mcp"
            className="mcp-compact-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
              <div className="mcp-triumvirate-bar">
                <div className="mcp-triumvirate-pills" role="tablist" aria-label="MCP Protocol Triumvirate">
                  {[
                    { id: 'tools', label: '9 Tools', badge: 'High Cohesion' },
                    { id: 'prompts', label: '4 Prompts', badge: 'Multi-Scope' },
                    { id: 'resources', label: '8 Resources', badge: 'Templates & Cards' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={mcpKind === item.id}
                      className={`mcp-kind-btn mono ${mcpKind === item.id ? 'active' : ''}`}
                      onClick={() => {
                        soundEngine.playTick(740);
                        setMcpKind(item.id as McpViewKind);
                      }}
                    >
                      <span>{item.label}</span>
                      <span className="mcp-kind-badge">{item.badge}</span>
                    </button>
                  ))}
                </div>
                <span className="mcp-spec-tag mono">MCP PROTOCOL 2024-11-05 SPEC</span>
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
                        className={`dock-copy mono ${copiedId === 'mcp-json' ? 'copied' : ''}`}
                        onClick={() => copySnippet('mcp-json', `${activeTool.name} payload`, activeTool.sampleCall)}
                      >
                        {copiedId === 'mcp-json' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === 'mcp-json' ? 'Copied Call' : 'Copy Call'}</span>
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
                        className={`dock-copy mono ${copiedId === 'prompt-name' ? 'copied' : ''}`}
                        onClick={() => copySnippet('prompt-name', activePrompt.name, activePrompt.name)}
                      >
                        {copiedId === 'prompt-name' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === 'prompt-name' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="mcp-prompt-details">
                      <div className="mcp-prompt-row mono">
                        <span className="mcp-pr-tag">ARGUMENTS:</span>
                        <code>{activePrompt.args}</code>
                      </div>
                      <div className="mcp-prompt-row mono">
                        <span className="mcp-pr-tag">PROTOCOL FLOW:</span>
                        <span>{activePrompt.flow}</span>
                      </div>
                    </div>
                    <pre className="dark-code-block mcp-pre mono">
                      <code>{renderHighlightedCode(`// Client MCP Prompt Request
{
  "method": "prompts/get",
  "params": {
    "name": "${activePrompt.name.replace(/^\//, '')}",
    "arguments": {
      "options": "Pino vs Winston",
      "context": "High-throughput microservice handling 15k req/s"
    }
  }
}`, 'json')}</code>
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
                        className={`dock-copy mono ${copiedId === 'resource-uri' ? 'copied' : ''}`}
                        onClick={() => copySnippet('resource-uri', activeResource.uri, activeResource.uri)}
                      >
                        {copiedId === 'resource-uri' ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedId === 'resource-uri' ? 'Copied URI' : 'Copy URI'}</span>
                      </button>
                    </div>
                    <p className="mcp-preview-desc">{activeResource.desc}</p>
                    <pre className="dark-code-block mcp-pre mono">
                      <code>{renderHighlightedCode(`// Client MCP Resource Read Request
{
  "method": "resources/read",
  "params": {
    "uri": "${activeResource.uri}"
  }
}
// Read-only canonical Markdown template loaded with zero token cost before session generation.`, 'json')}</code>
                    </pre>
                  </div>
                </div>
              )}

              <div className="grades-ribbon" role="tablist" aria-label="Evidence Grades A through E">
                {EVIDENCE_GRADES.map((g) => (
                  <button
                    key={g.grade}
                    type="button"
                    role="tab"
                    aria-selected={selectedGrade === g.grade}
                    className={`grade-chip g-${g.grade} ${selectedGrade === g.grade ? 'is-selected' : ''}`}
                    onClick={() => {
                      soundEngine.playTick(g.grade === 'A' || g.grade === 'B' ? 800 : 620);
                      setSelectedGrade(g.grade);
                    }}
                  >
                    <span className="mono g-ch-letter">{g.grade}</span>
                    <div>
                      <strong>{g.label}</strong>
                      <span className="mono g-ch-gate">{g.gateImpact}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="grade-specimen-bar mono">
                <span className={`gsb-badge g-${activeGrade.grade}`}>GRADE {activeGrade.grade}</span>
                <span className="gsb-desc">{activeGrade.description}</span>
                <code className="gsb-ex">{activeGrade.example}</code>
              </div>
            </motion.div>
          )}
      </div>
    </section>
  );
};
