import * as React from 'react';
import { useRoutes } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { routes } from './routes';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import KeepAliveBoundary from '@/components/custom/KeepAliveBoundary';
import '@/libs/shared-ui/src/lib/aggridSetup';

export function App() {
  const element = useRoutes(routes);
  // antd App 컨텍스트 — message/notification/Modal 훅(App.useApp)이 동적 테마를 읽도록 제공.
  // className="contents": 래퍼 div 유지(cssVar 스코프 필요) + display:contents 로 박스 제거 → height 체인 유지(ag-Grid 붕괴 방지)
  // KeepAliveBoundary: intra-remote 탭 전환 시 페이지 상태 보존(입력·스크롤·그리드).
  return (
    <AntdApp className="contents">
      <React.Suspense fallback={<FallbackSpinner />}>
        <KeepAliveBoundary>{element}</KeepAliveBoundary>
      </React.Suspense>
    </AntdApp>
  );
}

export default App;
