import React, { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  MessageSquarePlus,
  Play,
  Star,
  X,
} from 'lucide-react';
import { useStore } from '../store';
import { Topbar } from '../components/Topbar';
import { codeCorpus, commits, issues, pulls, repoOf } from '../data/github';

type Tab = 'issues' | 'pulls' | 'commits' | 'files';

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: 'issues', label: 'Issues', icon: CircleDot },
  { key: 'pulls', label: 'Pull requests', icon: GitPullRequest },
  { key: 'commits', label: 'Commits', icon: GitCommitHorizontal },
  { key: 'files', label: 'Files', icon: FileCode2 },
];

export const RepoPage: React.FC = () => {
  const { owner, name } = useParams();
  const repoId = `${owner}/${name}`;
  const repo = repoOf(repoId);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'issues';
  const { requestConsent, toast } = useStore();

  const [modal, setModal] = useState<null | 'issue' | 'pr' | 'review'>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const repoIssues = issues[repoId] ?? [];
  const repoPulls = pulls[repoId] ?? [];
  const repoCommits = commits[repoId] ?? [];
  const repoFiles = useMemo(() => codeCorpus.filter((f) => f.repoId === repoId), [repoId]);

  if (!repo) {
    return (
      <>
        <Topbar title="Repository not found" />
        <div className="page">
          <div className="panel">
            <div className="empty" style={{ padding: '60px 20px' }}>
              <h2 style={{ fontSize: 16 }}>No repository at {repoId}</h2>
              <Link to="/github" className="btn sm" style={{ marginTop: 8 }}>
                <ArrowLeft size={13} /> Back to repositories
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const openModal = (kind: 'issue' | 'pr' | 'review') => {
    setModal(kind);
    setTitle(
      kind === 'issue'
        ? 'Barge-in drops the final TTS chunk on Safari'
        : kind === 'pr'
          ? 'fix(audio): flush TTS ring buffer before barge-in teardown'
          : '',
    );
    setBody(
      kind === 'issue'
        ? 'Reported from the assistant console.\n\nBarge-in during the final TTS sentence drops the tail chunk on Safari 17.4. Chrome flushes synchronously and is unaffected.'
        : kind === 'pr'
          ? 'Flushes the ring buffer before teardown so the tail chunk is not dropped.\n\nCloses the p1 on Safari barge-in.'
          : 'Flush ordering looks right and the race is covered by the new test. One nit: the `pendingFinal` rejection path should clear the ring buffer too.',
    );
  };

  const stage = () => {
    if (!modal) return;
    if (modal === 'issue') {
      requestConsent({
        tool: 'github.create_issue',
        effect: 'write',
        target: repoId,
        title: `Create issue on ${repo.name}`,
        summary:
          'Posts a new issue with the body below. Scope `issues:write` on the installation token; the token is repo-scoped and expires in 1 hour.',
        args: { repository: repoId, title, labels: 'bug, p1', body },
      });
    } else if (modal === 'pr') {
      requestConsent({
        tool: 'github.create_pr',
        effect: 'write',
        target: repoId,
        title: `Open pull request on ${repo.name}`,
        summary:
          'Opens a non-draft PR and requests your review. Arguments were derived from repository content, so this escalates to per-action consent.',
        args: {
          repository: repoId,
          head: repoPulls[0]?.head ?? 'fix/tts-bargein-flush',
          base: repo.defaultBranch,
          title,
          body,
        },
      });
    } else {
      requestConsent({
        tool: 'github.review_pr',
        effect: 'write',
        target: repoId,
        title: `Submit APPROVE review on #${repoPulls[0]?.number ?? 512}`,
        summary:
          'Publishes a review visible to every collaborator on the repository. Scope `pull_requests:write`.',
        args: {
          repository: repoId,
          pull_number: repoPulls[0]?.number ?? 512,
          event: 'APPROVE',
          body,
        },
      });
    }
    setModal(null);
    toast('Action staged — approve it in the consent queue', 'warn');
  };

  return (
    <>
      <Topbar title={`${repo.owner}/${repo.name}`} sub={repo.description} />
      <div className="page">
        <div className="page-head">
          <div>
            <div className="hstack" style={{ marginBottom: 6 }}>
              <Link to="/github" className="btn sm ghost">
                <ArrowLeft size={13} /> Repositories
              </Link>
              <span className={`build ${repo.build}`}>{repo.build}</span>
              <span className="pill" style={{ height: 22, fontSize: 10 }}>
                <GitBranch size={10} /> {repo.defaultBranch}
              </span>
            </div>
            <h2>
              {repo.owner}/<span className="cyan">{repo.name}</span>
            </h2>
            <p>{repo.description}</p>
          </div>
          <div className="actions">
            <button className="btn sm" onClick={() => openModal('issue')}>
              <MessageSquarePlus size={13} /> New issue
            </button>
            <button className="btn sm" onClick={() => openModal('pr')}>
              <GitPullRequest size={13} /> Open PR
            </button>
            <button className="btn primary sm" onClick={() => openModal('review')}>
              <Play size={13} /> Run review
            </button>
          </div>
        </div>

        <div className="hstack" style={{ gap: 18, marginBottom: 16, flexWrap: 'wrap' }}>
          <span className="pill">
            <Star size={11} /> {repo.stars} stars
          </span>
          <span className="pill">{repo.forks} forks</span>
          <span className="pill">{repo.openIssues} open issues</span>
          <span className="pill">{repo.openPulls} open PRs</span>
          <span className="pill">{repo.isPrivate ? 'private' : 'public'}</span>
          <span className="pill">updated {repo.updatedAt}</span>
          {repo.topics.map((t) => (
            <span key={t} className="scope">
              {t}
            </span>
          ))}
        </div>

        <div className="panel">
          <div className="tabs" role="tablist">
            {TABS.map(({ key, label, icon: Icon }) => {
              const n =
                key === 'issues'
                  ? repoIssues.length
                  : key === 'pulls'
                    ? repoPulls.length
                    : key === 'commits'
                      ? repoCommits.length
                      : repoFiles.length;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={tab === key}
                  className={`tab${tab === key ? ' on' : ''}`}
                  onClick={() => setParams({ tab: key })}
                >
                  <Icon size={13} /> {label} <span className="n">{n}</span>
                </button>
              );
            })}
          </div>

          {tab === 'issues' &&
            (repoIssues.length ? (
              repoIssues.map((i) => (
                <div key={i.number} className="list-row">
                  <CircleDot
                    size={15}
                    className={i.state === 'open' ? 'mint' : 'dim'}
                    style={{ marginTop: 3 }}
                  />
                  <div className="body">
                    <div className="title">
                      <span className="num">#{i.number}</span>
                      {i.title}
                      {i.labels.map((l) => (
                        <span
                          key={l.name}
                          className="label"
                          style={{ color: l.color, borderColor: `${l.color}55`, background: `${l.color}14` }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                    <div className="sub">
                      <span>opened by {i.author}</span>
                      <span>·</span>
                      <span>{i.assignee ? `assigned to ${i.assignee}` : 'unassigned'}</span>
                      <span>·</span>
                      <span>{i.comments} comments</span>
                      <span>·</span>
                      <span>{i.createdAt}</span>
                    </div>
                  </div>
                  <div className="right">
                    <span className={`label state-${i.state}`}>{i.state}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '50px 20px' }}>
                <CheckCircle2 size={22} className="mint" />
                <h2 style={{ fontSize: 15 }}>No issues</h2>
                <p>This repository has a clean tracker.</p>
              </div>
            ))}

          {tab === 'pulls' &&
            (repoPulls.length ? (
              repoPulls.map((p) => (
                <div key={p.number} className="list-row">
                  <GitPullRequest
                    size={15}
                    className={p.state === 'open' ? 'mint' : 'dim'}
                    style={{ marginTop: 3 }}
                  />
                  <div className="body">
                    <div className="title">
                      <span className="num">#{p.number}</span>
                      {p.title}
                      {p.draft && <span className="label dim">draft</span>}
                    </div>
                    <div className="sub">
                      <span className="mono">
                        {p.head} → {p.base}
                      </span>
                      <span>·</span>
                      <span>
                        <span className="mint">+{p.additions}</span>{' '}
                        <span className="coral">−{p.deletions}</span> · {p.changedFiles.length} files
                      </span>
                      <span>·</span>
                      <span>{p.author}</span>
                    </div>
                  </div>
                  <div className="right">
                    <span className={`build ${p.checks === 'passing' ? 'passing' : p.checks === 'failing' ? 'failing' : 'queued'}`}>
                      {p.checks}
                    </span>
                    <span className={`label ${p.review === 'approved' ? 'mint' : p.review === 'changes_requested' ? 'coral' : 'dim'}`}>
                      {p.review.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '50px 20px' }}>
                <GitPullRequest size={22} className="dim" />
                <h2 style={{ fontSize: 15 }}>No pull requests</h2>
                <p>Nothing is open against {repo.defaultBranch}.</p>
              </div>
            ))}

          {tab === 'commits' &&
            (repoCommits.length ? (
              repoCommits.map((c) => (
                <div key={c.sha} className="list-row">
                  <GitCommitHorizontal size={15} className="dim" style={{ marginTop: 3 }} />
                  <div className="body">
                    <div className="title">{c.message}</div>
                    <div className="sub">
                      <span className="mono cyan">{c.sha.slice(0, 7)}</span>
                      <span>·</span>
                      <span>{c.author}</span>
                      <span>·</span>
                      <span>{c.date}</span>
                      <span>·</span>
                      <span>
                        {c.files} files · <span className="mint">+{c.additions}</span>{' '}
                        <span className="coral">−{c.deletions}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '50px 20px' }}>
                <GitCommitHorizontal size={22} className="dim" />
                <h2 style={{ fontSize: 15 }}>No commits indexed</h2>
                <p>The local index has not seen this branch yet.</p>
              </div>
            ))}

          {tab === 'files' &&
            (repoFiles.length ? (
              repoFiles.map((f) => (
                <div key={f.path} className="list-row">
                  <FileCode2 size={15} className="dim" style={{ marginTop: 3 }} />
                  <div className="body">
                    <div className="title mono" style={{ fontSize: 12.5 }}>
                      {f.path}
                    </div>
                    <div className="sub">
                      <span>{f.language}</span>
                      <span>·</span>
                      <span>indexed in tier-2 pgvector</span>
                    </div>
                  </div>
                  <div className="right">
                    <span className="label dim">read</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty" style={{ padding: '50px 20px' }}>
                <FileCode2 size={22} className="dim" />
                <h2 style={{ fontSize: 15 }}>No files indexed</h2>
                <p>Ask the assistant to search code to populate the index.</p>
              </div>
            ))}
        </div>
      </div>

      {modal && (
        <div className="modal-scrim" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <h3>
                {modal === 'issue' ? 'New issue' : modal === 'pr' ? 'Open pull request' : 'Run review'}
              </h3>
              <span className="pill warn" style={{ marginLeft: 'auto' }}>
                <span className="dot" /> write · needs consent
              </span>
              <button className="btn icon ghost" onClick={() => setModal(null)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              {modal !== 'review' && (
                <div className="field">
                  <label htmlFor="t">Title</label>
                  <input id="t" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}
              <div className="field">
                <label htmlFor="b">{modal === 'review' ? 'Review body' : 'Body'}</label>
                <textarea id="b" value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <p className="mono dim" style={{ fontSize: 10.5, margin: 0 }}>
                Nothing is sent yet. This stages a consent request with the exact payload above.
              </p>
            </div>
            <div className="modal-foot">
              <button className="btn ghost sm" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn primary sm" onClick={stage} disabled={modal !== 'review' && !title.trim()}>
                Stage for approval
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
