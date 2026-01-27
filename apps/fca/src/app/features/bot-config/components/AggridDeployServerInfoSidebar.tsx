import { useEffect, useState } from 'react';
import type { CustomToolPanelProps } from 'ag-grid-react';
import { OctagonAlert, Server, ServerOff } from 'lucide-react';
import { useGetBotDeployConfig } from '../hooks/useBotQueries';
import type { BotVersionListItem } from '../types';

interface DeployServerInfoToolPanelParams {
  serviceId: string;
}

function AggridDeployServerInfoSidebar(props: CustomToolPanelProps<BotVersionListItem> & DeployServerInfoToolPanelParams) {
  const { api, serviceId } = props;
  const [selectedRowData, setSelectedRowData] = useState<BotVersionListItem | null>(null);
  const { data: deployServerInfo } = useGetBotDeployConfig({ params: { serviceId }, queryOptions: { enabled: !!serviceId } });

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

  const renderDeployServerInfo = () => {
    const filteredServers = deployServerInfo?.filter((server) => server.applyVer === selectedRowData?.serviceVer) ?? [];
    if (!filteredServers.length) {
      return (
        <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
          <ServerOff className="size-15 text-gray-500" />
          <p className="text-base text-gray-500 text-center">
            선택한 버전이 배포된 <br /> 서버가 없습니다.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-foreground">적용 서버 ({filteredServers.length})</span>
        <div className="flex flex-col gap-2">
          {filteredServers.map((server) => (
            <div key={server.systemId} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card transition-colors">
              <Server className="size-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{server.systemName}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="w-full h-full flex flex-col gap-4 items-center justify-center">
      <OctagonAlert className="size-15 text-gray-500" />
      <p className="text-base text-gray-500">데이터를 선택해 주세요.</p>
    </div>
  );

  return <div className="w-full h-full overflow-y-auto p-3 select-text">{selectedRowData ? renderDeployServerInfo() : renderEmptyState()}</div>;
}

export default AggridDeployServerInfoSidebar;
