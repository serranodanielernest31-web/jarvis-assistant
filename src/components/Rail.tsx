import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Activity, Github, MessageSquare, ShieldCheck, Terminal } from 'lucide-react';
import { useStore } from '../store';

export const Rail: React.FC = () => {
  const { persona, setPersona, pending, setDrawerOpen } = useStore();
  const loc = useLocation();

  const items = [
    { to: '/', icon: MessageSquare, label: 'Console' },
    { to: '/github', icon: Github, label: 'GitHub' },
    { to: '/activity', icon: Activity, label: 'Audit log' },
  ];

  return (
    <nav className="rail" aria-label="Primary">
      <div className="rail-logo" title="JARVIS / FRIDAY">
        <Terminal size={19} strokeWidth={1.8} />
      </div>

      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `rail-btn${isActive ? ' active' : ''}`}
          title={label}
          aria-label={label}
        >
          <Icon size={19} strokeWidth={1.7} />
        </NavLink>
      ))}

      <button
        className="rail-btn"
        onClick={() => setDrawerOpen(true)}
        title="Consent queue"
        aria-label={`Consent queue, ${pending.length} pending`}
      >
        <ShieldCheck size={19} strokeWidth={1.7} />
        {pending.length > 0 && <span className="badge">{pending.length}</span>}
      </button>

      <div className="rail-spacer" />

      <button
        className={`rail-persona${persona === 'friday' ? ' friday' : ''}`}
        onClick={() => setPersona(persona === 'jarvis' ? 'friday' : 'jarvis')}
        title={`Switch to ${persona === 'jarvis' ? 'FRIDAY' : 'JARVIS'}`}
        aria-label="Switch assistant persona"
      >
        {persona === 'jarvis' ? 'J' : 'F'}
      </button>
      <div
        className="mono"
        style={{ fontSize: 8.5, color: 'var(--dim)', letterSpacing: '0.1em', marginTop: 2 }}
      >
        {loc.pathname === '/' ? 'LIVE' : 'IDLE'}
      </div>
    </nav>
  );
};
