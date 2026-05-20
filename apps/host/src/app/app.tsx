import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import { type Theme, ToastContainer, type ToastPosition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './features/layout/Layout';
import CsrfGuard from './features/router/CsrfGuard';
import RouteGuard from './features/router/RouteGuard';
import SessionGuard from './features/router/SessionGuard';
import SharedInfoProvider from './features/router/SharedInfoProvider';
import WsSessionEventHandler from './features/router/WsSessionEventHandler';
import { useApiErrorHandler } from './hooks/useApiErrorHandler';
import Login from './pages/Login';
import Main from './pages/Main';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Forbidden } from '@/components/custom/Forbidden';
import { NotFound } from '@/components/custom/NotFound';
import '../assets/styles/common.css';
import '../styles.scss';
import '@/libs/shared-ui/src/lib/aggridSetup';

const Manager = React.lazy(() => import('manager/Module').catch(() => ({ default: () => <NotFound /> })));
const Fca = React.lazy(() => import('fca/Module').catch(() => ({ default: () => <NotFound /> })));
const Ipron = React.lazy(() => import('ipron/Module').catch(() => ({ default: () => <NotFound /> })));
const Aoe = React.lazy(() => import('aoe/Module').catch(() => ({ default: () => <NotFound /> })));
const AoeWorkflow = React.lazy(() => import('aoe/WorkflowApp').catch(() => ({ default: () => <NotFound /> })));

const AppRoutes = () => {
  useApiErrorHandler();

  return (
    <Routes>
      <Route path="/" element={<CsrfGuard />}>
        <Route
          element={
            <SessionGuard>
              <SharedInfoProvider>
                <RouteGuard>
                  <WsSessionEventHandler />
                </RouteGuard>
              </SharedInfoProvider>
            </SessionGuard>
          }
        >
          <Route path="/" element={<Layout />}>
            <Route index element={<Main />} />
          </Route>
          <Route path="/manager" element={<Layout />}>
            <Route index path="*" element={<Manager />} />
          </Route>
          <Route path="/fca" element={<Layout />}>
            <Route index path="*" element={<Fca />} />
          </Route>
          <Route path="/ipron" element={<Layout />}>
            <Route index path="*" element={<Ipron />} />
          </Route>
          <Route path="/aoe" element={<Layout />}>
            <Route index path="*" element={<Aoe />} />
          </Route>
          <Route path="/aoe-workflow/:agentId" element={<AoeWorkflow />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/forbidden" element={<Forbidden useFullScreen />} />
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
