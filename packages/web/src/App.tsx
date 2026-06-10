import { Routes, Route, Outlet } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { NotePage } from './pages/NotePage';
import { GraphPage } from './pages/GraphPage';
import { DailyPage } from './pages/DailyPage';
import { LandingPage } from './pages/LandingPage';
import { BookmarksPage } from './pages/BookmarksPage';
import { ComposerPage } from './pages/ComposerPage';
import { TransformerPage } from './pages/TransformerPage';
import { AgentsPage } from './pages/AgentsPage';

/** Layout shim so AppShell can host nested routes via <Outlet />. */
function AppShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function App() {
  return (
    <Routes>
      {/* Marketing site — no sidebar, no chrome */}
      <Route path="/landing" element={<LandingPage />} />

      {/* App surfaces — wrapped in AppShell */}
      <Route element={<AppShellLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/notes/:id" element={<NotePage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/daily" element={<DailyPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/composer" element={<ComposerPage />} />
        <Route path="/transformer" element={<TransformerPage />} />
        <Route path="/agents" element={<AgentsPage />} />
      </Route>
    </Routes>
  );
}
