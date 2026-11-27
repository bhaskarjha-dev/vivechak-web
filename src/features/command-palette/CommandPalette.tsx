import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DOC_PAGES, DOC_SEARCH_INDEX } from '@/features/docs/docsData';
import { HOST_PRESETS, INSTALL_CHANNELS, MCP_TOOLS } from '@/shared/data/vivechakData';
import { copyText } from '@/shared/lib/clipboard';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import type { ThemeMode } from '@/shared/lib/theme';
import { showToast } from '@/shared/lib/toast';
import type { ReferenceTab } from '@/features/docs/ReferenceDrawer';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenReference: (tab?: ReferenceTab) => void;
}

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  hint: string;
  searchBody?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  theme,
  onToggleTheme,
  soundOn,
  onToggleSound,
  onOpenReference,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const items = useMemo<PaletteItem[]>(() => {
    const goTo = (to: string) => () => {
      onClose();
      navigate(to);
    };
    const copy = (text: string, label: string) => () => {
      void copyText(text);
      soundEngine.playSieveDrop();
      showToast(`Copied ${label}`);
      onClose();
    };

    return [
      { id: 'pg-home', group: 'Page', label: 'Overview — Hero, Before/After & Live Gate', hint: '/', action: goTo('/') },
      { id: 'pg-arch', group: 'Page', label: 'Architecture — Session DAG, Git Files, MCP & Security', hint: '/architecture', action: goTo('/architecture') },
      { id: 'pg-setup', group: 'Page', label: 'Setup — 13 Installers, 10 MCP Hosts, CI & FAQ', hint: '/setup', action: goTo('/setup') },
      { id: 'pg-play', group: 'Playground', label: 'Live ADR & Phase 0 Gate Auditor (In-Browser)', hint: '/playground', action: goTo('/playground') },
      { id: 'pg-scope', group: 'Playground', label: 'Scope Classifier & R/N/B/X Risk Profiler', hint: '/playground#scope', action: goTo('/playground#scope') },
      { id: 'pg-wep', group: 'Playground', label: 'WEP ±20% Sensitivity Matrix Builder', hint: '/playground#wep', action: goTo('/playground#wep') },
      { id: 'pg-prompt', group: 'Playground', label: 'Zero-Install Prompt Studio', hint: '/playground#prompt', action: goTo('/playground#prompt') },
      ...DOC_PAGES.map((p) => ({
        id: `doc-${p.slug}`,
        group: 'Docs',
        label: p.title.startsWith(p.shortTitle) ? p.title : `${p.shortTitle} — ${p.title}`,
        hint: `/docs/${p.slug}`,
        action: goTo(`/docs/${p.slug}`),
      })),
      {
        id: 'act-theme',
        group: 'Theme',
        label: theme === 'light' ? 'Switch to Obsidian (Dark Theme)' : 'Switch to Archival Paper (Light Theme)',
        hint: 'Press T',
        action: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        id: 'act-docs-cli',
        group: 'Quick Ref',
        label: 'Open Slide-Over Field Manual — CLI Commands',
        hint: 'Press ?',
        action: () => {
          onClose();
          onOpenReference('cli');
        },
      },
      {
        id: 'act-docs-gates',
        group: 'Quick Ref',
        label: 'Open Slide-Over Field Manual — G1–G12 & Codes',
        hint: 'E-* / Q-*',
        action: () => {
          onClose();
          onOpenReference('gates');
        },
      },
      {
        id: 'act-sound',
        group: 'Audio',
        label: soundOn ? 'Mute Web Audio Feedback' : 'Enable Web Audio Feedback',
        hint: 'Synth',
        action: () => {
          onToggleSound();
          onClose();
        },
      },
      { id: 'n-shift', group: 'Home', label: 'Before vs. After (4 Real Scenarios)', hint: '/#shift', action: goTo('/#shift') },
      { id: 'n-gate', group: 'Home', label: 'Live Phase 0 Exit Gate & TTY Sign-Off', hint: '/#gate', action: goTo('/#gate') },
      { id: 'c-curl', group: 'Install', label: 'Copy macOS / Linux curl installer', hint: 'install.sh', action: copy(INSTALL_CHANNELS.find((c) => c.id === 'shell')?.command ?? INSTALL_CHANNELS[0].command, 'curl installer') },
      { id: 'c-brew', group: 'Install', label: 'Copy Homebrew cask command', hint: 'brew', action: copy(INSTALL_CHANNELS.find((c) => c.id === 'brew')?.command ?? INSTALL_CHANNELS[1].command, 'brew command') },
      { id: 'c-npx', group: 'Install', label: 'Copy zero-install npx vivechak serve', hint: 'npx', action: copy(INSTALL_CHANNELS.find((c) => c.id === 'npx')?.command ?? 'npx -y vivechak serve', 'npx serve') },
      ...MCP_TOOLS.map((t) => ({
        id: `t-${t.name}`,
        group: 'MCP Tool',
        label: t.name,
        hint: t.readOnly ? 'RO' : 'RW',
        action: goTo('/docs/mcp-reference'),
      })),
      ...HOST_PRESETS.map((h) => ({
        id: `h-${h.id}`,
        group: 'Host',
        label: `Configure ${h.name} (vck setup ${h.shortcut})`,
        hint: `/setup?host=${h.id}`,
        action: goTo(`/setup?host=${h.id}`),
      })),
      ...DOC_SEARCH_INDEX.map((entry) => ({
        id: entry.id,
        group: 'Section',
        label: `${entry.pageTitle} › ${entry.heading}`,
        hint: `/docs/${entry.slug}#${entry.sectionId}`,
        searchBody: entry.searchText,
        action: goTo(`/docs/${entry.slug}#${entry.sectionId}`),
      })),
    ];
  }, [onClose, onOpenReference, onToggleSound, onToggleTheme, soundOn, theme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.group !== 'Section').slice(0, 12);
    const terms = q.split(/\s+/).filter(Boolean);
    const matches = items.filter((i) => {
      const hay = `${i.label} ${i.group} ${i.hint} ${i.searchBody ?? ''}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    // Prioritize direct label/title matches before deep full-text section hits
    return matches
      .sort((a, b) => {
        const aDirect = a.label.toLowerCase().includes(q) ? 0 : 1;
        const bDirect = b.label.toLowerCase().includes(q) ? 0 : 1;
        if (aDirect !== bDirect) return aDirect - bDirect;
        const aSec = a.group === 'Section' ? 1 : 0;
        const bSec = b.group === 'Section' ? 1 : 0;
        return aSec - bSec;
      })
      .slice(0, 18);
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        soundEngine.playTick(680);
        setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        soundEngine.playTick(760);
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        filtered[activeIndex].action();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="palette-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Vivechak Global Search and Command Index"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="palette-modal"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="palette-input-row">
              <span className="mono palette-prompt">vck &gt;</span>
              <input
                ref={inputRef}
                id="command-palette-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search docs, Playground, MCP tools, hosts, or press T for theme..."
                className="palette-input"
              />
              <kbd className="palette-esc mono">ESC</kbd>
            </div>

            <div className="palette-results" role="listbox">
              {filtered.length === 0 ? (
                <div className="palette-empty mono">No matching page, doc, or command.</div>
              ) : (
                filtered.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={idx === activeIndex}
                    className={`palette-item ${idx === activeIndex ? 'active' : ''}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.action}
                  >
                    <span className="mono palette-group">{item.group}</span>
                    <span className="palette-label">{item.label}</span>
                    <span className="mono palette-hint">{item.hint}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
