import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  FileCode2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import type { Card } from '../types';
import { commits, issues, pulls, repoOf } from '../data/github';
import { useStore } from '../store';

const Head: React.FC<{ icon: React.ReactNode; label: string; count?: string }> = ({
  icon,
  label,
  count,
}) => (
  <div className="mini-card-head">
    {icon}
    {label}
    {count && <span className="count">{count}</span>}
  </div>
);

export const CardView: React.FC<{ card: Card }> = ({ card }) => {
  const { setDrawerOpen } = useStore();

  if (card.kind === 'repos') {
    const list = card.repoIds.map(repoOf).filter(Boolean);
    return (
      <div className="mini-card">
        <Head icon={<GitBranch size={12} />} label="Repositories" count={`${list.length}`} />
        {list.map((r) => (
          <Link key={r!.id} to={`/github/${r!.id}`} className="row-item">
            <span className="title">
              <span className="dim">{r!.owner}/</span>
              <span className="cyan">{r!.name}</span>
            </span>
            <span className="meta">{r!.language}</span>
            <span className={`build ${r!.build}`}>{r!.build}</span>
          </Link>
        ))}
      </div>
    );
  }

  if (card.kind === 'issues') {
    const list = (issues[card.repoId] ?? []).filter((i) => card.numbers.includes(i.number));
    return (
      <div className="mini-card">
        <Head icon={<MessageSquare size={12} />} label="Open issues" count={`${list.length}`} />
        {list.map((i) => (
          <Link key={i.number} to={`/github/${card.repoId}?tab=issues`} className="row-item">
            <span className="num">#{i.number}</span>
            <span className="title">{i.title}</span>
            <span className="meta">{i.assignee ?? 'unassigned'}</span>
          </Link>
        ))}
      </div>
    );
  }

  if (card.kind === 'pulls') {
    const list = (pulls[card.repoId] ?? []).filter((p) => card.numbers.includes(p.number));
    return (
      <div className="mini-card">
        <Head icon={<GitPullRequest size={12} />} label="Pull requests" count={`${list.length}`} />
        {list.map((p) => (
          <Link key={p.number} to={`/github/${card.repoId}?tab=pulls`} className="row-item">
            <span className="num">#{p.number}</span>
            <span className="title">{p.title}</span>
            <span className={`build ${p.checks === 'passing' ? 'passing' : p.checks === 'failing' ? 'failing' : 'queued'}`}>
              {p.checks}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  if (card.kind === 'commits') {
    const list = (commits[card.repoId] ?? []).filter((c) => card.shas.includes(c.sha));
    return (
      <div className="mini-card">
        <Head icon={<GitCommitHorizontal size={12} />} label="Recent commits" count={`${list.length}`} />
        {list.map((c) => (
          <div key={c.sha} className="row-item">
            <span className="num mono">{c.sha.slice(0, 7)}</span>
            <span className="title">{c.message}</span>
            <span className="meta">
              +{c.additions} −{c.deletions}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (card.kind === 'code') {
    return (
      <div className="mini-card">
        <Head icon={<FileCode2 size={12} />} label={`Code · "${card.query}"`} count={`${card.hits.length} hits`} />
        {card.hits.map((h) => (
          <div key={`${h.repoId}-${h.path}`} className="code-hit">
            <div className="path">
              <span className="dim">{h.repoId.split('/')[1]}/</span>
              {h.path}
              <span className="score">{h.score.toFixed(2)}</span>
            </div>
            <pre>{h.snippet}</pre>
          </div>
        ))}
      </div>
    );
  }

  if (card.kind === 'consent') {
    return (
      <div className="mini-card">
        <Head icon={<ShieldAlert size={12} />} label="Awaiting consent" />
        <div className="row-item" style={{ cursor: 'pointer' }} onClick={() => setDrawerOpen(true)}>
          <span className="title">A write action is staged — review the payload</span>
          <span className="meta cyan">open queue →</span>
        </div>
      </div>
    );
  }

  /* created / reviewed confirmations */
  const label =
    card.kind === 'issue_created'
      ? `Issue #${card.number} created`
      : card.kind === 'pr_created'
        ? `Pull request #${card.number} opened`
        : `Review submitted on #${card.number}`;
  return (
    <div className="mini-card">
      <Head icon={<CheckCircle2 size={12} />} label="Executed" />
      <div className="row-item">
        <span className="title mint">{label}</span>
        <span className="meta">{card.repoId.split('/')[1]}</span>
      </div>
    </div>
  );
};
