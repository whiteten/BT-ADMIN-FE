import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { type Theme, ToastContainer, type ToastPosition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './features/layout/Layout';
import ProtectRouter from './features/router/ProtectRouter';
import Login from './pages/Login';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';
import '../assets/styles/common.css';
import '../styles.scss';
import '@/libs/shared-ui/src/lib/aggridSetup';

const Core = React.lazy(() => import('core/Module').catch(() => ({ default: () => <NotFound /> })));
const Bot = React.lazy(() => import('bot/Module').catch(() => ({ default: () => <NotFound /> })));

const AppRoutes = () => (
  <Routes>
    <Route element={<ProtectRouter />}>
      <Route path="/" element={<Navigate to="/bot" />} />
      <Route path="/core" element={<Layout />}>
        <Route index path="*" element={<Core />} />
      </Route>
      <Route path="/bot" element={<Layout />}>
        <Route index path="*" element={<Bot />} />
      </Route>
    </Route>
    <Route path="/login" element={<Login />} />
    <Route path="*" element={<NotFound useFullScreen />} />
  </Routes>
);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0, gcTime: 0, refetchOnWindowFocus: false } } });

export function App() {
  const useReactQueryDevtools = React.useMemo(() => {
    return process.env.NX_PUBLIC_REACT_QUERY_DEVTOOLS === 'ON';
  }, []);
  const toastOptions = React.useMemo(() => {
    return {
      position: 'bottom-right' as ToastPosition,
      autoClose: 5000,
      theme: 'colored' as Theme,
      pauseOnHover: true,
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense fallback={<FallbackSpinner useFullScreen />}>
        <AppRoutes />
        <ToastContainer {...toastOptions} />
      </React.Suspense>
      {useReactQueryDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
