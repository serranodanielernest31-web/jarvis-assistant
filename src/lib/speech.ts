import { useCallback, useEffect, useRef, useState } from 'react';

/* Minimal typings for the Web Speech API (not in lib.dom for all targets). */
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = () => getCtor() !== null;

export interface UseSpeechRecognition {
  supported: boolean;
  listening: boolean;
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

/**
 * Browser-native dictation. No keys, no vendor — Chrome/Edge/Safari only.
 * Final results are handed to `onFinal`; interim text is exposed for the live
 * "listening" readout in the composer.
 */
export function useSpeechRecognition(onFinal: (text: string) => void): UseSpeechRecognition {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  const cbRef = useRef(onFinal);
  cbRef.current = onFinal;

  const supported = speechSupported();

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError('This browser has no SpeechRecognition API. Use Chrome, Edge or Safari.');
      return;
    }
    if (recRef.current) {
      try {
        recRef.current.abort();
      } catch {
        /* noop */
      }
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    finalRef.current = '';
    setError(null);

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      let live = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        const txt = r[0]?.transcript ?? '';
        if (r.isFinal) finalRef.current += txt;
        else live += txt;
      }
      setInterim(live);
    };

    rec.onerror = (e) => {
      const code = (e as { error?: string }).error ?? 'unknown';
      setError(
        code === 'not-allowed'
          ? 'Microphone permission denied — allow it in the address bar.'
          : code === 'no-speech'
            ? 'No speech detected. Try again.'
            : `Speech error: ${code}`,
      );
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      setInterim('');
      const text = finalRef.current.trim();
      finalRef.current = '';
      if (text) cbRef.current(text);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setError('Could not start the microphone.');
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(
    () => () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    },
    [],
  );

  return { supported, listening, interim, error, start, stop, toggle };
}
