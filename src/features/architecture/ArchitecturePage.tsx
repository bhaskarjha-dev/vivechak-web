import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SEVEN_STEP_LADDER } from '@/shared/data/vivechakData';
import { navigate } from '@/shared/lib/router';
import { soundEngine } from '@/shared/lib/sound';
import { ArchitectureStage } from './ArchitectureStage';

const SECURITY_PILLARS = [
  { title: 'Go 1.26 os.Root', desc: 'Writes jailed strictly inside research/.' },
  { title: '7-step ladder', desc: 'Refuses /, $HOME, and OS dirs.' },
  { title: '~9 MB · 0 cloud', desc: 'Zero telemetry, zero outbound LLMs.' },
  { title: 'EXIT 0 / 1 CI', desc: 'Blocks unverified PRs in GitHub Actions.' },
];

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="subpage-shell">
      <ArchitectureStage asPageSection />

      <section className="subpage-band is-alt" id="security">
        <div className="wrap">
          <div className="security-head-row">
            <div>
              <h2 className="sec-title">Confinement &amp; security</h2>
              <p className="sec-sub mono" style={{ fontSize: '0.82rem' }}>
                7-step workspace resolution · kernel-enforced os.Root
              </p>
            </div>

            <a
              href="/setup"
              className="editorial-link"
              onClick={(e) => {
                e.preventDefault();
                soundEngine.playTick(760);
                navigate('/setup');
              }}
            >
              <span>Configure your MCP host</span>
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="trust-ribbon" style={{ marginTop: 0 }}>
            {SECURITY_PILLARS.map((p) => (
              <div key={p.title} className="trust-col">
                <strong>{p.title}</strong>
                <span>{p.desc}</span>
              </div>
            ))}
          </div>

          <div className="security-ladder-wrap">
            <div className="ladder-drawer">
              <div className="ladder-list">
                {SEVEN_STEP_LADDER.map((st) => (
                  <div key={st.step} className={`ladder-row ${st.step === '07' ? 'is-stop' : ''}`}>
                    <span className="mono ladder-num">{st.step}</span>
                    <div className="ladder-body">
                      <strong>{st.title}</strong>
                      <span>{st.detail}</span>
                    </div>
                    <span className="mono ladder-rule">{st.rule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
