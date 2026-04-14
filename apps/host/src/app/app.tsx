import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { type Theme, ToastContainer, type ToastPosition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './features/layout/Layout';
import CsrfGuard from './features/router/CsrfGuard';
import RouteGuard from './features/router/RouteGuard';
import SharedInfoProvider from './features/router/SharedInfoProvider';
import WsSessionEventHandler from './features/router/WsSessionEventHandler';
import { useApiErrorHandler } from './hooks/useApiErrorHandler';
import Login from './pages/Login';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { NotFound } from '@/components/custom/NotFound';
import '../assets/styles/common.css';
import '../styles.scss';
import '@/libs/shared-ui/src/lib/aggridSetup';

const Manager = React.lazy(() => import('manager/Module').catch(() => ({ default: () => <NotFound /> })));
const Fca = React.lazy(() => import('fca/Module').catch(() => ({ default: () => <NotFound /> })));
const Sd = React.lazy(() => import('sd/Module').catch(() => ({ default: () => <NotFound /> })));

const AppRoutes = () => {
  useApiErrorHandler();

  return (
    <Routes>
      <Route path="/" element={<CsrfGuard />}>
        <Route element={<RouteGuard />}>
          <Route element={<SharedInfoProvider />}>
            <Route element={<WsSessionEventHandler />}>
              <Route path="/" element={<Navigate to="/fca" />} />
              <Route path="/manager" element={<Layout />}>
                <Route index path="*" element={<Manager />} />
              </Route>
              <Route path="/fca" element={<Layout />}>
                <Route index path="*" element={<Fca />} />
              </Route>
              <Route path="/sd" element={<Layout />}>
                <Route index path="*" element={<Sd />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
      </Route>
      <Route path="*" element={<NotFound useFullScreen />} />
    </Routes>
  );
};

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
      {useReactQueryDevtools && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}

export default App;
