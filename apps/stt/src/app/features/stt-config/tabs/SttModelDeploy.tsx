import { useEffect, useRef, useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button } from 'antd';
import { ChevronLeft, ChevronRight, Server } from 'lucide-react';
import { toast } from '@/shared-util';
import SttModelDeployDrawer, { type SttModelDeployDrawerRef } from '../components/SttModelDeployDrawer';
import { useGetSttSystemList } from '../hooks/useCommonQueries';
import { useGetSttModelDeployList } from '../hooks/useModelQueries';
import type { SttModelDeployItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const PAGE_SIZE = 20;

interface CancelCellParams extends ICellRendererParams<SttModelDeployItem> {
  onCancel: (data: SttModelDeployItem) => void;
}

function CancelCellRenderer({ data, onCancel }: CancelCellParams) {
  if (!data || data.distributeResult !== 55) return null; // 예약 대기 상태일때만 배포 취소 가능
  return (
    <Button size="small" onClick={() => onCancel(data)}>
      취소
    </Button>
  );
}

export default function SttModelDeploy() {
  const { gridOptions } = useAggridOptions();
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const deployDrawerRef = useRef<SttModelDeployDrawerRef>(null);

  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const { data: systems = [], isLoading: isSystemsLoading } = useGetSttSystemList();

  useEffect(() => {
    if (systems.length > 0 && selectedSystemId === null) {
      setSelectedSystemId(systems[0].systemId);
    }
  }, [systems, selectedSystemId]);

  const { data: rowData = [], isLoading } = useGetSttModelDeployList({
    params: selectedSystemId ? { systemId: selectedSystemId } : undefined,
  });

  const handleCancel = (_data: SttModelDeployItem) => {
    toast.warning('배포 취소 기능은 준비 중입니다.');
  };

  const handleDeploy = () => {
    deployDrawerRef.current?.open();
  };

  const columnDefs: ColDef<SttModelDeployItem>[] = [
    { headerName: '배포 모델', field: 'modelVerName', flex: 4 },
    { headerName: '배포 시간', field: 'distributeTime', flex: 3 },
    { headerName: '배포 타입', field: 'distributeTypeName', flex: 2 },
    { headerName: '배포 상태', field: 'distributeResultName', flex: 2 },
    {
      headerName: '변경',
      colId: 'cancel',
      flex: 1,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: CancelCellRenderer,
      cellRendererParams: { onCancel: handleCancel },
    },
  ];

  return (
    <div className="flex flex-col gap-4 h-full">
      <SttModelDeployDrawer ref={deployDrawerRef} />
      {/* 시스템 카드 슬라이더 */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="text"
          icon={<ChevronLeft className="size-5" />}
          onClick={() => cardScrollRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
          className="!flex-shrink-0 !w-8 !h-8 !p-0"
        />
        <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto flex-1 py-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {isSystemsLoading ? (
            <div className="flex items-center justify-center flex-1 h-[76px] text-sm text-gray-400">시스템 목록을 불러오는 중...</div>
          ) : systems.length === 0 ? (
            <div className="flex items-center justify-center flex-1 h-[76px] text-sm text-gray-400">등록된 시스템이 없습니다.</div>
          ) : (
            systems.map((system) => (
              <div
                key={system.systemId}
                className={`flex-shrink-0 w-[220px] rounded-xl border cursor-pointer transition-all flex flex-col justify-center px-4 py-3 gap-1 hover:shadow-md ${
                  selectedSystemId === system.systemId
                    ? 'border-[var(--color-bt-primary)] shadow-[0_0_0_2px_rgba(64,81,137,0.15)] bg-[var(--color-bt-primary)]/5'
                    : 'border-gray-200 bg-white hover:border-[var(--color-bt-primary)]/50'
                }`}
                onClick={() => setSelectedSystemId(system.systemId)}
              >
                <div className="flex items-center gap-1.5">
                  <Server className="size-3.5 text-gray-400 shrink-0" />
                  <span className="text-base font-bold text-[#212529] truncate">{system.systemName}</span>
                </div>
                {system.systemAlias && <span className="text-xs text-gray-500 truncate pl-5">{system.systemAlias}</span>}
                <div className="flex items-center gap-2 mt-1">
                  {system.sysClassCdNm && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
                      {system.sysClassCdNm}
                    </span>
                  )}
                  {system.hostName && <span className="text-xs text-gray-400 font-mono truncate">{system.hostName}</span>}
                </div>
              </div>
            ))
          )}
        </div>
        <Button
          type="text"
          icon={<ChevronRight className="size-5" />}
          onClick={() => cardScrollRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
          className="!flex-shrink-0 !w-8 !h-8 !p-0"
        />

        <Button color="cyan" variant="solid" onClick={handleDeploy} className="shrink-0 ml-2">
          모델 배포
        </Button>
      </div>

      {/* 그리드 */}
      <div className="flex-1 min-h-0">
        <AgGridReact<SttModelDeployItem>
          rowData={rowData}
          columnDefs={columnDefs}
          gridOptions={{ ...gridOptions, paginationPageSize: PAGE_SIZE }}
          loading={isLoading}
          sideBar={false}
        />
      </div>
    </div>
  );
}
