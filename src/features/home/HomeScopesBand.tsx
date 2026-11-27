import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { copyText } from '@/shared/lib/clipboard';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

interface PipeNode {
  label: string;
  tone?: 'default' | 'accent' | 'pass' | 'skip';
}

interface ScopeItem {
  id: 'comparison' | 'decision' | 'project' | 'skip';
  code: string;
  name: string;
  rigor: number;
  cadence: string;
  artifact: string;
  pipeline: PipeNode[];
  invocation: string;
  href: string;
  cta: string;
}

const SCOPES: ScopeItem[] = [
  {
    id: 'comparison',
    code: 'C-NNN',
    name: 'Comparison',
    rigor: 1,
    cadence: '1 session · ~5m',
    artifact: 'C-001.md',
    pipeline: [
      { label: '2–5 options' },
      { label: 'WEP ±20%', tone: 'accent' },
      { label: 'C-001.md', tone: 'pass' },
      { label: 'Code' },
    ],
    invocation: 'vivechak_start(scope="comparison", question="Zod vs Valibot vs ArkType")',
    href: '/playground#wep',
    cta: 'WEP Builder',
  },
  {
    id: 'decision',
    code: 'D-NNN',
    name: 'Decision ADR',
    rigor: 3,
    cadence: '1–3 sessions · ~30m',
    artifact: 'D-001.md',
    pipeline: [
      { label: '1–3× Cited' },
      { label: 'Red-team R1', tone: 'accent' },
      { label: '/dev/tty', tone: 'accent' },
      { label: 'D-001.md', tone: 'pass' },
    ],
    invocation: 'vivechak_start(scope="decision", question="RabbitMQ → NATS JetStream")',
    href: '/playground#scope',
    cta: 'Risk Profiler',
  },
  {
    id: 'project',
    code: 'FAD',
    name: 'Project DAG',
    rigor: 5,
    cadence: '4–30 sessions',
    artifact: 'FAD.md',
    pipeline: [
      { label: 'DAG T0→T1×N' },
      { label: 'SYN-01 sink', tone: 'accent' },
      { label: 'G1–G12 Gate', tone: 'accent' },
      { label: 'FAD.md', tone: 'pass' },
    ],
    invocation: 'vivechak_start(scope="project", question="Multi-tenant GDPR platform")',
    href: '/architecture',
    cta: 'Session DAG',
  },
  {
    id: 'skip',
    code: 'SKIP',
    name: 'Routine code',
    rigor: 0,
    cadence: '0 tools',
    artifact: 'Direct',
    pipeline: [
      { label: 'Bug fix / Refactor', tone: 'skip' },
      { label: 'Bypassed (0 MCP tools)', tone: 'skip' },
      { label: 'Code directly', tone: 'pass' },
    ],
    invocation: 'Out of scope — write and test code directly',
    href: '/playground#scope',
    cta: 'Test Classifier',
  },
];

export const HomeScopesBand: React.FC = () => {
  const [activeId, setActiveId] = useState<ScopeItem['id']>('decision');
  const [copied, setCopied] = useState(false);
  const active = SCOPES.find((s) => s.id === activeId) ?? SCOPES[1];

  const handleCopy = async () => {
    const ok = await copyText(active.invocation);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopied(true);
    showToast('Copied MCP call');
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="band-obsidian" id="scopes">
      <div className="wrap">
        <div className="sec-head-split">
          <h2 className="sec-title">Scaled to reversal cost</h2>
          <a
            href="/playground#scope"
            className="editorial-link"
            onClick={(e) => {
              e.preventDefault();
              soundEngine.playTick(760);
              navigate('/playground#scope');
            }}
          >
            <span>Scope &amp; Risk Profiler</span>
            <ArrowRight size={14} />
          </a>
        </div>

        <div className="rigor-frame">
          <div className="rigor-matrix" role="tablist" aria-label="Vivechak research scopes">
            {SCOPES.map((sc) => {
              const isAct = sc.id === activeId;
              return (
                <button
                  key={sc.id}
                  type="button"
                  role="tab"
                  aria-selected={isAct}
                  id={`home-scope-${sc.id}`}
                  className={`rigor-row ${isAct ? 'active' : ''} ${sc.id === 'skip' ? 'is-skip' : ''}`}
                  onClick={() => {
                    soundEngine.playTick(sc.id === 'skip' ? 620 : 760);
                    setActiveId(sc.id);
                    setCopied(false);
                  }}
                >
                  <span className="rigor-code mono">{sc.code}</span>
                  <strong className="rigor-name">{sc.name}</strong>
                  <span className="rigor-meter" aria-label={`Rigor level ${sc.rigor} of 5`}>
                    {[1, 2, 3, 4, 5].map((seg) => (
                      <span key={seg} className={`rigor-bar ${seg <= sc.rigor ? 'is-on' : ''}`} />
                    ))}
                  </span>
                  <span className="rigor-cadence mono">{sc.cadence}</span>
                  <span className="rigor-artifact mono">{sc.artifact}</span>
                </button>
              );
            })}
          </div>

          {/* Live Morphing Execution Topology */}
          <div className="rigor-topo-row">
            <div className="topo-track" aria-label="Execution stages for selected scope">
              {active.pipeline.map((node, i) => (
                <React.Fragment key={`${active.id}-${node.label}`}>
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.16, delay: i * 0.03 }}
                    className={`topo-node mono tone-${node.tone ?? 'default'}`}
                  >
                    {node.label}
                  </motion.span>
                  {i < active.pipeline.length - 1 && (
                    <span className="topo-arrow mono" aria-hidden="true">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>

            <a
              href={active.href}
              className="editorial-link is-compact"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playSieveDrop();
                navigate(active.href);
              }}
            >
              <span>{active.cta}</span>
              <ArrowRight size={13} />
            </a>
          </div>

          <div className="scope-preview-bar">
            <code className="scope-preview-cmd mono">
              <span className="hero-cmd-prompt">$ </span>
              {active.invocation}
            </code>
            {active.id !== 'skip' && (
              <button
                type="button"
                className={`inline-action-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
