import * as React from 'react';
import { App as AntdApp } from 'antd';
import WorkflowEdit from './pages/workflow/WorkflowEdit';
import '../styles.css';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// 워크플로우 에디터는 host 셸 밖(별도 윈도우)에서 단독 실행 — antd App provider 가 없으면
// useModal 의 App.useApp() 가 런타임 에러. 여기서 wrapping 해 modal/message/notification 사용 가능하게 한다.
export default function WorkflowApp() {
  return (
    <AntdApp className="h-full">
      <React.Suspense fallback={<FallbackSpinner useFullScreen />}>
        <WorkflowEdit />
      </React.Suspense>
    </AntdApp>
  );
}
