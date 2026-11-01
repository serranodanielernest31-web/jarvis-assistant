import React, { useMemo, useState } from 'react';
import { Activity, Check, Download, ShieldCheck, X } from 'lucide-react';
import { useStore } from '../store';
import { Topbar } from '../components/Topbar';
import { grants } from '../data/activity';

type Filter = 'all' | 'read' | 'write' | 'destructive';

export const ActivityPage: React.FC = () => {
  const { audit, consents, approve, deny, setDrawerOpen } = useStore();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(
    () => (filter === 'all' ? audit : audit.filter((a) => a.effect === filter)),
    [audit, filter],
  );

  const pending = consents.filter((c) => c.status === 'pending');

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ audit, consents }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jarvis-audit-log.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Topbar title="Audit log" sub="Every tool call, its effect class, and the consent decision that gated it" />
      <div className="page">
        <div className="page-head">
          <div>
            <h2>Tool activity</h2>
            <p>{audit.length} calls this session · immutable append-only log</p>
          </div>
          <div className="actions">
            <button className="btn sm" onClick={exportJson}>
              <Download size={13} /> Export JSON
            </button>
            <button className="btn primary sm" onClick={() => setDrawerOpen(true)}>
              <ShieldCheck size={13} /> Consent queue ({pending.length})
            </button>
          </div>
        </div>

        {pending.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              Pending approval
            </div>
            <div className="stack" style={{ marginBottom: 20 }}>
              {pending.map((c) => (
                <div key={c.id} className="consent-card">
                  <div className="ct">
                    <span className={`eff ${c.effect}`} style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3 }}>
                      {c.effect}
                    </span>
                    {c.title}
                  </div>
                  <div className="cs">{c.summary}</div>
                  <pre>{JSON.stringify(c.args, null, 2)}</pre>
                  <div className="ca">
                    <button className="btn primary sm" onClick={() => approve(c.id)}>
                      <Check size={13} /> Approve &amp; execute
                    </button>
                    <button className="btn danger sm" onClick={() => deny(c.id)}>
                      <X size={13} /> Deny
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="toolbar">
          <div className="seg" role="group" aria-label="Effect filter">
            {(['all', 'read', 'write', 'destructive'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <span className="mono dim" style={{ fontSize: 10.5, marginLeft: 'auto' }}>
            {rows.length} rows
          </span>
        </div>

        <div className="panel">
          <div className="panel-head">
            <Activity size={13} className="cyan" />
            <h3>Call log</h3>
            <span className="right mono dim" style={{ fontSize: 10.5 }}>
              newest first
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="empty" style={{ padding: '50px 20px' }}>
              <Activity size={22} className="dim" />
              <h2 style={{ fontSize: 15 }}>No calls yet</h2>
              <p>Ask the assistant something and the tool calls will appear here.</p>
            </div>
          ) : (
            rows.map((a) => (
              <div key={a.id} className="audit-row">
                <span className="t">{new Date(a.at).toLocaleTimeString()}</span>
                <span className="n">
                  <span className={`eff ${a.effect}`} style={{ fontSize: 8.5, padding: '1px 4px', borderRadius: 3, marginRight: 7 }}>
                    {a.effect}
                  </span>
                  {a.name}
                </span>
                <span className="o" title={a.outcome}>
                  {a.outcome}
                </span>
                <span className="l">{a.latencyMs ? `${a.latencyMs}ms` : '—'}</span>
              </div>
            ))
          )}
        </div>

        <div className="section-title">Standing grants</div>
        <div className="panel">
          {grants.map((g) => (
            <div key={g.id} className="list-row">
              <ShieldCheck size={15} className={g.effect === 'read' ? 'mint' : g.effect === 'write' ? 'amber' : 'coral'} style={{ marginTop: 3 }} />
              <div className="body">
                <div className="title mono" style={{ fontSize: 12.5 }}>
                  {g.tool}
                </div>
                <div className="sub">
                  <span>scope {g.scope}</span>
                  <span>·</span>
                  <span>{g.expires}</span>
                </div>
              </div>
              <div className="right">
                <span className={`label ${g.effect === 'read' ? 'mint' : g.effect === 'write' ? 'amber' : 'coral'}`}>
                  {g.effect}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
