// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));

export function App() {
  return (
    <React.Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/" element={<Outlet />}>
          <Route index element={<Navigate to="main" replace />} />
          <Route path="main" element={<Main />} />
        </Route>
        <Route path="*" element={<NotFound homePath="/" />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
