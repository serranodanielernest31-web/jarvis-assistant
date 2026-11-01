import React, { useEffect, useRef } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { Topbar } from '../components/Topbar';
import { ContextRail } from '../components/ContextRail';
import { MessageView } from '../components/MessageView';
import { Composer } from '../components/Composer';

const SUGGESTIONS = [
  'List my repositories',
  'Open issues on jarvis-core',
  'Show open pull requests',
  'Search code for ring buffer',
  'Recent commits on friday-voice',
  'Create an issue about TTS barge-in',
  'Give me a status summary',
  'What can you do?',
];

export const ConsolePage: React.FC = () => {
  const { messages, persona, fsm, newConversation, clearConversation, send, lastLatency } = useStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, messages[messages.length - 1]?.text]);

  const orbState =
    fsm === 'LISTENING'
      ? 'listening'
      : fsm === 'THINKING' || fsm === 'ACTING'
        ? 'thinking'
        : fsm === 'SPEAKING'
          ? 'speaking'
          : fsm === 'AWAITING_CONSENT'
            ? 'awaiting'
            : '';

  const empty = messages.length <= 1;

  return (
    <>
      <Topbar
        title="Assistant console"
        sub={`${persona === 'jarvis' ? 'JARVIS' : 'FRIDAY'} · session-oriented runtime · voice + text share one state`}
      />
      <div className="console">
        <div className="chat-col">
          <div className="hero">
            <div className={`orb-wrap ${orbState} ${persona === 'friday' ? 'friday' : ''}`}>
              <div className="orb-ring r2" />
              <div className="orb-ring" />
              <div className="orb" />
            </div>

            <div className="hero-meta">
              <h2 className="name">
                {persona === 'jarvis' ? 'JARVIS' : 'FRIDAY'}
                <span className="tag">{fsm.replace('_', ' ')}</span>
              </h2>
              <p>
                {persona === 'jarvis'
                  ? 'Dry, precise, one step ahead. Reads run immediately; writes stop at your consent gate.'
                  : 'Warmer and faster. Same runtime, same policy gate — just a different voice.'}
              </p>
            </div>

            <div className="hero-stats">
              <div className="stat">
                <div className="k">turns</div>
                <div className="v">{messages.filter((m) => m.role === 'user').length}</div>
              </div>
              <div className="stat">
                <div className="k">last latency</div>
                <div className="v cyan">{lastLatency ? `${lastLatency}ms` : '—'}</div>
              </div>
              <div className="stat">
                <div className="k">voice</div>
                <div className="v mint">on</div>
              </div>
            </div>

            <div className="hstack" style={{ marginLeft: 8 }}>
              <button className="btn icon ghost" onClick={newConversation} title="New session" aria-label="New session">
                <Plus size={15} />
              </button>
              <button className="btn icon ghost" onClick={clearConversation} title="Clear transcript" aria-label="Clear transcript">
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="transcript" role="log" aria-live="polite">
            {empty ? (
              <div className="empty">
                <Sparkles size={26} className="cyan" />
                <h2>Say something. Or type it.</h2>
                <p>
                  Voice and text land in the same conversation state, so you can start by speaking and
                  finish by typing. Try one of these:
                </p>
                <div className="suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="suggestion" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => <MessageView key={m.id} msg={m} persona={persona} />)
            )}
            <div ref={endRef} />
          </div>

          <Composer />
        </div>

        <ContextRail />
      </div>
    </>
  );
};
