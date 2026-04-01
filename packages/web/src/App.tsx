import { Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Home } from './pages/Home';
import { NotePage } from './pages/NotePage';
import { GraphPage } from './pages/GraphPage';
import { DailyPage } from './pages/DailyPage';

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/notes/:id" element={<NotePage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/daily" element={<DailyPage />} />
      </Routes>
    </AppShell>
  );
}
