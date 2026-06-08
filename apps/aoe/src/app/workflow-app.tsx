import * as React from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import WorkflowEdit from './pages/workflow/WorkflowEdit';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// 워크플로우 에디터는 host 셸 밖(별도 윈도우)에서 단독 실행 — antd App provider 가 없으면
// useModal 의 App.useApp() 가 런타임 에러. 여기서 wrapping 해 modal/message/notification 사용 가능하게 한다.
// host Layout 과 달리 ConfigProvider 가 없어 antd v6 기본 마스크 블러(모자이크)가 적용되므로,
// Layout 과 동일하게 drawer/modal 마스크 블러를 끈다(어두운 딤만 유지).
export default function WorkflowApp() {
  return (
    <ConfigProvider drawer={{ mask: { blur: false } }} modal={{ mask: { blur: false } }}>
      <AntdApp className="h-full">
        <React.Suspense fallback={<FallbackSpinner useFullScreen />}>
          <WorkflowEdit />
        </React.Suspense>
      </AntdApp>
    </ConfigProvider>
  );
}
