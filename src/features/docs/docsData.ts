/**
 * Complete Release Documentation Dataset for vivechak.bhaskarjha.dev/docs/*
 * Grounded 100% in Vivechak v0.1.0 (README.md, QUICKSTART.md, HOST-SETUP.md,
 * MANUAL-WORKFLOW.md, HYBRID-EXECUTION.md, PARALLEL-EXECUTION.md, TROUBLESHOOTING.md,
 * examples/SAMPLE-*.md, docs/reference/{tools,gate,codes}.md, cmd/vivechak/main.go).
 */

export type DocBlock =
  | { type: 'text'; body: string }
  | { type: 'callout'; tone: 'tip' | 'warn' | 'note'; title: string; body: string }
  | { type: 'code'; lang: 'markdown' | 'json' | 'yaml'; label?: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'bullets'; items: { lead?: string; text: string }[] }
  | { type: 'workflow-diagram' }
  | { type: 'auditor-cta'; presetId: string; label: string; desc: string };

export interface DocSection {
  id: string;
  heading: string;
  blocks: DocBlock[];
}

export interface DocPage {
  slug: string;
  group: 'Get Started' | 'Workflows' | 'Reference' | 'Architecture';
  title: string;
  shortTitle: string;
  description: string;
  readMinutes: number;
  sections: DocSection[];
}

export const DOC_GROUPS: DocPage['group'][] = [
  'Get Started',
  'Workflows',
  'Reference',
  'Architecture',
];

export const DOC_PAGES: DocPage[] = [
  {
    slug: 'quickstart',
    group: 'Get Started',
    title: 'Quickstart — Vivechak in 5 Minutes',
    shortTitle: 'Quickstart',
    description:
      'Install the ~9 MB static Go binary (vck), auto-configure your MCP editor, and gate your first architectural decision in Git.',
    readMinutes: 4,
    sections: [
      {
        id: 'lifecycle',
        heading: 'How Vivechak Works',
        blocks: [
          {
            type: 'text',
            body: 'Vivechak (vck) puts an evidence-graded research and gate step before implementation. Your existing coding agent performs web research; Vivechak structures, validates, hashes, and gates plain Markdown files inside research/ next to your code.',
          },
          { type: 'workflow-diagram' },
          {
            type: 'callout',
            tone: 'note',
            title: 'Zero cloud, zero hidden databases, zero LLM calls',
            body: 'Vivechak is a ~9 MB local static Go binary (MIT license) with zero outbound network requests and zero telemetry. Plain YAML-frontmattered Markdown inside research/ is the entire database.',
          },
        ],
      },
      {
        id: 'install',
        heading: '1. Install or Run Ephemerally',
        blocks: [
          {
            type: 'code',
            lang: 'markdown',
            label: 'Fastest Native Install (macOS / Linux / Homebrew / Windows)',
            code: `# macOS & Linux static binary (installs both vck and vivechak)
curl -fsSL https://raw.githubusercontent.com/bhaskarjha-dev/vivechak/main/install.sh | sh

# Homebrew (macOS & Linuxbrew)
brew install --cask bhaskarjha-dev/tap/vivechak

# Windows PowerShell
irm https://raw.githubusercontent.com/bhaskarjha-dev/vivechak/main/install.ps1 | iex`,
          },
          {
            type: 'table',
            headers: ['Channel', 'Command / Source'],
            rows: [
              ['Zero-Install (Node.js)', 'npx -y vivechak serve'],
              ['Zero-Install (Python / uv)', 'uvx vck serve'],
              ['Universal Agent Skill', 'npx skills add bhaskarjha-dev/vivechak'],
              ['WinGet / Scoop', 'winget install bhaskarjha-dev.Vivechak  |  scoop install vivechak'],
              ['Docker (GHCR non-root)', 'docker run -i --rm --user "$(id -u):$(id -g)" -e VIVECHAK_PROJECT_ROOT=/workspace -v "${PWD}:/workspace" ghcr.io/bhaskarjha-dev/vivechak:latest serve'],
              ['Nix / NixOS', 'nix run github:bhaskarjha-dev/vivechak'],
              ['Go 1.26+ Toolchain', 'go install github.com/bhaskarjha-dev/vivechak/cmd/vivechak@latest'],
              ['Smithery CLI', 'npx -y @smithery/cli install @bhaskarjha-dev/vivechak --client cursor'],
              ['Linux Packages', '.deb, .rpm, .apk, Arch .pkg.tar.zst on GitHub Releases'],
            ],
          },
        ],
      },
      {
        id: 'setup-host',
        heading: '2. Register With Your AI Coding Host',
        blocks: [
          {
            type: 'text',
            body: 'Run vck setup to merge Vivechak safely into your editor config with automatic timestamped backups (<config>.vivechak-bak-<timestamp>). Preview any edit first with --dry-run.',
          },
          {
            type: 'code',
            lang: 'markdown',
            label: '1-Command Host Registration',
            code: `vck setup                 # auto-detects host in current workspace
vck setup cursor          # Cursor (.cursor/mcp.json)
vck setup claude-code     # Claude Code (.mcp.json / ~/.claude.json)
vck setup vscode          # VS Code (.vscode/mcp.json)
vck setup zed             # Zed (~/.config/zed/settings.json)
vck setup cursor --dry-run`,
          },
        ],
      },
      {
        id: 'first-decision',
        heading: '3. Run Your First Decision & Gate',
        blocks: [
          {
            type: 'code',
            lang: 'markdown',
            label: 'Prompt Your Agent & Gate in Terminal',
            code: `# Ask your coding agent (or invoke native MCP slash prompt /compare, /decision, /project):
"Use Vivechak to compare Pino and Winston for our 15k req/sec Node.js service."
"Use Vivechak to decide whether to migrate 25M events/day from PostgreSQL to ClickHouse."

# Once a One-Way Door ADR is drafted and red-teamed, attest interactively as a human:
vck signoff D-001 --reviewer "Jane Doe"

# Verify workspace integrity & Phase 0 Gate (CI-ready; exits 1 on FAIL):
vck doctor && vck gate --track all`,
          },
        ],
      },
      {
        id: 'upgrade-uninstall',
        heading: '4. Upgrade & Uninstall',
        blocks: [
          {
            type: 'table',
            headers: ['Channel', 'Upgrade', 'Uninstall'],
            rows: [
              ['Shell (install.sh)', 'Re-run install.sh', 'rm /usr/local/bin/vck /usr/local/bin/vivechak (or ~/.local/bin)'],
              ['Homebrew', 'brew update && brew upgrade --cask bhaskarjha-dev/tap/vivechak', 'brew uninstall --cask bhaskarjha-dev/tap/vivechak'],
              ['WinGet / Scoop', 'winget upgrade bhaskarjha-dev.Vivechak', 'winget uninstall bhaskarjha-dev.Vivechak'],
              ['npx / uvx / Docker', 'Pulls latest automatically (docker pull ...)', 'Clear local cache (~/.cache/vivechak)'],
            ],
          },
          {
            type: 'text',
            body: 'Uninstalling only removes the binary. All research/ Markdown artifacts remain safely committed in your Git repository.',
          },
        ],
      },
    ],
  },
  {
    slug: 'scopes',
    group: 'Get Started',
    title: 'Three Scopes & Reversibility Calibration',
    shortTitle: '3 Scopes & R/N/B/X',
    description:
      'Match research rigor to reversal cost across Comparison (C-NNN), Decision (D-NNN), and Project (FAD) scopes — and skip Vivechak for routine code.',
    readMinutes: 4,
    sections: [
      {
        id: 'scope-matrix',
        heading: 'The 3-Scope Spectrum',
        blocks: [
          {
            type: 'text',
            body: 'Principle P2 (Reversibility-Calibrated Rigor) prevents both under-researching irreversible bets and over-engineering trivial library picks.',
          },
          {
            type: 'table',
            headers: ['Dimension', '1. Comparison (C-NNN)', '2. Decision (D-NNN)', '3. Project (FAD)'],
            rows: [
              ['Best for', 'Compare 2–5 bounded options', 'Architectural fork or migration', 'Greenfield platform or major rewrite'],
              ['Slash prompt', '/compare', '/decision', '/project'],
              ['Sessions & Time', '1 session (~5 min)', '1–3 sessions (~30 min)', '4–30 DAG sessions (Hours–Days)'],
              ['DAG Overhead', 'Zero', 'Zero project DAG', 'Full topological DAG + SYN-01 sink'],
              ['Gate Track', 'None (0 gate)', 'Track A or Track B', 'Mandatory Track A + Track B (G1–G12)'],
              ['Output Artifact', 'research/C-NNN-comparison.md', 'research/D-NNN-decision.md', 'research/FAD.md + DECISIONS.md'],
            ],
          },
        ],
      },
      {
        id: 'anti-pattern',
        heading: 'When NOT to Use Vivechak',
        blocks: [
          {
            type: 'callout',
            tone: 'warn',
            title: 'Anti-Pattern Guardrail: Skip Vivechak for Routine Code',
            body: 'Never invoke Vivechak to write functions, debug stack traces, fix compiler/type errors, explain language syntax, or perform local refactors. Let your coding agent execute directly with zero ceremony.',
          },
        ],
      },
      {
        id: 'rnbx',
        heading: 'R/N/B/X Risk Profiling & Door Classification',
        blocks: [
          {
            type: 'text',
            body: 'Decision Scope scores every dilemma across four 0–3 dimensions to select Track A (Two-Way Door) versus Track B (One-Way Door):',
          },
          {
            type: 'bullets',
            items: [
              { lead: 'R — Reversal Cost (0–3):', text: '0 = feature flag · 1 = localized refactor · 2 = multi-service migration · 3 = data/API rewrite.' },
              { lead: 'N — Novelty (0–3):', text: '0 = team operates daily · 1 = adjacent stack · 2 = new paradigm · 3 = unproven in production.' },
              { lead: 'B — Blast Radius (0–3):', text: '0 = single module · 1 = one service · 2 = cross-service contract · 3 = entire product/org.' },
              { lead: 'X — Regulatory / Security (0–3):', text: 'X = 3 (HIPAA, PCI-DSS, SOC 2 security boundary, GDPR deletion) triggers an automatic One-Way Door hard override regardless of R/N/B.' },
            ],
          },
          {
            type: 'callout',
            tone: 'tip',
            title: 'Two-Way vs One-Way Rule of Thumb',
            body: 'One-Way Door when R >= 2, B = 3, or X = 3 → requires Grade A/B fetched primary URLs, rejected alternatives, red-team SHA-256 record (G10), and human TTY sign-off (G11). Otherwise Two-Way Door → move fast at ~70% confidence with a review_trigger (G12).',
          },
        ],
      },
    ],
  },
  {
    slug: 'hosts',
    group: 'Get Started',
    title: 'Host Setup — 10 Verified MCP Clients',
    shortTitle: 'Host Setup (10 IDEs)',
    description:
      'Auto-merge configuration across Cursor, Claude Code, VS Code, Claude Desktop, Antigravity, Zed, Windsurf, OpenCode, Roo Code, and Block Goose.',
    readMinutes: 5,
    sections: [
      {
        id: 'verified-presets',
        heading: 'Verified Host Presets',
        blocks: [
          {
            type: 'text',
            body: 'Every preset below is verified against Vivechak’s JSON/JSONC/YAML config merger. Malformed host files fail closed — vck setup never truncates or corrupts an unparseable config.',
          },
          {
            type: 'table',
            headers: ['Host', 'Shortcut Command', 'Config Path', 'Top-Level Key'],
            rows: [
              ['Cursor', 'vck setup cursor', '.cursor/mcp.json or ~/.cursor/mcp.json', 'mcpServers'],
              ['Claude Code CLI', 'vck setup claude-code', '.mcp.json or ~/.claude.json', 'mcpServers'],
              ['VS Code', 'vck setup vscode', '.vscode/mcp.json', 'servers'],
              ['Claude Desktop', 'vck setup claude', 'claude_desktop_config.json', 'mcpServers'],
              ['Google Antigravity', 'vck setup agy', '~/.gemini/config/mcp_config.json', 'mcpServers'],
              ['Zed', 'vck setup zed', '~/.config/zed/settings.json', 'context_servers'],
              ['Windsurf', 'vck setup windsurf', '~/.codeium/windsurf/mcp_config.json', 'mcpServers'],
              ['OpenCode', 'vck setup opencode', 'opencode.json', 'mcp'],
              ['Roo Code', 'vck setup roo', '.roo/mcp.json', 'mcpServers'],
              ['Block Goose', 'vck setup goose', '~/.config/goose/config.yaml', 'extensions'],
            ],
          },
          {
            type: 'code',
            lang: 'markdown',
            label: 'Any Other MCP Host (Cline, Continue, Kiro, Trae, OpenHands)',
            code: `# Point directly to any JSON/YAML MCP config file:
vck setup /path/to/host-mcp-config.json --dry-run

# Or pipe raw JSON config:
vck mcp-config`,
          },
        ],
      },
      {
        id: 'env-vars',
        heading: 'Dual Environment Variable Ladder',
        blocks: [
          {
            type: 'text',
            body: 'For containers or multi-root IDEs, pass project_root explicitly in tool calls or set VIVECHAK_PROJECT_ROOT (or alias VCK_PROJECT_ROOT). Unexpanded macros like ${workspaceFolder} and unnamespaced variables like WORKSPACE or PROJECT_ROOT are safely ignored to protect container isolation.',
          },
          {
            type: 'code',
            lang: 'json',
            label: 'Explicit Workspace Root Example (.vscode/mcp.json)',
            code: `{
  "servers": {
    "vivechak": {
      "type": "stdio",
      "command": "/usr/local/bin/vck",
      "args": ["serve"],
      "env": {
        "VCK_PROJECT_ROOT": "\${workspaceFolder}"
      }
    }
  }
}`,
          },
        ],
      },
      {
        id: 'agents-md',
        heading: 'Recommended AGENTS.md / CLAUDE.md Rule',
        blocks: [
          {
            type: 'text',
            body: 'Paste this 8-line block into your repository’s AGENTS.md or CLAUDE.md so coding agents invoke Vivechak only on architectural decisions and skip it on routine bugs:',
          },
          {
            type: 'code',
            lang: 'markdown',
            label: 'AGENTS.md Snippet',
            code: `## Architecture Decisions (Vivechak)
When making a hard-to-reverse technical choice (new datastore, protocol, core dependency, public API, or security boundary), use the Vivechak MCP tools to record research in \`research/\`:
1. Call \`vivechak_start(scope="decision", question="<choice>")\`.
2. For 2–5 bounded options, save a graded WEP matrix with \`vivechak_save(kind="comparison", content="<matrix>")\`.
3. Record architectural decisions with \`vivechak_record_decision(id="D-001", content="<adr>")\` and challenge One-Way Doors via \`vivechak_review(mode="red_team", id="D-001")\`.
4. Run \`vivechak_gate()\` (or \`vck gate\` in CI) after a human runs \`vck signoff D-001 --reviewer "<name>"\`.
Skip Vivechak for routine bug fixes, refactors, and reversible local implementation choices.`,
          },
        ],
      },
    ],
  },
  {
    slug: 'manual-workflow',
    group: 'Workflows',
    title: 'Zero-Install Manual Workflow',
    shortTitle: 'Manual Mode (Zero-Install)',
    description:
      'Run the full Vivechak methodology inside Claude, ChatGPT, or Gemini web chat without installing any binary or MCP server.',
    readMinutes: 4,
    sections: [
      {
        id: 'why-manual',
        heading: 'Browser-Only Execution',
        blocks: [
          {
            type: 'text',
            body: 'Vivechak’s methodology generators (GENERATOR-COMPARISON.md, GENERATOR-DECISION.md, GENERATOR-PROJECT.md) are completely self-contained. You do not need to read FRAMEWORK.md or install vck to produce Grade A–E research artifacts.',
          },
          {
            type: 'callout',
            tone: 'tip',
            title: 'Generate a ready-to-paste prompt immediately',
            body: 'Use the in-browser Prompt Studio on /playground (or Setup → Prompt Builder on Home) to customize your question, contender options, and constraints, then copy or download a ready-to-paste Markdown brief.',
          },
        ],
      },
      {
        id: 'workspace-layout',
        heading: 'Standard research/ Folder Layout',
        blocks: [
          {
            type: 'code',
            lang: 'markdown',
            label: 'Plain Git Markdown Layout',
            code: `your-repo/
└── research/
    ├── C-001-comparison.md        # Comparison scope: Weighted Evaluation (WEP) matrix
    ├── D-001-plan.md              # Decision scope: 1–3 session plan (yaml vivechak-plan)
    ├── D-001-decision.md          # Canonical locked ADR
    ├── D-001-R1.md                # Adversarial red-team record bound via SHA-256
    ├── DECISIONS.md               # Auto-compiled decision registry across all D-NNN files
    ├── RESEARCH-PIPELINE.md       # Project scope: multi-layer DAG + session prompts
    ├── sessions/                  # Graded empirical outputs (D-001-S1.md, T1-01.md, ...)
    ├── FAD.md                     # Synthesized Founding Architecture Document
    └── PHASE-0-GATE.md            # Mechanical G1–G12 audit report`,
          },
        ],
      },
      {
        id: 'six-templates',
        heading: 'The 6 Operational Templates',
        blocks: [
          {
            type: 'table',
            headers: ['Template', 'Scopes Used', 'Purpose'],
            rows: [
              ['COMPARISON-SESSION.template.md', 'Comparison, Project', 'Weighted Evaluation Protocol (WEP) matrix + ±20% sensitivity check'],
              ['DECISIONS.template.md', 'Decision, Project', 'YAML-frontmattered ADR with rejected alternatives & review_trigger'],
              ['CONFLICT-RESOLUTION.template.md', 'Decision, Project', 'Heuer ACH-style matrix resolving contradictory evidence'],
              ['SESSION.template.md', 'Project', '9-section research session contract (Prior → Findings → Concerns → Delta)'],
              ['FOUNDING-ARCHITECTURE.template.md', 'Project', 'Map-Reduce synthesis compiling completed sessions into FAD.md'],
              ['PHASE-0-GATE.template.md', 'Project', 'Two-track Track A / Track B pre-codebase exit checklist'],
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'hybrid-parallel',
    group: 'Workflows',
    title: 'Hybrid & Parallel Subagent Execution',
    shortTitle: 'Hybrid & Parallel Agents',
    description:
      'Combine MCP agents with browser Deep Research sessions for cross-vendor triangulation (P7), and fan out independent DAG layers across concurrent subagents safely.',
    readMinutes: 5,
    sections: [
      {
        id: 'hybrid-native',
        heading: 'Hybrid Is the Native Execution Mode',
        blocks: [
          {
            type: 'text',
            body: 'The DAG does not care whether a session file was written by Cursor via MCP, Claude Code subagents, or pasted from Gemini Deep Research — only that research/sessions/<ID>.md exists with valid frontmatter and status: complete.',
          },
          {
            type: 'bullets',
            items: [
              { lead: 'Cross-Vendor Triangulation (P7):', text: 'Run contested One-Way Door sessions on a second frontier model family (e.g., Claude via MCP + Gemini Deep Research in browser) to defeat correlated single-model errors.' },
              { lead: 'Authenticated / Private Sources:', text: 'Run sessions requiring internal wikis, vendor consoles, or private repos manually, then return the file to research/sessions/ and call vivechak_review(mode="validate").' },
              { lead: 'Manual Session Card Handoff:', text: 'Agents present the Session ID, Reason, Full Prompt, Return File Path, and Decline Path ("run it yourself") cleanly.' },
            ],
          },
        ],
      },
      {
        id: 'parallel-swarms',
        heading: 'Parallel Subagents & parallelism_hint',
        blocks: [
          {
            type: 'text',
            body: 'When multiple DAG nodes in the same layer have satisfied dependencies, vivechak_next returns other_ready_sessions and parallelism_hint so coordinator agents can dispatch concurrent subagents immediately.',
          },
          {
            type: 'code',
            lang: 'json',
            label: 'vivechak_next Parallel Response Excerpt',
            code: `{
  "ok": true,
  "message": "Ready session T1-01: Primary Database Engine",
  "data": {
    "session_id": "T1-01",
    "other_ready_sessions": ["T1-02", "T1-03"],
    "parallelism_hint": "PARALLEL EXECUTION AVAILABLE: 3 independent sessions can run simultaneously (T1-01, T1-02, T1-03)."
  }
}`,
          },
        ],
      },
      {
        id: 'locking',
        heading: 'Advisory Locking & Atomic Write Guarantees',
        blocks: [
          {
            type: 'table',
            headers: ['MCP Tool', 'Lock Target', 'Timeout', 'Guarantee'],
            rows: [
              ['vivechak_save', 'research/sessions/[ID].md or FAD.md', '5s', 'Exponential backoff + atomic temp rename (monotonic tmpFileCounter on Windows)'],
              ['vivechak_record_decision', 'Target D-*.md + DECISIONS.md', '10s', 'Serialized registry compilation with natural ID sorting'],
              ['vivechak_amend', 'Target artifact', '5s', 'Preserves history + computes W-STALE-DOWNSTREAM DAG dependents'],
              ['vivechak_replan', 'RESEARCH-PIPELINE.md', '5s', 'Eager flock acquired before DAG read; rejects cycles or removing completed nodes'],
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'examples',
    group: 'Workflows',
    title: 'Real Adoption Walkthroughs',
    shortTitle: 'Walkthrough Examples',
    description:
      'Annotated end-to-end artifacts across all three scopes: Pino vs Winston (C-001), ClickHouse Migration (D-001), and Katha Platform Architecture (FAD).',
    readMinutes: 6,
    sections: [
      {
        id: 'example-comparison',
        heading: '1. Comparison Scope: Pino vs Winston (C-001)',
        blocks: [
          {
            type: 'text',
            body: 'Goal: Choose a Node.js structured logger for a 15,000 req/sec microservice in 1 session (~5 minutes) with zero DAG or Phase 0 Gate overhead.',
          },
          {
            type: 'code',
            lang: 'markdown',
            label: 'research/C-001-comparison.md (Excerpt)',
            code: `---
id: C-001
type: comparison
status: complete
door_type: two-way
---
# C-001: High-Throughput Node.js Logger Comparison

| Criterion | Weight | Pino | Winston | Bunyan |
|---|---:|---:|---:|---:|
| Event-Loop Latency | 0.35 | 5 [B · fetched] | 2 [B · fetched] | 3 [B · fetched] |
| GC & Heap Pressure | 0.25 | 5 [A · fetched] | 3 [B · fetched] | 4 [A · fetched] |
| Transport Ecosystem | 0.22 | 4 [A · fetched] | 5 [A · fetched] | 2 [C · fetched] |
| Maintenance & CVEs | 0.18 | 5 [A · fetched] | 4 [A · fetched] | 1 [A · fetched] |

## ±20% Sensitivity Verdict: ROBUST WINNER — Pino (4.82 vs 3.16)
Failure mode: async worker logs can drop on SIGKILL unless pino.final() / flushSync is wired.`,
          },
        ],
      },
      {
        id: 'example-decision',
        heading: '2. Decision Scope: PostgreSQL → ClickHouse (D-001)',
        blocks: [
          {
            type: 'text',
            body: 'Goal: Resolve an irreversible One-Way Door analytics migration (25M events/day) via 2 focused sessions, adversarial red-team challenge D-001-R1, and interactive human TTY sign-off.',
          },
          {
            type: 'auditor-cta',
            presetId: 'passing-adr',
            label: 'Open D-001 in Live ADR Auditor →',
            desc: 'Inspect live G5–G12 verification, SHA-256 decision_hash computation, and try tampering with the outcome in-browser.',
          },
        ],
      },
      {
        id: 'example-project',
        heading: '3. Project Scope: Katha Platform DAG → FAD',
        blocks: [
          {
            type: 'text',
            body: 'Goal: Architect an interactive collaborative novel-writing platform from scratch (character graph persistence, Yjs vs OT sync, GDPR EU/US compliance) using a 4-session topological DAG terminating at SYN-01.',
          },
          {
            type: 'code',
            lang: 'yaml',
            label: 'research/RESEARCH-PIPELINE.md — yaml vivechak-plan block',
            code: `plan: PROJECT
sessions:
  - {id: T1-01, title: Graph Persistence Landscape, layer: 1, door: one-way, informs: [D-001], depends: []}
  - {id: T1-02, title: "Collaborative Sync: Yjs vs OT", layer: 1, door: two-way, depends: []}
  - {id: T2-01, title: PostgreSQL + AGE vs Neo4j, layer: 2, door: one-way, informs: [D-001], depends: [T1-01]}
  - {id: SYN-01, title: Founding Architecture Document, layer: 3, kind: synthesis, depends: [T1-02, T2-01]}
decisions:
  - {id: D-001, title: Primary graph datastore, door: one-way}`,
          },
          {
            type: 'text',
            body: 'Notice how T1-01 and T1-02 run concurrently in Layer 1, T2-01 receives T1-01’s findings wrapped in <upstream-findings trust="untrusted-data">, and SYN-01 stays locked by the Terminal Synthesis Sink Guard until 100% of upstream sessions complete.',
          },
        ],
      },
    ],
  },
  {
    slug: 'cli',
    group: 'Reference',
    title: 'CLI Commands & CI Merge Gates',
    shortTitle: 'CLI & CI Gates',
    description:
      'Every vck / vivechak subcommand, flag, exit code, interactive TTY signoff flow, and GitHub Actions / GitLab CI pipeline template.',
    readMinutes: 4,
    sections: [
      {
        id: 'commands',
        heading: 'CLI Command Reference',
        blocks: [
          {
            type: 'table',
            headers: ['Command', 'Flags / Usage', 'Behavior'],
            rows: [
              ['vck setup <host|path>', '--dry-run (alias: install)', 'Safe JSON/JSONC/YAML config merge with timestamped backup'],
              ['vck serve', '(default over pipe)', 'Starts MCP stdio transport; all slog logs route strictly to stderr'],
              ['vck doctor [path]', 'Optional workspace path', 'Checks .vivechak.json, orphaned sessions, YAML frontmatter, UTF-8, stale refs'],
              ['vck gate [flags] [path]', '--track <all|track_a|track_b> --format <text|json> --verbose', 'Evaluates G1–G12, writes research/PHASE-0-GATE.md, exits 0 (PASS) or 1 (FAIL)'],
              ['vck signoff <D-id>', '--reviewer "<name>"', 'Interactive /dev/tty attestation writing reviewed_hash; refuses pipes (E-TTY-REQUIRED)'],
              ['vck mcp-config', 'Pipeable JSON stdout', 'Emits universal MCP JSON block for custom clients'],
              ['vck version', '-v / --version', 'Prints release version, commit SHA, and build timestamp'],
            ],
          },
        ],
      },
      {
        id: 'ci-pipelines',
        heading: 'Enforcing Phase 0 Gates in CI',
        blocks: [
          {
            type: 'code',
            lang: 'yaml',
            label: '.github/workflows/vivechak-gate.yml',
            code: `name: Vivechak Phase 0 Gate
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
      - name: Verify workspace & enforce Track A / Track B gate
        run: |
          vck doctor
          vck gate --track all --verbose`,
          },
          {
            type: 'code',
            lang: 'markdown',
            label: 'Interactive MCP Protocol Inspection',
            code: `npx @modelcontextprotocol/inspector vck serve`,
          },
        ],
      },
    ],
  },
  {
    slug: 'mcp-reference',
    group: 'Reference',
    title: 'MCP Surface — 9 Tools, 4 Prompts, 8 Resources',
    shortTitle: 'MCP Surface',
    description:
      'Complete Model Context Protocol specification: 9 consolidated tools, Guided Worker response envelope, 4 slash prompts, and 8 read-only vivechak:// resources.',
    readMinutes: 5,
    sections: [
      {
        id: 'tools-table',
        heading: '9 Consolidated MCP Tools',
        blocks: [
          {
            type: 'text',
            body: 'Always-loaded ServerInstructions stay under 600 bytes. Every successful response follows the Guided Worker envelope ({ok, message, data, warnings, next: {tool, args, why}}).',
          },
          {
            type: 'table',
            headers: ['Tool', 'Required Params', 'Access', 'Responsibility'],
            rows: [
              ['vivechak_start', 'scope, question', 'RW', 'Initialize research/, allocate C-NNN/D-NNN, return front-loaded brief'],
              ['vivechak_save', 'kind, content', 'RW', 'Validate (L1–L3 + Q-* coach) & atomically persist comparison, plan, session, or fad'],
              ['vivechak_record_decision', 'id', 'RW', 'Create/update canonical D-NNN-decision.md (supports auto_draft_from & supersedes) + compile DECISIONS.md'],
              ['vivechak_next', '(none)', 'RO', 'Topologically resolve next ready session, inject upstream data, hold SYN-01 sink'],
              ['vivechak_status', '(none)', 'RO', 'Workspace health, progress metrics, summary/table/mermaid rendering'],
              ['vivechak_review', 'mode', 'RW*', 'Dry-run validate, evidence audit, consistency check, or red_team writing D-NNN-R1.md'],
              ['vivechak_amend', 'id, note', 'RW', 'Append dated post-hoc amendments & flag W-STALE-DOWNSTREAM dependents'],
              ['vivechak_replan', 'plan, op', 'RW', 'Mutate active yaml vivechak-plan DAG (add/remove/update_deps/update_prompt)'],
              ['vivechak_gate', '(none)', 'RW', 'Evaluate G1–G12 across Track A/B & persist research/PHASE-0-GATE.md'],
            ],
          },
        ],
      },
      {
        id: 'prompts-resources',
        heading: '4 Slash Prompts & 8 Read-Only Resources',
        blocks: [
          {
            type: 'table',
            headers: ['Prompt', 'Arguments', 'Workflow'],
            rows: [
              ['/compare', 'options (req), criteria, context', 'Comparison scope → web search → WEP matrix in C-NNN-comparison.md'],
              ['/decision', 'question (req), context', 'Decision scope → 1–3 sessions → ADR → red_team → vck signoff'],
              ['/project', 'vision (req), constraints', 'Project scope → DAG → sessions → FAD.md → vivechak_gate'],
              ['/gate', 'decision (optional D-ID)', 'Evaluate G1–G12 and surface exact fixes or vck signoff command'],
            ],
          },
          {
            type: 'bullets',
            items: [
              { lead: 'Templates (6):', text: 'vivechak://templates/{decisions, comparison, fad, conflict-resolution, gate, session}' },
              { lead: 'Methodology Cards (2):', text: 'vivechak://methodology/grades · vivechak://methodology/principles' },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'gate-rules',
    group: 'Reference',
    title: 'Phase 0 Exit Gate (Rules G1–G12)',
    shortTitle: 'Phase 0 Gate (G1–G12)',
    description:
      'Mechanical specification of Track A (Two-Way Doors) and Track B (One-Way Doors) exit rules enforced by vivechak_gate and vck gate.',
    readMinutes: 5,
    sections: [
      {
        id: 'disclaimer',
        heading: 'Dual-Track Philosophy & Scope',
        blocks: [
          {
            type: 'callout',
            tone: 'note',
            title: 'Honest Architectural Disclaimer',
            body: 'The Phase 0 Gate is necessary, not sufficient: it mechanically verifies structure, hashes, and the agent’s reported labels — Vivechak does not fetch or verify external URLs itself. Interactive vck signoff raises accountability via typed human attestation rather than acting as a cryptographic security boundary.',
          },
          {
            type: 'auditor-cta',
            presetId: 'broken-draft',
            label: 'Test G5–G12 Live on a Broken Draft →',
            desc: 'Watch Vivechak catch recalled Grade A claims, stubs, missing triggers, and missing SHA-256 signoff live in your browser.',
          },
        ],
      },
      {
        id: 'ledger',
        heading: 'Mechanical Rules Ledger (G1–G12)',
        blocks: [
          {
            type: 'table',
            headers: ['Rule', 'Track', 'Name', 'Verification Criteria'],
            rows: [
              ['G1', 'Track B', 'Plan & DAG Validity', 'Parses fenced yaml vivechak-plan; acyclic; project pipelines have 1 synthesis sink.'],
              ['G2', 'Track B', 'Session Completeness', 'All non-synthesis sessions have status: complete and non-stub content.'],
              ['G3', 'Track B', 'FAD Synthesis Contract', 'Project scope has completed FAD.md with all accepted ADRs in Locked Registry.'],
              ['G4', 'Track B', 'Decision Traceability', 'Every decision ID in plan or informs_decisions has an ADR in research/.'],
              ['G5', 'Track B', 'Locked ADR Status', 'Target ADRs are locked (accepted, superseded, rejected); zero proposed.'],
              ['G6', 'Track B', 'Grade A/B URL Depth', '>=2 Grade A/B claims each on a line or ledger row with explicit https:// URL.'],
              ['G7', 'Track B', 'Verification Provenance', '>=2 counted claims carry fetched or human label (recalled/cached never count).'],
              ['G8', 'Track B', 'No Stubs & Rejected Alts', 'Zero unexpanded template placeholders + substantive rejected alternatives.'],
              ['G9', 'Track B', 'Measurable Review Trigger', 'Concrete quantitative metric or calendar date in review_trigger frontmatter.'],
              ['G10', 'Track B', 'Red-Team SHA-256 Binding', 'Current research/D-NNN-R<k>.md matches decision_hash + >=50 chars cited in ## Challenge Findings.'],
              ['G11', 'Track B', 'Human TTY Sign-Off', 'Valid interactive vck signoff attestation (human_reviewed: true, reviewed_by, reviewed_at, matching reviewed_hash).'],
              ['G12', 'Track A', 'Two-Way Reversibility', 'Confirms reversibility rationale, non-placeholder content, and review_trigger.'],
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'codes',
    group: 'Reference',
    title: 'Diagnostic, Warning & Coaching Codes',
    shortTitle: 'Diagnostic Codes',
    description:
      'Structured operational errors (E-*), structural validations (V-*), non-blocking warnings (W-*), and real-time Quality Coach observations (Q-*).',
    readMinutes: 4,
    sections: [
      {
        id: 'errors-v',
        heading: 'Operational Errors (E-*) & Structural Checks (V-*)',
        blocks: [
          {
            type: 'table',
            headers: ['Code', 'Meaning', 'Remediation (fix)'],
            rows: [
              ['E-HUMAN-ONLY-FIELD', 'Agent attempted to set human_reviewed or reviewed_hash.', 'Remove sign-off fields and ask a human to run vck signoff <D-id> in TTY.'],
              ['E-ROOT-UNRESOLVED', '7-step fail-closed ladder could not find a safe project root.', 'Pass explicit project_root pointing to your repository root.'],
              ['E-CONFINEMENT', 'Target artifact escaped os.Root-confined research/.', 'Write artifacts strictly under research/ inside resolved workspace.'],
              ['E-TTY-REQUIRED', 'vck signoff invoked without interactive terminal.', 'Run vck signoff directly in a human terminal (/dev/tty / CONIN$).'],
              ['E-PLACEHOLDER-REMAINS', 'Unexpanded bracketed template stubs remain.', 'Replace placeholders with grounded findings before marking accepted.'],
              ['V-PLAN-CYCLE', 'DAG contains a cycle or depends on synthesis sink.', 'Keep sessions acyclic and let synthesis depend on [ALL].'],
              ['V-OWD-VAGUE-PROVENANCE', 'One-Way Door Grade A/B claim lacks concrete URL anchor.', 'Attach a canonical https:// URL directly alongside the claim.'],
              ['V-CMP-WEIGHTS', 'WEP criterion weights missing or do not sum to 1.0.', 'Normalize positive criterion weights to 1.00 (100%).'],
            ],
          },
        ],
      },
      {
        id: 'warnings-q',
        heading: 'Advisory Warnings (W-*) & Cognitive Quality Coach (Q-*)',
        blocks: [
          {
            type: 'table',
            headers: ['Code', 'Signal', 'Coaching Guidance'],
            rows: [
              ['W-RECALLED-GRADE-CAP', 'Recalled/parametric claim graded above Grade D.', 'Cap model recall at Grade D or verify via live web search.'],
              ['W-STALE-DOWNSTREAM', 'Completed downstream session predates an upstream amendment.', 'Review listed downstream sessions and run vivechak_amend if needed.'],
              ['Q-BIAS', '## Delta reports zero contradicted or updated beliefs.', 'Actively test disconfirming evidence and document revised priors.'],
              ['Q-CONCERNS', '## Discovered Concerns missing or <50 chars.', 'Detail concrete failure modes, scaling cliffs, and operational caveats.'],
              ['Q-DEPTH', 'Fewer than recommended 4–7 graded key findings.', 'Expand empirical findings backed by independent primary sources.'],
              ['Q-FRESHNESS', 'Cites version-sensitive claims older than 2 years.', 'Verify against current upstream documentation.'],
              ['Q-RIGOR', 'Recommends option without evaluating rejected contenders.', 'Add ## Alternatives Considered weighing rejected trade-offs.'],
              ['Q-STRUCTURE', 'Session omits ## Prior or ## Delta sections.', 'Track explicit belief shift from Prior to Delta.'],
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'methodology',
    group: 'Architecture',
    title: 'Methodology, Security & Troubleshooting',
    shortTitle: 'Methodology & Security',
    description:
      'The 8 Core Principles (P1–P8), Grade A–E evidence taxonomy, Go 1.26 os.Root confinement, 7-step fail-closed workspace ladder, and vck doctor diagnostics.',
    readMinutes: 6,
    sections: [
      {
        id: 'principles',
        heading: 'The 8 Core Principles (P1–P8)',
        blocks: [
          {
            type: 'table',
            headers: ['ID', 'Principle', 'Core Mandate'],
            rows: [
              ['P1', 'Context Architecture Law', 'Decompose by attention budget & coupling; mandate map-reduce synthesis after decomposition.'],
              ['P2', 'Reversibility-Calibrated Rigor', 'Fast spikes for Two-Way Doors (~70% confidence); relentless falsification for One-Way Doors.'],
              ['P3', 'Evidentiary Grounding', 'Every claim carries Grade A–E, modifiers, and verification method; recalled memory caps at Grade D.'],
              ['P4', 'Prescriptive Scope, Dynamic Method', 'Front-load WHAT/WHY/BOUNDARIES; zero persona roleplay, zero hardcoded search quotas, zero drip-fed turns.'],
              ['P5', 'Commodity-Maximized Composition', 'Compose 100% commodity infrastructure (auth, queues, DBs); build custom strictly for differentiating domain logic.'],
              ['P6', 'Dual-Audience Artifacts', 'Hybrid Markdown + YAML frontmatter in Git IS the database for humans and agents alike.'],
              ['P7', 'Staged Triangulation', 'Single-model default → critique probe → cross-vendor triangulation for contested One-Way Doors.'],
              ['P8', 'Structured Falsification', 'Hunt disconfirming evidence, log rejected alternatives, lock review_trigger thresholds, run 12-month premortems.'],
            ],
          },
        ],
      },
      {
        id: 'security-ladder',
        heading: 'Go 1.26 os.Root & 7-Step Fail-Closed Ladder',
        blocks: [
          {
            type: 'text',
            body: 'Every filesystem write is strictly jailed inside research/ using Go 1.26’s os.Root capability handle so symlinks or ../ traversals can never touch application source code. Workspace discovery evaluates strictly in order and fails closed:',
          },
          {
            type: 'bullets',
            items: [
              { lead: '01 Explicit project_root:', text: 'Highest precedence; validated against SafeRoot and normalized if pointing inside research/.' },
              { lead: '02 Single MCP client root:', text: 'Queried once per session (200ms timeout); refreshes on notifications/roots/list_changed.' },
              { lead: '03 Namespaced Env Ladder:', text: 'VIVECHAK_PROJECT_ROOT → VCK_PROJECT_ROOT; ignores unexpanded ${workspaceFolder} and unnamespaced vars.' },
              { lead: '04 Per-Session Memory:', text: 'Remembers last resolved root within that single session only.' },
              { lead: '05 Marker Walk-Up:', text: 'Walks up from cwd for research/.vivechak.json, stopping strictly before $HOME or system directories.' },
              { lead: '06 Guarded Working Dir:', text: 'Accepts cwd only if a project anchor (.git, go.mod, package.json, Cargo.toml) exists and passes SafeRoot.' },
              { lead: '07 Fail-Closed Refusal:', text: 'Never guesses or writes to /, $HOME, /Applications, or Program Files; emits E-ROOT-UNRESOLVED.' },
            ],
          },
        ],
      },
      {
        id: 'troubleshooting',
        heading: 'Troubleshooting & Lock Files',
        blocks: [
          {
            type: 'bullets',
            items: [
              { lead: 'Run vck doctor first:', text: 'Inspects research/.vivechak.json, orphaned sessions, YAML frontmatter syntax, non-UTF-8 bytes, and superseded decision references.' },
              { lead: 'macOS GUI PATH / Windows Escaping:', text: 'Desktop apps often miss ~/.zshrc PATH additions — run vck setup <host> to write exact binary paths and valid escaped JSON.' },
              { lead: '0-byte *.lock files:', text: 'Empty advisory lock files under research/ remain by design after flock/LockFileEx release to eliminate TOCTOU unlink races, and are gitignored via research/.gitignore.' },
            ],
          },
        ],
      },
    ],
  },
];

export function hasDocPage(slug: string): boolean {
  return DOC_PAGES.some((p) => p.slug === slug);
}

export function findDocPage(slug: string): DocPage {
  return DOC_PAGES.find((p) => p.slug === slug) ?? DOC_PAGES[0];
}

export interface DocSearchEntry {
  id: string;
  slug: string;
  sectionId: string;
  pageTitle: string;
  heading: string;
  searchText: string;
}

function sectionPlainText(sec: DocSection): string {
  const parts: string[] = [sec.heading];
  for (const b of sec.blocks) {
    if (b.type === 'text') parts.push(b.body);
    else if (b.type === 'callout') parts.push(b.title, b.body);
    else if (b.type === 'code') parts.push(b.label || '', b.code);
    else if (b.type === 'bullets') {
      for (const it of b.items) parts.push(it.lead || '', it.text);
    } else if (b.type === 'table') {
      parts.push(...b.headers);
      for (const row of b.rows) parts.push(...row);
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export const DOC_SEARCH_INDEX: DocSearchEntry[] = DOC_PAGES.flatMap((page) =>
  page.sections.map((sec) => ({
    id: `sec-${page.slug}-${sec.id}`,
    slug: page.slug,
    sectionId: sec.id,
    pageTitle: page.shortTitle,
    heading: sec.heading,
    searchText: `${page.title} ${page.shortTitle} ${page.group} ${sectionPlainText(sec)}`.toLowerCase(),
  }))
);

export function docPageToMarkdown(page: DocPage): string {
  const out: string[] = [`# ${page.title}`, '', `> ${page.description}`, ''];
  for (const sec of page.sections) {
    out.push(`## ${sec.heading}`, '');
    for (const b of sec.blocks) {
      if (b.type === 'text') out.push(b.body, '');
      else if (b.type === 'callout') out.push(`> **${b.title}:** ${b.body}`, '');
      else if (b.type === 'code') out.push('```' + b.lang, b.code, '```', '');
      else if (b.type === 'bullets') {
        for (const it of b.items) out.push(`- ${it.lead ? `**${it.lead}** ` : ''}${it.text}`);
        out.push('');
      } else if (b.type === 'table') {
        out.push(`| ${b.headers.join(' | ')} |`);
        out.push(`| ${b.headers.map(() => '---').join(' | ')} |`);
        for (const row of b.rows) out.push(`| ${row.join(' | ')} |`);
        out.push('');
      }
    }
  }
  return out.join('\n').trim() + '\n';
}

export function compileAllDocsMarkdown(): string {
  const header = [
    '# Vivechak (vck) v0.1.0 — Complete Release Documentation',
    '',
    '> Canonical full-text manual compiled from https://vivechak.bhaskarjha.dev/docs/*',
    '> MIT License · Local-first Go MCP server & CLI · https://github.com/bhaskarjha-dev/vivechak',
    '',
    '---',
    '',
  ].join('\n');

  return (
    header +
    DOC_PAGES.map(
      (p) => `<!-- Route: https://vivechak.bhaskarjha.dev/docs/${p.slug} -->\n\n${docPageToMarkdown(p)}`
    ).join('\n---\n\n')
  );
}
