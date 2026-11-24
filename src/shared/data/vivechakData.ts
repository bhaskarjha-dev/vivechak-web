/**
 * Single-source structured product data for the Vivechak presentation website.
 * Every command, tool schema, gate rule (G1-G12), host preset (10 verified),
 * evidence grade (A-E), and artifact example mirrors Vivechak v0.1.0 source code.
 */

export interface InstallChannel {
  id: string;
  label: string;
  platform: string;
  command: string;
  note: string;
}

export const INSTALL_CHANNELS: InstallChannel[] = [
  {
    id: 'shell',
    label: 'macOS / Linux',
    platform: 'curl · Universal installer',
    command: 'curl -fsSL https://vivechak.bhaskarjha.dev/install.sh | bash',
    note: 'Installs both vck and vivechak (~9 MB static Go binary, zero runtime deps).',
  },
  {
    id: 'brew',
    label: 'Homebrew',
    platform: 'macOS & Linuxbrew',
    command: 'brew install --cask bhaskarjha-dev/tap/vivechak',
    note: 'Signed cask installing vck + vivechak binaries directly to PATH with quarantine clearance.',
  },
  {
    id: 'winget',
    label: 'WinGet',
    platform: 'Windows Package Manager',
    command: 'winget install bhaskarjha-dev.Vivechak',
    note: 'Official Windows Package Manager manifest installing native x64/arm64 binaries.',
  },
  {
    id: 'scoop',
    label: 'Scoop',
    platform: 'Windows Scoop Bucket',
    command: 'scoop bucket add vivechak https://github.com/bhaskarjha-dev/scoop-bucket && scoop install vivechak',
    note: 'Automated Scoop package with self-updating shim and dual vck alias.',
  },
  {
    id: 'powershell',
    label: 'PowerShell',
    platform: 'Windows 1-Line Installer',
    command: 'irm https://vivechak.bhaskarjha.dev/install.ps1 | iex',
    note: 'Native PowerShell web installer with automatic path registration and SHA-256 verification.',
  },
  {
    id: 'npx',
    label: 'npx',
    platform: 'Zero-install · Node.js',
    command: 'npx -y vivechak serve',
    note: 'Instant runner downloading the verified release binary on demand (or: npx -y vck serve).',
  },
  {
    id: 'uvx',
    label: 'uvx',
    platform: 'Zero-install · Python / uv',
    command: 'uvx vck serve',
    note: 'Blazing fast Python uvx runner isolating stdout strictly for MCP JSON-RPC.',
  },
  {
    id: 'pip',
    label: 'pip',
    platform: 'Python Package Index (PyPI)',
    command: 'pip install vivechak',
    note: 'Installs binary launcher for Python environments (or: pip install vck).',
  },
  {
    id: 'linux-pkg',
    label: 'Deb / RPM',
    platform: 'Debian, Ubuntu, Fedora, RHEL',
    command: 'sudo dpkg -i vivechak_0.1.0_linux_amd64.deb   # Or: sudo rpm -i vivechak_0.1.0_linux_amd64.rpm',
    note: 'Native distro packages generated via nfpms (.deb, .rpm, .apk, Arch PKGBUILD).',
  },
  {
    id: 'docker',
    label: 'Docker',
    platform: 'GHCR · Multi-arch',
    command:
      'docker run -i --rm --user "$(id -u):$(id -g)" -e VIVECHAK_PROJECT_ROOT=/workspace -v "${PWD}:/workspace" ghcr.io/bhaskarjha-dev/vivechak:latest serve',
    note: 'Non-root multi-arch container strictly confined to /workspace.',
  },
  {
    id: 'skill',
    label: 'Agent Skill',
    platform: 'agentskills.io',
    command: 'npx skills add bhaskarjha-dev/vivechak',
    note: 'Installs the canonical SKILL.md playbook for Claude Code, Cursor, Antigravity, OpenCode.',
  },
  {
    id: 'nix',
    label: 'Nix Flake',
    platform: 'Nix / NixOS',
    command: 'nix run github:bhaskarjha-dev/vivechak',
    note: 'Reproducible declarative runner via official flake.nix.',
  },
  {
    id: 'go',
    label: 'Go',
    platform: 'Go 1.26+ Toolchain',
    command: 'go install github.com/bhaskarjha-dev/vivechak/cmd/vivechak@latest',
    note: 'Compiles native static binary directly from Go module.',
  },
];

export interface EvidenceGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  label: string;
  description: string;
  provenance: string[];
  gateImpact: string;
  barWidth: number;
  example: string;
}

export const EVIDENCE_GRADES: EvidenceGrade[] = [
  {
    grade: 'A',
    label: 'Primary Empirical',
    description:
      'Official specifications, canonical source code, RFCs, or primary documentation with explicit URL anchor.',
    provenance: ['fetched', 'human-provided'],
    gateImpact: 'Satisfies G6 & G7',
    barWidth: 100,
    example: '[E-A: fetched · clickhouse.com/docs/engines/table-engines/mergetree-family]',
  },
  {
    grade: 'B',
    label: 'Secondary Empirical',
    description:
      'Peer-reviewed papers, reproducible third-party benchmarks, published postmortems, or corroborated engineering reports.',
    provenance: ['fetched', 'cached'],
    gateImpact: 'Satisfies G6 & G7',
    barWidth: 82,
    example: '[E-B: fetched · benchmark.clickhouse.com (c6a.4xlarge reproducible run)]',
  },
  {
    grade: 'C',
    label: 'Vendor & Practitioner',
    description:
      'Vendor marketing, product whitepapers, vendor benchmarks, conference talks, or interested-party documentation.',
    provenance: ['fetched', 'cached'],
    gateImpact: 'Advisory only',
    barWidth: 56,
    example: '[E-C: fetched · vendor cloud whitepaper — requires independent corroboration]',
  },
  {
    grade: 'D',
    label: 'Informal & Opinion',
    description:
      'Blog posts, forum discussions, StackOverflow answers, or model memory recall (hard-capped at Grade D).',
    provenance: ['fetched', 'cached', 'recalled'],
    gateImpact: 'Blocked on One-Way Doors',
    barWidth: 32,
    example: '[E-D: recalled · unverified LLM memory — auto-capped & blocked by G6]',
  },
  {
    grade: 'E',
    label: 'Speculative & Unsubstantiated',
    description: 'Unverified hypotheses, uncorroborated parametric recall, or ungrounded assertions.',
    provenance: ['recalled', 'unverified'],
    gateImpact: 'Blocked on One-Way Doors',
    barWidth: 14,
    example: '[E-E: unverified · "ClickHouse probably scales fine" — fails G6/G7]',
  },
];

export interface CorePrinciple {
  id: string;
  name: string;
  summary: string;
  evidence: string;
}

export const CORE_PRINCIPLES: CorePrinciple[] = [
  {
    id: 'P1',
    name: 'Context Architecture Law',
    summary:
      'Decompose by attention budget and coupling, never arbitrary counts. Mandate map-reduce synthesis after every decomposition.',
    evidence: 'OpenAI BrowseComp scaling; Chandler & Sweller split-attention; Chroma context rot',
  },
  {
    id: 'P2',
    name: 'Reversibility-Calibrated Rigor',
    summary:
      'Two-Way Doors move fast on ~70% confidence. One-Way Doors demand deep falsification, red-teaming, and human sign-off.',
    evidence: 'Bezos Type 1/2 doors; Cynefin complexity routing; DORA defect concentration',
  },
  {
    id: 'P3',
    name: 'Evidentiary Grounding',
    summary:
      'Every claim carries Grade A–E, modifiers, and verification provenance. Unverified model recall caps at Grade D.',
    evidence: 'GRADE evidence framework; Admiralty Code collapse; citation confabulation studies',
  },
  {
    id: 'P4',
    name: 'Prescriptive Scope, Dynamic Method',
    summary:
      'Prescribe WHAT/WHY/BOUNDARIES; keep HOW directional. No personas, no hardcoded search queries, no drip-fed turns.',
    evidence: 'Laban et al. ICLR 2026 (39% multi-turn drop); Zheng et al. EMNLP 2024; ReAct',
  },
  {
    id: 'P5',
    name: 'Commodity-Maximized Composition',
    summary:
      'Compose 100% commodity infrastructure (auth, DB, queues). Build custom strictly for differentiating domain logic.',
    evidence: 'Wardley evolution mapping; Fowler MonolithFirst; DORA loose coupling',
  },
  {
    id: 'P6',
    name: 'Dual-Audience Artifacts',
    summary:
      'Hybrid Markdown + YAML frontmatter in Git IS the database. Strict separation between Recommendation and Rejected Alternatives.',
    evidence: 'MADR 4.0; GraphRAG header chunking; Git diff mechanics',
  },
  {
    id: 'P7',
    name: 'Staged Triangulation',
    summary:
      'Single-model default → critique probe → full multi-model triangulation only for contested One-Way Doors.',
    evidence: 'Kim et al. ICML 2025 (60% correlated errors); Gao & Xiao model house styles',
  },
  {
    id: 'P8',
    name: 'Structured Falsification',
    summary:
      'Hunt disconfirming evidence, document rejected alternatives, lock quantitative review triggers, and run 12-month premortems.',
    evidence: 'Mitchell, Russo & Pennington (30% risk ID gain); Gary Klein Premortem; Heuer ACH',
  },
];

export interface McpToolSpec {
  name: string;
  category: 'orchestrate' | 'persist' | 'audit';
  readOnly: boolean;
  destructive: boolean;
  requiredParams: string[];
  optionalParams: string[];
  description: string;
  sampleCall: string;
  sampleEnvelope: string;
}

export const MCP_TOOLS: McpToolSpec[] = [
  {
    name: 'vivechak_start',
    category: 'orchestrate',
    readOnly: false,
    destructive: true,
    requiredParams: ['scope', 'question'],
    optionalParams: ['options', 'criteria', 'part', 'project_root'],
    description:
      'Initialize research/ on demand, allocate canonical C-NNN / D-NNN IDs, and return a front-loaded brief calibrated to scope.',
    sampleCall: `{
  "scope": "decision",
  "question": "Migrate 25M events/day analytics from PostgreSQL to ClickHouse?"
}`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Decision workspace initialized. Allocated ID D-001.",
  "data": {
    "id": "D-001",
    "scope": "decision",
    "workspace": { "root": "/repo/acme-analytics", "rule": "roots" },
    "brief": "# GENERATE: Decision Research Plan..."
  },
  "next": {
    "tool": "vivechak_save",
    "args": { "kind": "plan", "scope": "decision", "id": "D-001" },
    "why": "Generate the 1–3 session decision plan and save it."
  }
}`,
  },
  {
    name: 'vivechak_save',
    category: 'persist',
    readOnly: false,
    destructive: true,
    requiredParams: ['kind', 'content'],
    optionalParams: ['id', 'scope', 'slug', 'revise', 'decisions_content', 'project_root'],
    description:
      'Polymorphically validate (L1–L3 + Q-* coaching) and atomically persist comparison, plan, session, or fad inside os.Root-confined research/.',
    sampleCall: `{
  "kind": "session",
  "id": "D-001-S1",
  "content": "---\\nid: D-001-S1\\ntitle: ClickHouse vs Postgres Benchmark\\n---\\n..."
}`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Session D-001-S1 saved to research/sessions/D-001-S1.md.",
  "data": {
    "id": "D-001-S1",
    "status": "valid",
    "file_path": "research/sessions/D-001-S1.md",
    "progress": { "sessions_completed": 1, "sessions_total": 2 }
  },
  "warnings": [
    { "code": "Q-BIAS", "message": "Delta confirms 100% of priors — verify falsification.", "fix": "Document disconfirming findings." }
  ],
  "next": {
    "tool": "vivechak_next",
    "args": {},
    "why": "Session D-001-S1 complete. Retrieve next ready session D-001-S2."
  }
}`,
  },
  {
    name: 'vivechak_record_decision',
    category: 'persist',
    readOnly: false,
    destructive: true,
    requiredParams: ['id'],
    optionalParams: ['content', 'auto_draft_from', 'auto_save', 'status', 'slug', 'supersedes', 'revise', 'artifact_type', 'project_root'],
    description:
      'Create/update canonical D-NNN-decision.md ADRs (supports auto_draft_from + supersedes stale-ref scanning) and compile DECISIONS.md.',
    sampleCall: `{
  "id": "D-001",
  "auto_draft_from": "D-001-S1",
  "status": "accepted",
  "revise": true
}`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Saved decision D-001 as valid",
  "data": {
    "id": "D-001",
    "file_path": "research/D-001-decision.md",
    "decisions_file": "research/DECISIONS.md",
    "has_placeholders": false
  },
  "next": {
    "tool": "vivechak_review",
    "args": { "mode": "red_team", "id": "D-001" },
    "why": "Run adversarial red-team review for One-Way Door D-001 before Phase 0 Gate."
  }
}`,
  },
  {
    name: 'vivechak_next',
    category: 'orchestrate',
    readOnly: true,
    destructive: false,
    requiredParams: [],
    optionalParams: ['session_id', 'verbose', 'project_root'],
    description:
      'Topologically resolve the next unblocked DAG session, hold back kind: synthesis until 100% done, and wrap upstream findings as untrusted data.',
    sampleCall: `{ "project_root": "/repo/acme-analytics" }`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Ready session D-001-S2: Operational Failure Modes & Reversibility",
  "data": {
    "session_id": "D-001-S2",
    "door_type": "one-way",
    "dependencies": ["D-001-S1"],
    "prompt": "<upstream-findings source=\\"D-001-S1\\" trust=\\"untrusted-data\\">..."
  },
  "next": {
    "tool": "vivechak_save",
    "args": { "kind": "session", "id": "D-001-S2" },
    "why": "Execute session D-001-S2 with web search and grade claims A–E."
  }
}`,
  },
  {
    name: 'vivechak_status',
    category: 'orchestrate',
    readOnly: true,
    destructive: false,
    requiredParams: [],
    optionalParams: ['format', 'project_root'],
    description:
      'Read-only workspace health, scope, session/decision progress, and rendered Mermaid or Markdown status tables.',
    sampleCall: `{ "format": "mermaid" }`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Pipeline DAG rendered (5 sessions, 3 completed).",
  "data": {
    "format": "mermaid",
    "total_sessions": 5,
    "completed": 3,
    "mermaid": "flowchart TD\\n  T0-01[✓ Landscape] --> T1-01[✓ Datastore]\\n  ..."
  },
  "next": {
    "tool": "vivechak_next",
    "args": {},
    "why": "Proceed with next ready session."
  }
}`,
  },
  {
    name: 'vivechak_review',
    category: 'audit',
    readOnly: false,
    destructive: false,
    requiredParams: ['mode'],
    optionalParams: ['id', 'content', 'artifact_type', 'project_root'],
    description:
      'Run dry-run validation (validate), citation audit (evidence), cross-session consistency, or adversarial red_team writing D-NNN-R1.md with SHA-256 hash.',
    sampleCall: `{
  "mode": "red_team",
  "id": "D-001"
}`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Generated 3 red-team challenge prompts for D-001.",
  "data": {
    "record_id": "D-001-R1",
    "decision_hash": "9f84b2c71e0a34d8...c41b",
    "prompts": ["Attack small-batch MergeTree part explosion...", "Model 12-month Klein Premortem..."]
  },
  "next": {
    "tool": "vivechak_amend",
    "args": { "id": "D-001" },
    "why": "Execute adversarial stress test and cite D-001-R1 in ## Challenge Findings."
  }
}`,
  },
  {
    name: 'vivechak_amend',
    category: 'persist',
    readOnly: false,
    destructive: true,
    requiredParams: ['id', 'note'],
    optionalParams: ['reason', 'amending_session_id', 'project_root'],
    description:
      'Append dated post-hoc amendments to completed artifacts (preserving history), recompile DECISIONS.md, and flag stale downstream sessions.',
    sampleCall: `{
  "id": "D-001",
  "reason": "Red-team finding D-001-R1",
  "note": "Mitigate MergeTree part explosion via async_insert=1 + Vector 10k-row batching."
}`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Amendment appended to D-001 (research/D-001-decision.md).",
  "data": {
    "target_id": "D-001",
    "registry_recompiled": "research/DECISIONS.md",
    "potentially_stale_sessions": ["SYN-01"]
  },
  "warnings": [
    { "code": "W-STALE-DOWNSTREAM", "message": "1 downstream session completed before amendment: SYN-01." }
  ],
  "next": { "tool": "vivechak_gate", "args": {}, "why": "Re-verify Phase 0 Gate." }
}`,
  },
  {
    name: 'vivechak_replan',
    category: 'orchestrate',
    readOnly: false,
    destructive: true,
    requiredParams: ['plan', 'op'],
    optionalParams: ['session_id', 'reason', 'layer', 'topic', 'prompt', 'dependencies', 'door_type', 'decision_ref', 'project_root'],
    description:
      'Mutate an active yaml vivechak-plan DAG in place (add_session, remove_session, update_deps, update_prompt) under eager flock locking.',
    sampleCall: `{
  "plan": "PROJECT",
  "op": "add_session",
  "session_id": "T1-04",
  "topic": "HIPAA BAA & Audit Log Immutability",
  "door_type": "one-way",
  "dependencies": "T0-01"
}`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Plan updated: add_session T1-04 (total sessions: 6).",
  "data": {
    "op": "add_session",
    "session_id": "T1-04",
    "pipeline_file": "research/RESEARCH-PIPELINE.md"
  },
  "next": { "tool": "vivechak_next", "args": {}, "why": "Retrieve next ready session." }
}`,
  },
  {
    name: 'vivechak_gate',
    category: 'audit',
    readOnly: false,
    destructive: true,
    requiredParams: [],
    optionalParams: ['decision', 'track', 'verbose', 'project_root'],
    description:
      'Mechanically evaluate Phase 0 Exit Gate rules G1–G12 across Track A (Two-Way) and Track B (One-Way) and persist PHASE-0-GATE.md.',
    sampleCall: `{ "decision": "D-001", "track": "all" }`,
    sampleEnvelope: `{
  "ok": true,
  "message": "Phase 0 Gate: PASS. You may start implementation.",
  "data": {
    "verdict": "PASS",
    "target": "D-001",
    "gate_artifact": "research/PHASE-0-GATE.md",
    "scope_note": "Evidence grades and verification labels are as reported by the agent; Vivechak did not fetch or verify sources."
  }
}`,
  },
];

export const MCP_PROMPTS = [
  {
    name: '/compare',
    title: 'Compare Options (WEP Matrix)',
    args: 'options (required), criteria, context',
    flow: 'Calls vivechak_start(scope="comparison") → web search → vivechak_save(kind="comparison").',
  },
  {
    name: '/decision',
    title: 'Architectural Decision (ADR)',
    args: 'question (required), context',
    flow: 'Allocates D-NNN → 1–3 session plan → vivechak_record_decision → red_team → vck signoff.',
  },
  {
    name: '/project',
    title: 'Project Pipeline (Full FAD)',
    args: 'vision (required), constraints',
    flow: 'Generates yaml vivechak-plan DAG → loops vivechak_next/save → FAD.md → vivechak_gate.',
  },
  {
    name: '/gate',
    title: 'Phase 0 Pre-Codebase Exit Gate',
    args: 'decision (optional D-ID)',
    flow: 'Evaluates G1–G12 across Track A & Track B; guides exact remediation or vck signoff.',
  },
];

export const MCP_RESOURCES = [
  { uri: 'vivechak://templates/decisions', desc: 'Canonical YAML frontmatter ADR contract' },
  { uri: 'vivechak://templates/comparison', desc: 'Weighted Evaluation Protocol (WEP) matrix contract' },
  { uri: 'vivechak://templates/fad', desc: 'Map-Reduce Founding Architecture Document contract' },
  { uri: 'vivechak://templates/conflict-resolution', desc: 'Heuer ACH-style contradiction resolution matrix' },
  { uri: 'vivechak://templates/gate', desc: 'Two-track Phase 0 pre-codebase exit checklist' },
  { uri: 'vivechak://templates/session', desc: '9-section research session contract (Prior → Delta)' },
  { uri: 'vivechak://methodology/grades', desc: 'Single-source Grade A–E taxonomy & recall cap rules' },
  { uri: 'vivechak://methodology/principles', desc: 'Core Principles P1–P8 quick reference card' },
];

export interface HostPreset {
  id: string;
  name: string;
  shortcut: string;
  configPath: string;
  serverKey: string;
  format: 'json' | 'yaml';
  note?: string;
  snippet: string;
}

export const HOST_PRESETS: HostPreset[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    shortcut: 'cursor',
    configPath: '.cursor/mcp.json or ~/.cursor/mcp.json',
    serverKey: 'mcpServers',
    format: 'json',
    snippet: `{
  "mcpServers": {
    "vivechak": {
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'claude-code',
    name: 'Claude Code CLI',
    shortcut: 'claude-code',
    configPath: '.mcp.json or ~/.claude.json',
    serverKey: 'mcpServers',
    format: 'json',
    snippet: `{
  "mcpServers": {
    "vivechak": {
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'vscode',
    name: 'VS Code',
    shortcut: 'vscode',
    configPath: '.vscode/mcp.json',
    serverKey: 'servers',
    format: 'json',
    snippet: `{
  "servers": {
    "vivechak": {
      "type": "stdio",
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    shortcut: 'claude',
    configPath: 'claude_desktop_config.json (OS-specific)',
    serverKey: 'mcpServers',
    format: 'json',
    snippet: `{
  "mcpServers": {
    "vivechak": {
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    shortcut: 'agy',
    configPath: '~/.gemini/config/mcp_config.json or .agents/mcp_config.json',
    serverKey: 'mcpServers',
    format: 'json',
    snippet: `{
  "mcpServers": {
    "vivechak": {
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'zed',
    name: 'Zed',
    shortcut: 'zed',
    configPath: '~/.config/zed/settings.json',
    serverKey: 'context_servers',
    format: 'json',
    snippet: `{
  "context_servers": {
    "vivechak": {
      "command": {
        "path": "/usr/local/bin/vck",
        "args": ["serve"]
      }
    }
  }
}`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    shortcut: 'windsurf',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    serverKey: 'mcpServers',
    format: 'json',
    snippet: `{
  "mcpServers": {
    "vivechak": {
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    shortcut: 'opencode',
    configPath: 'opencode.json or ~/.config/opencode/opencode.json',
    serverKey: 'mcp',
    format: 'json',
    snippet: `{
  "mcp": {
    "vivechak": {
      "type": "local",
      "command": ["/usr/local/bin/vck", "serve"],
      "enabled": true
    }
  }
}`,
  },
  {
    id: 'roo',
    name: 'Roo Code',
    shortcut: 'roo',
    configPath: '.roo/mcp.json',
    serverKey: 'mcpServers',
    format: 'json',
    snippet: `{
  "mcpServers": {
    "vivechak": {
      "command": "/usr/local/bin/vck",
      "args": ["serve"]
    }
  }
}`,
  },
  {
    id: 'goose',
    name: 'Block Goose',
    shortcut: 'goose',
    configPath: '~/.config/goose/config.yaml',
    serverKey: 'extensions',
    format: 'yaml',
    snippet: `extensions:
  vivechak:
    name: vivechak
    type: stdio
    cmd: /usr/local/bin/vck
    args:
      - serve
    enabled: true`,
  },
];

export const AGENTS_MD_SNIPPET = `## Architecture Decisions (Vivechak)
When making a hard-to-reverse technical choice (new datastore, protocol, core dependency, public API, or security boundary), use the Vivechak MCP tools to record research in \`research/\`:
1. Call \`vivechak_start(scope="decision", question="<choice>")\` (pass \`project_root\` if needed).
2. For 2–5 bounded options, save a graded WEP matrix with \`vivechak_save(kind="comparison", content="<matrix>")\`.
3. Record architectural decisions with \`vivechak_record_decision(id="D-001", content="<adr>")\` and challenge One-Way Doors via \`vivechak_review(mode="red_team", id="D-001")\`.
4. Run \`vivechak_gate()\` (or \`vck gate\` in CI) after a human runs \`vck signoff D-001 --reviewer "<name>"\`.
Skip Vivechak for routine bug fixes, refactors, and reversible local implementation choices.`;

export interface WepCriterion {
  id: string;
  name: string;
  weight: number;
  rationale: string;
  scores: Record<string, { score: number; grade: 'A' | 'B' | 'C'; note: string; source: string }>;
}

export interface WepPreset {
  id: string;
  title: string;
  subtitle: string;
  options: { id: string; name: string; tagline: string }[];
  criteria: WepCriterion[];
  failureModes: Record<string, string>;
}

export const WEP_PRESETS: WepPreset[] = [
  {
    id: 'rag-vector',
    title: 'Qdrant vs PostgreSQL + pgvector vs Pinecone',
    subtitle: 'Hybrid AI RAG retrieval · 10M embeddings · Weight-Sensitive (±20% Flip)',
    options: [
      { id: 'qdrant', name: 'Qdrant', tagline: 'Rust HNSW · SIMD quantization' },
      { id: 'pgvector', name: 'Postgres + pgvector', tagline: 'Single DB · ACID SQL + vector joins' },
      { id: 'pinecone', name: 'Pinecone Serverless', tagline: 'Zero-ops SaaS · proprietary API' },
    ],
    criteria: [
      {
        id: 'scale',
        name: '10M-Vector Recall & p99 Latency',
        weight: 0.34,
        rationale: 'Strict <40ms p99 retrieval at 97%+ recall with metadata filters',
        scores: {
          qdrant: {
            score: 5,
            grade: 'A',
            note: 'Filterable Rust HNSW + scalar quantization hits <18ms p99 at 10M vectors',
            source: 'qdrant.tech/documentation/concepts/filtering/',
          },
          pgvector: {
            score: 3,
            grade: 'B',
            note: 'halfvec HNSW handles 1–5M cleanly, but filtered p99 degrades past 10M without sharding',
            source: 'github.com/pgvector/pgvector#hnsw + ANN-Benchmarks',
          },
          pinecone: {
            score: 5,
            grade: 'A',
            note: 'Managed serverless namespaces sustain low-latency high-recall queries cleanly',
            source: 'docs.pinecone.io/guides/indexes/understanding-indexes',
          },
        },
      },
      {
        id: 'ops',
        name: 'Unified SQL Joins & Small-Team Ops',
        weight: 0.32,
        rationale: '5-person team wants tenant ACL joins without dual-write drift',
        scores: {
          qdrant: {
            score: 3,
            grade: 'A',
            note: 'Second stateful cluster requires CDC sync pipeline to keep Postgres ACLs consistent',
            source: 'qdrant.tech/documentation/guides/distributed_deployment/',
          },
          pgvector: {
            score: 5,
            grade: 'A',
            note: 'Single ACID transaction for embeddings + tenant permissions + backups',
            source: 'postgresql.org/docs/current/mvcc.html',
          },
          pinecone: {
            score: 4,
            grade: 'A',
            note: 'No cluster ops, but external sync lag & eventual consistency on RBAC deletes',
            source: 'docs.pinecone.io/guides/data/upsert-data',
          },
        },
      },
      {
        id: 'cost',
        name: 'Predictable Monthly Infra Cost',
        weight: 0.2,
        rationale: 'Keep retrieval tier under $900/month with bursty agent queries',
        scores: {
          qdrant: {
            score: 5,
            grade: 'B',
            note: 'Binary/scalar quantization cuts RAM footprint 4×–32× on commodity nodes',
            source: 'qdrant.tech/documentation/guides/quantization/',
          },
          pgvector: {
            score: 4,
            grade: 'B',
            note: 'Zero extra vendor bill, though HNSW index memory raises primary RDS tier',
            source: 'github.com/pgvector/pgvector#indexing',
          },
          pinecone: {
            score: 2,
            grade: 'A',
            note: 'Read-unit metered billing spikes unpredictably on multi-step agent RAG loops',
            source: 'docs.pinecone.io/guides/organizations/understanding-cost',
          },
        },
      },
      {
        id: 'exit',
        name: 'Portability & Zero Lock-In',
        weight: 0.14,
        rationale: 'Avoid One-Way vendor lock-in if embedding models or clouds change',
        scores: {
          qdrant: {
            score: 5,
            grade: 'A',
            note: 'Apache-2.0 open source; runs identically locally, self-hosted, or managed',
            source: 'github.com/qdrant/qdrant/blob/master/LICENSE',
          },
          pgvector: {
            score: 5,
            grade: 'A',
            note: 'Standard PostgreSQL extension available on every cloud and self-hosted host',
            source: 'github.com/pgvector/pgvector/blob/master/LICENSE',
          },
          pinecone: {
            score: 2,
            grade: 'A',
            note: 'Closed-source managed service with proprietary query/filter semantics',
            source: 'docs.pinecone.io/reference/api/introduction',
          },
        },
      },
    ],
    failureModes: {
      qdrant: 'Dual-write drift between PostgreSQL permissions and Qdrant payloads leaks stale tenant docs unless synced via transactional outbox.',
      pgvector: 'Post-filtering strict tenant WHERE clauses on an HNSW graph starves top-k candidates unless iterative_scan is tuned.',
      pinecone: 'Agentic fan-out queries multiply read-unit spend and create a costly One-Way migration exit.',
    },
  },
  {
    id: 'logging',
    title: 'Pino vs Winston vs Bunyan',
    subtitle: 'High-throughput Node.js microservice · 15,000 req/sec',
    options: [
      { id: 'pino', name: 'Pino', tagline: 'Worker-thread NDJSON · sonic-boom' },
      { id: 'winston', name: 'Winston', tagline: 'Rich legacy transports · main-thread' },
      { id: 'bunyan', name: 'Bunyan', tagline: 'Minimal JSON streams · maintenance mode' },
    ],
    criteria: [
      {
        id: 'latency',
        name: 'Event-Loop Latency Overhead',
        weight: 0.35,
        rationale: '15k req/sec leaves <0.5ms logging budget on libuv thread',
        scores: {
          pino: {
            score: 5,
            grade: 'B',
            note: '0.3ms/log via sonic-boom asynchronous worker-thread flushing',
            source: 'Reproducible Node 22 benchmark + getpino.io/docs/benchmarks',
          },
          winston: {
            score: 2,
            grade: 'B',
            note: '1.8ms/log synchronous formatting creates backpressure spikes under load',
            source: 'V8 flamegraph & reproducible load test',
          },
          bunyan: {
            score: 3,
            grade: 'B',
            note: '0.9ms/log synchronous JSON.stringify without worker offload',
            source: 'Third-party Node logger shootout',
          },
        },
      },
      {
        id: 'gc',
        name: 'Memory & GC Allocation Pressure',
        weight: 0.25,
        rationale: 'Heap churn amplifies p99 tail latency in containerized Node',
        scores: {
          pino: {
            score: 5,
            grade: 'A',
            note: 'Pre-compiled serializer & flat JSON string assembly minimize heap churn',
            source: 'github.com/pinojs/pino/blob/master/lib/proto.js',
          },
          winston: {
            score: 3,
            grade: 'B',
            note: 'Instantiates multiple logform transform wrappers per log event',
            source: 'V8 heap allocation profiler snapshot',
          },
          bunyan: {
            score: 4,
            grade: 'A',
            note: 'Lightweight stream write path with small object footprint',
            source: 'github.com/trentm/node-bunyan/blob/master/lib/bunyan.js',
          },
        },
      },
      {
        id: 'transports',
        name: 'Transport & SIEM Ecosystem',
        weight: 0.22,
        rationale: 'Need reliable shipping to Datadog, Loki, and CloudWatch',
        scores: {
          pino: {
            score: 4,
            grade: 'A',
            note: 'Decoupled worker transports (pino-loki, pino-datadog) avoid app crashes',
            source: 'getpino.io/docs/transports',
          },
          winston: {
            score: 5,
            grade: 'A',
            note: 'Largest mature catalog of drop-in community & enterprise transports',
            source: 'github.com/winstonjs/winston#transports',
          },
          bunyan: {
            score: 2,
            grade: 'C',
            note: 'Aging third-party transport ecosystem with stale maintainers',
            source: 'npm registry release history',
          },
        },
      },
      {
        id: 'maintenance',
        name: 'Maintenance Velocity & Security',
        weight: 0.18,
        rationale: 'Long-lived core dependency in production microservices',
        scores: {
          pino: {
            score: 5,
            grade: 'A',
            note: 'Active OpenJS / Fastify core maintenance with regular Node LTS releases',
            source: 'github.com/pinojs/pino/releases',
          },
          winston: {
            score: 4,
            grade: 'A',
            note: 'Widely deployed and patched, slower major architectural cadence',
            source: 'github.com/winstonjs/winston/releases',
          },
          bunyan: {
            score: 1,
            grade: 'A',
            note: 'Effectively dormant upstream; unpatched transitive CVEs reported',
            source: 'github.com/trentm/node-bunyan/commits',
          },
        },
      },
    ],
    failureModes: {
      pino: 'In-flight worker logs can drop on sudden SIGKILL unless pino.final() / flushSync is wired on shutdown.',
      winston: 'High-volume error storms synchronously saturate the Node.js event loop, cascading into HTTP 504 timeouts.',
      bunyan: 'Stagnant upstream maintenance forces internal forks on new Node LTS deprecations.',
    },
  },
  {
    id: 'analytics',
    title: 'ClickHouse vs PostgreSQL + TimescaleDB vs DynamoDB + Athena',
    subtitle: 'Multi-tenant B2B analytics · 25M events/day · p95 < 500ms',
    options: [
      { id: 'clickhouse', name: 'ClickHouse Cloud', tagline: 'Columnar MergeTree · ZSTD 5:1' },
      { id: 'postgres', name: 'Postgres + Timescale', tagline: 'Existing team expertise · OLTP+OLAP' },
      { id: 'dynamo', name: 'DynamoDB + Athena', tagline: 'Zero-ops serverless · S3 scans' },
    ],
    criteria: [
      {
        id: 'scan',
        name: '30-Day Analytical p95 Latency',
        weight: 0.34,
        rationale: 'Customer dashboards time out above 500ms across 750M rows',
        scores: {
          clickhouse: {
            score: 5,
            grade: 'A',
            note: 'Columnar vectorized scans hit 90–220ms p95 over 750M compressed rows',
            source: 'clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree',
          },
          postgres: {
            score: 3,
            grade: 'B',
            note: 'Continuous aggregates help fixed queries, but ad-hoc filters exceed 2.4s',
            source: 'TimescaleDB compression & ClickBench reproducible runs',
          },
          dynamo: {
            score: 2,
            grade: 'A',
            note: 'Athena cold Parquet scan startup alone runs 1.5–6s per dashboard refresh',
            source: 'docs.aws.amazon.com/athena/latest/ug/performance-tuning.html',
          },
        },
      },
      {
        id: 'ops',
        name: 'Operational Burden (Small Team)',
        weight: 0.3,
        rationale: 'No dedicated DBA; zero prior ClickHouse on-call experience',
        scores: {
          clickhouse: {
            score: 3,
            grade: 'A',
            note: 'Requires Vector/Kafka batching buffer (>=10k rows) to avoid Too Many Parts',
            source: 'clickhouse.com/docs/en/troubleshooting/too-many-parts',
          },
          postgres: {
            score: 5,
            grade: 'A',
            note: 'Team already operates Postgres backups, migrations, and observability',
            source: 'postgresql.org/docs/current/ddl-partitioning.html',
          },
          dynamo: {
            score: 4,
            grade: 'A',
            note: 'Managed scaling, but Firehose → S3 → Glue compaction adds pipeline glue',
            source: 'docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html',
          },
        },
      },
      {
        id: 'storage',
        name: 'Storage Cost & Compression',
        weight: 0.2,
        rationale: 'Bootstrap budget ceiling of $2,500/month at 18-month horizon',
        scores: {
          clickhouse: {
            score: 5,
            grade: 'B',
            note: '4:1 to 6:1 ZSTD columnar compression cuts hot storage dramatically',
            source: 'ClickBench storage footprint measurements',
          },
          postgres: {
            score: 3,
            grade: 'B',
            note: 'Row-store WAL + B-tree indexes inflate disk footprint 3–4× before compression',
            source: 'PostgreSQL / Timescale storage benchmarks',
          },
          dynamo: {
            score: 4,
            grade: 'B',
            note: 'Cheap S3 Parquet at rest, but Athena $5/TB scan billing spikes on heavy users',
            source: 'aws.amazon.com/athena/pricing',
          },
        },
      },
      {
        id: 'reversibility',
        name: 'Exit Path & Lock-In',
        weight: 0.16,
        rationale: 'One-Way Door mitigation if operational load exceeds 5 hrs/week',
        scores: {
          clickhouse: {
            score: 4,
            grade: 'A',
            note: 'Standard SQL + Parquet export + open-source engine prevent vendor trap',
            source: 'clickhouse.com/docs/en/interfaces/formats#parquet',
          },
          postgres: {
            score: 5,
            grade: 'A',
            note: 'Ubiquitous standard SQL portable across every cloud provider',
            source: 'postgresql.org/docs/current/backup-dump.html',
          },
          dynamo: {
            score: 2,
            grade: 'B',
            note: 'Proprietary access patterns and AWS-coupled Glue/Firehose plumbing',
            source: 'Independent multi-cloud migration postmortems',
          },
        },
      },
    ],
    failureModes: {
      clickhouse: 'Direct micro-batch inserts (<1,000 rows) trigger MergeTree "Too many parts" collapse unless buffered via async_insert=1 or Vector.',
      postgres: 'Ad-hoc multi-column dashboard filters bypass continuous aggregates and lock IOPS during peak ingest.',
      dynamo: 'Unbounded customer refreshes trigger surprise Athena scan bills and sluggish multi-second chart loads.',
    },
  },
];

export interface WorkspaceFile {
  path: string;
  name: string;
  badge: string;
  summary: string;
  content: string;
}

export interface ScopePreview {
  id: 'comparison' | 'decision' | 'project';
  icon: string;
  tabLabel: string;
  badge: string;
  overhead: string;
  time: string;
  title: string;
  desc: string;
  examplePrompt: string;
  command: string;
  outputFile: string;
  linkLabel: string;
  linkHref: string;
}

export const SCOPE_PREVIEWS: ScopePreview[] = [
  {
    id: 'comparison',
    icon: '⚡',
    tabLabel: '5-Min Comparison',
    badge: 'RAPID WEP MATRIX',
    overhead: '0 DAG · 0 Gate Required',
    time: '1 Session (~5 mins)',
    title: 'Compare 2–5 Libraries, Stores, or Algorithms',
    desc: 'Eliminates toolchain fatigue with an empirical Weighted Evaluation Protocol (WEP) matrix, sensitivity check, and live Grade A–E citations.',
    examplePrompt: 'Pino vs Winston for high-throughput Node.js microservice',
    command: 'vck compare "Pino vs Winston"',
    outputFile: 'research/C-001-comparison.md',
    linkLabel: 'Explore WEP Playground',
    linkHref: '/playground',
  },
  {
    id: 'decision',
    icon: '🎯',
    tabLabel: '30-Min Decision (ADR)',
    badge: 'GIT-TRACKED ADR',
    overhead: '0 Project DAG · Red-Team SHA-256',
    time: '1–3 Sessions (~30 mins)',
    title: 'Lock an Architectural Fork or Dilemma in Code',
    desc: 'Binds an evidence-graded ADR with explicit rejected alternatives, reversal triggers, and automated SHA-256 red-team challenge record.',
    examplePrompt: 'Should we migrate event storage from PostgreSQL to ClickHouse?',
    command: 'vck start --scope decision "PostgreSQL vs ClickHouse"',
    outputFile: 'research/D-001-decision.md',
    linkLabel: 'Inspect Live Gate',
    linkHref: '#gate',
  },
  {
    id: 'project',
    icon: '🏛️',
    tabLabel: 'Full Project Scope',
    badge: 'FOUNDING ARCHITECTURE',
    overhead: 'Topological DAG · Phase 0 Exit Gate',
    time: '4–30 Sessions (Hours–Days)',
    title: 'Architect a Greenfield Platform or Major Rewrite',
    desc: 'Orchestrates dependency-ordered subagent sessions into a unified Founding Architecture Document (FAD) verified by two-track Phase 0 pre-code exit gate.',
    examplePrompt: 'Architect collaborative AI storytelling platform from scratch',
    command: 'vck start --scope project "Katha Storytelling Platform"',
    outputFile: 'research/FAD.md',
    linkLabel: 'View Live DAG Simulator',
    linkHref: '#architecture',
  },
];

export const WORKSPACE_FILES: WorkspaceFile[] = [
  {
    path: 'research/C-001-comparison.md',
    name: 'C-001-comparison.md',
    badge: 'WEP · 5-Min Matrix',
    summary: 'Comparison Scope walkthrough (examples/SAMPLE-COMPARISON.md): Pino vs Winston Weighted Evaluation Protocol matrix with ±20% sensitivity test.',
    content: `---
id: C-001
title: "Pino vs Winston for High-Throughput Node.js Microservice"
date: "2026-10-18"
status: complete
vivechak: 1
---

# C-001: Pino vs Winston Comparison

## Key Findings
- Pino delivers up to 5x lower event-loop latency via sonic-boom asynchronous writing [Grade C: https://getpino.io/docs/benchmarks/ | vendor benchmark].
- Winston formats log entries synchronously on the event loop, causing backpressure lag under heavy HTTP microservice load [Grade B: V8 heap profiler].

## Weighted Evaluation Protocol (WEP) Matrix
| Criterion | Weight | Pino Score (1-5) | Winston Score (1-5) | Evidence Grade & Provenance |
|---|---|---|---|---|
| Event Loop Latency | 0.40 | 5 (0.3ms/log) | 3 (1.8ms/log) | [Grade C: https://getpino.io/docs/benchmarks/ | vendor benchmark] |
| Memory Allocation | 0.30 | 5 (Minimal GC) | 3 (Object churn) | [Grade B: V8 heap profiler] |
| Transport Decoupling | 0.30 | 5 (Worker thread) | 4 (In-process streams) | [Grade A: https://github.com/pinojs/pino/blob/master/lib/proto.js | canonical source code] |
| **Weighted Total** | **1.00** | **5.00** | **3.30** | **Pino Wins (+51% margin)** |

## Sensitivity Check
Even if transport weight increases to 0.50, Pino retains the winning score (4.70 vs 3.60).

## Failure Modes
- **Pino:** In unbuffered crashes, in-flight worker logs may be lost unless \`pino.final()\` handler is registered [Grade A: docs].
- **Winston:** High volume synchronously saturates Node.js libuv event loop threads, creating backpressure lag on HTTP routes [Grade B: issue reports].

## Recommendation
Adopt **Pino** with externalized log shipping via worker thread. Register \`pino.final()\` on \`SIGTERM\`.

## Sources & Evidence Ledger
- Pino benchmarks: https://getpino.io/docs/benchmarks/ [Grade C | vendor benchmark]
- Node.js heap profiler: reproducible local V8 snapshots [Grade B]
- Pino transport architecture: https://getpino.io/docs/transports/ [Grade A]`,
  },
  {
    path: 'research/DECISIONS.md',
    name: 'DECISIONS.md',
    badge: 'Registry · Single Source',
    summary: 'Consolidated registry auto-compiled by vivechak_record_decision tracking accepted ADRs, reversal triggers, and signoff hashes.',
    content: `# Architectural Decisions (DECISIONS.md)

*Compiled automatically by \`vck\` / \`vivechak_record_decision\`. Canonical files are \`research/D-*.md\`.*

| ID | Title | Status | Door | Review Trigger | Reviewer | SHA-256 Hash |
|---|---|---|---|---|---|---|
| [D-001](D-001-decision.md) | Analytical Event Storage Engine | Accepted | One-Way | Ingest > 150k/s or storage > $2.5k/mo | Jane Doe | \`8c3f9e41b2a7d018f5...\` |
| [D-002](D-002-decision.md) | Collaborative Chapter Sync Engine (Yjs) | Accepted | Two-Way | Offline conflict rate > 2.5% | — | — |
| [D-003](D-003-decision.md) | LLM Streaming & Token Context Budget | Accepted | Two-Way | Model p95 latency > 1,200ms | — | — |

## Summary
- **Total Decisions:** 3
- **One-Way Doors:** 1 (100% human-signed via \`vck signoff\`)
- **Two-Way Doors:** 2 (Fast reversible paths)
- **Phase 0 Status:** Pre-codebase exit criteria verified via \`vck gate\` (Exit code 0 PASS)`,
  },
  {
    path: 'research/FAD.md',
    name: 'FAD.md',
    badge: 'FAD · Map-Reduce',
    summary: 'Founding Architecture Document synthesized after 100% of pipeline DAG sessions reach status: complete.',
    content: `---
id: SYN-01
title: "Katha — Collaborative AI Storytelling Platform FAD"
synthesis_date: 2026-11-18
status: sealed
research_sessions_ingested: 4
decisions_locked: 3
open_questions: 0
schema_version: "0.1.0"
vivechak: 1
---

# Katha — Founding Architecture Document (FAD)

## 1. Executive Summary
Katha is a collaborative web platform enabling indie novelists to write fiction with real-time character graph consistency, automated plot outline assistance, and low-latency token streaming. 

This Founding Architecture Document synthesizes research sessions T0-01, T1-01, T1-02, and T1-03 into a unified system specification.

## 2. Locked Decision Registry
| D-ID | Decision | Chosen Solution | Door Type | Confidence | Evidence Ref |
|---|---|---|---|---|---|
| D-001 | Primary Story Graph Datastore | PostgreSQL 16 + recursive CTEs + pgvector | One-Way | High | [Grade A: postgresql.org] |
| D-002 | Chapter Collaboration Engine | Yjs CRDT + WebSocket ephemeral provider | Two-Way | High | [Grade A: yjs.dev] |
| D-003 | LLM Streaming & Context Window | SSE streaming + sliding story-graph window | Two-Way | High | [Grade A: fetch API] |

## 3. Composed vs Built Primitives (Wardley Map)
- **Composed (Commodity):** PostgreSQL 16 (OLTP + graph queries + vectors), Yjs (conflict-free chapter sync), Next.js 15 (Edge SSR).
- **Built (Proprietary Core IP):** Consistency Traversal Engine (CTE query builder enforcing max depth <= 8), Story-Graph Context Pruner (extracts top-k active character arcs for LLM prompt context).

## 4. Phase 0 Gate Verification
- **Track A (Two-Way Doors):** D-002, D-003 reversibility confirmed (spikes in code branch).
- **Track B (One-Way Doors):** D-001 passed G1–G10 rules; signed off by Jane Doe (\`vck signoff D-001\`). Exit 0 sealed.`,
  },

  {
    path: 'research/RESEARCH-PIPELINE.md',
    name: 'RESEARCH-PIPELINE.md',
    badge: 'Katha · Project DAG',
    summary: 'Real Project Scope walkthrough (examples/SAMPLE-PROJECT.md): strict yaml vivechak-plan parsed by dag.go.',
    content: `---
id: DAG
type: plan
title: "Katha — Collaborative AI Storytelling Platform Pipeline"
date: 2026-11-18
status: complete
vivechak: 1
---

# RESEARCH-PIPELINE: Katha Platform Architecture

\`\`\`yaml vivechak-plan
plan: PROJECT
sessions:
  - {id: T0-01, title: Domain & GDPR Boundary Scan, layer: 0, door: one-way, informs: [D-001], depends: []}
  - {id: T1-01, title: "Story Graph: Postgres+pgvector vs Neo4j", layer: 1, door: one-way, informs: [D-001], depends: [T0-01]}
  - {id: T1-02, title: "Realtime Sync: Yjs CRDT vs WebSocket OT", layer: 1, door: two-way, informs: [D-002], depends: [T0-01]}
  - {id: T1-03, title: LLM Streaming & Token Context Budget, layer: 1, door: two-way, informs: [D-003], depends: [T0-01]}
  - {id: SYN-01, title: Founding Architecture Document (FAD.md), kind: synthesis, depends: [ALL]}
decisions:
  - {id: D-001, title: Primary Story Graph Datastore, door: one-way}
  - {id: D-002, title: Collaborative Chapter Sync Engine, door: two-way}
  - {id: D-003, title: LLM Streaming & Context Strategy, door: two-way}
\`\`\`

## Sessions
### T1-01: Story Graph: Postgres+pgvector vs Neo4j
\`\`\`prompt
# RESEARCH BRIEF: Story Graph Persistence for Katha
## KNOWN
[UPSTREAM_FINDINGS] — treat inherited claims as assumptions to stress-test.
Verify whether PostgreSQL 16 recursive CTEs + pgvector suffice at 50k edges or if Neo4j is required.
\`\`\``,
  },
  {
    path: 'research/D-001-dogfood-mcp.md',
    name: 'D-001-dogfood.md',
    badge: 'Real Dogfood ADR',
    summary: 'Actual ADR from examples/dogfood/research/D-001.md: Vivechak used Vivechak to cut 13→9 MCP tools & shrink schema 68%.',
    content: `---
id: D-001
type: decision
title: "Consolidate MCP Tool Surface from 13 to 9 Tools"
status: accepted
door_type: two-way
date: 2026-10-24
confidence: high
review_trigger: "Re-evaluate if frontier LLMs show zero tool-confusion above 12 MCP schemas"
vivechak: 1
---

# D-001: Consolidate MCP Tool Surface from 13 to 9 Tools

## Decision Outcome
Consolidate from 13 granular MCP tools to **9 high-cohesion tools** (\`vivechak_start\`, \`vivechak_save\`, \`vivechak_record_decision\`, \`vivechak_next\`, \`vivechak_status\`, \`vivechak_review\`, \`vivechak_amend\`, \`vivechak_replan\`, \`vivechak_gate\`).
Measured binary payload: \`tools/list\` dropped from **19,419 bytes → 6,115 bytes** (9,063 bytes total always-loaded context, meeting the ≤10 KB budget) [A · single · fresh · direct · fetched](https://github.com/bhaskarjha-dev/vivechak/blob/main/examples/dogfood/research/D-001.md).

## Rejected Alternatives & Tradeoffs
- **Retain 13 fine-grained tools:** Caused smaller models in multi-harness runs to stall on dead \`init\` turns and misroute comparison IDs [C · corroborated · cached](https://github.com/bhaskarjha-dev/vivechak/blob/main/tests/harness/DEFECTS.md).
- **Extreme consolidation (3 mega-tools):** Hides parameters behind complex sub-schemas, hurting tool-calling accuracy.

## Failure Modes & Reversal Triggers
- Agent omits \`kind\` on \`vivechak_save\` → mitigated via strict enum validation + Guided Worker \`next\` hints.`,
  },
  {
    path: 'research/D-001-decision.md',
    name: 'D-001-decision.md',
    badge: 'One-Way · Sealed',
    summary: 'Canonical One-Way Door ADR bound to D-001-R1 red-team record and interactive vck signoff SHA-256 hash.',
    content: `---
id: D-001
type: decision
title: "Analytical Event Storage Engine"
status: accepted
door_type: one-way
date: 2026-11-18
confidence: high
informed_by_sessions: [D-001-S1, D-001-S2]
review_trigger: "Sustained ingest > 150k events/s or monthly storage > $2,500"
review_date: 2027-05-18
human_reviewed: true
reviewed_by: "Jane Doe"
reviewed_at: "2026-11-18T14:22:09Z"
reviewed_hash: "8c3f9e41b2a7d018f5e9a3102b77d4c1..."
vivechak: 1
---

# D-001: Analytical Event Storage Engine

## Decision Outcome
Adopt **ClickHouse Cloud** (MergeTree partitioned monthly) with a **Vector** batching buffer (>=10,000 rows/flush) for 30-day event analytics, retaining PostgreSQL for transactional state [A · corroborated · fresh · direct · fetched](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree).

## Rejected Alternatives & Tradeoffs
- **PostgreSQL + TimescaleDB:** Rejected — ad-hoc 30-day multi-column filters over 750M rows exceed 500ms p95 without columnar compression [B · corroborated · fresh · direct · fetched](https://benchmark.clickhouse.com/).
- **DynamoDB + Athena:** Rejected — Athena cold query overhead (1.5–6s) violates dashboard SLA [A · single · fresh · direct · fetched](https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html).

## Challenge Findings
Stress-tested in \`D-001-R1\`: small-batch inserts (<1,000 rows) trigger MergeTree "Too many parts" failure [A · corroborated · fresh · direct · fetched](https://clickhouse.com/docs/en/troubleshooting/too-many-parts). Mitigated via Vector 10k-row batching + \`async_insert=1\`.`,
  },
  {
    path: 'research/D-001-R1.md',
    name: 'D-001-R1.md',
    badge: 'Red-Team · SHA-256',
    summary: 'Adversarial challenge record cryptographically bound to Decision Outcome + Rejected Alternatives.',
    content: `---
id: D-001-R1
type: challenge
decision: D-001
decision_hash: "6a19c0d82e4b71a3f09c41e8b32d5e74..."
date: 2026-11-18
status: complete
vivechak: 1
---

# Adversarial Red-Team Challenge: D-001 (D-001-R1)

## Challenge Prompts
### Prompt 1 — MergeTree Ingestion Failure Mode
Assume ClickHouse fails catastrophically at month 6 under bursty multi-tenant webhook writes. Identify the exact part-merge failure threshold and test whether async_insert=1 silently drops acks on node restart.

### Prompt 2 — 12-Month Gary Klein Premortem
It is November 2027 and the team is migrating back to PostgreSQL. Which hidden operational cost (schema migrations, mutation throttling, or Zookeeper/Keeper drift) caused the reversal?`,
  },
  {
    path: 'research/sessions/T1-01.md',
    name: 'sessions/T1-01.md',
    badge: '9-Section · Delta',
    summary: 'Katha empirical session where ## Delta disproved the initial assumption that Neo4j was required.',
    content: `---
id: T1-01
type: session
title: "Story Graph Persistence: PostgreSQL 16 + pgvector vs Neo4j"
date: 2026-11-18
status: complete
informs_decisions: [D-001]
confidence: high
vivechak: 1
---

## Prior
- I believe Katha requires a dedicated graph database (Neo4j) for real-time character & plot consistency traversal.

## Key Findings
- PostgreSQL 16 recursive CTEs traverse 50k story-graph edges in <50ms p95 with indexed foreign keys [A · corroborated · fresh · direct · fetched](https://www.postgresql.org/docs/16/queries-with.html).
- Co-locating pgvector eliminates dual-database backup drift and cuts GDPR right-to-erasure to a single ACID transaction [A · single · fresh · direct · fetched](https://github.com/pgvector/pgvector).

## Discovered Concerns
Recursive CTE latency degrades past 10 traversal hops without explicit CYCLE and depth guards; enforce max depth <= 8 in application query builders.

## Delta
| Prior Belief | Status | Evidence | Impact |
|---|---|---|---|
| Dedicated Neo4j graph DB is required | **Contradicted** | Postgres 16 CTE docs [A] + PGBench [B] | Eliminated 2nd stateful cluster; saved ~6 weeks ops |`,
  },
  {
    path: 'research/PHASE-0-GATE.md',
    name: 'PHASE-0-GATE.md',
    badge: 'G1–G12 Report',
    summary: 'Auto-persisted mechanical audit written by vivechak_gate / vck gate (CI exit code 0 on PASS).',
    content: `# Phase 0 Pre-Codebase Exit Gate Report

**Verdict:** PASS (exit code 0)
**Target:** D-001 · **Evaluated:** 2026-11-18 UTC

> Scope Note: Evidence grades and verification labels are as reported by the agent; Vivechak did not fetch or verify sources.

| Rule | Track | Status | Verification Summary |
|---|---|---|---|
| G1 | Track B | PASS | Plan parses via yaml vivechak-plan; acyclic DAG |
| G2 | Track B | PASS | All planned sessions status: complete |
| G5 | Track B | PASS | Target ADRs locked (0 proposed) |
| G6 | Track B | PASS | ≥2 Grade A/B claims with https:// URLs |
| G7 | Track B | PASS | ≥2 claims labeled fetched/human |
| G8 | Track B | PASS | Zero placeholders; rejected alternatives documented |
| G9 | Track B | PASS | Measurable reversal trigger declared |
| G10 | Track B | PASS | D-001-R1 decision_hash matches current outcome |
| G11 | Track B | PASS | Valid vck signoff by Jane Doe (reviewed_hash match) |`,
  },
];

export const DAG_NODES = [
  {
    id: 'T0-01',
    layer: 0,
    title: 'Domain & GDPR Boundary',
    door: 'one-way' as const,
    status: 'complete' as const,
    depends: [] as string[],
    informs: 'D-001',
    injectedSnippet:
      'Root Layer 0 session for Katha (examples/SAMPLE-PROJECT.md). Maps EU/US GDPR deletion boundaries, 50k-node story graph scale, and collaborative editing latency targets.',
  },
  {
    id: 'T1-01',
    layer: 1,
    title: 'Story Graph: Postgres vs Neo4j',
    door: 'one-way' as const,
    status: 'complete' as const,
    depends: ['T0-01'],
    informs: 'D-001',
    injectedSnippet: `<upstream-findings source="T0-01" trust="untrusted-data">
### Key Findings (T0-01)
- Story graphs average 800–50k nodes per novel; EU GDPR erasure must purge author graphs cleanly.
- Result: Contradicted Neo4j assumption — PostgreSQL 16 CTEs + pgvector hit <50ms p95.
</upstream-findings>`,
  },
  {
    id: 'T1-02',
    layer: 1,
    title: 'Sync Engine: Yjs CRDT vs OT',
    door: 'two-way' as const,
    status: 'complete' as const,
    depends: ['T0-01'],
    informs: 'D-002',
    injectedSnippet: `<upstream-findings source="T0-01" trust="untrusted-data">
### Key Findings (T0-01)
- Authors edit chapters offline on flights & co-edit live with editors.
- Runs in parallel with T1-01 & T1-03 (Inverted Dependency Default — zero sibling blocking).
</upstream-findings>`,
  },
  {
    id: 'T1-03',
    layer: 1,
    title: 'LLM Streaming & Token Budget',
    door: 'two-way' as const,
    status: 'ready' as const,
    depends: ['T0-01'],
    informs: 'D-003',
    injectedSnippet: `<upstream-findings source="T0-01" trust="untrusted-data">
### Key Findings (T0-01)
- Sub-400ms TTFT streaming required for branching plot suggestions over 100k-word novels.
</upstream-findings>
### RESEARCH CALIBRATION (Active Rules)
1. Memory != Evidence (recalled caps at Grade D).
2. Upstream != Exhaustive — verify streaming backpressure via primary docs.`,
  },
  {
    id: 'SYN-01',
    layer: 2,
    title: 'Founding Architecture (FAD)',
    door: 'one-way' as const,
    status: 'held' as const,
    depends: ['T0-01', 'T1-01', 'T1-02', 'T1-03'],
    informs: 'FAD.md',
    injectedSnippet: `// TERMINAL SYNTHESIS GUARD (internal/core/dag.go)
// Held back until 100% of non-synthesis sessions reach status: complete.
// Missing: T1-03 (currently ready).
// When unlocked, synthesizes Katha research/FAD.md:
//   1. Cross-session Technology Coherence Matrix
//   2. Locked Decision Registry (D-001..D-003) WITH Rejected Alternatives
//   3. Aggregated ## Delta Belief Evolution Ledger`,
  },
];

export const SEVEN_STEP_LADDER = [
  { step: '01', rule: 'explicit', title: 'Explicit project_root arg', detail: 'Highest precedence; validated against SafeRoot and normalized if pointing inside research/.' },
  { step: '02', rule: 'roots', title: 'Single MCP client root', detail: 'Queried once per session (200ms timeout) when advertised; refreshed on notifications/roots/list_changed.' },
  { step: '03', rule: 'env', title: 'Namespaced Env Ladder', detail: 'VIVECHAK_PROJECT_ROOT → VCK_PROJECT_ROOT. Ignores unexpanded ${workspaceFolder} and unnamespaced vars.' },
  { step: '04', rule: 'session', title: 'Per-Session Memory', detail: 'Remembers the last resolved root within that single MCP session only — never leaks across chats.' },
  { step: '05', rule: 'marker', title: 'Marker Walk-Up', detail: 'Walks up from cwd for research/.vivechak.json, stopping strictly before $HOME or system dirs.' },
  { step: '06', rule: 'cwd', title: 'Guarded Working Dir', detail: 'Accepts cwd only if a project anchor (.git, go.mod, package.json, Cargo.toml, etc.) exists and passes SafeRoot.' },
  { step: '07', rule: 'refusal', title: 'Fail-Closed Refusal', detail: 'Never guesses or writes to /, $HOME, /Applications, or Program Files. Emits E-ROOT-UNRESOLVED.' },
];

export const MANUAL_PROMPTS = {
  comparison: `# GENERATE: Comparison Research Prompt (Zero-Install Browser Mode)

OPTIONS: [Pino, Winston, Bunyan]
CRITERIA: [Event-loop latency, GC pressure, Transports, Maintenance]
CONTEXT: [High-throughput Node.js microservice handling 15k req/sec]

Run with web search enabled. For every factual claim attach an inline evidence grade:
- Grade A: Official docs / canonical source code / RFC with URL anchor
- Grade B: Reproducible benchmarks / peer-reviewed papers / postmortems
- Grade C: Vendor marketing / benchmarks · Grade D: Blogs / recalled (capped!)

Deliver a Weighted Evaluation Protocol (WEP) matrix with normalized weights summing to 1.0,
evidence-backed 1–5 scores, a ±20% top-2 weight sensitivity check, at least one concrete
failure mode per contender, and a Delta table showing which prior beliefs changed.`,
  decision: `# GENERATE: Architectural Decision Plan (Zero-Install Browser Mode)

DECISION: [Should we migrate 25M events/day analytics from PostgreSQL to ClickHouse?]
OPTIONS: [ClickHouse Cloud, PostgreSQL + TimescaleDB, DynamoDB + Athena]
CONTEXT: [30-day p95 query latency degrading past 8s; small team with zero ClickHouse ops experience]
STAGE: [live]

1. Profile R (Reversal cost), N (Novelty), B (Blast radius), X (Regulatory) from 0–3.
2. Classify One-Way Door (R>=2 or B=3) vs Two-Way Door.
3. Emit 1–3 focused research sessions (L Landscape, C Comparison, F 12-month Klein Premortem)
   plus a proposed ADR with quantitative review_trigger thresholds and rejected alternatives.`,
  project: `# GENERATE: Project Research Pipeline (Zero-Install Browser Mode)

PROJECT VISION: [Paste your greenfield architecture or major rewrite vision here]

1. Score 8 complexity dimensions (0–24 points → Tier 0–3; hard override if Regulatory = 3).
2. Decompose into a Constrained DAG (default unblocked; hard dependencies only) ending at SYN-01.
3. Keep One-Way Doors on Track B (Grade A/B fetched evidence, red-team challenge, premortem)
   and Two-Way Doors on Track A (fast spike / convention).
4. Synthesize all completed sessions into a sealed Founding Architecture Document (FAD.md).`,
};

export interface CliCommandSpec {
  cmd: string;
  usage: string;
  summary: string;
  flags: string;
}

export const CLI_COMMANDS: CliCommandSpec[] = [
  {
    cmd: 'vck setup <host|path>',
    usage: 'vck setup cursor --dry-run',
    summary: 'Auto-detect & safely merge Vivechak into 10 verified MCP hosts with timestamped backups.',
    flags: '--dry-run · hosts: cursor, claude-code, vscode, claude, agy, zed, windsurf, opencode, roo, goose',
  },
  {
    cmd: 'vck serve',
    usage: 'vck serve',
    summary: 'Start the local stdio MCP server (9 tools, 4 prompts, 8 resources). All logs route to stderr.',
    flags: 'Default subcommand when invoked over a pipe (zero stdout pollution).',
  },
  {
    cmd: 'vck doctor [path]',
    usage: 'vck doctor',
    summary: 'Verify workspace confinement, research/ structure, YAML frontmatter syntax, and stale hashes.',
    flags: 'Optional [path] target (defaults to resolved project workspace).',
  },
  {
    cmd: 'vck gate [flags] [path]',
    usage: 'vck gate --track all --verbose',
    summary: 'Mechanically evaluate Phase 0 Exit Gate rules G1–G12 and write research/PHASE-0-GATE.md.',
    flags: '--track <all|track_a|track_b> · --format <text|json> · --verbose · Exits 0 on PASS, 1 on FAIL',
  },
  {
    cmd: 'vck signoff <D-id>',
    usage: 'vck signoff D-001 --reviewer "Jane Doe"',
    summary: 'Interactive /dev/tty human attestation binding SHA-256 reviewed_hash into a One-Way Door ADR.',
    flags: '--reviewer "<name>" · Refuses non-TTY automation (E-TTY-REQUIRED)',
  },
  {
    cmd: 'vck mcp-config',
    usage: 'vck mcp-config',
    summary: 'Output universal pipeable MCP JSON configuration snippet for custom clients.',
    flags: 'Pipe directly into jq or any MCP client config file.',
  },
  {
    cmd: 'vck version',
    usage: 'vck version',
    summary: 'Print installed binary version, commit SHA, and build timestamp.',
    flags: 'Aliases: --version, -v',
  },
];

export interface GateRuleRef {
  id: string;
  name: string;
  track: 'Track A' | 'Track B';
  criteria: string;
}

export const GATE_RULES_REF: GateRuleRef[] = [
  { id: 'G1', name: 'Plan & DAG Validity', track: 'Track B', criteria: 'Plan parses via fenced yaml vivechak-plan with no cycles or unknown deps; project plans have 1 synthesis sink.' },
  { id: 'G2', name: 'Session Completeness', track: 'Track B', criteria: 'Every non-synthesis session has status: complete and substantive non-stub findings.' },
  { id: 'G3', name: 'FAD Synthesis Contract', track: 'Track B', criteria: 'Project scope has completed research/FAD.md and every accepted ADR appears in the Locked Registry.' },
  { id: 'G4', name: 'Decision Traceability', track: 'Track B', criteria: 'Every decision ID in plan or session informs_decisions exists as an ADR in research/.' },
  { id: 'G5', name: 'Locked ADR Status', track: 'Track B', criteria: 'Target ADRs are locked (accepted, superseded, or rejected); none remain proposed.' },
  { id: 'G6', name: 'Grade A/B URL Depth', track: 'Track B', criteria: 'Accepted One-Way Door ADRs carry >=2 Grade A/B claims anchored with explicit https:// URLs.' },
  { id: 'G7', name: 'Verification Provenance', track: 'Track B', criteria: '>=2 Grade A/B claims carry fetched or human verification labels; recalled/cached never count.' },
  { id: 'G8', name: 'No Stubs & Rejected Alts', track: 'Track B', criteria: 'Zero unexpanded template placeholders and substantive documented rejected alternatives.' },
  { id: 'G9', name: 'Measurable Review Trigger', track: 'Track B', criteria: 'Concrete quantitative review_trigger threshold or calendar review date declared in frontmatter.' },
  { id: 'G10', name: 'Red-Team SHA-256 Binding', track: 'Track B', criteria: 'Current research/D-NNN-R<k>.md matches decision_hash and is cited (>=50 chars) in ## Challenge Findings.' },
  { id: 'G11', name: 'Human TTY Sign-Off', track: 'Track B', criteria: 'Valid interactive vck signoff attestation (human_reviewed: true, reviewed_by, reviewed_at, matching reviewed_hash).' },
  { id: 'G12', name: 'Two-Way Reversibility', track: 'Track A', criteria: 'Accepted Two-Way Door ADRs confirm reversibility path, non-placeholder content, and a review_trigger.' },
];

export interface DiagnosticCodeRef {
  code: string;
  family: 'Error' | 'Validation' | 'Warning' | 'Coach';
  meaning: string;
  fix: string;
}

export const DIAGNOSTIC_CODES: DiagnosticCodeRef[] = [
  { code: 'E-HUMAN-ONLY-FIELD', family: 'Error', meaning: 'Agent tried setting human_reviewed or reviewed_hash directly.', fix: 'Remove sign-off fields and have a human run vck signoff <D-id> in an interactive terminal.' },
  { code: 'E-ROOT-UNRESOLVED', family: 'Error', meaning: 'Fail-closed ladder could not resolve a safe project workspace.', fix: 'Pass explicit project_root pointing to your repository root.' },
  { code: 'E-CONFINEMENT', family: 'Error', meaning: 'Target path attempted to escape os.Root-confined research/.', fix: 'Write strictly inside research/ within the resolved workspace.' },
  { code: 'E-TTY-REQUIRED', family: 'Error', meaning: 'vck signoff invoked without an interactive terminal (/dev/tty).', fix: 'Run vck signoff directly in a human shell rather than a piped subagent.' },
  { code: 'E-PLACEHOLDER-REMAINS', family: 'Error', meaning: 'Unexpanded template placeholders remain in a locked artifact.', fix: 'Replace all bracketed placeholders with grounded findings before locking.' },
  { code: 'V-PLAN-CYCLE', family: 'Validation', meaning: 'Dependency DAG contains a cycle or depends on kind: synthesis.', fix: 'Keep sessions acyclic and let synthesis depend on [ALL].' },
  { code: 'V-OWD-VAGUE-PROVENANCE', family: 'Validation', meaning: 'One-Way Door Grade A/B claim lacks a concrete URL anchor.', fix: 'Attach a canonical https:// URL to every Grade A/B claim.' },
  { code: 'W-RECALLED-GRADE-CAP', family: 'Warning', meaning: 'Model-recalled claim was graded higher than Grade D.', fix: 'Cap recalled claims at Grade D or verify via live web search.' },
  { code: 'W-STALE-DOWNSTREAM', family: 'Warning', meaning: 'Upstream artifact was amended after downstream sessions finished.', fix: 'Review listed downstream sessions and run vivechak_amend if conclusions shifted.' },
  { code: 'Q-BIAS', family: 'Coach', meaning: 'Session ## Delta reports zero updated/contradicted beliefs.', fix: 'Hunt disconfirming evidence and record assumption shifts in ## Delta.' },
  { code: 'Q-CONCERNS', family: 'Coach', meaning: '## Discovered Concerns section is missing or under-developed.', fix: 'Document concrete failure modes, scaling limits, and operational caveats (>=50 chars).' },
  { code: 'Q-FRESHNESS', family: 'Coach', meaning: 'Session cites version-sensitive claims older than 2 years.', fix: 'Verify against current upstream release documentation.' },
];

export const GITHUB_ACTIONS_SNIPPET = `name: Vivechak Phase 0 Gate
on:
  pull_request:
    paths:
      - 'research/**'

jobs:
  architecture-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Vivechak (vck)
        run: curl -fsSL https://raw.githubusercontent.com/bhaskarjha-dev/vivechak/main/install.sh | sh
      - name: Audit workspace & enforce Track A / Track B gate
        run: |
          vck doctor
          vck gate --track all --verbose`;

export function buildCustomPrompt(params: {
  scope: 'comparison' | 'decision' | 'project';
  question: string;
  options?: string;
  context?: string;
  doorType?: 'one-way' | 'two-way';
}): string {
  const q = params.question.trim() || 'Should we migrate 25M events/day analytics from PostgreSQL to ClickHouse?';
  const opts = params.options?.trim() || 'ClickHouse Cloud, PostgreSQL + TimescaleDB, DynamoDB + Athena';
  const ctx = params.context?.trim() || 'Production service; team prioritizes low operational overhead and clear exit paths';

  if (params.scope === 'comparison') {
    return `# VIVECHAK · COMPARISON BRIEF (Zero-Install · C-NNN)

QUESTION: ${q}
OPTIONS: [${opts}]
CONTEXT: ${ctx}

Instructions (run with live web search enabled):
1. Grade EVERY factual claim inline:
   - [A · fetched](url): Official docs, RFCs, or canonical source code
   - [B · fetched](url): Reproducible third-party benchmarks, peer-reviewed papers, postmortems
   - [C · fetched](url): Vendor marketing or talks · [D · recalled]: Model memory (HARD CAP at Grade D!)
2. Build a Weighted Evaluation Protocol (WEP) Markdown table with 4–6 criteria whose weights sum to 1.00 and 1–5 scores backed by citations.
3. Run a ±20% Top-2 Weight Sensitivity Check and declare ROBUST WINNER or WEIGHT-SENSITIVE.
4. State at least one concrete production failure mode per option and a ## Delta table listing which initial assumptions changed.`;
  }

  if (params.scope === 'project') {
    return `# VIVECHAK · PROJECT ARCHITECTURE PIPELINE (Zero-Install · FAD)

PROJECT VISION: ${q}
CONSTRAINTS & CONTEXT: ${ctx}

Instructions (run with live web search enabled):
1. Decompose the architecture into a Constrained Topological DAG inside a \`\`\`yaml vivechak-plan block (Layer 0 root → parallel Layer 1 sessions → single terminal SYN-01 synthesis sink).
2. Classify every architectural fork as One-Way Door (Track B: >=2 Grade A/B fetched primary URLs, rejected alternatives, 12-month Klein Premortem, quantitative review_trigger) or Two-Way Door (Track A: fast spike / convention).
3. Enforce Grade D hard cap on recalled memory; cite primary https:// documentation for every Track B claim.
4. End with a Founding Architecture Document (FAD.md) Locked Decision Registry + Phase 0 Gate checklist (G1–G12).`;
  }

  const doorLine =
    params.doorType === 'two-way'
      ? 'DOOR CLASSIFICATION: Two-Way Door (Track A · Velocity-Calibrated — ~70% confidence + explicit rollback path & review_trigger)'
      : 'DOOR CLASSIFICATION: One-Way Door (Track B · Rigor-Calibrated — >=2 Grade A/B fetched URLs, rejected alternatives, red-team attack & quantitative review_trigger)';

  return `# VIVECHAK · ARCHITECTURAL DECISION RECORD BRIEF (Zero-Install · D-NNN)

DECISION: ${q}
OPTIONS: [${opts}]
CONTEXT: ${ctx}
${doorLine}

Instructions (run with live web search enabled):
1. State your ## Prior beliefs before searching so confirmation bias is visible.
2. Research each contender with live primary URLs. Grade every claim inline ([A/B/C/D/E · fetched](url)). Never grade recalled memory above Grade D.
3. Produce a canonical YAML-frontmattered ADR (id: D-001, status: proposed, door_type, review_trigger) with:
   - ## Decision Outcome
   - ## Rejected Alternatives & Tradeoffs (why each lost with cited evidence)
   - ## Discovered Concerns (>=50 chars of concrete failure modes & disconfirming evidence)
   - ## Challenge Findings (attack your own winning option via a 12-month Klein Premortem)
   - ## Delta (table showing every prior belief confirmed, updated, or contradicted)`;
}
