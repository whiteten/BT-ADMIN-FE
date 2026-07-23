import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, RowDoubleClickedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { type BreadcrumbProps, Button, Dropdown } from 'antd';
import dayjs from 'dayjs';
import { ChevronDown, Download, Trash2, Upload } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import ExcelImportResultModal, { type ExcelImportResultModalRef } from '../../features/stt-config/components/ExcelImportResultModal';
import PaGroupTree from '../../features/stt-config/components/PaGroupTree';
import SttDnDrawer, { type SttDnDrawerRef } from '../../features/stt-config/components/SttDnDrawer';
import { PA_GROUP_OPTIONS } from '../../features/stt-config/constants/sttCodeConstants';
import { dnQueryKeys, useDeleteSttDn, useExportSttDn, useGetSttDnList, useImportSttDn } from '../../features/stt-config/hooks/useDnQueries';
import type { CodeItem, SttDictionaryItem, SttDnItem, SttDnSearchParams } from '../../features/stt-config/types';
import FileImportModal, { type FileImportModalRef } from '@/components/custom/FileImportModal';
import NoData from '@/components/custom/NoData';
import ScopeSelect from '@/components/custom/ScopeSelect';
import { Badge } from '@/components/ui/badge';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'STT 관리', path: '/stt/stt-config' },
  { title: 'STT 내선 관리', path: '/stt/stt-config/dn/list' },
];

const PAGE_SIZE = 20;

/** hostName(PA 그룹 코드) → 라벨. BE 는 코드만 내려주고 라벨은 FE 상수에서 해석한다. */
const PA_GROUP_LABEL_BY_CODE: Record<string, string> = Object.fromEntries(PA_GROUP_OPTIONS.map((g) => [g.code, g.value]));

function UseYnCellRenderer({ value }: ICellRendererParams<SttDictionaryItem>) {
  const isUsed = value === '1' || value === 1;
  return (
    <Badge className={`text-[13px] leading-[13px] font-medium !h-6 ${isUsed ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>{isUsed ? '사용' : '미사용'}</Badge>
  );
}

function DnStatusCellRenderer({ value }: ICellRendererParams<SttDnItem>) {
  const isRegistered = value === '1' || value === 1;
  return (
    <Badge className={`text-[13px] leading-[13px] font-medium !h-6 ${isRegistered ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
      {isRegistered ? '등록' : '미등록'}
    </Badge>
  );
}

interface DeleteCellRendererParams extends ICellRendererParams<SttDnItem> {
  onDelete: (data: SttDnItem) => void;
}

function DeleteCellRenderer({ data, onDelete }: DeleteCellRendererParams) {
  if (!data) return null;
  return (
    <button onClick={() => onDelete(data)} className="flex items-center justify-center text-red-400 hover:text-red-600 transition-colors">
      <Trash2 size={15} />
    </button>
  );
}

export default function DnList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { gridOptions } = useAggridOptions();
  const queryClient = useQueryClient();
  const modal = useModal();
  const drawerRef = useRef<SttDnDrawerRef>(null);
  const importModalRef = useRef<FileImportModalRef>(null);
  const importResultModalRef = useRef<ExcelImportResultModalRef>(null);

  // 운영자 모드(통합운영) — 시스템 관리자가 헤더 TenantChip 에서 진입.
  //  - 전체(actAsTenantId=null): tenantId 미전달 → apiClient 가 X-View-All-Tenants 주입 → 전체 테넌트 조회
  //  - 대행(actAsTenantId=X): apiClient 가 X-Act-As-Tenant 주입 → X 테넌트로 조회 스코프
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants ?? []);
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const actAsTenantId = useOperatorScopeStore((s) => s.actAsTenantId);
  const setActAsTenant = useOperatorScopeStore((s) => s.setActAsTenant);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<SttDnSearchParams | null>(null);

  const { data: rowData = [], isLoading } = useGetSttDnList({ params: searchParams });

  const { mutate: exportDn, isPending: isExporting } = useExportSttDn();

  const { mutate: importDn, isPending: isImporting } = useImportSttDn({
    mutationOptions: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: dnQueryKeys.getSttDnList._def });
        importModalRef.current?.close();
        importResultModalRef.current?.open(data);
      },
      onError: () => {
        toast.error('Import에 실패했습니다.');
      },
    },
  });

  const { mutate: deleteDn } = useDeleteSttDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: dnQueryKeys.getSttDnList._def });
      },
      onError: () => {
        toast.error('삭제에 실패했습니다.');
      },
    },
  });

  const handleRowDoubleClicked = (event: RowDoubleClickedEvent<SttDnItem>) => {
    if (!event.data) return;
    drawerRef.current?.open(event.data.hostName, event.data);
  };

  const handleDelete = (data: SttDnItem) => {
    modal.confirm.delete({ onOk: () => deleteDn({ tenantId: data.tenantId, dnNo: data.dnNo }) });
  };

  const handleClickImport = () => {
    if (!selectedGroupId) {
      toast.warning('좌측 트리에서 그룹을 선택해주세요.');
      return;
    }
    importModalRef.current?.open();
  };

  const handleImportDn = (files: File[]) => {
    if (files.length > 0 && selectedGroupId) {
      importDn({ hostName: selectedGroupId, data: files[0] });
    }
  };

  const handleGroupSelect = (hostName: string | null, _group: CodeItem | null) => {
    setSelectedGroupId(hostName);
    setSearchParams(hostName ? { hostName } : null);
  };

  const columnDefs: ColDef<SttDnItem>[] = [
    { headerName: '테넌트명', field: 'tenantName', flex: 2 },
    { headerName: '내선번호', field: 'dnNo', flex: 1, maxWidth: 100, filter: true },
    { headerName: '전화기IP', field: 'phoneIp', flex: 2, filter: true },
    {
      headerName: '내선상태',
      field: 'dnStatus',
      maxWidth: 110,
      flex: 1,
      filter: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      filterValueGetter: ({ data }) => (String(data?.dnStatus) === '1' ? '등록' : '미등록'),
      cellRenderer: DnStatusCellRenderer,
    },
    {
      headerName: '사용여부',
      field: 'useYn',
      maxWidth: 110,
      flex: 1,
      filter: true,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      filterValueGetter: ({ data }) => (String(data?.useYn) === '1' ? '사용' : '미사용'),
      cellRenderer: UseYnCellRenderer,
    },
    { headerName: '상담원ID', field: 'agentId', flex: 2 },
    {
      headerName: '시스템그룹',
      field: 'hostName',
      flex: 2,
      valueFormatter: ({ value }) => PA_GROUP_LABEL_BY_CODE[value] ?? value,
      filterValueGetter: ({ data }) => (data ? (PA_GROUP_LABEL_BY_CODE[data.hostName] ?? data.hostName) : ''),
    },
    { headerName: '수정일시', field: 'saFinshDate', flex: 2, valueFormatter: ({ value }) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '') },
    {
      headerName: '',
      colId: 'actions',
      maxWidth: 60,
      sortable: false,
      filter: false,
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      cellRenderer: DeleteCellRenderer,
      cellRendererParams: { onDelete: handleDelete },
    },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* 본문 */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측: PA 그룹 트리 */}
        <div className="w-[280px] shrink-0 bg-white bt-shadow p-4 overflow-y-auto">
          <PaGroupTree selectedGroupId={selectedGroupId} onSelect={handleGroupSelect} />
        </div>

        {/* 우측: 검색 필터 + 내선 리스트 */}
        <div className="flex-1 min-h-0 bg-white bt-shadow overflow-hidden flex flex-col">
          {/* 검색 필터 */}
          <div className="flex items-center gap-4 flex-wrap px-5 py-4 shrink-0">
            {operatorMode && (
              <ScopeSelect
                kind="tenant"
                options={availableTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }))}
                value={actAsTenantId}
                onChange={(id) => {
                  setActAsTenant(id);
                  void queryClient.invalidateQueries({ queryKey: dnQueryKeys._def });
                }}
              />
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                type="primary"
                onClick={() => {
                  if (!selectedGroupId) {
                    toast.warning('좌측 트리에서 그룹을 선택해주세요.');
                    return;
                  }
                  drawerRef.current?.open(selectedGroupId);
                }}
              >
                추가
              </Button>
              <Dropdown
                trigger={['click']}
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: 'import-excel',
                      label: (
                        <span className="flex items-center gap-2">
                          <Upload className="size-4" />
                          엑셀로 일괄추가
                        </span>
                      ),
                      onClick: handleClickImport,
                    },
                    {
                      key: 'template-download',
                      label: (
                        <span className="flex items-center gap-2">
                          <Download className="size-4" />
                          템플릿 다운로드
                        </span>
                      ),
                      onClick: () => exportDn(undefined),
                    },
                  ],
                }}
              >
                <Button variant="solid" loading={isExporting}>
                  Import
                  <ChevronDown className="size-3.5" />
                </Button>
              </Dropdown>
            </div>
          </div>

          <div className="border-t border-gray-200" />

          {/* 내선 리스트 */}
          <div className="flex-1 min-h-0 p-5 overflow-hidden flex flex-col">
            {!selectedGroupId ? (
              <div className="flex-1 flex items-center justify-center">
                <NoData message="좌측 트리에서 PA 그룹을 선택해주세요." iconSize={50} fontSize="text-lg" gap={2} />
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <AgGridReact<SttDnItem>
                  rowData={rowData}
                  columnDefs={columnDefs}
                  gridOptions={{ ...gridOptions, paginationPageSize: PAGE_SIZE }}
                  onRowDoubleClicked={handleRowDoubleClicked}
                  loading={isLoading}
                  sideBar={false}
                  getRowStyle={(params) => {
                    const isInactive = params.data?.useYn === '0' || params.data?.dnStatus === '0';
                    return isInactive ? { color: '#adb5bd' } : undefined;
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <SttDnDrawer ref={drawerRef} />
      <FileImportModal ref={importModalRef} title="Import" accept=".xlsx,.xls" onConfirm={handleImportDn} confirmLoading={isImporting} />
      <ExcelImportResultModal ref={importResultModalRef} nameColumnTitle="내선번호" />
    </div>
  );
}
