import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, '..');

// Discover repository root (local dev) or remote raw URL (CI/CD)
function findLocalRepoDir() {
  const candidates = [
    process.env.VIVECHAK_REPO_DIR,
    path.resolve(WEB_ROOT, '../..'),
    path.resolve(WEB_ROOT, '..'),
    path.resolve(WEB_ROOT, '../../vivechak'),
  ].filter(Boolean);

  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'go.mod')) && fs.existsSync(path.join(c, 'docs'))) {
      return path.resolve(c);
    }
  }
  return null;
}

const LOCAL_REPO_DIR = findLocalRepoDir();
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/bhaskarjha-dev/vivechak/main';

console.log(`[sync-docs] Core repository path: ${LOCAL_REPO_DIR ? LOCAL_REPO_DIR : 'remote GitHub raw (' + GITHUB_RAW_BASE + ')'}`);

async function readRepoFile(relPath) {
  if (LOCAL_REPO_DIR) {
    const absPath = path.join(LOCAL_REPO_DIR, relPath);
    if (fs.existsSync(absPath)) {
      return fs.readFileSync(absPath, 'utf-8');
    }
  }
  const url = `${GITHUB_RAW_BASE}/${relPath.replace(/\\/g, '/')}`;
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch (err) {
    console.warn(`[sync-docs] Failed to fetch ${url}: ${err.message}`);
  }
  return null;
}

function cleanSlug(text) {
  return text
    .toLowerCase()
    .replace(/^\d+[\.\-\s]+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'section';
}

function parseMarkdownToBlocks(markdown, options = {}) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  let currentSec = { id: 'overview', heading: 'Overview', blocks: [] };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // ## Section Heading
    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (currentSec.blocks.length > 0 || currentSec.heading !== 'Overview') {
        sections.push(currentSec);
      }
      const rawHeading = h2Match[1].trim();
      const customId = options.slugMap?.[rawHeading] || cleanSlug(rawHeading);
      currentSec = {
        id: customId,
        heading: rawHeading.replace(/^\d+\.\s*/, ''),
        blocks: [],
      };
      i++;
      continue;
    }

    // Skip top # Title or Horizontal rule
    if (line.match(/^#\s+/) || line.match(/^---+\s*$/)) {
      i++;
      continue;
    }

    // Workflow Diagram Detection
    if (line.includes('workflow-dark.svg') || line.includes('workflow-light.svg')) {
      currentSec.blocks.push({ type: 'workflow-diagram' });
      // Skip accompanying picture tags or image lines
      while (i < lines.length && !lines[i].includes('</picture>') && !lines[i].includes('</p>')) {
        i++;
      }
      i++;
      continue;
    }

    // GitHub Alert Callout (> [!NOTE], > [!TIP], > [!WARNING], > [!IMPORTANT], > [!CAUTION])
    const alertMatch = line.match(/^>\s+\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)$/i);
    if (alertMatch) {
      const typeStr = alertMatch[1].toUpperCase();
      const tone = typeStr === 'WARNING' || typeStr === 'CAUTION' ? 'warn' : typeStr === 'TIP' ? 'tip' : 'note';
      let title = alertMatch[2].trim() || (tone === 'tip' ? 'Tip' : tone === 'warn' ? 'Warning' : 'Note');
      const bodyLines = [];
      i++;
      while (i < lines.length && lines[i].startsWith('>')) {
        let bLine = lines[i].replace(/^>\s?/, '');
        if (!title && bLine.startsWith('**')) {
          const boldMatch = bLine.match(/^\*\*([^*]+)\*\*(.*)$/);
          if (boldMatch) {
            title = boldMatch[1];
            bLine = boldMatch[2].trim();
          }
        }
        if (bLine) bodyLines.push(bLine);
        i++;
      }
      currentSec.blocks.push({
        type: 'callout',
        tone,
        title: title.replace(/[:\-]$/, '').trim(),
        body: bodyLines.join(' ').trim(),
      });
      continue;
    }

    // General Blockquote (> ...)
    if (line.startsWith('>')) {
      const bLines = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        bLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const bText = bLines.join(' ').trim();
      if (bText) {
        currentSec.blocks.push({
          type: 'callout',
          tone: 'note',
          title: 'Note',
          body: bText,
        });
      }
      continue;
    }

    // Code Fence (```)
    const codeMatch = line.match(/^```([a-zA-Z0-9_\-\.]*)\s*(.*)$/);
    if (codeMatch) {
      let lang = (codeMatch[1] || 'markdown').toLowerCase();
      if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) lang = 'markdown';
      if (!['markdown', 'json', 'yaml'].includes(lang)) lang = 'markdown';

      const label = codeMatch[2].trim() || options.codeLabels?.[currentSec.id] || (lang === 'json' ? 'JSON' : lang === 'yaml' ? 'YAML' : 'Terminal');
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      currentSec.blocks.push({
        type: 'code',
        lang,
        label,
        code: codeLines.join('\n').trim(),
      });
      continue;
    }

    // Markdown Table (| header | header |)
    if (line.startsWith('|') && line.includes('|', 1)) {
      const headers = line.split('|').slice(1, -1).map((c) => c.trim());
      i++;
      // Skip separator row |---|---|
      if (i < lines.length && lines[i].startsWith('|') && lines[i].includes('---')) {
        i++;
      }
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|') && lines[i].includes('|', 1)) {
        const row = lines[i].split('|').slice(1, -1).map((c) => c.trim().replace(/\\\|/g, '|'));
        rows.push(row);
        i++;
      }
      if (headers.length > 0 && rows.length > 0) {
        currentSec.blocks.push({
          type: 'table',
          headers,
          rows,
        });
      }
      continue;
    }

    // Bullet List (- item or * item)
    if (line.match(/^[\-\*]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].match(/^[\-\*]\s+/)) {
        const rawItem = lines[i].replace(/^[\-\*]\s+/, '').trim();
        const boldLeadMatch = rawItem.match(/^(\*\*[^*]+\*\*|`[^`]+`:?)\s*(.*)$/);
        if (boldLeadMatch) {
          items.push({
            lead: boldLeadMatch[1].replace(/\*\*/g, '').trim(),
            text: boldLeadMatch[2].trim(),
          });
        } else {
          items.push({ text: rawItem });
        }
        i++;
      }
      if (items.length > 0) {
        currentSec.blocks.push({
          type: 'bullets',
          items,
        });
      }
      continue;
    }

    // Plain Text Paragraph
    if (line.trim().length > 0) {
      const textLines = [line.trim()];
      i++;
      while (
        i < lines.length &&
        lines[i].trim().length > 0 &&
        !lines[i].startsWith('#') &&
        !lines[i].startsWith('```') &&
        !lines[i].startsWith('|') &&
        !lines[i].startsWith('>') &&
        !lines[i].startsWith('- ') &&
        !lines[i].startsWith('* ')
      ) {
        textLines.push(lines[i].trim());
        i++;
      }
      currentSec.blocks.push({
        type: 'text',
        body: textLines.join(' ').replace(/<[^>]+>/g, ''),
      });
      continue;
    }

    i++;
  }

  if (currentSec.blocks.length > 0) {
    sections.push(currentSec);
  }

  return sections.filter((s) => s.blocks.length > 0);
}

// Complete Manifest of All 11 Core Documentation Pages
const DOC_PAGE_DEFS = [
  {
    slug: 'quickstart',
    group: 'Get Started',
    title: 'Quickstart — Vivechak in 5 Minutes',
    shortTitle: 'Quickstart',
    description: 'Install the ~9 MB static Go binary (vck), auto-configure your MCP editor, and gate your first architectural decision in Git.',
    readMinutes: 4,
    src: 'docs/QUICKSTART.md',
    postProcess: (sections) => {
      // Inject auditor CTA on first-decision
      const sec = sections.find((s) => s.id.includes('first-decision') || s.id.includes('decision'));
      if (sec) {
        sec.blocks.push({
          type: 'auditor-cta',
          presetId: 'sample-comparison',
          label: 'Launch Pino vs Winston Comparison in Playground',
          desc: 'Simulate how Vivechak structures 2–5 option comparisons with WEP scoring and ±20% sensitivity checks.',
        });
      }
      return sections;
    },
  },
  {
    slug: 'scopes',
    group: 'Get Started',
    title: 'The Three Scopes — Comparison, Decision & Project',
    shortTitle: 'Three Scopes',
    description: 'Calibrate research investment to reversal risk: 1-session WEP matrix (5 min), 1–3 session ADR (30 min), or multi-session DAG pipeline.',
    src: 'FRAMEWORK.md',
    scopeSectionOnly: true,
  },
  {
    slug: 'hosts',
    group: 'Get Started',
    title: 'Verified MCP Host Presets & Setup Guides',
    shortTitle: 'Host Presets',
    description: '1-command configuration and auto-detected setup paths across Cursor, Claude Code, VS Code, Google Antigravity, Windsurf, Zed, and Goose.',
    src: 'docs/HOST-SETUP.md',
  },
  {
    slug: 'manual-workflow',
    group: 'Workflows',
    title: 'Zero-Install Manual Workflow',
    shortTitle: 'Manual Mode',
    description: 'Use Vivechak in browser deep-research chats (ChatGPT, Claude.ai, Gemini, Perplexity) with zero local installations and 100% template fidelity.',
    src: 'docs/MANUAL-WORKFLOW.md',
  },
  {
    slug: 'hybrid-parallel',
    group: 'Workflows',
    title: 'Hybrid Execution & Concurrent Subagent Scaling',
    shortTitle: 'Hybrid & Parallel',
    description: 'Combine MCP-automated sessions with browser triangulation, and scale multi-session DAG pipelines across concurrent subagents.',
    src: 'docs/PARALLEL-EXECUTION.md',
  },
  {
    slug: 'examples',
    group: 'Workflows',
    title: 'Adoption Walkthroughs & Dogfood Registry',
    shortTitle: 'Examples',
    description: 'Concrete walkthroughs across all 3 scope levels, plus real-world dogfood decision records audited continuously in CI.',
    src: 'examples/README.md',
  },
  {
    slug: 'cli',
    group: 'Reference',
    title: 'CLI Commands & Diagnostic Codes',
    shortTitle: 'CLI Reference',
    description: 'Complete reference for vck subcommands (doctor, gate, setup, signoff, mcp-config, serve) and fail-closed exit codes.',
    src: 'docs/TROUBLESHOOTING.md',
  },
  {
    slug: 'mcp-reference',
    group: 'Reference',
    title: '9 Consolidated MCP Tools Schema',
    shortTitle: 'MCP Tools',
    description: 'Canonical tool definitions, input schemas, parameter annotations, and advisory locking semantics across the 9-tool MCP surface.',
    src: 'docs/reference/tools.md',
  },
  {
    slug: 'gate-rules',
    group: 'Reference',
    title: 'Phase 0 Exit Gate Rules (G1–G12)',
    shortTitle: 'Gate Rules',
    description: 'Dual-track mechanical pre-codebase exit criteria: Track A reversibility confirmation and Track B evidentiary depth.',
    src: 'docs/reference/gate.md',
    postProcess: (sections) => {
      const sec = sections[sections.length - 1];
      if (sec) {
        sec.blocks.push({
          type: 'auditor-cta',
          presetId: 'sample-project',
          label: 'Test Phase 0 Gate in Live Playground',
          desc: 'Simulate full Track A and Track B exit evaluations against real ADRs with real-time rule clearance indicators.',
        });
      }
      return sections;
    },
  },
  {
    slug: 'codes',
    group: 'Reference',
    title: 'Diagnostic & Quality Coaching Codes (E-*, W-*, Q-*)',
    shortTitle: 'Error Codes',
    description: 'Catalog of all 78 operational errors, structural validation diagnostics, warnings, and non-blocking real-time quality coach codes.',
    src: 'docs/reference/codes.md',
  },
  {
    slug: 'methodology',
    group: 'Architecture',
    title: 'Epistemic Framework & Evidence Grading Specification',
    shortTitle: 'Methodology',
    description: 'The 8 Core Principles, Admiralty-derived A–E evidence grading system, WEP sensitivity analysis, and anti-pattern guardrails.',
    src: 'FRAMEWORK.md',
  },
];

async function syncDocs() {
  console.log('[sync-docs] Compiling documentation from repository source of truth...');
  const compiledPages = [];

  for (const def of DOC_PAGE_DEFS) {
    const rawContent = await readRepoFile(def.src);
    if (!rawContent) {
      console.warn(`[sync-docs] Warning: Could not find ${def.src}, skipping ${def.slug}`);
      continue;
    }

    let markdown = rawContent;
    if (def.scopeSectionOnly) {
      const scopeMatch = markdown.match(/##\s+Principle\s+2:\s+Reversibility-Calibrated\s+Rigor[\s\S]*?(?=##\s+Principle\s+3|$)/i);
      if (scopeMatch) {
        markdown = `# The Three Scopes\n\n> Calibrate research investment to reversal risk.\n\n` + scopeMatch[0];
      }
    }

    let sections = parseMarkdownToBlocks(markdown);
    if (def.postProcess) {
      sections = def.postProcess(sections);
    }

    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const readMinutes = def.readMinutes || Math.max(3, Math.ceil(wordCount / 200));

    compiledPages.push({
      slug: def.slug,
      group: def.group,
      title: def.title,
      shortTitle: def.shortTitle,
      description: def.description,
      readMinutes,
      sections,
    });
    console.log(`[sync-docs] ✓ Processed ${def.slug} from ${def.src} (${sections.length} sections)`);
  }

  // Generate TypeScript code for docsData.ts
  const tsContent = `/**
 * AUTO-GENERATED by scripts/sync_docs.mjs from core repository markdown.
 * DO NOT EDIT MANUALLY. Run 'npm run sync-docs' or 'npm run build' to regenerate.
 * Source: github.com/bhaskarjha-dev/vivechak (v0.1.0)
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

export const DOC_PAGES: DocPage[] = ${JSON.stringify(compiledPages, null, 2)};

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
  return sec.blocks
    .map((b) => {
      switch (b.type) {
        case 'text':
          return b.body;
        case 'callout':
          return \`\${b.title} \${b.body}\`;
        case 'code':
          return b.code;
        case 'table':
          return \`\${b.headers.join(' ')} \${b.rows.map((r) => r.join(' ')).join(' ')}\`;
        case 'bullets':
          return b.items.map((it) => \`\${it.lead || ''} \${it.text}\`).join(' ');
        case 'auditor-cta':
          return \`\${b.label} \${b.desc}\`;
        default:
          return '';
      }
    })
    .join(' ');
}

export const DOC_SEARCH_INDEX: DocSearchEntry[] = DOC_PAGES.flatMap((page) =>
  page.sections.map((sec) => ({
    id: \`sec-\${page.slug}-\${sec.id}\`,
    slug: page.slug,
    sectionId: sec.id,
    pageTitle: page.shortTitle,
    heading: sec.heading,
    searchText: \`\${page.title} \${page.shortTitle} \${page.group} \${sectionPlainText(sec)}\`.toLowerCase(),
  }))
);

export function docPageToMarkdown(page: DocPage): string {
  const out: string[] = [\`# \${page.title}\`, '', \`> \${page.description}\`, ''];
  for (const sec of page.sections) {
    out.push(\`## \${sec.heading}\`, '');
    for (const b of sec.blocks) {
      if (b.type === 'text') out.push(b.body, '');
      else if (b.type === 'callout') out.push(\`> **\${b.title}:** \${b.body}\`, '');
      else if (b.type === 'code') out.push(${JSON.stringify('```')} + b.lang, b.code, ${JSON.stringify('```')}, '');
      else if (b.type === 'bullets') {
        for (const it of b.items) out.push(\`- \${it.lead ? \`**\${it.lead}** \` : ''}\${it.text}\`);
        out.push('');
      } else if (b.type === 'table') {
        out.push(\`| \${b.headers.join(' | ')} |\`);
        out.push(\`| \${b.headers.map(() => '---').join(' | ')} |\`);
        for (const row of b.rows) out.push(\`| \${row.join(' | ')} |\`);
        out.push('');
      }
    }
  }
  return out.join('\\n').trim() + '\\n';
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
  ].join('\\n');

  return (
    header +
    DOC_PAGES.map(
      (p) => \`<!-- Route: https://vivechak.bhaskarjha.dev/docs/\${p.slug} -->\\n\\n\${docPageToMarkdown(p)}\`
    ).join('\\n---\\n\\n')
  );
}
`;

  const targetPath = path.join(WEB_ROOT, 'src', 'features', 'docs', 'docsData.ts');
  fs.writeFileSync(targetPath, tsContent, 'utf-8');
  console.log(`[sync-docs] ✓ Successfully synchronized ${compiledPages.length} documentation pages to ${targetPath}`);
}

syncDocs().catch((err) => {
  console.error('[sync-docs] Fatal error:', err);
  process.exit(1);
});
