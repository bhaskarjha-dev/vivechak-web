import { useEffect, useRef, useState } from 'react';
import { sha256Hex } from '@/shared/lib/sha256';

export interface GateState {
  evidenceGrounded: boolean;
  placeholdersFixed: boolean;
  redTeamRan: boolean;
  redTeamHash: string;
  signedOff: boolean;
  reviewerName: string;
  reviewedHash: string;
  outcomeTampered: boolean;
}

export interface TermLine {
  id: number;
  kind: 'cmd' | 'pass' | 'fail' | 'warn' | 'hash' | 'muted';
  text: string;
}

export const INITIAL_GATE_STATE: GateState = {
  evidenceGrounded: false,
  placeholdersFixed: false,
  redTeamRan: false,
  redTeamHash: '',
  signedOff: false,
  reviewerName: 'Jane Doe',
  reviewedHash: '',
  outcomeTampered: false,
};

export async function computeGateHashes(
  s: Pick<GateState, 'evidenceGrounded' | 'placeholdersFixed' | 'outcomeTampered'>,
) {
  const outcomeBody = s.outcomeTampered
    ? `## Decision Outcome\nAdopt ClickHouse WITHOUT Vector batching buffer.\n## Rejected\n${s.placeholdersFixed ? 'TimescaleDB; DynamoDB' : '[Stub]'}`
    : `## Decision Outcome\nAdopt ClickHouse Cloud + Vector >=10k buffer [A · fetched].\n## Rejected\n${s.placeholdersFixed ? 'TimescaleDB; DynamoDB' : '[Stub]'}`;
  const fullAdr = `id:D-001|ev:${s.evidenceGrounded}|ph:${s.placeholdersFixed}|${outcomeBody}`;
  const [outcomeHash, adrHash] = await Promise.all([sha256Hex(outcomeBody), sha256Hex(fullAdr)]);
  return { outcomeHash, adrHash };
}

export function useGateStateMachine() {
  const [state, setState] = useState<GateState>(INITIAL_GATE_STATE);
  const stateRef = useRef<GateState>(INITIAL_GATE_STATE);
  stateRef.current = state;

  const [outcomeHash, setOutcomeHash] = useState('4b91e0a3c2f8d714a09b3e12f8c67120e4d91a0f');
  const [adrHash, setAdrHash] = useState('9a72c5e81f4d03b6e91c4a20d87f31b5c0a42e11');
  const [activeRuleId, setActiveRuleId] = useState('G10');
  const [ttyOpen, setTtyOpen] = useState(false);
  const [reviewerInput, setReviewerInput] = useState('Jane Doe');
  const [ttyConfirmInput, setTtyConfirmInput] = useState('');
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const [termLines, setTermLines] = useState<TermLine[]>([]);

  useEffect(() => {
    void computeGateHashes(state).then(({ outcomeHash: oh, adrHash: ah }) => {
      setOutcomeHash(oh);
      setAdrHash(ah);
    });
  }, [state]);

  const reset = () => {
    setState(INITIAL_GATE_STATE);
    setTtyOpen(false);
    setReviewerInput('Jane Doe');
    setTtyConfirmInput('');
    setTermLines([]);
    setActiveRuleId('G10');
  };

  return {
    state, setState, stateRef,
    outcomeHash, adrHash,
    activeRuleId, setActiveRuleId,
    ttyOpen, setTtyOpen,
    reviewerInput, setReviewerInput,
    ttyConfirmInput, setTtyConfirmInput,
    autoPlaying, setAutoPlaying,
    hoveredStep, setHoveredStep,
    termLines, setTermLines,
    reset,
  } as const;
}
