export type Persona = 'jarvis' | 'friday';

export type Fsm =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'ACTING'
  | 'SPEAKING'
  | 'AWAITING_CONSENT';

export type Effect = 'read' | 'write' | 'destructive';

export interface Label {
  name: string;
  color: string;
}

export interface Repo {
  id: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  langColor: string;
  stars: number;
  forks: number;
  openIssues: number;
  openPulls: number;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
  topics: string[];
  build: 'passing' | 'failing' | 'queued';
  pinned?: boolean;
}

export interface Issue {
  number: number;
  repoId: string;
  title: string;
  body: string;
  state: 'open' | 'closed';
  author: string;
  assignee: string | null;
  comments: number;
  createdAt: string;
  labels: Label[];
}

export interface PullFile {
  path: string;
  additions: number;
  deletions: number;
}

export interface Pull {
  number: number;
  repoId: string;
  title: string;
  body: string;
  state: 'open' | 'merged' | 'closed';
  draft: boolean;
  author: string;
  head: string;
  base: string;
  additions: number;
  deletions: number;
  changedFiles: PullFile[];
  review: 'approved' | 'changes_requested' | 'pending';
  checks: 'passing' | 'failing' | 'running';
  createdAt: string;
}

export interface Commit {
  sha: string;
  repoId: string;
  message: string;
  author: string;
  date: string;
  additions: number;
  deletions: number;
  files: number;
}

export interface CodeHit {
  repoId: string;
  path: string;
  language: string;
  line: number;
  snippet: string;
  score: number;
}

export interface GithubAccount {
  login: string;
  name: string;
  scopes: string[];
  installation: string;
  connectedAt: string;
}

/* ---------- tool + audit ---------- */

export interface ToolCall {
  id: string;
  name: string;
  effect: Effect;
  args: Record<string, string | number | boolean>;
  status: 'running' | 'ok' | 'error' | 'blocked' | 'awaiting';
  latencyMs: number;
  outcome: string;
  at: number;
}

/* ---------- consent ---------- */

export interface ConsentRequest {
  id: string;
  tool: string;
  effect: Effect;
  target: string;
  title: string;
  summary: string;
  args: Record<string, string | number>;
  origin: 'voice' | 'panel';
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
  decidedAt?: number;
}

/* ---------- chat cards ---------- */

export type Card =
  | { kind: 'repos'; repoIds: string[] }
  | { kind: 'issues'; repoId: string; numbers: number[] }
  | { kind: 'pulls'; repoId: string; numbers: number[] }
  | { kind: 'commits'; repoId: string; shas: string[] }
  | { kind: 'code'; query: string; hits: CodeHit[] }
  | { kind: 'issue_created'; repoId: string; number: number }
  | { kind: 'pr_created'; repoId: string; number: number }
  | { kind: 'reviewed'; repoId: string; number: number; verdict: string }
  | { kind: 'consent'; consentId: string };

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  cards: Card[];
  tools: ToolCall[];
  at: number;
  streaming?: boolean;
  spoken?: boolean;
  trace?: string[];
  latencyMs?: number;
}

export interface Conversation {
  id: string;
  title: string;
  persona: Persona;
  messages: Message[];
  createdAt: number;
}
