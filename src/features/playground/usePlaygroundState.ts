import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUDITOR_PRESETS, auditArtifact } from '@/shared/lib/auditorEngine';
import { sha256Hex } from '@/shared/lib/sha256';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

export type PlaygroundTab = 'auditor' | 'wep' | 'prompt';

export interface CustomWepRow {
  id: string;
  name: string;
  weight: number;
  scores: [number, number, number];
}

export interface UsePlaygroundStateOptions {
  initialTab?: PlaygroundTab;
  initialPresetId?: string | null;
}

export function usePlaygroundState({
  initialTab = 'auditor',
  initialPresetId,
}: UsePlaygroundStateOptions) {
  /* ── Shared / tab state ── */
  const [tab, setTab] = useState<PlaygroundTab>(initialTab);
  const [didSwitchTab, setDidSwitchTab] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const dragDepthRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  /* ── Tab 1: Live ADR / Session Auditor ── */
  const [editorText, setEditorText] = useState<string>(AUDITOR_PRESETS[0].content);
  const [decisionHash, setDecisionHash] = useState<string>('calculating…');

  useEffect(() => {
    if (!initialPresetId) return;
    const found = AUDITOR_PRESETS.find((p) => p.id === initialPresetId);
    if (found) {
      setEditorText(found.content);
      setTab('auditor');
    }
  }, [initialPresetId]);

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
    if (!/##\s+Discovered\s+Concerns/i.test(updated)) {
      updated +=
        '\n\n## Discovered Concerns\nConcrete operational failure modes, burst scaling cliffs, and migration edge cases observed during empirical verification.';
    }
    if (!/##\s+Challenge\s+Findings/i.test(updated) && audit.artifactKind === 'decision') {
      updated +=
        '\n\n## Challenge Findings\nStress-tested in D-001-R1: simulated peak-load failure path and validated deterministic fallback & batching mitigations.';
    }
    setEditorText(updated);
    showToast('Appended missing Track B sections');
  }, [editorText, audit.artifactKind]);

  /* ── Tab 2: WEP ── */
  const [wepTitle, setWepTitle] = useState('');
  const [wepOptions, setWepOptions] = useState<[string, string, string]>(['', '', '']);
  const [wepRows, setWepRows] = useState<CustomWepRow[]>([]);

  /* ── Tab 3: Prompt Builder ── */
  const [promptScope, setPromptScope] = useState<'comparison' | 'decision' | 'project'>('decision');
  const [promptQuestion, setPromptQuestion] = useState('');
  const [promptOptions, setPromptOptions] = useState('');
  const [promptContext, setPromptContext] = useState('');
  const [promptDoor, setPromptDoor] = useState<'one-way' | 'two-way'>('one-way');

  return {
    // Shared
    tab, setTab,
    didSwitchTab, setDidSwitchTab,
    copiedId, setCopiedId,
    dragActive, setDragActive,
    dragDepthRef,
    fileInputRef,

    // Auditor
    editorText, setEditorText,
    decisionHash,
    audit,
    insertMissingSkeleton,

    // WEP
    wepTitle, setWepTitle,
    wepOptions, setWepOptions,
    wepRows, setWepRows,

    // Prompt Builder
    promptScope, setPromptScope,
    promptQuestion, setPromptQuestion,
    promptOptions, setPromptOptions,
    promptContext, setPromptContext,
    promptDoor, setPromptDoor,
  } as const;
}
