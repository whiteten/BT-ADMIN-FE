import { useEffect } from 'react';
import { type BreadcrumbProps, Tabs } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import CustomWidgetCatalogTab from '../../features/monitoring/components/catalog/CustomWidgetCatalogTab';
import TemplateWidgetTab from '../../features/monitoring/components/catalog/TemplateWidgetTab';
import { usePersistentState } from '@/libs/shared-ui/src/hooks/usePersistentState';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '모니터링', path: '/insight/monitoring' },
  { title: '위젯 관리', path: '/insight/monitoring/widgets' },
];

/**
 * 위젯 관리 — 탭 구분.
 * - 커스텀 위젯: BE 구현체 1:1 매칭 카탈로그 → 수정만 가능
 * - 템플릿 위젯: 데이터셋 기반 재사용 정의 → 등록·수정·삭제(CRUD)
 */
export default function WidgetCatalogManageList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [activeTab, setActiveTab] = usePersistentState('insight.monitoring.widgetManage.tab', 'custom');

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-col w-full h-full bg-white bt-shadow px-5 pb-5">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="flex-1 min-h-0 [&_.ant-tabs-content]:h-full [&_.ant-tabs-content-holder]:flex-1 [&_.ant-tabs-content-holder]:min-h-0 [&_.ant-tabs]:h-full"
          items={[
            { key: 'custom', label: '커스텀 위젯', children: <CustomWidgetCatalogTab /> },
            { key: 'template', label: '템플릿 위젯', children: <TemplateWidgetTab /> },
          ]}
        />
      </div>
    </div>
  );
}
