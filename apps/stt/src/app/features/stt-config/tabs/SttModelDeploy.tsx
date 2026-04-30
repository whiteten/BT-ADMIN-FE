import { useState } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Select } from 'antd';
import { toast } from '@/shared-util';
import type { DeployStatus, DeployType, SttModelDeployItem } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const DEPLOY_MODEL_OPTIONS = [{ label: '전체', value: '' }];

const DEPLOY_TYPE_LABELS: Record<DeployType, string> = {
  realtime: '실시간',
  scheduled: '예약',
};

const DEPLOY_STATUS_CONFIG: Record<DeployStatus, { label: string; className: string }> = {
  deploying: { label: '배포중', className: 'text-blue-600 bg-blue-100' },
  requested: { label: '배포요청', className: 'text-gray-500 bg-gray-100' },
  deployed: { label: '배포완료', className: 'text-emerald-600 bg-emerald-100' },
  failed: { label: '배포실패', className: 'text-red-500 bg-red-100' },
};

const PAGE_SIZE = 20;

function DeployStatusCellRenderer({ value }: ICellRendererParams<SttModelDeployItem>) {
  const config = DEPLOY_STATUS_CONFIG[value as DeployStatus] ?? { label: String(value ?? ''), className: 'text-gray-500 bg-gray-100' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>{config.label}</span>;
}

interface CancelCellParams extends ICellRendererParams<SttModelDeployItem> {
  onCancel: (data: SttModelDeployItem) => void;
}

function CancelCellRenderer({ data, onCancel }: CancelCellParams) {
  if (!data || data.deployStatus !== 'requested') return null;
  return (
    <Button size="small" onClick={() => onCancel(data)}>
      취소
    </Button>
  );
}

export default function SttModelDeploy() {
  const { gridOptions } = useAggridOptions();

  const [deployModel, setDeployModel] = useState('');

  // TODO: API 연동
  const rowData: SttModelDeployItem[] = [];
  const isLoading = false;

  const handleCancel = (_data: SttModelDeployItem) => {
    toast.warning('배포 취소 기능은 준비 중입니다.');
  };

  const handleDeploy = () => {
    toast.warning('모델 배포 기능은 준비 중입니다.');
  };

  const columnDefs: ColDef<SttModelDeployItem>[] = [
    { headerName: '배포 모델', field: 'modelName', flex: 4 },
    { headerName: '배포 시간', field: 'deployTime', flex: 3 },
    {
      headerName: '배포 타입',
      field: 'deployType',
      flex: 2,
      valueFormatter: ({ value }) => DEPLOY_TYPE_LABELS[value as DeployType] ?? value,
    },
    {
      headerName: '배포 상태',
      field: 'deployStatus',
      flex: 2,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: DeployStatusCellRenderer,
    },
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
      {/* 필터 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#495057] shrink-0">배포 모델</span>
          <Select value={deployModel} onChange={setDeployModel} options={DEPLOY_MODEL_OPTIONS} style={{ width: 200 }} />
        </div>
        <Button color="cyan" variant="solid" onClick={handleDeploy} loading={isLoading} className="ml-auto">
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
