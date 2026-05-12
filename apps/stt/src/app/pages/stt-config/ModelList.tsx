import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconEntity, IconLayer } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const SttModel = React.lazy(() => import('../../features/stt-config/tabs/SttModel'));
const SttModelDeploy = React.lazy(() => import('../../features/stt-config/tabs/SttModelDeploy'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: '모델 관리', path: '/stt/stt-config/model/list' },
];

const tabs: PageTab[] = [
  { id: 'model', label: '모델', icon: IconEntity, component: SttModel },
  { id: 'model-deploy', label: '모델 배포', icon: IconLayer, component: SttModelDeploy },
];

export default function ModelList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} />
    </div>
  );
}
