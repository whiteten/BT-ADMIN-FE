// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));

export function App() {
  return (
    <React.Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/" element={<Outlet />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route path="*" element={<NotFound homePath="/" />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
