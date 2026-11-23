import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Check, Copy, Search, X } from 'lucide-react';
import {
  CLI_COMMANDS,
  CORE_PRINCIPLES,
  DIAGNOSTIC_CODES,
  EVIDENCE_GRADES,
  GATE_RULES_REF,
  MCP_PROMPTS,
  MCP_RESOURCES,
  MCP_TOOLS,
} from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

export type ReferenceTab = 'cli' | 'mcp' | 'gates' | 'principles';

interface ReferenceDrawerProps {
  open: boolean;
  initialTab?: ReferenceTab;
  onClose: () => void;
}

const TABS: { id: ReferenceTab; label: string }[] = [
  { id: 'cli', label: 'CLI Commands' },
  { id: 'mcp', label: 'MCP Surface' },
  { id: 'gates', label: 'Gates & Codes' },
  { id: 'principles', label: '8 Principles' },
];

export const ReferenceDrawer: React.FC<ReferenceDrawerProps> = ({
  open,
  initialTab = 'cli',
  onClose,
}) => {
  const [tab, setTab] = useState<ReferenceTab>(initialTab);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setQuery('');
      window.setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();

  const filteredCli = useMemo(
    () =>
      !q
        ? CLI_COMMANDS
        : CLI_COMMANDS.filter(
            (c) =>
              c.cmd.toLowerCase().includes(q) ||
              c.summary.toLowerCase().includes(q) ||
              c.flags.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredTools = useMemo(
    () =>
      !q
        ? MCP_TOOLS
        : MCP_TOOLS.filter(
            (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredPrompts = useMemo(
    () =>
      !q
        ? MCP_PROMPTS
        : MCP_PROMPTS.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.title.toLowerCase().includes(q) ||
              p.flow.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredResources = useMemo(
    () =>
      !q
        ? MCP_RESOURCES
        : MCP_RESOURCES.filter(
            (r) => r.uri.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredGrades = useMemo(
    () =>
      !q
        ? EVIDENCE_GRADES
        : EVIDENCE_GRADES.filter(
            (g) =>
              `grade ${g.grade}`.toLowerCase().includes(q) ||
              g.label.toLowerCase().includes(q) ||
              g.description.toLowerCase().includes(q) ||
              g.gateImpact.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredRules = useMemo(
    () =>
      !q
        ? GATE_RULES_REF
        : GATE_RULES_REF.filter(
            (r) =>
              r.id.toLowerCase().includes(q) ||
              r.name.toLowerCase().includes(q) ||
              r.criteria.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredCodes = useMemo(
    () =>
      !q
        ? DIAGNOSTIC_CODES
        : DIAGNOSTIC_CODES.filter(
            (d) =>
              d.code.toLowerCase().includes(q) ||
              d.meaning.toLowerCase().includes(q) ||
              d.fix.toLowerCase().includes(q)
          ),
    [q]
  );

  const filteredPrinciples = useMemo(
    () =>
      !q
        ? CORE_PRINCIPLES
        : CORE_PRINCIPLES.filter(
            (p) =>
              p.id.toLowerCase().includes(q) ||
              p.name.toLowerCase().includes(q) ||
              p.summary.toLowerCase().includes(q) ||
              p.evidence.toLowerCase().includes(q)
          ),
    [q]
  );

  const counts = useMemo<Record<ReferenceTab, number>>(
    () => ({
      cli: filteredCli.length,
      mcp: filteredTools.length + filteredPrompts.length + filteredResources.length,
      gates: filteredGrades.length + filteredRules.length + filteredCodes.length,
      principles: filteredPrinciples.length,
    }),
    [
      filteredCli.length,
      filteredTools.length,
      filteredPrompts.length,
      filteredResources.length,
      filteredGrades.length,
      filteredRules.length,
      filteredCodes.length,
      filteredPrinciples.length,
    ]
  );

  // Auto-jump to the first tab with matches when user's search yields 0 on current tab
  useEffect(() => {
    if (!q || counts[tab] > 0) return;
    const matchTab = TABS.find((t) => counts[t.id] > 0)?.id;
    if (matchTab) setTab(matchTab);
  }, [q, tab, counts]);

  const handleCopy = async (id: string, text: string, label: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedId(id);
    showToast(`Copied ${label}`);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="ref-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Vivechak Field Manual Quick Reference"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.aside
            className="ref-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
          >
            <div className="ref-head">
              <div className="ref-title-wrap">
                <BookOpen size={16} className="ref-ico" />
                <div>
                  <strong>Vivechak Field Manual</strong>
                  <span className="mono">v0.1.0 · Zero-exit developer reference</span>
                </div>
              </div>
              <button
                type="button"
                className="ref-close-btn"
                onClick={onClose}
                aria-label="Close Field Manual"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ref-controls">
              <div className="ref-search-row">
                <Search size={14} className="ref-search-ico" />
                <input
                  ref={inputRef}
                  id="ref-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter commands, G1–G12 rules, E-* / Q-* codes..."
                />
                {query && (
                  <button
                    type="button"
                    className="ref-clear-btn mono"
                    onClick={() => setQuery('')}
                    aria-label="Clear filter"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="ref-tabs" role="tablist" aria-label="Field Manual Sections">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.id}
                    className={`ref-tab mono ${tab === t.id ? 'active' : ''}`}
                    onClick={() => {
                      soundEngine.playTick(740);
                      setTab(t.id);
                    }}
                  >
                    {t.label}
                    {q ? ` (${counts[t.id]})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="ref-body">
              {tab === 'cli' && (
                <div className="ref-list">
                  {filteredCli.map((c) => (
                    <div key={c.cmd} className="ref-card">
                      <div className="ref-card-top">
                        <code className="mono ref-code-title">{c.cmd}</code>
                        <button
                          type="button"
                          className={`ref-copy-mini mono ${copiedId === c.cmd ? 'copied' : ''}`}
                          onClick={() => void handleCopy(c.cmd, c.usage, c.usage)}
                        >
                          {copiedId === c.cmd ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedId === c.cmd ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <p className="ref-desc">{c.summary}</p>
                      <div className="ref-meta mono">{c.flags}</div>
                    </div>
                  ))}
                  {filteredCli.length === 0 && <div className="ref-empty mono">No matching CLI commands.</div>}
                </div>
              )}

              {tab === 'mcp' && (
                <div className="ref-list">
                  <div className="ref-group-lbl mono">9 CONSOLIDATED MCP TOOLS</div>
                  {filteredTools.map((t) => (
                    <div key={t.name} className="ref-card">
                      <div className="ref-card-top">
                        <code className="mono ref-code-title">{t.name}</code>
                        <span className={`ref-pill mono ${t.readOnly ? 'is-ro' : ''}`}>
                          {t.readOnly ? 'READ-ONLY' : 'MUTATES research/'}
                        </span>
                      </div>
                      <p className="ref-desc">{t.description}</p>
                      <div className="ref-meta mono">
                        required: {t.requiredParams.length ? t.requiredParams.join(', ') : 'none'}
                      </div>
                    </div>
                  ))}

                  <div className="ref-group-lbl mono">4 MCP SLASH PROMPTS</div>
                  {filteredPrompts.map((p) => (
                    <div key={p.name} className="ref-card">
                      <div className="ref-card-top">
                        <code className="mono ref-code-title">{p.name}</code>
                        <span className="ref-meta mono">{p.args}</span>
                      </div>
                      <p className="ref-desc">{p.flow}</p>
                    </div>
                  ))}

                  <div className="ref-group-lbl mono">8 READ-ONLY MCP RESOURCES</div>
                  {filteredResources.map((r) => (
                    <div key={r.uri} className="ref-card ref-card-compact">
                      <div className="ref-card-top">
                        <code className="mono ref-code-title">{r.uri}</code>
                        <button
                          type="button"
                          className={`ref-copy-mini mono ${copiedId === r.uri ? 'copied' : ''}`}
                          onClick={() => void handleCopy(r.uri, r.uri, r.uri)}
                        >
                          {copiedId === r.uri ? <Check size={11} /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="ref-desc">{r.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'gates' && (
                <div className="ref-list">
                  {filteredGrades.length > 0 && (
                    <>
                      <div className="ref-group-lbl mono">EVIDENCE GRADES (A–E)</div>
                      <div className="ref-grade-strip">
                        {filteredGrades.map((g) => (
                          <div key={g.grade} className="ref-grade-row">
                            <span className={`ref-g-badge mono g-${g.grade}`}>{g.grade}</span>
                            <div>
                              <strong>{g.label}</strong>
                              <p className="ref-desc">{g.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {filteredRules.length > 0 && (
                    <>
                      <div className="ref-group-lbl mono">PHASE 0 EXIT GATE RULES (G1–G12)</div>
                      {filteredRules.map((r) => (
                        <div key={r.id} className="ref-card ref-card-compact">
                          <div className="ref-card-top">
                            <strong className="ref-rule-title">
                              <span className="mono ref-rule-id">{r.id}</span> {r.name}
                            </strong>
                            <span className="ref-pill mono">{r.track}</span>
                          </div>
                          <p className="ref-desc">{r.criteria}</p>
                        </div>
                      ))}
                    </>
                  )}

                  {filteredCodes.length > 0 && (
                    <>
                      <div className="ref-group-lbl mono">KEY DIAGNOSTIC &amp; QUALITY COACH CODES</div>
                      {filteredCodes.map((d) => (
                        <div key={d.code} className="ref-card ref-card-compact">
                          <div className="ref-card-top">
                            <code className="mono ref-code-title">{d.code}</code>
                            <span className={`ref-pill mono fam-${d.family.toLowerCase()}`}>{d.family}</span>
                          </div>
                          <p className="ref-desc">{d.meaning}</p>
                          <div className="ref-meta mono">Fix: {d.fix}</div>
                        </div>
                      ))}
                    </>
                  )}

                  {filteredGrades.length === 0 && filteredRules.length === 0 && filteredCodes.length === 0 && (
                    <div className="ref-empty mono">No matching grades, rules, or diagnostic codes.</div>
                  )}
                </div>
              )}

              {tab === 'principles' && (
                <div className="ref-list">
                  {filteredPrinciples.map((p) => (
                    <div key={p.id} className="ref-card">
                      <div className="ref-card-top">
                        <strong className="ref-rule-title">
                          <span className="mono ref-rule-id">{p.id}</span> {p.name}
                        </strong>
                      </div>
                      <p className="ref-desc">{p.summary}</p>
                      <div className="ref-meta mono">Empirical basis: {p.evidence}</div>
                    </div>
                  ))}
                  {filteredPrinciples.length === 0 && <div className="ref-empty mono">No matching principles.</div>}
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
