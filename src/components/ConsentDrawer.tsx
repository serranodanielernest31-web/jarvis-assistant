import React from 'react';
import { Check, ShieldAlert, X } from 'lucide-react';
import { useStore } from '../store';

export const ConsentDrawer: React.FC = () => {
  const { drawerOpen, setDrawerOpen, consents, approve, deny } = useStore();
  if (!drawerOpen) return null;

  const pending = consents.filter((c) => c.status === 'pending');
  const decided = consents.filter((c) => c.status !== 'pending');

  return (
    <>
      <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />
      <aside className="drawer" role="dialog" aria-label="Consent queue" aria-modal="true">
        <div className="drawer-head">
          <ShieldAlert size={16} className="amber" />
          <h3>Consent queue</h3>
          <span className="pill warn" style={{ marginLeft: 'auto' }}>
            <span className="dot" />
            {pending.length} pending
          </span>
          <button className="btn icon ghost" onClick={() => setDrawerOpen(false)} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="drawer-body">
          {pending.length === 0 && (
            <div className="empty" style={{ padding: '40px 10px' }}>
              <ShieldAlert size={26} className="dim" />
              <h2 style={{ fontSize: 15 }}>Nothing waiting</h2>
              <p>
                Every write action the assistant stages lands here with its exact payload. Nothing
                leaves the adapter until you approve it.
              </p>
            </div>
          )}

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
                <span className="mono dim" style={{ marginLeft: 'auto', fontSize: 10, alignSelf: 'center' }}>
                  via {c.origin}
                </span>
              </div>
            </div>
          ))}

          {decided.length > 0 && (
            <>
              <div className="section-title" style={{ margin: '8px 0 0' }}>
                Decided this session
              </div>
              {decided.map((c) => (
                <div
                  key={c.id}
                  className="row-item"
                  style={{ border: '1px solid var(--line)', borderRadius: 8, background: 'rgba(6,12,20,.6)' }}
                >
                  <span className={`eff ${c.effect}`} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3 }}>
                    {c.effect}
                  </span>
                  <span className="title">{c.title}</span>
                  <span className={`meta ${c.status === 'approved' ? 'mint' : 'coral'}`}>{c.status}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="drawer-foot">
          <span className="mono dim" style={{ fontSize: 10.5, alignSelf: 'center' }}>
            consent TTL 300s · per-action
          </span>
          <button className="btn ghost sm" style={{ marginLeft: 'auto' }} onClick={() => setDrawerOpen(false)}>
            Close
          </button>
        </div>
      </aside>
    </>
  );
};
