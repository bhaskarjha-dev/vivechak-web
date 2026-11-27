import { renderToString } from 'react-dom/server';
import { App } from '@/app/App';
import { ArchitecturePage } from '@/features/architecture/ArchitecturePage';
import { DOC_PAGES, compileAllDocsMarkdown } from '@/features/docs/docsData';
import { DocsPortal } from '@/features/docs/DocsPortal';
import { PlaygroundStudio } from '@/features/playground/PlaygroundStudio';
import { SetupPage } from '@/features/setup/SetupPage';

export interface PrerenderMeta {
  route: string;
  title: string;
  description: string;
}

export function getRoutes(): PrerenderMeta[] {
  return [
    {
      route: '/',
      title: 'Vivechak — Prove Decisions Before Code',
      description:
        'Make AI coding agents prove hard architectural decisions with cited research (Grade A-E), red-team SHA-256 checks, and human sign-off — stored locally in plain Git Markdown.',
    },
    {
      route: '/architecture',
      title: 'System Architecture & Security — Vivechak',
      description:
        'Inspect Vivechak’s topological session DAG, SYN-01 sink guard, Git Markdown storage, 9-tool MCP surface (9 KB), Grades A–E, and Go 1.26 os.Root 7-step confinement.',
    },
    {
      route: '/setup',
      title: 'Install, 10 MCP Hosts & CI Setup — Vivechak',
      description:
        'Install the ~9 MB local Go MCP server across 12 channels, auto-configure 10 verified hosts with --dry-run backups, add the Agent Skill / AGENTS.md, or wire GitHub Actions CI.',
    },
    {
      route: '/playground',
      title: 'Playground & ADR Auditor — Vivechak',
      description:
        'Live in-browser Vivechak ADR & Session Gate Auditor (G5–G12 + Q-* quality coaching), Scope & R/N/B/X risk profiler, editable WEP ±20% builder, and zero-install prompt studio.',
    },
    {
      route: '/docs',
      title: 'Documentation — Vivechak v0.1.0',
      description:
        'Complete Vivechak v0.1.0 documentation: Quickstart, 3 Scopes, 10 MCP Hosts, Zero-Install Manual Mode, Hybrid & Parallel Agents, CLI, MCP Reference, G1–G12 Gates, and Methodology.',
    },
    ...DOC_PAGES.map((p) => ({
      route: `/docs/${p.slug}`,
      title: `${p.shortTitle} — Vivechak Docs`,
      description: p.description,
    })),
  ];
}

export function renderRoute(route: string): string {
  return renderToString(
    <App
      initialPath={route}
      preloadedArchitecture={ArchitecturePage}
      preloadedSetup={SetupPage}
      preloadedDocs={DocsPortal}
      preloadedPlayground={PlaygroundStudio}
    />
  );
}

export function renderLlmsFullText(): string {
  return compileAllDocsMarkdown();
}
