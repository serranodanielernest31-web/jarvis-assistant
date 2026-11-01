import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import type { Message } from '../types';
import { CardView } from './CardView';
import { useStore } from '../store';

/** Renders `code` spans inside plain text without a markdown dependency. */
const RichText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        ),
      )}
    </>
  );
};

export const MessageView: React.FC<{ msg: Message; persona: 'jarvis' | 'friday' }> = ({
  msg,
  persona,
}) => {
  const { speak, voiceOut } = useStore();
  const isUser = msg.role === 'user';
  const time = new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`msg ${isUser ? 'user' : 'assistant'}`}>
      <div className="avatar" aria-hidden>
        {isUser ? 'YOU' : persona === 'jarvis' ? 'J' : 'F'}
      </div>

      <div className="bubble">
        <div className="bubble-head">
          <span>{isUser ? 'Operator' : persona === 'jarvis' ? 'JARVIS' : 'FRIDAY'}</span>
          <span className="sep">·</span>
          <span>{time}</span>
          {!isUser && msg.latencyMs ? (
            <>
              <span className="sep">·</span>
              <span className="cyan">{msg.latencyMs}ms</span>
            </>
          ) : null}
        </div>

        <div className="bubble-body">
          <RichText text={msg.text} />
          {msg.streaming && <span className="caret" />}
        </div>

        {msg.tools.length > 0 && (
          <div className="tools">
            {msg.tools.map((t) => (
              <span key={t.id} className="tool-chip" title={t.outcome}>
                <span className={`eff ${t.effect}`}>{t.effect}</span>
                {t.name}
                {t.latencyMs > 0 && <span className="lat">{t.latencyMs}ms</span>}
              </span>
            ))}
          </div>
        )}

        {msg.cards.length > 0 && (
          <div className="cards">
            {msg.cards.map((c, i) => (
              <CardView key={i} card={c} />
            ))}
          </div>
        )}

        {!isUser && !msg.streaming && (
          <div className="msg-foot">
            <button onClick={() => speak(msg.text)} title="Replay aloud">
              {voiceOut ? <Volume2 size={12} /> : <VolumeX size={12} />}
              replay
            </button>
            {msg.trace && msg.trace.length > 0 && (
              <>
                <span className="sep">·</span>
                <span>{msg.trace.length} trace steps</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
