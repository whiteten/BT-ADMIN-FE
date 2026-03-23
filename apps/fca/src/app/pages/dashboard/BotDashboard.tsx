import { useEffect, useState } from 'react';
import { GridLayout, type Layout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import type { Option } from 'react-multi-select-component';
import { type BreadcrumbProps } from 'antd';
import styles from './BotDashboard.module.scss';
import { useGetBots } from '../../features/bot-config/hooks/useBotQueries';
import BotDashboardToolbar from '../../features/dashboard/components/BotDashboardToolbar';
import DashboardCardItem from '../../features/dashboard/components/DashboardCardItem';
import { botDashboardLayoutRenderMapper } from '../../features/dashboard/constants/BotDashboardLayoutRenderMapper';
import { GRID_COLS } from '../../features/dashboard/constants/dashboardConstants';
import { DEFAULT_LAYOUT, useBotDashboardStore } from '../../features/dashboard/hooks/useBotDashboardStore';
import { useDashboardSocket } from '../../features/dashboard/hooks/useDashboardSocket';
import type { DashboardLayoutItem, DashboardWidgetType } from '../../features/dashboard/types/dashboard.types';
import { generateWidgetId, syncLayoutWithFilter } from '../../features/dashboard/utils/dashboardUtils';
import PageHeader from '@/components/custom/PageHeader';
import { cn } from '@/lib/utils';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '대시보드', path: '/fca/dashboard' },
  { title: '콜봇 현황', path: '/fca/dashboard/call-bot' },
];

export default function BotDashboard() {
  const { data: botList } = useGetBots();
  const serviceOptions: Option[] = (botList ?? []).map((b) => ({
    label: b.serviceName ? String(b.serviceName) : String(b.serviceId),
    value: String(b.serviceId),
  }));

  const [selectedService, setSelectedService] = useState<Option[]>([]);

  useEffect(() => {
    if (serviceOptions.length > 0) {
      setSelectedService(serviceOptions);
    }
  }, [serviceOptions]);

  useDashboardSocket();
  const globalOptions = {
    serviceIds: selectedService.map((item) => item.value as string),
  };

  const modal = useModal();
  const { layout: storedLayout, setLayout, setWidgetOptions } = useBotDashboardStore();
  const { width, containerRef, mounted } = useContainerWidth();

  const [isEditMode, setIsEditMode] = useState(false);
  const layoutFilterOptions = DEFAULT_LAYOUT.filter((item) => item.widgetType in botDashboardLayoutRenderMapper).map((item) => ({
    label: botDashboardLayoutRenderMapper[item.widgetType]?.title ?? item.widgetType,
    value: item.widgetType,
  }));
  const storedLayoutTypes = new Set(storedLayout.map((item) => item.widgetType));
  const [selectedLayoutFilterItems, setSelectedLayoutFilterItems] = useState<Option[]>(() => layoutFilterOptions.filter((opt) => storedLayoutTypes.has(opt.value)));
  const [draftLayout, setDraftLayout] = useState<DashboardLayoutItem[]>(() => [...storedLayout]);

  const handleStartEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setDraftLayout([...storedLayout]);
    setSelectedLayoutFilterItems(layoutFilterOptions.filter((opt) => storedLayoutTypes.has(opt.value)));
    setIsEditMode(false);
  };

  const handleSaveEdit = () => {
    setLayout(draftLayout);
    // draftLayout에 존재하는 위젯 ID만 남기고 고아 옵션 정리
    const activeIds = new Set(draftLayout.map((item) => item.i));
    const currentOptions = useBotDashboardStore.getState().widgetOptions;
    const cleanedOptions: Record<string, Record<string, unknown>> = {};
    for (const id of activeIds) {
      if (currentOptions[id]) cleanedOptions[id] = currentOptions[id];
    }
    setWidgetOptions(cleanedOptions);
    setIsEditMode(false);
  };

  const handleResetLayouts = () => {
    modal.confirm.execute({
      options: {
        title: '레이아웃 초기화 안내',
        width: 600,
        content: (
          <>
            <span>레이아웃을 초기화하면, 각 위젯에 설정한 옵션도 함께 초기화됩니다.</span>
            <br />
            <span>저장 시 초기화가 반영됩니다. 진행하시겠습니까?</span>
          </>
        ),
        okText: '초기화',
        okType: 'danger',
      },
      onOk: () => {
        setDraftLayout(DEFAULT_LAYOUT.map((item) => ({ ...item, i: generateWidgetId() })));
        setSelectedLayoutFilterItems(layoutFilterOptions);
      },
    });
  };

  const handleLayoutChange = (newLayout: Layout) => {
    setDraftLayout((prev) => {
      const widgetTypeMap = new Map(prev.map((item) => [item.i, item.widgetType]));
      return newLayout.map((item) => ({
        ...item,
        widgetType: widgetTypeMap.get(item.i) ?? (item.i as DashboardWidgetType),
      }));
    });
  };

  // 필터와 레이아웃을 한번에 업데이트 처리
  const handleLayoutFilterChange = (newFilterItems: Option[]) => {
    setSelectedLayoutFilterItems(newFilterItems);
    setDraftLayout((prev) => syncLayoutWithFilter(prev, newFilterItems, DEFAULT_LAYOUT, GRID_COLS));
  };

  // 편집 중에는 임시(draft) 레이아웃을, 아닐 때는 저장된 레이아웃을 표시한다
  const displayLayout = isEditMode ? draftLayout : storedLayout;

  const extra = (
    <BotDashboardToolbar
      isEditMode={isEditMode}
      layoutFilterOptions={layoutFilterOptions}
      selectedLayoutFilterItems={selectedLayoutFilterItems}
      serviceOptions={serviceOptions}
      selectedService={selectedService}
      onLayoutFilterChange={handleLayoutFilterChange}
      onStartEdit={handleStartEdit}
      onCancelEdit={handleCancelEdit}
      onSaveEdit={handleSaveEdit}
      onResetLayouts={handleResetLayouts}
      onServiceChange={setSelectedService}
    />
  );

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} extra={extra} />
      <div
        ref={containerRef}
        className={cn(
          `${styles['grid-container']} flex-1 min-h-0 overflow-hidden overflow-y-auto pr-2 rounded-lg transition-colors`,
          isEditMode && 'bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] bg-[length:16px_16px]',
        )}
      >
        {mounted && (
          <GridLayout
            layout={displayLayout}
            width={width}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: 60,
              containerPadding: [0, 5],
            }}
            dragConfig={{ enabled: isEditMode, bounded: true }}
            resizeConfig={{ enabled: isEditMode, handles: ['sw', 'nw', 'se', 'ne'] }}
            onLayoutChange={handleLayoutChange}
          >
            {displayLayout.map((item) => {
              const mapEntry = botDashboardLayoutRenderMapper[item.widgetType];
              if (!mapEntry) return null;
              return (
                <div key={item.i} className="w-full h-full">
                  <DashboardCardItem widgetId={item.i} widgetType={item.widgetType} mapEntry={mapEntry} globalOptions={globalOptions} />
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
}
