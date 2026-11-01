import type { ConsentRequest } from '../types';

const FEED = [
  { name: 'github.list_repos', effect: 'read', args: 'sort=updated', outcome: '6 repositories', latencyMs: 148, ago: 46 },
  { name: 'github.list_pulls', effect: 'read', args: 'state=open', outcome: '3 pull requests', latencyMs: 186, ago: 44 },
  { name: 'github.get_diff', effect: 'read', args: 'sha=a9f31c2', outcome: '61 lines / 3 files', latencyMs: 132, ago: 39 },
  { name: 'github.create_issue', effect: 'write', args: 'repo=jarvis-core', outcome: 'approved by user', latencyMs: 402, ago: 27 },
  { name: 'github.search_code', effect: 'read', args: 'q="ring buffer"', outcome: '4 hits above 0.55', latencyMs: 214, ago: 18 },
  { name: 'github.review_pr', effect: 'write', args: 'number=512 event=APPROVE', outcome: 'submitted', latencyMs: 611, ago: 11 },
] as const;

export function seedFeed(now: number) {
  return FEED.map((f, i) => ({
    id: `seed-${i}`,
    name: f.name,
    effect: f.effect as 'read' | 'write' | 'destructive',
    args: { detail: f.args } as Record<string, string | number | boolean>,
    status: 'ok' as const,
    latencyMs: f.latencyMs,
    outcome: f.outcome,
    at: now - f.ago * 60_000,
  }));
}

export const seedConsents: ConsentRequest[] = [];

export const grants = [
  { id: 'g1', tool: 'github.list_issues', effect: 'read', scope: 'acme-control/*', expires: 'never (read)' },
  { id: 'g2', tool: 'github.create_issue', effect: 'write', scope: 'acme-control/github-adapter', expires: 'expires in 4h 12m' },
  { id: 'g3', tool: 'github.comment_issue', effect: 'write', scope: 'nova-labs/reactor-ui', expires: 'expires in 51m' },
  { id: 'g4', tool: 'github.create_pr', effect: 'destructive', scope: 'never granted', expires: 'per-action only' },
];
