import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { type Theme, ToastContainer, type ToastPosition } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Layout } from './features/layout/Layout';
import CsrfGuard from './features/router/CsrfGuard';
import GuestGuard from './features/router/GuestGuard';
import RouteShell from './features/router/RouteShell';
import { useApiErrorHandler } from './hooks/useApiErrorHandler';
import Login from './pages/Login';
import Main from './pages/Main';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Forbidden } from '@/components/custom/Forbidden';
import { NotFound } from '@/components/custom/NotFound';
import '../assets/styles/common.css';
import '../styles.scss';
import '@/libs/shared-ui/src/lib/aggridSetup';

// remote 모듈 lazy 로더 — 로드 실패 시 NotFound로 폴백(개별 remote 장애가 host 전체를 깨지 않게).
const lazyRemote = (load: () => Promise<{ default: React.ComponentType }>) => React.lazy(() => load().catch(() => ({ default: () => <NotFound /> })));

// host에 통합되는 remote 목록(SoT). 라우트(루트 redirect + 모듈)는 아래에서 이 배열로 일괄 생성.
// import 경로는 Module Federation 인식을 위해 정적 문자열이어야 한다(변수 금지).
const REMOTES = [
  { id: 'manager', Module: lazyRemote(() => import('manager/Module')) },
  { id: 'fca', Module: lazyRemote(() => import('fca/Module')) },
  { id: 'ipron', Module: lazyRemote(() => import('ipron/Module')) },
  { id: 'aoe', Module: lazyRemote(() => import('aoe/Module')) },
  { id: 'stt', Module: lazyRemote(() => import('stt/Module')) },
  { id: 'ivr', Module: lazyRemote(() => import('ivr/Module')) },
  { id: 'insight', Module: lazyRemote(() => import('insight/Module')) },
  { id: 'taskboard', Module: lazyRemote(() => import('taskboard/Module')) },
  { id: 'vel', Module: lazyRemote(() => import('vel/Module')) },
];

// host 자체 화면도 변형 소켓으로 감싼다(appId='host'). 변형·현장 커스텀(site:) 교체 대상이 된다.
// 화면 키는 SoT — 한번 정하면 변경 금지.
const pv = createPageVariantSocket('host');

const AppRoutes = () => {
  useApiErrorHandler();

  return (
    <Routes>
      <Route path="/" element={<CsrfGuard />}>
        {/* RouteShell — 진입 pathname의 공개(handle.public) 여부를 판정해
            private(기존 4단 가드 조립: PrivateRouteGate) / public(최소 트리: PublicRouteGate)을 택1. */}
        <Route element={<RouteShell />}>
          {/* 단일 공유 Layout — remote 그룹마다 Layout을 따로 두지 않고 하나로 묶는다.
              그래야 remote 전환 시 Layout(과 그 안의 host 레벨 keep-alive)이 언마운트되지 않아
              cross-remote 페이지 보존이 가능하다(Layout이 방문한 remote 모듈을 keep-alive로 유지). */}
          <Route element={<Layout />}>
            <Route index element={pv('main', Main)} />
            {/* remote 루트 정확 진입(/insight 등)은 host index(홈)로 보낸다. 과거엔 각 remote routes의
                루트 index <Navigate to="/">가 담당했으나, 그 redirect가 host keep-alive로 보존된 비활성
                remote에서 location 변화에 반응해 발동 → 정상 탭 네비게이션을 '/'로 덮는 버그가 있었다.
                redirect 책임을 항상 활성인 host로 끌어올려 비활성 remote가 발사할 redirect 자체를 없앤다. */}
            {REMOTES.map(({ id, Module }) => (
              <React.Fragment key={id}>
                <Route path={id} element={<Navigate to="/" replace />} />
                <Route path={`${id}/*`} element={<Module />} />
              </React.Fragment>
            ))}
          </Route>
        </Route>
        <Route path="/login" element={<GuestGuard>{pv('login', Login)}</GuestGuard>} />
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
      position: 'top-center' as ToastPosition,
      autoClose: 5000,
      theme: 'light' as Theme,
      pauseOnHover: true,
      pauseOnFocusLoss: false,
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
