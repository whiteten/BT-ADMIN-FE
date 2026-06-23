import { useEffect } from 'react';
import type { BreadcrumbProps } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import CustomWidgetCatalogTab from '../../features/monitoring/components/catalog/CustomWidgetCatalogTab';
import TemplateWidgetTab from '../../features/monitoring/components/catalog/TemplateWidgetTab';
import { IconLayer, IconSlidersHorizontal } from '@/components/custom/Icons';
import PageTabs, { type PageTab } from '@/components/custom/PageTabs';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '위젯 관리', path: '/insight/monitoring/widgets' },
];

/**
 * 위젯 관리 — 탭 구분 (FCA PageTabs 패턴).
 * - 커스텀 위젯: BE 구현체 1:1 매칭 카탈로그 → 수정만 가능
 * - 템플릿 위젯: 데이터셋 기반 재사용 정의 → 등록·수정·삭제(CRUD)
 */
const tabs: PageTab[] = [
  { id: 'custom', label: '커스텀 위젯', icon: IconSlidersHorizontal, component: CustomWidgetCatalogTab },
  { id: 'template', label: '템플릿 위젯', icon: IconLayer, component: TemplateWidgetTab },
];

export default function WidgetCatalogManageList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageTabs tabs={tabs} defaultTab="custom" />
    </div>
  );
}
