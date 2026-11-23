import { renderToString } from 'react-dom/server';
import { App } from '@/app/App';
import { DOC_PAGES, compileAllDocsMarkdown } from '@/features/docs/docsData';
import { DocsPortal } from '@/features/docs/DocsPortal';
import { PlaygroundStudio } from '@/features/playground/PlaygroundStudio';

export interface PrerenderMeta {
  route: string;
  title: string;
  description: string;
}

export function getRoutes(): PrerenderMeta[] {
  return [
    {
      route: '/',
      title: 'Vivechak — Sift Truth Before Code',
      description:
        'Make AI coding agents prove hard architectural decisions with cited research (Grade A-E), red-team SHA-256 checks, and human sign-off — stored locally in plain Git Markdown.',
    },
    {
      route: '/playground',
      title: 'Playground & ADR Auditor — Vivechak',
      description:
        'Live in-browser Vivechak ADR & Session Gate Auditor (G5–G12 + Q-* quality coaching), editable WEP ±20% matrix builder, and zero-install prompt studio.',
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
      preloadedDocs={DocsPortal}
      preloadedPlayground={PlaygroundStudio}
    />
  );
}

export function renderLlmsFullText(): string {
  return compileAllDocsMarkdown();
}
