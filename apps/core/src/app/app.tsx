import * as React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const UserList = React.lazy(() => import('./pages/user/UserList'));
const UserCreate = React.lazy(() => import('./pages/user/UserCreate'));
const UserDetail = React.lazy(() => import('./pages/user/UserDetail'));

export function App() {
  return (
    <React.Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/" element={<Outlet />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="user" element={<Outlet />}>
            <Route index element={<Navigate to="../users" replace />} />
            <Route path=":id" element={<UserDetail />} />
            <Route path="create" element={<UserCreate />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound homePath="/core" />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
