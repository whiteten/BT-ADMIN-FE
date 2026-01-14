import { useEffect, useState } from 'react';
import type { CustomToolPanelProps } from 'ag-grid-react';
import { Clock, FileText, OctagonAlert, RotateCcw, Server, ServerOff, User } from 'lucide-react';
import { Log } from '@/log';
import { Badge } from '@/components/ui/badge';

// 임시 타입 정의 (추후 types 폴더로 이동 권장)
interface EnvNodeItem {
  fileName: string;
  systemId: string;
  status: string;
  workDateTime: string;
  worker: string;
}

interface BotEnvItem {
  envId: string;
  categoryName: string;
  varName: string;
  varValue: string;
  nodes: EnvNodeItem[];
}

function AggridEnvDeploySidebar(props: CustomToolPanelProps<BotEnvItem>) {
  const { api } = props;
  const [selectedRowData, setSelectedRowData] = useState<BotEnvItem | null>(null);

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
    api.addEventListener('selectionChanged', handleSelectionChanged);
    api.addEventListener('paginationChanged', handlePaginationChanged);
    return () => {
      if (api && !api.isDestroyed?.()) {
        api.removeEventListener('selectionChanged', handleSelectionChanged);
        api.removeEventListener('paginationChanged', handlePaginationChanged);
      }
    };
  }, [api]);

  const handleRetry = (node: EnvNodeItem) => {
    // TODO: 재시도 API 연동
    Log.debug('Retry node:', node);
  };

  const renderNodeCard = (node: EnvNodeItem, index: number) => {
    const isSuccess = node.status === '완료';
    return (
      <div key={index} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card">
        {/* 헤더: 시스템ID */}
        <div className="flex items-center gap-2 min-w-0">
          <Server className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">{node.systemId}</span>
        </div>

        {/* 상세 정보 */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="size-3 shrink-0" />
            <span className="truncate">{node.fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-3 shrink-0" />
            <span>{node.workDateTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="size-3 shrink-0" />
            <span>{node.worker}</span>
          </div>
        </div>

        {/* 상태 배지 + 재시도 버튼 */}
        <div className="flex items-center justify-between mt-1">
          <Badge variant="secondary" className={isSuccess ? 'text-[#0AB39C] bg-[#0AB39C1A]' : 'text-[#F06548] bg-[#F065481A]'}>
            {node.status}
          </Badge>
          {!isSuccess && (
            <button
              type="button"
              onClick={() => handleRetry(node)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground rounded border border-border hover:bg-accent transition-colors"
            >
              <RotateCcw className="size-3" />
              <span>재시도</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderDeployInfo = () => {
    const nodes = selectedRowData?.nodes ?? [];
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
        <div className="flex flex-col gap-2">{nodes.map((node, index) => renderNodeCard(node, index))}</div>
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
