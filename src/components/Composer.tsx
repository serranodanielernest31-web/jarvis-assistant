import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, MicOff, Square, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '../store';
import { useSpeechRecognition } from '../lib/speech';

export const Composer: React.FC = () => {
  const { send, fsm, voiceOut, setVoiceOut, speaking, stopSpeaking, toast } = useStore();
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  const rec = useSpeechRecognition((final) => {
    send(final, 'voice');
  });

  const busy = fsm === 'THINKING' || fsm === 'ACTING';

  /* auto-grow */
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  useEffect(() => {
    if (rec.error) toast(rec.error, 'err');
  }, [rec.error, toast]);

  const submit = () => {
    if (!text.trim() || busy) return;
    send(text, 'panel');
    setText('');
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={taRef}
          rows={1}
          value={rec.listening && rec.interim ? `${text}${rec.interim}` : text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder={
            rec.listening
              ? 'Listening… speak now'
              : 'Ask JARVIS — "list my repos", "open issues on jarvis-core", "search code for ring buffer"'
          }
          aria-label="Message the assistant"
        />

        {speaking ? (
          <button className="mic-btn" onClick={stopSpeaking} title="Stop speaking" aria-label="Stop speaking">
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            className={`mic-btn${rec.listening ? ' on' : ''}`}
            onClick={rec.toggle}
            title={rec.supported ? 'Voice input (browser speech recognition)' : 'Voice input unsupported in this browser'}
            aria-label="Toggle voice input"
            aria-pressed={rec.listening}
          >
            {rec.listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}

        <button
          className="send-btn"
          onClick={submit}
          disabled={!text.trim() || busy}
          title="Send (Enter)"
          aria-label="Send message"
        >
          <ArrowUp size={17} strokeWidth={2.4} />
        </button>
      </div>

      <div className="composer-hint">
        <span>
          <span className="kbd">Enter</span> send · <span className="kbd">Shift+Enter</span> newline
        </span>
        <div className="right">
          <button
            className={`toggle${voiceOut ? ' on' : ''}`}
            onClick={() => setVoiceOut(!voiceOut)}
            title="Speak replies aloud"
          >
            {voiceOut ? <Volume2 size={12} /> : <VolumeX size={12} />}
            voice out {voiceOut ? 'on' : 'off'}
          </button>
          <span className={rec.supported ? 'mint' : 'coral'}>
            {rec.supported ? 'mic ready' : 'mic unsupported'}
          </span>
        </div>
      </div>
    </div>
  );
};
