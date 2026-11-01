import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  GitFork,
  Github,
  Lock,
  Plug,
  RefreshCw,
  Search,
  Star,
  Unplug,
} from 'lucide-react';
import { useStore } from '../store';
import { Topbar } from '../components/Topbar';
import { repos } from '../data/github';

type Sort = 'updated' | 'stars' | 'issues';
type Filter = 'all' | 'public' | 'private';

export const GithubPage: React.FC = () => {
  const { github, connectGithub, disconnectGithub, toast } = useStore();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const list = useMemo(() => {
    let out = repos.filter((r) => {
      const hay = `${r.owner}/${r.name} ${r.description} ${r.topics.join(' ')} ${r.language}`.toLowerCase();
      if (q && !hay.includes(q.toLowerCase())) return false;
      if (filter === 'public' && r.isPrivate) return false;
      if (filter === 'private' && !r.isPrivate) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === 'stars') return b.stars - a.stars;
      if (sort === 'issues') return b.openIssues - a.openIssues;
      return (a.pinned ? -1 : 0) - (b.pinned ? -1 : 0);
    });
    return out;
  }, [q, sort, filter]);

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      toast('Repositories refreshed · 1 GraphQL round trip', 'ok');
    }, 700);
  };

  return (
    <>
      <Topbar title="GitHub" sub="Installation-scoped access · read tools run immediately, writes need consent" />
      <div className="page">
        <div className="page-head">
          <div>
            <h2>Connected account</h2>
            <p>One GitHub App installation, repo-scoped token, refreshed silently before its 1h TTL.</p>
          </div>
          <div className="actions">
            <button className="btn sm" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={13} className={refreshing ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <div className="conn">
          <div className="conn-avatar">{github.connected ? github.login.slice(0, 2).toUpperCase() : '?'}</div>
          <div className="conn-info">
            <div className="login">
              {github.connected ? github.name : 'No account connected'}
              {github.connected && (
                <span className="pill" style={{ height: 20, fontSize: 10 }}>
                  <span className="dot" /> connected
                </span>
              )}
            </div>
            <div className="meta">
              {github.connected
                ? `@${github.login} · ${github.installation} · since ${new Date(github.connectedAt).toLocaleDateString()}`
                : 'Connect an installation to let the assistant read repositories.'}
            </div>
            {github.connected && (
              <div className="scopes">
                {github.scopes.map((s) => (
                  <span key={s} className="scope">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="actions">
            {github.connected ? (
              <>
                <button className="btn sm" onClick={connectGithub}>
                  <Plug size={13} /> Re-authorize
                </button>
                <button className="btn danger sm" onClick={disconnectGithub}>
                  <Unplug size={13} /> Disconnect
                </button>
              </>
            ) : (
              <button className="btn primary sm" onClick={connectGithub}>
                <Github size={13} /> Connect GitHub
              </button>
            )}
          </div>
        </div>

        <div className="page-head" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 17 }}>Repositories</h2>
            <p>{list.length} of {repos.length} visible to this installation</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <Search size={14} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name, topic or language…"
              aria-label="Filter repositories"
            />
          </div>
          <div className="seg" role="group" aria-label="Visibility filter">
            {(['all', 'public', 'private'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Sort">
            {(['updated', 'stars', 'issues'] as Sort[]).map((s) => (
              <button key={s} className={sort === s ? 'on' : ''} onClick={() => setSort(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="panel">
            <div className="empty" style={{ padding: '60px 20px' }}>
              <Search size={24} className="dim" />
              <h2 style={{ fontSize: 15 }}>No repositories match</h2>
              <p>Clear the filter or search a different term.</p>
            </div>
          </div>
        ) : (
          <div className="repo-grid">
            {list.map((r) => (
              <Link key={r.id} to={`/github/${r.id}`} className="repo-card">
                <div className="top">
                  <span className="name">{r.name}</span>
                  {r.isPrivate ? <Lock size={11} className="dim" /> : null}
                  <span className={`build ${r.build}`} style={{ marginLeft: 'auto' }}>
                    {r.build}
                  </span>
                </div>
                <div className="owner">{r.owner}</div>
                <div className="desc">{r.description}</div>
                <div className="foot">
                  <span className="lang">
                    <i style={{ background: r.langColor }} />
                    {r.language}
                  </span>
                  <span>
                    <Star size={10} style={{ verticalAlign: -1 }} /> {r.stars}
                  </span>
                  <span>
                    <GitFork size={10} style={{ verticalAlign: -1 }} /> {r.forks}
                  </span>
                  <span className="spacer" />
                  <span>{r.openIssues} issues</span>
                  <ArrowUpRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
