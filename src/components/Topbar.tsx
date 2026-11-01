import React from 'react';
import { Cpu, ShieldCheck, Wifi } from 'lucide-react';
import { useStore } from '../store';

export const Topbar: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => {
  const { github, pending, setDrawerOpen, fsm } = useStore();

  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>

      <div className="topbar-right">
        <span className={`pill${fsm === 'AWAITING_CONSENT' ? ' warn' : ''}`}>
          <span className="dot" />
          {fsm.replace('_', ' ')}
        </span>

        <span className="pill" title="Tool layer is local — no vendor keys required">
          <Cpu size={12} strokeWidth={2} />
          local runtime
        </span>

        <button
          className={`pill${github.connected ? '' : ' danger'}`}
          onClick={() => setDrawerOpen(true)}
          style={{ cursor: 'pointer' }}
          title="Consent queue"
        >
          <ShieldCheck size={12} strokeWidth={2} />
          {pending.length} pending
        </button>

        <span className={`pill${github.connected ? '' : ' danger'}`}>
          <Wifi size={12} strokeWidth={2} />
          {github.connected ? `@${github.login}` : 'github offline'}
        </span>
      </div>
    </header>
  );
};
