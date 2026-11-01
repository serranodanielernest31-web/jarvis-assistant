import React from 'react';
import { Activity, Gauge, KeyRound, Layers, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { grants } from '../data/activity';
import { repos } from '../data/github';

const FSM_STEPS: Array<{ key: string; label: string }> = [
  { key: 'IDLE', label: 'idle' },
  { key: 'LISTENING', label: 'listen' },
  { key: 'THINKING', label: 'think' },
  { key: 'ACTING', label: 'act' },
  { key: 'SPEAKING', label: 'speak' },
];

export const ContextRail: React.FC = () => {
  const { fsm, lastLatency, lastTrace, github, pending, persona } = useStore();
  const activeIdx = FSM_STEPS.findIndex((s) => s.key === fsm);

  return (
    <aside className="ctx" aria-label="Runtime context">
      <div className="ctx-block">
        <div className="ctx-head">
          <Activity size={11} /> Runtime state
          <span className="right">{fsm}</span>
        </div>
        <div className="ctx-body">
          <div className="fsm-track">
            {FSM_STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`fsm-step${i <= activeIdx ? ' on' : ''}${fsm === 'AWAITING_CONSENT' ? ' amber' : ''}`}
                title={s.label}
              />
            ))}
          </div>
          <div className="kv">
            <span className="k">persona</span>
            <span className="v cyan">{persona.toUpperCase()}</span>
          </div>
          <div className="kv">
            <span className="k">last turn</span>
            <span className="v">{lastLatency ? `${lastLatency} ms` : '—'}</span>
          </div>
          <div className="kv">
            <span className="k">budget</span>
            <span className="v mint">p95 &lt; 800 ms</span>
          </div>
          <div className="kv">
            <span className="k">consent queue</span>
            <span className={`v ${pending.length ? 'amber' : ''}`}>{pending.length} pending</span>
          </div>
        </div>
      </div>

      <div className="ctx-block">
        <div className="ctx-head">
          <Gauge size={11} /> Last trace
        </div>
        <div className="ctx-body">
          <div className="trace-list">
            {(lastTrace.length ? lastTrace : ['awaiting first turn…']).map((t, i) => (
              <div key={i}>{t}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="ctx-block">
        <div className="ctx-head">
          <KeyRound size={11} /> GitHub
          <span className="right">{github.connected ? 'connected' : 'offline'}</span>
        </div>
        <div className="ctx-body">
          <div className="kv">
            <span className="k">account</span>
            <span className="v cyan">@{github.login}</span>
          </div>
          <div className="kv">
            <span className="k">installation</span>
            <span className="v">{github.installation.split(' ')[0]}</span>
          </div>
          <div className="kv">
            <span className="k">token ttl</span>
            <span className="v mint">1h · repo-scoped</span>
          </div>
          <div className="kv">
            <span className="k">repos visible</span>
            <span className="v">{repos.length}</span>
          </div>
        </div>
      </div>

      <div className="ctx-block">
        <div className="ctx-head">
          <ShieldCheck size={11} /> Standing grants
        </div>
        <div className="ctx-body">
          {grants.map((g) => (
            <div key={g.id} className="grant">
              <span className={`eff ${g.effect}`} style={{ fontSize: 8.5, padding: '1px 4px', borderRadius: 3 }}>
                {g.effect}
              </span>
              <span className="name">{g.tool.replace('github.', '')}</span>
              <span className="exp">{g.expires.replace('expires in ', '')}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ctx-block">
        <div className="ctx-head">
          <Layers size={11} /> Stack
        </div>
        <div className="ctx-body">
          <div className="kv">
            <span className="k">ui</span>
            <span className="v">React 18 · Vite</span>
          </div>
          <div className="kv">
            <span className="k">voice in</span>
            <span className="v">Web Speech API</span>
          </div>
          <div className="kv">
            <span className="k">voice out</span>
            <span className="v">SpeechSynthesis</span>
          </div>
          <div className="kv">
            <span className="k">brain</span>
            <span className="v amber">mock intent engine</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
