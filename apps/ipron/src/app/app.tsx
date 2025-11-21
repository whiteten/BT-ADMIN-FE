import * as React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';

const Dashboard = React.lazy(() => import('./pages/dashboard/Dashboard'));
const PhoneList = React.lazy(() => import('./pages/phone/PhoneList'));
const PhoneCreate = React.lazy(() => import('./pages/phone/PhoneCreate'));
const PhoneDetail = React.lazy(() => import('./pages/phone/PhoneDetail'));

export function App() {
  return (
    <React.Suspense fallback={<FallbackSpinner />}>
      <Routes>
        <Route path="/" element={<Outlet />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="phones" element={<PhoneList />} />
          <Route path="phone" element={<Outlet />}>
            <Route index element={<Navigate to="../phones" replace />} />
            <Route path=":id" element={<PhoneDetail />} />
            <Route path="create" element={<PhoneCreate />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound homePath="/ipron" />} />
      </Routes>
    </React.Suspense>
  );
}

export default App;
