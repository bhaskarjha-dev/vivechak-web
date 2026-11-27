import React from 'react';
import { ArrowRight } from 'lucide-react';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';

export const HomeExploreBand: React.FC = () => {
  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    soundEngine.playTick(760);
    navigate(href);
  };

  return (
    <section className="band-obsidian home-explore-band" id="explore">
      <div className="wrap">
        <div className="explore-grid">
          {/* 1 · Architecture Schematic */}
          <a href="/architecture" className="explore-col" onClick={go('/architecture')}>
            <div className="explore-visual" aria-hidden="true">
              <svg viewBox="0 0 240 68" className="explore-svg">
                <path d="M 52 34 C 78 34, 78 14, 102 14" className="ex-edge is-on" />
                <path d="M 52 34 L 102 34" className="ex-edge is-on" />
                <path d="M 52 34 C 78 34, 78 54, 102 54" className="ex-edge" />
                <path d="M 142 14 C 166 14, 166 34, 188 34" className="ex-edge is-on" />
                <path d="M 142 34 L 188 34" className="ex-edge is-on" />
                <path d="M 142 54 C 166 54, 166 34, 188 34" className="ex-edge is-dash" />
                <rect x="8" y="24" width="44" height="20" rx="4" className="ex-node is-pass" />
                <rect x="102" y="4" width="40" height="20" rx="4" className="ex-node is-pass" />
                <rect x="102" y="24" width="40" height="20" rx="4" className="ex-node is-pass" />
                <rect x="102" y="44" width="40" height="20" rx="4" className="ex-node" />
                <rect x="188" y="24" width="44" height="20" rx="4" className="ex-node is-accent" />
                <text x="30" y="37" className="ex-txt">T0</text>
                <text x="122" y="17" className="ex-txt">T1</text>
                <text x="122" y="37" className="ex-txt">T2</text>
                <text x="122" y="57" className="ex-txt">T3</text>
                <text x="210" y="37" className="ex-txt is-accent">SYN</text>
              </svg>
            </div>
            <div className="explore-foot">
              <div>
                <h3 className="explore-title">Architecture</h3>
                <span className="explore-spec mono">DAG · research/ · 9 tools · os.Root</span>
              </div>
              <ArrowRight size={15} className="explore-arrow" />
            </div>
          </a>

          {/* 2 · Setup Terminal Schematic */}
          <a href="/setup" className="explore-col" onClick={go('/setup')}>
            <div className="explore-visual explore-term-mini mono" aria-hidden="true">
              <div className="etm-line">
                <span className="etm-p">$</span> vck setup cursor
              </div>
              <div className="etm-line etm-ok">✓ merged .cursor/mcp.json</div>
              <div className="etm-line etm-dim">backup .vivechak-bak</div>
            </div>
            <div className="explore-foot">
              <div>
                <h3 className="explore-title">Setup</h3>
                <span className="explore-spec mono">12 MCP installs · 10 hosts · Skill · CI</span>
              </div>
              <ArrowRight size={15} className="explore-arrow" />
            </div>
          </a>

          {/* 3 · Playground Auditor Schematic */}
          <a href="/playground" className="explore-col" onClick={go('/playground')}>
            <div className="explore-visual explore-gate-mini mono" aria-hidden="true">
              <div className="egm-pills">
                <span className="egm-dot is-pass">G5</span>
                <span className="egm-dot is-pass">G6</span>
                <span className="egm-dot is-pass">G10</span>
                <span className="egm-dot is-accent">±20%</span>
              </div>
              <div className="egm-hash">sha256:ca2ec407f90f… · 100% local</div>
            </div>
            <div className="explore-foot">
              <div>
                <h3 className="explore-title">Playground</h3>
                <span className="explore-spec mono">ADR auditor · R/N/B/X · WEP · Prompts</span>
              </div>
              <ArrowRight size={15} className="explore-arrow" />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};
