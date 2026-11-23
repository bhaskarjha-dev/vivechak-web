import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  FileText,
  Hash,
  Info,
  Lightbulb,
  Menu,
  Search,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import {
  DOC_GROUPS,
  DOC_PAGES,
  docPageToMarkdown,
  findDocPage,
  type DocBlock,
} from '@/features/docs/docsData';
import { copyText } from '@/shared/lib/clipboard';
import { renderHighlightedCode } from '@/shared/lib/highlight';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { showToast } from '@/shared/lib/toast';

interface DocsPortalProps {
  slug: string;
  onLaunchAuditorPreset: (presetId: string) => void;
  onOpenPalette?: () => void;
}

export const DocsPortal: React.FC<DocsPortalProps> = ({
  slug,
  onLaunchAuditorPreset,
  onOpenPalette,
}) => {
  const page = findDocPage(slug);
  const pageIndex = DOC_PAGES.findIndex((p) => p.slug === page.slug);
  const prevPage = pageIndex > 0 ? DOC_PAGES[pageIndex - 1] : null;
  const nextPage = pageIndex < DOC_PAGES.length - 1 ? DOC_PAGES[pageIndex + 1] : null;

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeHeading, setActiveHeading] = useState<string>(page.sections[0]?.id ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setActiveHeading(page.sections[0]?.id ?? '');
    setSidebarOpen(false);
  }, [page.slug, page.sections]);

  useEffect(() => {
    const els = page.sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]?.target.id) setActiveHeading(vis[0].target.id);
      },
      { rootMargin: '-18% 0px -65% 0px', threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [page.slug, page.sections]);

  const handleCopy = async (id: string, text: string, label: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    soundEngine.playSieveDrop();
    setCopiedId(id);
    showToast(`Copied ${label}`);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const renderBlock = (block: DocBlock, key: string) => {
    switch (block.type) {
      case 'text':
        return (
          <p key={key} className="doc-p">
            {block.body}
          </p>
        );
      case 'callout': {
        const Icon = block.tone === 'warn' ? AlertTriangle : block.tone === 'tip' ? Lightbulb : Info;
        return (
          <div key={key} className={`doc-callout tone-${block.tone}`}>
            <Icon size={16} className="doc-callout-ico" />
            <div>
              <strong>{block.title}</strong>
              <p>{block.body}</p>
            </div>
          </div>
        );
      }
      case 'workflow-diagram':
        return (
          <figure key={key} className="doc-diagram-frame">
            <img
              src="/assets/workflow-dark.svg"
              alt="Vivechak 5-Stage Decision Lifecycle"
              className="brand-for-dark doc-workflow-img"
            />
            <img
              src="/assets/workflow-light.svg"
              alt="Vivechak 5-Stage Decision Lifecycle"
              className="brand-for-light doc-workflow-img"
            />
            <figcaption className="mono">
              Official Vivechak 5-Stage Decision Lifecycle · Plain Markdown inside research/
            </figcaption>
          </figure>
        );
      case 'code':
        return (
          <div key={key} className="doc-code-wrap">
            <div className="doc-code-head mono">
              <span>{block.label || block.lang.toUpperCase()}</span>
              <button
                type="button"
                className={`dock-copy mono ${copiedId === key ? 'copied' : ''}`}
                onClick={() => void handleCopy(key, block.code, block.label || 'code snippet')}
              >
                {copiedId === key ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId === key ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="dark-code-block doc-pre mono">
              <code>{renderHighlightedCode(block.code, block.lang)}</code>
            </pre>
          </div>
        );
      case 'table':
        return (
          <div key={key} className="doc-table-scroll">
            <table className="doc-table">
              <thead>
                <tr>
                  {block.headers.map((h) => (
                    <th key={h} className="mono">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className={cIdx === 0 ? 'doc-td-lead mono' : ''}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'bullets':
        return (
          <ul key={key} className="doc-bullets">
            {block.items.map((it, idx) => (
              <li key={idx}>
                {it.lead && <strong className="doc-bullet-lead">{it.lead} </strong>}
                <span>{it.text}</span>
              </li>
            ))}
          </ul>
        );
      case 'auditor-cta':
        return (
          <div key={key} className="doc-auditor-banner">
            <div className="doc-auditor-copy">
              <div className="doc-auditor-tag mono">
                <Sparkles size={12} /> INTERACTIVE PLAYGROUND
              </div>
              <strong>{block.label}</strong>
              <p>{block.desc}</p>
            </div>
            <button
              type="button"
              className="btn-saffron btn-sm"
              onClick={() => {
                soundEngine.playSieveDrop();
                onLaunchAuditorPreset(block.presetId);
              }}
            >
              <Terminal size={13} />
              <span>Launch Auditor</span>
            </button>
          </div>
        );
    }
  };

  return (
    <div className="docs-shell">
      <div className="wrap docs-grid">
        {/* Mobile Docs Chapter Selector Bar */}
        <div className="docs-mobile-bar">
          <button
            type="button"
            className="docs-mobile-toggle mono"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={14} /> : <Menu size={14} />}
            <span>
              {page.group} / {page.shortTitle}
            </span>
          </button>
          <button
            type="button"
            className="docs-copy-md-btn mono"
            onClick={() => void handleCopy('md-mob', docPageToMarkdown(page), `${page.slug}.md`)}
          >
            <FileText size={12} />
            <span>Copy MD</span>
          </button>
        </div>

        {/* Left Sidebar Navigation */}
        <aside className={`docs-sidebar ${sidebarOpen ? 'is-open' : ''}`} aria-label="Documentation navigation">
          <div className="docs-side-top">
            <a
              href="/"
              className="docs-back-home mono"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playTick(680);
                navigate('/');
              }}
            >
              <ArrowLeft size={12} />
              <span>Back to Overview</span>
            </a>

            {onOpenPalette && (
              <button
                type="button"
                id="docs-search-btn"
                className="docs-search-pill mono"
                onClick={() => {
                  soundEngine.playTick(800);
                  onOpenPalette();
                }}
              >
                <Search size={12} />
                <span>Search all docs…</span>
                <kbd>⌘K</kbd>
              </button>
            )}
          </div>

          {DOC_GROUPS.map((group) => (
            <div key={group} className="docs-nav-group">
              <div className="docs-nav-group-lbl mono">{group}</div>
              <div className="docs-nav-list">
                {DOC_PAGES.filter((p) => p.group === group).map((p) => {
                  const active = p.slug === page.slug;
                  return (
                    <a
                      key={p.slug}
                      href={`/docs/${p.slug}`}
                      className={`docs-nav-item ${active ? 'active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        soundEngine.playTick(760);
                        navigate(`/docs/${p.slug}`);
                      }}
                    >
                      {p.shortTitle}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="docs-side-foot">
            <a
              href="/playground"
              className="docs-side-play mono"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playSieveDrop();
                navigate('/playground');
              }}
            >
              <Sparkles size={13} />
              <span>Open Live Playground →</span>
            </a>
          </div>
        </aside>

        {/* Center Editorial Article */}
        <article className="docs-article">
          <div className="docs-article-head">
            <div className="docs-crumb-row mono">
              <span className="docs-crumb">
                <BookOpen size={12} /> DOCS · {page.group.toUpperCase()} · {page.readMinutes} MIN READ
              </span>
              <button
                type="button"
                id="btn-copy-doc-markdown"
                className={`docs-copy-md-btn mono ${copiedId === 'doc-md' ? 'copied' : ''}`}
                onClick={() => void handleCopy('doc-md', docPageToMarkdown(page), `${page.slug}.md for AI`)}
                title="Copy full page as clean Markdown for pasting into your AI coding agent"
              >
                {copiedId === 'doc-md' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId === 'doc-md' ? 'Copied Markdown' : 'Copy as Markdown'}</span>
              </button>
            </div>

            <h1 className="docs-h1">{page.title}</h1>
            <p className="docs-lead">{page.description}</p>
          </div>

          <div className="docs-body">
            {page.sections.map((sec) => (
              <section key={sec.id} id={sec.id} className="docs-sec">
                <h2 className="docs-h2">
                  <span>{sec.heading}</span>
                  <button
                    type="button"
                    className="docs-anchor-btn"
                    aria-label={`Copy direct link to ${sec.heading}`}
                    title="Copy direct section link"
                    onClick={() => {
                      const origin =
                        typeof window !== 'undefined' && window.location.origin.startsWith('http')
                          ? window.location.origin
                          : 'https://vivechak.bhaskarjha.dev';
                      const url = `${origin}/docs/${page.slug}#${sec.id}`;
                      if (typeof window !== 'undefined') {
                        window.history.replaceState({}, '', `/docs/${page.slug}#${sec.id}`);
                      }
                      void handleCopy(`anc-${sec.id}`, url, `#${sec.id} link`);
                    }}
                  >
                    <Hash size={14} />
                  </button>
                </h2>
                {sec.blocks.map((b, idx) => renderBlock(b, `${page.slug}-${sec.id}-${idx}`))}
              </section>
            ))}
          </div>

          <div className="docs-source-row mono">
            <span>Grounded in Vivechak v0.1.0 release specification</span>
            <a
              href="https://github.com/bhaskarjha-dev/vivechak/tree/main/docs"
              target="_blank"
              rel="noreferrer"
              className="docs-source-link"
            >
              <span>View source docs on GitHub</span>
              <ArrowUpRight size={12} />
            </a>
          </div>

          {/* Prev / Next Editorial Pager */}
          <nav className="docs-pager" aria-label="Adjacent documentation pages">
            {prevPage ? (
              <a
                href={`/docs/${prevPage.slug}`}
                className="docs-pager-card"
                onClick={(e) => {
                  e.preventDefault();
                  soundEngine.playTick(700);
                  navigate(`/docs/${prevPage.slug}`);
                }}
              >
                <span className="mono docs-pager-dir">
                  <ArrowLeft size={12} /> PREVIOUS
                </span>
                <strong>{prevPage.shortTitle}</strong>
              </a>
            ) : (
              <div />
            )}

            {nextPage && (
              <a
                href={`/docs/${nextPage.slug}`}
                className="docs-pager-card is-next"
                onClick={(e) => {
                  e.preventDefault();
                  soundEngine.playTick(760);
                  navigate(`/docs/${nextPage.slug}`);
                }}
              >
                <span className="mono docs-pager-dir">
                  NEXT <ArrowRight size={12} />
                </span>
                <strong>{nextPage.shortTitle}</strong>
              </a>
            )}
          </nav>
        </article>

        {/* Right "On This Page" Sticky Table of Contents */}
        <aside className="docs-toc" aria-label="On this page">
          <div className="docs-toc-sticky">
            <div className="docs-toc-lbl mono">ON THIS PAGE</div>
            <div className="docs-toc-list">
              {page.sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className={`docs-toc-link ${activeHeading === sec.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveHeading(sec.id);
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {sec.heading}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
