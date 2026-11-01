import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ConsentRequest,
  Conversation,
  Effect,
  Fsm,
  Message,
  Persona,
  ToolCall,
} from './types';
import { planTurn } from './lib/assistant';
import { seedFeed } from './data/activity';
import { account as mockAccount, repos } from './data/github';

/* ------------------------------------------------------------------ */
/*  types                                                              */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: string;
  text: string;
  kind: 'ok' | 'warn' | 'err';
}

export interface GithubState {
  connected: boolean;
  login: string;
  name: string;
  scopes: string[];
  installation: string;
  connectedAt: string;
}

interface Store {
  /* persona + fsm */
  persona: Persona;
  setPersona: (p: Persona) => void;
  fsm: Fsm;
  lastLatency: number;
  lastTrace: string[];

  /* conversation */
  conversations: Conversation[];
  activeId: string;
  active: Conversation;
  messages: Message[];
  send: (text: string, origin?: 'voice' | 'panel') => void;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  clearConversation: () => void;

  /* voice */
  voiceOut: boolean;
  setVoiceOut: (v: boolean) => void;
  speaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;

  /* github */
  github: GithubState;
  connectGithub: () => void;
  disconnectGithub: () => void;

  /* consent + audit */
  consents: ConsentRequest[];
  pending: ConsentRequest[];
  approve: (id: string) => void;
  deny: (id: string) => void;
  audit: ToolCall[];
  requestConsent: (draft: Omit<ConsentRequest, 'id' | 'status' | 'createdAt' | 'origin'>) => void;

  /* ui */
  toasts: Toast[];
  toast: (text: string, kind?: Toast['kind']) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  lastRepo: string;
  setLastRepo: (id: string) => void;
}

const Ctx = createContext<Store | null>(null);

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
};

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10);

const GREETING: Message = {
  id: 'greet',
  role: 'assistant',
  text:
    "Good to see you. I'm online — voice and text share one conversation state, and every write action stops at your consent gate before it leaves the adapter.\n\nAsk me for your repositories, a repo's issues or pull requests, a code search, or recent commits. I can also stage an issue, a pull request or a review for your approval.",
  cards: [],
  tools: [],
  at: Date.now(),
  spoken: false,
  trace: ['boot: session restored', 'auth: installation token verified', 'policy: 4 standing grants loaded'],
  latencyMs: 0,
};

function makeConversation(persona: Persona, title = 'New session'): Conversation {
  return {
    id: uid(),
    title,
    persona,
    messages: [{ ...GREETING, id: uid(), at: Date.now() }],
    createdAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/*  provider                                                           */
/* ------------------------------------------------------------------ */

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [persona, setPersonaRaw] = useState<Persona>('jarvis');
  const [fsm, setFsm] = useState<Fsm>('IDLE');
  const [lastLatency, setLastLatency] = useState(0);
  const [lastTrace, setLastTrace] = useState<string[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>(() => [makeConversation('jarvis')]);
  const [activeId, setActiveId] = useState(() => conversations[0].id);

  const [voiceOut, setVoiceOut] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const [github, setGithub] = useState<GithubState>({
    connected: true,
    login: mockAccount.login,
    name: mockAccount.name,
    scopes: mockAccount.scopes,
    installation: mockAccount.installation,
    connectedAt: mockAccount.connectedAt,
  });

  const [consents, setConsents] = useState<ConsentRequest[]>([]);
  const [audit, setAudit] = useState<ToolCall[]>(() => seedFeed(Date.now()));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastRepo, setLastRepo] = useState('acme-control/jarvis-core');

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  );

  const toast = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = uid();
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /* ---------------- speech synthesis ---------------- */
  const speak = useCallback(
    (text: string) => {
      if (!voiceOut || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const clean = text.replace(/`/g, '').replace(/\s+/g, ' ').slice(0, 420);
      if (!clean) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.02;
      u.pitch = persona === 'friday' ? 1.12 : 0.92;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /Google UK English Female|Samantha|Microsoft Aria/i.test(v.name)) ??
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) u.voice = preferred;
      u.onstart = () => {
        setSpeaking(true);
        setFsm('SPEAKING');
      };
      u.onend = () => {
        setSpeaking(false);
        setFsm('IDLE');
      };
      u.onerror = () => {
        setSpeaking(false);
        setFsm('IDLE');
      };
      window.speechSynthesis.speak(u);
    },
    [voiceOut, persona],
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
    setFsm('IDLE');
  }, []);

  /* ---------------- conversation mutation ---------------- */
  const patchActive = useCallback(
    (fn: (c: Conversation) => Conversation) => {
      setConversations((list) => list.map((c) => (c.id === activeId ? fn(c) : c)));
    },
    [activeId],
  );

  const pushMessage = useCallback(
    (m: Message) => patchActive((c) => ({ ...c, messages: [...c.messages, m] })),
    [patchActive],
  );

  const updateMessage = useCallback(
    (id: string, patch: Partial<Message>) =>
      patchActive((c) => ({
        ...c,
        messages: c.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),
    [patchActive],
  );

  /* ---------------- the turn ---------------- */
  const send = useCallback(
    (raw: string, origin: 'voice' | 'panel' = 'panel') => {
      const text = raw.trim();
      if (!text) return;

      const userMsg: Message = { id: uid(), role: 'user', text, cards: [], tools: [], at: Date.now() };
      pushMessage(userMsg);
      patchActive((c) => ({
        ...c,
        title: c.messages.length <= 1 ? text.slice(0, 46) : c.title,
      }));

      setFsm('THINKING');
      const plan = planTurn(text, { lastRepo });

      const assistantId = uid();
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        text: '',
        cards: [],
        tools: [],
        at: Date.now(),
        streaming: true,
        trace: plan.trace,
        latencyMs: plan.latencyMs,
      };

      /* stage 1: thinking → tools appear */
      window.setTimeout(() => {
        setFsm(plan.consent ? 'AWAITING_CONSENT' : 'ACTING');
        updateMessage(assistantId, { tools: plan.tools.map((t) => ({ ...t, id: uid(), at: Date.now() })) });
        setAudit((a) => [
          ...plan.tools.map((t) => ({ ...t, id: uid(), at: Date.now() })),
          ...a,
        ]);
      }, 260);

      /* stage 2: stream the reply */
      window.setTimeout(() => {
        pushMessage(assistantMsg);
        const words = plan.reply.split(/(\s+)/);
        let i = 0;
        const tick = window.setInterval(() => {
          i += 2;
          const partial = words.slice(0, i).join('');
          updateMessage(assistantId, { text: partial });
          if (i >= words.length) {
            window.clearInterval(tick);
            updateMessage(assistantId, {
              text: plan.reply,
              streaming: false,
              cards: plan.cards,
              spoken: true,
            });
            setLastLatency(plan.latencyMs);
            setLastTrace(plan.trace);
            if (plan.navigate) setLastRepo(plan.navigate.replace('/github/', ''));

            if (plan.consent) {
              const c: ConsentRequest = {
                id: uid(),
                status: 'pending',
                createdAt: Date.now(),
                origin,
                ...plan.consent,
              };
              setConsents((list) => [c, ...list]);
              setDrawerOpen(true);
              setFsm('AWAITING_CONSENT');
            } else {
              setFsm('IDLE');
            }
            speak(plan.reply);
          }
        }, 16);
      }, 620);
    },
    [lastRepo, pushMessage, patchActive, updateMessage, speak],
  );

  /* ---------------- consent ---------------- */
  const requestConsent = useCallback(
    (draft: Omit<ConsentRequest, 'id' | 'status' | 'createdAt' | 'origin'>) => {
      const c: ConsentRequest = { id: uid(), status: 'pending', createdAt: Date.now(), origin: 'panel', ...draft };
      setConsents((list) => [c, ...list]);
      setDrawerOpen(true);
      setFsm('AWAITING_CONSENT');
    },
    [],
  );

  const approve = useCallback(
    (id: string) => {
      setConsents((list) =>
        list.map((c) => (c.id === id ? { ...c, status: 'approved', decidedAt: Date.now() } : c)),
      );
      const c = consents.find((x) => x.id === id);
      if (c) {
        setAudit((a) => [
          {
            id: uid(),
            name: c.tool,
            effect: c.effect,
            args: c.args,
            status: 'ok',
            latencyMs: 180 + Math.floor(Math.random() * 320),
            outcome: 'approved by user · executed',
            at: Date.now(),
          },
          ...a,
        ]);
        toast(`${c.tool} approved and executed`, 'ok');
      }
      setFsm('IDLE');
    },
    [consents, toast],
  );

  const deny = useCallback(
    (id: string) => {
      setConsents((list) =>
        list.map((c) => (c.id === id ? { ...c, status: 'denied', decidedAt: Date.now() } : c)),
      );
      const c = consents.find((x) => x.id === id);
      if (c) {
        setAudit((a) => [
          {
            id: uid(),
            name: c.tool,
            effect: c.effect,
            args: c.args,
            status: 'blocked',
            latencyMs: 0,
            outcome: 'denied by user · nothing sent',
            at: Date.now(),
          },
          ...a,
        ]);
        toast(`${c.tool} denied — nothing left the adapter`, 'warn');
      }
      setFsm('IDLE');
    },
    [consents, toast],
  );

  /* ---------------- github ---------------- */
  const connectGithub = useCallback(() => {
    setGithub({
      connected: true,
      login: mockAccount.login,
      name: mockAccount.name,
      scopes: mockAccount.scopes,
      installation: mockAccount.installation,
      connectedAt: new Date().toISOString(),
    });
    toast('GitHub installation connected · repo-scoped token, 1h TTL', 'ok');
  }, [toast]);

  const disconnectGithub = useCallback(() => {
    setGithub((g) => ({ ...g, connected: false }));
    toast('GitHub disconnected — read tools will fail closed', 'warn');
  }, [toast]);

  /* ---------------- conversation ops ---------------- */
  const newConversation = useCallback(() => {
    const c = makeConversation(persona);
    setConversations((list) => [c, ...list]);
    setActiveId(c.id);
    setFsm('IDLE');
  }, [persona]);

  const selectConversation = useCallback((id: string) => setActiveId(id), []);

  const clearConversation = useCallback(() => {
    patchActive((c) => ({ ...c, messages: [{ ...GREETING, id: uid(), at: Date.now() }] }));
    toast('Transcript cleared', 'ok');
  }, [patchActive, toast]);

  const setPersona = useCallback(
    (p: Persona) => {
      setPersonaRaw(p);
      patchActive((c) => ({ ...c, persona: p }));
      toast(p === 'jarvis' ? 'JARVIS online — dry, precise' : 'FRIDAY online — warmer, faster', 'ok');
    },
    [patchActive, toast],
  );

  /* keep fsm sane if speech is unavailable */
  useEffect(() => {
    if (fsm === 'SPEAKING' && !speaking) setFsm('IDLE');
  }, [fsm, speaking]);

  const pending = useMemo(() => consents.filter((c) => c.status === 'pending'), [consents]);

  const value: Store = {
    persona,
    setPersona,
    fsm,
    lastLatency,
    lastTrace,
    conversations,
    activeId,
    active,
    messages: active.messages,
    send,
    newConversation,
    selectConversation,
    clearConversation,
    voiceOut,
    setVoiceOut,
    speaking,
    speak,
    stopSpeaking,
    github,
    connectGithub,
    disconnectGithub,
    consents,
    pending,
    approve,
    deny,
    audit,
    requestConsent,
    toasts,
    toast,
    drawerOpen,
    setDrawerOpen,
    lastRepo,
    setLastRepo,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const repoCount = repos.length;
