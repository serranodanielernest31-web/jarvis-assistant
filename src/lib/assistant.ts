import type { Card, Effect, ToolCall } from '../types';
import { codeCorpus, codeSnippets, commits, issues, pulls, repos } from '../data/github';

export interface ConsentDraft {
  tool: string;
  effect: Effect;
  target: string;
  title: string;
  summary: string;
  args: Record<string, string | number>;
}

export interface TurnPlan {
  intent: string;
  filler: string;
  reply: string;
  cards: Card[];
  tools: Array<Omit<ToolCall, 'id' | 'at'>>;
  consent?: ConsentDraft;
  trace: string[];
  latencyMs: number;
  navigate?: string;
}

const LOWER = (s: string) => s.toLowerCase();

/** Resolve a repo mentioned in free text, falling back to the most recent one. */
export function resolveRepo(text: string, fallback = 'acme-control/jarvis-core'): string {
  const t = LOWER(text);
  const scored = repos
    .map((r) => {
      let score = 0;
      if (t.includes(LOWER(r.name))) score += 10;
      if (t.includes(LOWER(r.owner))) score += 4;
      if (t.includes(LOWER(r.id))) score += 12;
      const words = LOWER(r.name).split('-');
      for (const w of words) if (w.length > 3 && t.includes(w)) score += 3;
      return { id: r.id, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? fallback;
}

function tool(
  name: string,
  effect: Effect,
  args: Record<string, string | number | boolean>,
  outcome: string,
  latencyMs: number,
): Omit<ToolCall, 'id' | 'at'> {
  return { name, effect, args, status: 'ok', outcome, latencyMs };
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

const FILLERS: Record<string, string[]> = {
  read: ['On it.', 'Checking.', 'One moment.', 'Pulling that up.'],
  write: ['Understood. That needs your approval first.', 'Ready — pending your go-ahead.'],
  help: ['Right here.', 'At your service.'],
};

function filler(kind: keyof typeof FILLERS, seed = Date.now()): string {
  const opts = FILLERS[kind];
  return opts[seed % opts.length];
}

export function searchCode(query: string, repoFilter?: string) {
  const q = LOWER(query).trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const hits = codeCorpus
    .filter((f) => !repoFilter || f.repoId === repoFilter)
    .map((f) => {
      const lines = codeSnippets[f.path] ?? ['// no preview available'];
      const joined = LOWER(lines.join(' '));
      let score = 0;
      for (const term of terms) {
        if (joined.includes(term)) score += 0.25;
        if (LOWER(f.path).includes(term)) score += 0.4;
      }
      const lineIdx = Math.max(
        0,
        lines.findIndex((l) => terms.some((term) => LOWER(l).includes(term))),
      );
      return {
        repoId: f.repoId,
        path: f.path,
        language: f.language,
        line: 12 + lineIdx * 4,
        snippet: lines.slice(lineIdx, lineIdx + 3).join('\n'),
        score: Math.min(0.98, 0.55 + score),
      };
    })
    .filter((h) => h.score > 0.55)
    .sort((a, b) => b.score - a.score);
  return hits.length
    ? pick(hits, 4)
    : pick(
        codeCorpus.filter((f) => !repoFilter || f.repoId === repoFilter).map((f) => ({
          repoId: f.repoId,
          path: f.path,
          language: f.language,
          line: 18,
          snippet: (codeSnippets[f.path] ?? []).slice(0, 2).join('\n'),
          score: 0.62,
        })),
        2,
      );
}

export function planTurn(raw: string, ctx: { lastRepo: string }): TurnPlan {
  const text = raw.trim();
  const t = LOWER(text);
  const repoId = resolveRepo(text, ctx.lastRepo);
  const repo = repos.find((r) => r.id === repoId)!;

  /* ---------- help / identity ---------- */
  if (/^(help|what can you do|capabilities|命令|你能做什么)/i.test(t) || t.includes('what can you do')) {
    return {
      intent: 'assistant.help',
      filler: 'Right here.',
      reply:
        "I hold one conversation state across voice and text, and every side-effecting action passes a policy gate. Ask me to list repositories, pull up a repo's issues or pull requests, search code, or read commits. Anything that writes — an issue, a comment, a PR, a review — I stage behind your consent and never fire it silently. Switch me to FRIDAY if you want the other voice; the runtime underneath is identical.",
      cards: [],
      tools: [],
      trace: ['router: assistant.help', 'no tools required', 'policy gate: skipped'],
      latencyMs: 240,
    };
  }

  /* ---------- create issue (write → consent) ---------- */
  if (/\b(create|open|file|raise|add)\b.*\bissue|new issue|bug report/i.test(t)) {
    const titleMatch = text.match(/(?:titled|called|about|for|saying)\s+["“']?(.+?)["”']?$/i);
    const title = titleMatch ? titleMatch[1].replace(/[.?!]$/, '') : 'Barge-in drops the final TTS chunk on Safari';
    const num = 500 + Math.floor(Math.random() * 90);
    return {
      intent: 'github.create_issue',
      filler: filler('write'),
      reply: `I've staged an issue on ${repo.name} — "${title}". It's sitting in your consent queue with the exact payload I'd send. Approve it and it lands on \`${repo.defaultBranch}\` immediately; deny it and nothing leaves the adapter.`,
      cards: [],
      tools: [
        tool(
          'github.create_issue',
          'write',
          { repo: repoId, title, labels: 'bug,p1' },
          'staged — awaiting consent',
          0,
        ),
        tool(
          'github.list_repos',
          'read',
          { sort: 'updated', per_page: 100 },
          'resolved installation scope',
          96,
        ),
      ],
      consent: {
        tool: 'github.create_issue',
        effect: 'write',
        target: repoId,
        title: `Create issue #${num} on ${repo.name}`,
        summary:
          'Posts a new issue with the body below. Scope `issues:write` on the installation token; the token is repo-scoped and expires in 1 hour.',
        args: {
          repository: repoId,
          title,
          labels: 'bug, p1',
          body:
            'Reported by voice on the assistant console.\n\nBarge-in during the final TTS sentence drops the tail chunk on Safari 17.4. Chrome flushes synchronously and is unaffected.',
        },
      },
      trace: [
        'router: github.create_issue  (confidence 0.94)',
        'policy: effect=write → standing grant absent',
        'policy: repo-derived args=false → consent TTL 300s',
        'fsm: THINKING → AWAITING_CONSENT',
      ],
      latencyMs: 412,
    };
  }

  /* ---------- create PR (write → consent) ---------- */
  if (/\b(open|create|raise)\b.*\b(pr|pull request)\b|new pull request/i.test(t)) {
    const num = 513 + Math.floor(Math.random() * 40);
    const base = pulls[repoId]?.[0];
    return {
      intent: 'github.create_pr',
      filler: filler('write'),
      reply: `Staged a pull request on ${repo.name} from \`${base?.head ?? 'fix/tts-bargein-flush'}\` into \`${repo.defaultBranch}\`, assigned to you. I pulled the branch name, the diff summary and the linked issue out of the repo — check the payload before you approve, since those arguments came from repository content.`,
      cards: [],
      tools: [
        tool(
          'github.create_pr',
          'write',
          { repo: repoId, head: base?.head ?? 'fix/tts-bargein-flush', base: repo.defaultBranch },
          'staged — awaiting consent',
          0,
        ),
        tool('github.list_pulls', 'read', { repo: repoId, state: 'open' }, '3 open pull requests', 118),
        tool('github.get_diff', 'read', { sha: 'a9f31c2', max_bytes: 65536 }, 'diff 61 lines', 132),
      ],
      consent: {
        tool: 'github.create_pr',
        effect: 'write',
        target: repoId,
        title: `Open pull request on ${repo.name}`,
        summary:
          'Opens a non-draft PR and requests your review. Arguments were derived from repository content, so this escalates to per-action consent even though a standing grant exists.',
        args: {
          repository: repoId,
          head: base?.head ?? 'fix/tts-bargein-flush',
          base: repo.defaultBranch,
          title: 'fix(audio): flush TTS ring buffer before barge-in teardown',
          assignee: 'serrano-d',
        },
      },
      trace: [
        'router: github.create_pr  (confidence 0.91)',
        'context: branch + diff resolved from repo',
        'policy: repo-derived args=true → escalate to per-action consent',
        'fsm: THINKING → AWAITING_CONSENT',
      ],
      latencyMs: 486,
    };
  }

  /* ---------- review PR (write → consent) ---------- */
  if (/\breview\b/i.test(t) && /\b(pr|pull|#?\d+)\b/i.test(t)) {
    const pr = pulls[repoId]?.[0];
    return {
      intent: 'github.review_pr',
      filler: filler('write'),
      reply: `Drafted a review for #${pr?.number ?? 512} on ${repo.name}: approve with one note about the teardown race. The review is staged — I don't submit a review until you approve it, because a submitted review is visible to your whole team.`,
      cards: [],
      tools: [
        tool('github.get_diff', 'read', { sha: 'a9f31c2' }, 'diff retrieved — 61 lines', 148),
        tool('github.review_pr', 'write', { repo: repoId, number: pr?.number ?? 512, event: 'APPROVE' }, 'staged — awaiting consent', 0),
      ],
      consent: {
        tool: 'github.review_pr',
        effect: 'write',
        target: repoId,
        title: `Submit APPROVE review on #${pr?.number ?? 512}`,
        summary:
          'Publishes a review visible to every collaborator on the repository. Scope `pull_requests:write`.',
        args: {
          repository: repoId,
          pull_number: pr?.number ?? 512,
          event: 'APPROVE',
          body: 'Flush ordering looks right, and the race is covered by the new test. One nit: the `pendingFinal` rejection path should clear the ring buffer too.',
        },
      },
      trace: [
        'router: github.review_pr  (confidence 0.88)',
        'tool: github.get_diff → 61 lines, 3 files',
        'policy: effect=write → consent required',
        'fsm: THINKING → AWAITING_CONSENT',
      ],
      latencyMs: 528,
    };
  }

  /* ---------- code search ---------- */
  if (/\b(search|find|where is|grep|look for|locate)\b/i.test(t) || t.includes('code for')) {
    const query = text
      .replace(/.*\b(search|find|where is|grep|look for|locate)\b/i, '')
      .replace(/\b(in|for|inside|across)\b.*$/i, '')
      .replace(/[?.!]/g, '')
      .trim() || 'tts buffer';
    const scoped = /across|all repos|every repo/i.test(t) ? undefined : repoId;
    const hits = searchCode(query, scoped);
    return {
      intent: 'github.search_code',
      filler: filler('read'),
      reply: `Four hits for "${query || 'tts buffer'}"${scoped ? ` in ${repo.name}` : ' across every readable repo'}. The strongest is \`${hits[0]?.path}\` — that's the flush path the reopen is about. Tier 2 of the index (pgvector over AST chunks) ranked these; Tier 1 would be GitHub's own code search if the local index missed.`,
      cards: [{ kind: 'code', query: query || 'tts buffer', hits }],
      tools: [
        tool('github.search_code', 'read', { q: query || 'tts buffer', repo: scoped ?? 'all' }, `${hits.length} matches`, 214),
      ],
      trace: [
        `router: github.search_code  (q="${query || 'tts buffer'}")`,
        `index: tier2 pgvector · ${hits.length} chunks above 0.55`,
        'policy: effect=read → scope check only',
      ],
      latencyMs: 214,
      navigate: '/github',
    };
  }

  /* ---------- commits ---------- */
  if (/\bcommit|history|recent changes|log\b/i.test(t)) {
    const list = pick(commits[repoId] ?? [], 5);
    return {
      intent: 'github.list_commits',
      filler: filler('read'),
      reply: `Last ${list.length} commits on ${repo.name}. The head is \`${list[0]?.sha}\` — "${list[0]?.message}". Nothing unmerged behind it, and the check suite on that SHA is green.`,
      cards: [{ kind: 'commits', repoId, shas: list.map((c) => c.sha) }],
      tools: [
        tool('github.list_commits', 'read', { repo: repoId, sha: repo.defaultBranch }, `${list.length} commits`, 132),
      ],
      trace: [`router: github.list_commits`, `tool: GET /repos/${repoId}/commits`, 'policy: effect=read → allowed'],
      latencyMs: 132,
    };
  }

  /* ---------- pull requests ---------- */
  if (/\b(pr|prs|pull request|pull requests|pulls)\b/i.test(t) && !/\bopen a\b/i.test(t)) {
    const list = pulls[repoId] ?? [];
    const open = list.filter((p) => p.state === 'open');
    const blocked = open.filter((p) => p.checks === 'failing' || p.review === 'changes_requested');
    return {
      intent: 'github.list_pulls',
      filler: filler('read'),
      reply: `${open.length} open pull requests on ${repo.name}. ${
        blocked.length
          ? `#${blocked[0].number} needs attention — checks are ${blocked[0].checks} and the review is ${blocked[0].review.replace('_', ' ')}.`
          : 'All of them are green and awaiting review.'
      } I read these through one GraphQL round trip so the PR cards cost a single rate-limit unit instead of four.`,
      cards: [{ kind: 'pulls', repoId, numbers: open.map((p) => p.number) }],
      tools: [
        tool('github.list_pulls', 'read', { repo: repoId, state: 'open' }, `${open.length} pull requests`, 186),
      ],
      trace: [
        'router: github.list_pulls',
        `graphql: pullRequests(states:[OPEN]) → reviews, checks, files in 1 call`,
        'policy: effect=read → allowed',
      ],
      latencyMs: 186,
      navigate: `/github/${repoId}`,
    };
  }

  /* ---------- issues ---------- */
  if (/\bissue|issues|bug|bugs|ticket/i.test(t)) {
    const list = (issues[repoId] ?? []).filter((i) => i.state === 'open');
    const p1 = list.filter((i) => i.labels.some((l) => l.name === 'p1'));
    return {
      intent: 'github.list_issues',
      filler: filler('read'),
      reply: `${list.length} open issues on ${repo.name}. ${
        p1.length ? `#${p1[0].number} is the only p1 — "${p1[0].title}". ` : ''
      }${list.filter((i) => !i.assignee).length} are unassigned. Ask me to create one and I'll stage it for your approval rather than posting it straight away.`,
      cards: [{ kind: 'issues', repoId, numbers: list.map((i) => i.number) }],
      tools: [
        tool('github.list_issues', 'read', { repo: repoId, state: 'open' }, `${list.length} issues`, 164),
      ],
      trace: [`router: github.list_issues`, `tool: GET /repos/${repoId}/issues?state=open`, 'policy: effect=read → allowed'],
      latencyMs: 164,
      navigate: `/github/${repoId}`,
    };
  }

  /* ---------- repository list ---------- */
  if (/\b(repo|repos|repositor|project|codebase)\b/i.test(t)) {
    const list = t.includes('private')
      ? repos.filter((r) => r.isPrivate)
      : pick(repos, 4);
    const failing = repos.filter((r) => r.build === 'failing');
    return {
      intent: 'github.list_repos',
      filler: filler('read'),
      reply: `Here are ${list.length} repositories from your installation. ${
        failing.length
          ? `${failing[0].name} is the one to watch — its check suite is failing on \`${failing[0].defaultBranch}\`.`
          : 'Every default branch is green.'
      } The token this used is repo-scoped and expires in ${Math.max(
        4,
        Math.round((60 - new Date().getMinutes()) % 60),
      )} minutes; I'll refresh it silently before then.`,
      cards: [{ kind: 'repos', repoIds: list.map((r) => r.id) }],
      tools: [
        tool('github.list_repos', 'read', { sort: 'updated', per_page: 100 }, `${list.length} repositories`, 148),
      ],
      trace: [
        'router: github.list_repos  (confidence 0.96)',
        'auth: installation token verified · repo-scoped · ttl 1h',
        'policy: effect=read → allowed',
      ],
      latencyMs: 148,
      navigate: '/github',
    };
  }

  /* ---------- status / summary ---------- */
  if (/\b(status|summary|summar|brief me|what's up|whats up|standup|state of)\b/i.test(t)) {
    const openPulls = Object.values(pulls).flat().filter((p) => p.state === 'open').length;
    const openIssues = Object.values(issues).flat().filter((i) => i.state === 'open').length;
    const failing = repos.filter((r) => r.build === 'failing');
    return {
      intent: 'assistant.status',
      filler: filler('read'),
      reply: `Across ${repos.length} repositories: ${openPulls} open pull requests, ${openIssues} open issues, and ${
        failing.length ? `${failing.length} failing build${failing.length > 1 ? 's' : ''} — ${failing.map((f) => f.name).join(', ')}` : 'no failing builds'
      }. The p1 on jarvis-core is the Safari barge-in race, and #512 already has an approved fix waiting on merge. Want me to walk the diff?`,
      cards: [
        { kind: 'pulls', repoId: 'acme-control/jarvis-core', numbers: [512, 509] },
      ],
      tools: [
        tool('github.list_repos', 'read', { sort: 'updated' }, '6 repositories scanned', 96),
        tool('github.list_pulls', 'read', { state: 'open' }, `${openPulls} open`, 141),
        tool('github.list_issues', 'read', { state: 'open', labels: 'p1' }, `${openIssues} open`, 158),
      ],
      trace: [
        'router: assistant.status',
        'fan-out: 3 read tools in parallel (asyncio.gather)',
        'synthesis: 1 sentence + rich card payload',
      ],
      latencyMs: 395,
    };
  }

  /* ---------- navigate ---------- */
  if (/\b(open|go to|show me|take me)\b/i.test(t)) {
    return {
      intent: 'ui.navigate',
      filler: filler('read'),
      reply: `Opening ${repo.name}. Issues, pull requests, commits and the quick actions are all wired to the adapter — say the word and I'll run one.`,
      cards: [{ kind: 'repos', repoIds: [repoId] }],
      tools: [tool('ui.navigate', 'read', { path: `/github/${repoId}` }, 'route resolved', 42)],
      trace: [`router: ui.navigate → /github/${repoId}`, 'policy: effect=read → allowed'],
      latencyMs: 42,
      navigate: `/github/${repoId}`,
    };
  }

  /* ---------- fallback ---------- */
  return {
    intent: 'assistant.fallback',
    filler: 'Let me think about that.',
    reply: `I don't have a tool that maps cleanly onto that, and I won't guess at an action I can't attribute to a scope. What I can do right now: list your repositories, pull ${repo.name}'s issues or pull requests, search the code index, read recent commits, or stage a write — an issue, a PR, a review — behind your approval. Ask for any of those and I'll run it.`,
    cards: [],
    tools: [],
    trace: [
      'router: no intent above 0.55 confidence',
      'policy: refusing to synthesize an unattributable action',
      'fallback: capability list returned',
    ],
    latencyMs: 310,
  };
}
