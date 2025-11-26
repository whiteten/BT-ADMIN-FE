import * as React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const BotList = React.lazy(() => import('./pages/bot-config/BotList'));

export function App() {
  return (
    <React.Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/" element={<Outlet />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<Main />} />
          <Route path="bot-config" element={<Outlet />}>
            <Route index element={<Navigate to="bots" replace />} />
            <Route path="bots" element={<BotList />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound homePath="/bot" />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
