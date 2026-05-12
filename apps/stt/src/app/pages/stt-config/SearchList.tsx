import React, { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { IconDocument } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const SttSearch = React.lazy(() => import('../../features/stt-config/tabs/SttSearch'));
const SttSearchCallbot = React.lazy(() => import('../../features/stt-config/tabs/SttSearchCallbot'));

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: 'STT 검색', path: '/stt/stt-config/search/list' },
];

const tabs: PageTab[] = [
  { id: 'stt-search', label: 'STT 검색', icon: IconDocument, component: SttSearch },
  { id: 'stt-search-callbot', label: 'STT 검색(음성봇)', icon: IconDocument, component: SttSearchCallbot },
];

export default function SearchList() {
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
