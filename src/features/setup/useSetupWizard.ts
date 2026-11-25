import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HOST_PRESETS,
  buildCustomPrompt,
} from '@/shared/data/vivechakData';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';
import type { PromptBridgePayload } from '@/features/calibration/CalibrationLab';

type OutputMode = 'cli' | 'manual' | 'agents' | 'ci';
type PromptScope = 'comparison' | 'decision' | 'project';

export interface UseSetupWizardOptions {
  bridgedPrompt?: PromptBridgePayload | null;
  bridgedHost?: { hostId: string; nonce: number } | null;
}

function extractOptionsFromQuestion(question: string): string | null {
  const clean = question.replace(/[?!.]+$/, '').trim();
  // Pattern 1: "migrate ... from <A> to <B>"
  const migrateMatch = clean.match(/\bfrom\s+([A-Za-z0-9.+/_-]+(?:\s+[A-Za-z0-9.+/_-]+){0,2})\s+(?:to|→|->)\s+([A-Za-z0-9.+/_-]+(?:\s+[A-Za-z0-9.+/_-]+){0,2})/i);
  if (migrateMatch) {
    return `${migrateMatch[1].trim()}, ${migrateMatch[2].trim()}`;
  }
  // Pattern 2: "Compare A vs B vs C [for ...]" or "A vs B"
  const stripped = clean
    .replace(/^(?:please\s+)?(?:compare|comparison\s+(?:of|between)|choose\s+between|evaluate|should\s+(?:we|i)\s+(?:use|adopt|pick|choose))\s+/i, '')
    .replace(/\s+(?:for|in|on|with)\s+(?:our|my|a|an|the)\b.*$/i, '')
    .trim();
  if (/\s+(?:vs\.?|versus|or)\s+/i.test(stripped)) {
    const parts = stripped
      .split(/\s+(?:vs\.?|versus|or)\s+|,\s*/i)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 36);
    if (parts.length >= 2) {
      return parts.slice(0, 5).join(', ');
    }
  }
  return null;
}

export function useSetupWizard({ bridgedPrompt, bridgedHost }: UseSetupWizardOptions) {
  const [hostId, setHostId] = useState(HOST_PRESETS[0].id);
  const [outputMode, setOutputMode] = useState<OutputMode>('cli');
  const [cliDryRun, setCliDryRun] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [ladderOpen, setLadderOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ── Prompt Builder state ── */
  const [builderScope, setBuilderScope] = useState<PromptScope>('decision');
  const [builderQuestion, setBuilderQuestion] = useState(
    'Should we adopt PostgreSQL + pgvector or Qdrant for 10M-vector hybrid RAG search?',
  );
  const [builderOptions, setBuilderOptions] = useState(
    'Qdrant, PostgreSQL + pgvector, Pinecone Serverless',
  );
  const [builderContext, setBuilderContext] = useState(
    '5-person backend team; strict tenant ACL joins; <40ms p99 under $900/mo',
  );
  const [builderDoor, setBuilderDoor] = useState<'one-way' | 'two-way'>('one-way');

  /* ── Restore saved host preset ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vck_host_preset');
      if (saved && HOST_PRESETS.some((h) => h.id === saved)) {
        setHostId(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  /* ── Bridge from hero host selection ── */
  useEffect(() => {
    if (!bridgedHost) return;
    if (HOST_PRESETS.some((h) => h.id === bridgedHost.hostId)) {
      setHostId(bridgedHost.hostId);
      setOutputMode('cli');
      try {
        localStorage.setItem('vck_host_preset', bridgedHost.hostId);
      } catch {
        // ignore
      }
    }
  }, [bridgedHost]);

  /* ── Bridge from calibration lab ── */
  useEffect(() => {
    if (!bridgedPrompt) return;
    setBuilderScope(bridgedPrompt.scope);
    setBuilderQuestion(bridgedPrompt.question);
    setBuilderDoor(bridgedPrompt.doorType);
    const extracted = extractOptionsFromQuestion(bridgedPrompt.question);
    if (extracted) {
      setBuilderOptions(extracted);
    } else if (bridgedPrompt.scope === 'project') {
      setBuilderOptions('');
    }
    setOutputMode('manual');
    document.getElementById('setup')?.scrollIntoView({ behavior: 'smooth' });
    showToast(`Prompt Builder pre-filled (${bridgedPrompt.scope.toUpperCase()})`);
  }, [bridgedPrompt]);

  const selectHost = useCallback((id: string) => {
    soundEngine.playTick(740);
    setHostId(id);
    try {
      localStorage.setItem('vck_host_preset', id);
    } catch {
      // ignore
    }
  }, []);

  const activeHost = HOST_PRESETS.find((h) => h.id === hostId) ?? HOST_PRESETS[0];

  const customPromptText = useMemo(
    () =>
      buildCustomPrompt({
        scope: builderScope,
        question: builderQuestion,
        options: builderOptions,
        context: builderContext,
        doorType: builderDoor,
      }),
    [builderScope, builderQuestion, builderOptions, builderContext, builderDoor],
  );

  return {
    hostId, selectHost,
    outputMode, setOutputMode,
    cliDryRun, setCliDryRun,
    copiedKey, setCopiedKey,
    ladderOpen, setLadderOpen,
    openFaq, setOpenFaq,

    // Prompt builder
    builderScope, setBuilderScope,
    builderQuestion, setBuilderQuestion,
    builderOptions, setBuilderOptions,
    builderContext, setBuilderContext,
    builderDoor, setBuilderDoor,

    activeHost,
    customPromptText,
  } as const;
}
