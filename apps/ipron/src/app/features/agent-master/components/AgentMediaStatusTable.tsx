/**
 * 상담사 미디어 현황 매트릭스 (AS-IS SWAT IPR20S40xx 미디어 화면 흡수).
 *
 * 상담사 × 8 미디어 매트릭스를 ag-Grid 로 표시 (읽기 전용 현황).
 * 각 셀: 해당 미디어의 사용 여부 뱃지 + (사용 시) MAX/UTIL/AFC quick.
 * 더블클릭 → 상담사 편집 Drawer (미디어 배정/편집은 기존 Drawer 의 미디어 탭에서 처리).
 *
 * 데이터 출처: 기존 getList(AgentResponse) — 별도 미디어 API 없음. agent.mediaMatrix 셀 파생.
 * useGrpMdaOpt=1(그룹 미디어 옵션 상속) 상담사는 회색 "그룹" 표기.
 */
import { useMemo } from 'react';
import type { CellStyle, ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import type { AgentMediaOption, AgentResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const MEDIA_KEYS = ['chat', 'videoVoice', 'videoChat', 'email', 'fax', 'voip', 'mvoip', 'sms'] as const;
type MediaKey = (typeof MEDIA_KEYS)[number];

const MEDIA_LABELS: Record<MediaKey, string> = {
  chat: 'Chat',
  videoVoice: 'Video Voice',
  videoChat: 'Video Chat',
  email: 'Email',
  fax: 'Fax',
  voip: 'VOIP',
  mvoip: 'MVOIP',
  sms: 'SMS / WEB',
};

interface AgentMediaStatusTableProps {
  rowData: AgentResponse[];
  isLoading?: boolean;
  onRowDoubleClicked: (agent: AgentResponse) => void;
}

function MediaCell({ opt, inherited }: { opt: AgentMediaOption | null | undefined; inherited: boolean }) {
  const on = !!opt?.use;
  if (inherited) {
    return (
      <span className="inline-flex items-center justify-center w-full h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-200">
        그룹
      </span>
    );
  }
  if (!on) {
    return (
      <span className="inline-flex items-center justify-center w-full h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-gray-400 bg-gray-50 border border-gray-200">
        미사용
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center gap-1 w-full h-[20px] leading-none px-1.5 rounded text-[11px] font-medium text-green-700 bg-green-50 border border-green-200"
      title={`UTIL ${opt?.util ?? 0} · MAX ${opt?.max ?? 0} · AFC ${opt?.afctime ?? 0}s`}
    >
      <span>사용</span>
      <span className="text-[10px] text-green-600/80">M{opt?.max ?? 0}</span>
    </span>
  );
}

export default function AgentMediaStatusTable({ rowData, isLoading, onRowDoubleClicked }: AgentMediaStatusTableProps) {
  const { gridOptions } = useAggridOptions();

  const defaultColDef: ColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }), []);

  const columnDefs: ColDef<AgentResponse>[] = useMemo(() => {
    const base: ColDef<AgentResponse>[] = [
      { headerName: '테넌트', field: 'tenantName', flex: 1, minWidth: 90, pinned: 'left', valueFormatter: (p) => p.value ?? '-' },
      { headerName: '그룹', field: 'groupName', flex: 1, minWidth: 100, pinned: 'left', valueFormatter: (p) => p.value ?? '-' },
      {
        headerName: '로그인 ID',
        field: 'agentLoginId',
        flex: 0.9,
        minWidth: 90,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => (params.data ? <span className="font-semibold text-gray-800">{params.data.agentLoginId}</span> : null),
      },
      { headerName: '상담사명', field: 'agentName', flex: 0.9, minWidth: 90, pinned: 'left' },
      {
        headerName: '미디어 옵션',
        field: 'useGrpMdaOpt',
        flex: 0.8,
        minWidth: 90,
        cellStyle: { textAlign: 'center' } as CellStyle,
        valueGetter: (p) => (p.data?.useGrpMdaOpt === 1 ? '그룹' : '개별'),
        cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
          const group = params.data?.useGrpMdaOpt === 1;
          return (
            <span
              className={`inline-flex items-center justify-center w-[44px] h-[20px] leading-none px-1.5 rounded text-[11px] font-medium ${
                group ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-[#405189] bg-[#405189]/5 border border-[#405189]/20'
              }`}
            >
              {group ? '그룹' : '개별'}
            </span>
          );
        },
      },
    ];

    const mediaCols: ColDef<AgentResponse>[] = MEDIA_KEYS.map((key) => ({
      headerName: MEDIA_LABELS[key],
      colId: `media_${key}`,
      flex: 0.8,
      minWidth: 96,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' } as CellStyle,
      cellRenderer: (params: ICellRendererParams<AgentResponse>) => {
        const data = params.data;
        if (!data) return null;
        const inherited = data.useGrpMdaOpt === 1;
        return <MediaCell opt={data.mediaMatrix?.[key]} inherited={inherited} />;
      },
    }));

    return [...base, ...mediaCols];
  }, []);

  return (
    <AgGridReact<AgentResponse>
      rowData={rowData}
      columnDefs={columnDefs}
      defaultColDef={defaultColDef}
      gridOptions={{
        ...gridOptions,
        statusBar: undefined,
        pagination: false,
        sideBar: false,
        rowSelection: { mode: 'singleRow', checkboxes: false, enableClickSelection: true },
      }}
      loading={isLoading}
      onRowDoubleClicked={(e) => e.data && onRowDoubleClicked(e.data)}
    />
  );
}
