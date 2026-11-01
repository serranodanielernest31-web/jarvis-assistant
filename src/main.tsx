import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './store';
import { Rail } from './components/Rail';
import { ConsentDrawer } from './components/ConsentDrawer';
import { Toasts } from './components/Toasts';
import { ConsolePage } from './pages/ConsolePage';
import { GithubPage } from './pages/GithubPage';
import { RepoPage } from './pages/RepoPage';
import { ActivityPage } from './pages/ActivityPage';
import './styles.css';

const App: React.FC = () => (
  <StoreProvider>
    <div className="shell">
      <Rail />
      <main className="main">
        <Routes>
          <Route path="/" element={<ConsolePage />} />
          <Route path="/github" element={<GithubPage />} />
          <Route path="/github/:owner/:name" element={<RepoPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
    <ConsentDrawer />
    <Toasts />
  </StoreProvider>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);
