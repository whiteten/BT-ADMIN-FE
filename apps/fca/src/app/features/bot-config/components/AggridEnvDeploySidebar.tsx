import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { CustomToolPanelProps } from 'ag-grid-react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { Clock, OctagonAlert, RotateCcw, Server, ServerOff, User } from 'lucide-react';
import { toast } from '@/shared-util';
import { botQueryKeys, useApplyEnv, useGetEnvNodeList } from '../hooks/useBotQueries';
import type { EnvListItem, EnvNodeItem } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { Badge } from '@/components/ui/badge';

function AggridEnvDeploySidebar(props: CustomToolPanelProps<EnvListItem>) {
  const { api } = props;
  const queryClient = useQueryClient();
  const { serviceId = '' } = useParams();
  const [selectedRowData, setSelectedRowData] = useState<EnvListItem | null>(null);
  const [isOpened, setIsOpened] = useState(false);

  // 선택된 row의 category, property로 노드 목록 조회
  const { data: nodes = [], isLoading } = useGetEnvNodeList({
    params: {
      serviceId,
      category: selectedRowData?.category,
      property: selectedRowData?.property,
    },
    queryOptions: {
      enabled: !!serviceId && !!selectedRowData?.category && !!selectedRowData?.property && isOpened,
    },
  });

  const { mutate: applyEnv, isPending: isApplying } = useApplyEnv({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getEnvList({ serviceId }).queryKey });
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getEnvNodeList({ serviceId, category: selectedRowData?.category, property: selectedRowData?.property }).queryKey });
        toast.success('적용되었습니다.');
      },
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
      setIsOpened(isToolPanelVisible && openedToolPanel === 'envDeployInfo');
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

  const handleApply = (node: EnvNodeItem) => {
    applyEnv({ params: { serviceId, systemId: node.systemId, category: selectedRowData?.category, property: selectedRowData?.property }, data: {} });
  };

  const getApplyResultStyle = (applyResult: number | null) => {
    if (applyResult === 1) {
      return { className: 'text-[#0AB39C] bg-[#0AB39C1A]', label: '성공' };
    }
    if (applyResult === 0) {
      return { className: 'text-[#F06548] bg-[#F065481A]', label: '실패' };
    }
    return { className: 'text-gray-500 bg-gray-100', label: '미적용' };
  };

  const renderNodeCard = (node: EnvNodeItem) => {
    const { className: badgeClassName, label: badgeLabel } = getApplyResultStyle(node.applyResult);
    return (
      <div key={node.historyId} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card">
        {/* 헤더: 시스템명 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Server className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate">{node.systemName}</span>
          </div>
          <Badge variant="secondary" className={badgeClassName}>
            {badgeLabel}
          </Badge>
        </div>

        {/* 상세 정보 */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <User className="size-3 shrink-0" />
            <span className="truncate">{node.workUser ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="size-3 shrink-0" />
              <span>{node.workTime ? dayjs(node.workTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
            </div>
            <Button
              size="small"
              icon={<RotateCcw className="size-3" />}
              onClick={() => handleApply(node)}
              loading={isApplying}
              style={{ fontSize: 12, padding: '0 6px', height: 22, gap: 3 }}
            >
              적용
            </Button>
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

    if (!nodes.length) {
      return (
        <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
          <ServerOff className="size-15 text-gray-500" />
          <p className="text-base text-gray-500 text-center">
            적용된 노드가 <br /> 없습니다.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-foreground">적용 노드 ({nodes.length})</span>
        <div className="flex flex-col gap-2">{nodes.map((node) => renderNodeCard(node))}</div>
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

export default AggridEnvDeploySidebar;
