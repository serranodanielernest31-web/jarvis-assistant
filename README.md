# JARVIS / FRIDAY — Assistant Console

A voice-first AI assistant console with a permissioned tool layer and a GitHub panel.
JARVIS and FRIDAY are two personas over one runtime: voice, text and tool calls share a
single conversation state, and every side-effecting action stops at a consent gate before
it leaves the adapter.

![stack](https://img.shields.io/badge/React-18-35e0ff) ![stack](https://img.shields.io/badge/Vite-5-35e0ff) ![stack](https://img.shields.io/badge/TypeScript-5.6-35e0ff)

---

## What it does

| Area | Detail |
|---|---|
| **Chat console** | Streaming replies, tool-call chips with effect class + latency, rich result cards (repos, issues, PRs, commits, code hits) |
| **Voice in** | Browser `SpeechRecognition` — speak and the transcript is sent as a turn |
| **Voice out** | `SpeechSynthesis` with a per-persona pitch; replay any message, or mute |
| **Personas** | JARVIS (dry, precise) and FRIDAY (warmer, faster) — same runtime, different voice |
| **GitHub panel** | Connection card with scopes, repo list with search / visibility filter / sort, repo detail with issues, PRs, commits and files |
| **Actions** | New issue, open PR, run review — all staged as consent requests with the exact JSON payload |
| **Consent gate** | `read` runs immediately, `write` needs approval, `destructive` needs per-action confirmation |
| **Audit log** | Append-only call log with effect class, outcome and latency; exportable as JSON |
| **Runtime rail** | FSM state, last-turn latency, trace steps, standing grants, stack info |

## Quick start

```bash
git clone <your-repo-url> jarvis-assistant
cd jarvis-assistant
npm install
npm run dev
```

Open <http://localhost:5178>.

```bash
npm run build     # typecheck + production bundle into dist/
npm run preview   # serve the built bundle on :4178
```

Node 18+ required. No API keys, no database, no backend — see **How it works**.

## Project structure

```
jarvis-assistant/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── src/
    ├── main.tsx              # router + providers
    ├── store.tsx             # single source of truth: conversation, FSM, consent, audit
    ├── types.ts              # domain types (Repo, Issue, Pull, Message, ConsentRequest…)
    ├── styles.css            # "arc-reactor HUD" design system
    ├── lib/
    │   ├── assistant.ts      # intent router → TurnPlan (reply, cards, tools, consent)
    │   └── speech.ts         # Web Speech API wrapper (dictation)
    ├── data/
    │   ├── github.ts         # mock GitHub dataset (repos, issues, PRs, commits, code)
    │   └── activity.ts       # seed audit feed + standing grants
    ├── components/
    │   ├── Rail.tsx          # left nav + persona switch
    │   ├── Topbar.tsx        # page header + live status pills
    │   ├── ContextRail.tsx   # FSM, trace, grants, stack
    │   ├── MessageView.tsx   # transcript bubble + tool chips + cards
    │   ├── CardView.tsx      # rich result cards
    │   ├── Composer.tsx      # textarea, mic, send, voice-out toggle
    │   ├── ConsentDrawer.tsx # approval queue
    │   └── Toasts.tsx
    └── pages/
        ├── ConsolePage.tsx   # /
        ├── GithubPage.tsx    # /github
        ├── RepoPage.tsx      # /github/:owner/:name
        └── ActivityPage.tsx  # /activity
```

## How it works

The app is deliberately **frontend-only and key-free** so it runs anywhere with `npm install`:

- **The brain** is `src/lib/assistant.ts` — a deterministic intent router. It scores the
  utterance against a set of intents (`list_repos`, `list_issues`, `list_pulls`,
  `search_code`, `list_commits`, `create_issue`, `create_pr`, `review_pr`, `status`,
  `navigate`, `help`) and returns a `TurnPlan`: the reply text, the cards to render, the
  tool calls to log, and — for writes — a `ConsentDraft`.
- **The GitHub data** is a fixture set in `src/data/github.ts` (6 repos, issues, PRs,
  commits, a code corpus with snippets). Swapping it for the real REST/GraphQL API means
  replacing that module and the `planTurn` tool calls; nothing in the UI changes.
- **Voice** uses the browser's own APIs, so there is no STT/TTS vendor and no key. Chrome,
  Edge and Safari support dictation; Firefox does not (the UI says so instead of failing
  silently).
- **The consent gate** is the point of the architecture: `read` tools execute inline,
  `write` tools produce a `ConsentRequest` that lands in the drawer with its exact payload,
  and nothing is "executed" until you approve it. Denials are logged as `blocked`.

### Wiring a real backend

1. Replace `src/data/github.ts` with fetch calls to your API (or GitHub directly).
2. In `src/lib/assistant.ts`, swap the fixture lookups for those calls and keep the
   `TurnPlan` shape — the UI is already driven by it.
3. For a real LLM, replace `planTurn` with a model call that returns the same `TurnPlan`
   (tool calls + optional consent draft). The policy gate stays where it is: between the
   plan and execution.
4. Put secrets server-side. `.env.example` lists the variables a real deployment would
   need; **nothing in this repo reads them**, and no key should ever ship to the browser.

## Environment

Copy `.env.example` to `.env` only if you wire a real backend. The app runs with no `.env`
at all.

## Accessibility

- Semantic landmarks (`nav`, `main`, `header`, `aside`), labelled controls, `aria-live`
  transcript and toast region.
- Full keyboard operation: `Enter` sends, `Shift+Enter` newlines, every action is a real
  button.
- `prefers-reduced-motion` disables the orb breathing, scanline sweep and message entry.
- Contrast targets WCAG 2.1 AA on the dark ground.

## License

MIT — see `LICENSE`.
