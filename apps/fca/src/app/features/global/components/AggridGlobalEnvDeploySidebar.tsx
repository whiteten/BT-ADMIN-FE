import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CustomToolPanelProps } from 'ag-grid-react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { Clock, OctagonAlert, RotateCcw, Server, ServerOff, User } from 'lucide-react';
import { toast } from '@/shared-util';
import { globalEnvQueryKeys, useGetGlobalEnvHistoryList, useReapplyGlobalEnv } from '../hooks/useGlobalEnvQueries';
import type { GlobalEnvHistoryItem, GlobalEnvListItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Badge } from '@/components/ui/badge';

function AggridGlobalEnvDeploySidebar(props: CustomToolPanelProps<GlobalEnvListItem>) {
  const { api } = props;
  const queryClient = useQueryClient();
  const [selectedRowData, setSelectedRowData] = useState<GlobalEnvListItem | null>(null);
  const [isOpened, setIsOpened] = useState(false);
  const [applyingSystemId, setApplyingSystemId] = useState<number | null>(null);

  const { mutate: reapplyGlobalEnv } = useReapplyGlobalEnv({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: globalEnvQueryKeys.getGlobalEnvList._def });
        queryClient.invalidateQueries({
          queryKey: globalEnvQueryKeys.getGlobalEnvHistoryList({ category: selectedRowData?.category, property: selectedRowData?.property }).queryKey,
        });
        toast.success('적용되었습니다.');
        setApplyingSystemId(null);
      },
      onError: () => {
        setApplyingSystemId(null);
      },
    },
  });

  const { data: historyList = [], isLoading } = useGetGlobalEnvHistoryList({
    params: {
      category: selectedRowData?.category,
      property: selectedRowData?.property,
    },
    queryOptions: {
      enabled: !!selectedRowData?.category && !!selectedRowData?.property && isOpened,
    },
  });

  useEffect(() => {
    if (!api || api.isDestroyed?.()) return;
    const handleSelectionChanged = () => {
      const selectedRows = api.getSelectedRows();
      const isRowSelected = selectedRows && selectedRows.length > 0;
      setSelectedRowData(isRowSelected ? selectedRows[0] : null);
    };
    const handlePaginationChanged = () => {
      api.deselectAll();
    };
    const handleToolPanelVisibleChanged = () => {
      const isToolPanelVisible = api.isToolPanelShowing();
      const openedToolPanel = api.getOpenedToolPanel();
      setIsOpened(isToolPanelVisible && openedToolPanel === 'globalEnvDeployInfo');
    };

    api.addEventListener('selectionChanged', handleSelectionChanged);
    api.addEventListener('paginationChanged', handlePaginationChanged);
    api.addEventListener('toolPanelVisibleChanged', handleToolPanelVisibleChanged);
    return () => {
      if (api && !api.isDestroyed?.()) {
        api.removeEventListener('selectionChanged', handleSelectionChanged);
        api.removeEventListener('paginationChanged', handlePaginationChanged);
        api.removeEventListener('toolPanelVisibleChanged', handleToolPanelVisibleChanged);
      }
    };
  }, [api]);

  useEffect(() => {
    if (!isOpened || !selectedRowData) return;
    queryClient.invalidateQueries({
      queryKey: globalEnvQueryKeys.getGlobalEnvHistoryList({ category: selectedRowData.category, property: selectedRowData.property }).queryKey,
    });
  }, [isOpened, selectedRowData, queryClient]);

  const getApplyResultStyle = (applyResult: number | null) => {
    if (applyResult === 1) {
      return { className: 'text-[#0AB39C] bg-[#0AB39C1A]', label: '성공' };
    }
    if (applyResult === 0) {
      return { className: 'text-[#F06548] bg-[#F065481A]', label: '실패' };
    }
    return { className: 'text-gray-500 bg-gray-100', label: '미적용' };
  };

  const handleApply = (item: GlobalEnvHistoryItem) => {
    if (applyingSystemId !== null) return;
    setApplyingSystemId(item.systemId);
    reapplyGlobalEnv({ params: { systemId: item.systemId, category: selectedRowData?.category, property: selectedRowData?.property }, data: {} });
  };

  const renderHistoryCard = (item: GlobalEnvHistoryItem) => {
    const { className: badgeClassName, label: badgeLabel } = getApplyResultStyle(item.applyResult);
    const key = `${item.historyId}_${item.systemId}_${item.category}_${item.property}`;
    return (
      <div key={key} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Server className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{item.systemName}</span>
          </div>
          <Badge variant="secondary" className={badgeClassName}>
            {badgeLabel}
          </Badge>
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="size-3 shrink-0" />
            <span className="truncate">{item.workUser ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="size-3 shrink-0" />
              <span>{item.workTime ? dayjs(item.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
            </div>
            <div className={applyingSystemId !== null && applyingSystemId !== item.systemId ? 'pointer-events-none' : ''}>
              <Button
                size="small"
                icon={<RotateCcw className="size-3" />}
                onClick={() => handleApply(item)}
                loading={applyingSystemId === item.systemId}
                style={{ fontSize: 12, padding: '0 6px', height: 22, gap: 3 }}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDeployInfo = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <FallbackSpinner />
        </div>
      );
    }
    if (!historyList.length) {
      return (
        <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
          <ServerOff className="size-15 text-gray-500" />
          <p className="text-base text-gray-500 text-center">
            적용 이력이 <br /> 없습니다.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-foreground">적용 노드 ({historyList.length})</span>
        <div className="flex flex-col gap-2">{historyList.map((item) => renderHistoryCard(item))}</div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
      <OctagonAlert className="size-15 text-gray-500" />
      <p className="text-base text-gray-500">데이터를 선택해 주세요.</p>
    </div>
  );

  return <div className="w-full h-full overflow-y-auto p-3 select-text">{selectedRowData ? renderDeployInfo() : renderEmptyState()}</div>;
}

export default AggridGlobalEnvDeploySidebar;
