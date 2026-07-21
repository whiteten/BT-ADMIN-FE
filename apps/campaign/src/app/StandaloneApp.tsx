import { Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import { getBasePath } from '@/shared-util';
import App from './app';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import ToastProvider from '@/components/custom/ToastProvider';
// 단독 실행 시 host가 제공하던 전역 Tailwind + 디자인 토큰을 standalone 전용 단위로 자체 생성
// (global.css를 직접 import하면 광역 @source 스캔을 상속해 host 저장 시 campaign이 재빌드됨)
import '../standalone.css';
import '../styles.css';
import '@/libs/shared-ui/src/lib/aggridSetup';

/**
 * 캠페인 앱 단독 실행(standalone dev) 셸.
 * <p>
 * host 통합 시에는 remote-entry(App)만 사용되며 이 컴포넌트는 쓰이지 않는다.
 * 단독 서빙(`nx serve campaign`) 시 host가 제공하던 providers(Router/QueryClient/AntD/Toast)를
 * 여기서 직접 제공하고, 캠페인 라우트를 `/campaign/*` 아래에 마운트해 host와 동일한 경로 체계를 재현한다.
 * </p>
 */
const queryClient = new QueryClient();

export default function StandaloneApp() {
  return (
    <ConfigProvider>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={getBasePath() || '/'} future={{ v7_relativeSplatPath: false, v7_startTransition: true }}>
            {/* host 레이아웃이 없는 standalone에서 페이지의 h-full 체인이 동작하도록 뷰포트 전체를 채우는 컨테이너 제공.
                Tailwind 동적 생성에 의존하지 않도록 인라인 스타일 사용. */}
            <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#f0f2f5', padding: 16 }}>
              <Suspense fallback={<FallbackSpinner />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/campaign/ingestion/mapping/list" replace />} />
                  <Route path="/campaign/*" element={<App />} />
                </Routes>
              </Suspense>
            </div>
            {/* 자체 토스트 렌더러 — standalone엔 헤더가 없어 headerHeight 생략 */}
            <ToastProvider />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
