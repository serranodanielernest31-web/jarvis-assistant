import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../store';

export const Toasts: React.FC = () => {
  const { toasts } = useStore();
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.kind === 'ok' ? (
            <CheckCircle2 size={14} />
          ) : t.kind === 'warn' ? (
            <AlertTriangle size={14} />
          ) : (
            <XCircle size={14} />
          )}
          {t.text}
        </div>
      ))}
    </div>
  );
};
