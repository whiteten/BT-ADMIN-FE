/**
 * COS 설정 목록 페이지
 *
 * 상단: 테넌트 탭 바 (전체 + 테넌트별)
 * 하단: ag-Grid (COS 목록, 서비스 플래그 설정/해제 배지)
 *
 * Layout:
 * +----------------------------------------------------------+
 * | [전체] [기본테넌트] [test] [...]        [검색] [+추가]       |
 * +----------------------------------------------------------+
 * | COS 설정 (n건)                                             |
 * | ag-Grid: COS ID | COS이름 | 착신금지 | 발신금지 | ...        |
 * +----------------------------------------------------------+
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input, Modal } from 'antd';
import { Building2, ChevronLeft, ChevronRight, Layers, Plus, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import { cosApi } from '../api/cosApi';
import { cosQueryKeys, useDeleteCos, useGetCosList, useGetNodeTenants } from '../hooks/useCosQueries';
import type { Cos } from '../types/cos.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '번호자원관리', path: '/ipron/cos' },
  { title: 'COS 설정', path: '/ipron/cos' },
];

/** 0/1 서비스 플래그를 설정/해제 배지로 표시 */
const StatusBadgeRenderer = (params: ICellRendererParams) => {
  const value = params.value;
  return value === 1 ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#e6f4ff', color: '#1677ff' }}>
      설정
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
      해제
    </span>
  );
};

export default function CosListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodeTenants = [] } = useGetNodeTenants();

  // 테넌트 목록 (중복 제거)
  const tenants = useMemo(() => {
    const map = new Map<number, string>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) {
        map.set(nt.tenantId, nt.tenantName);
      }
    }
    return Array.from(map.entries())
      .map(([tenantId, tenantName]) => ({ tenantId, tenantName }))
      .sort((a, b) => a.tenantId - b.tenantId);
  }, [nodeTenants]);

  // 선택된 테넌트의 COS 목록 조회
  const listParams = useMemo(() => (selectedTenantId && selectedTenantId > 0 ? { tenantId: selectedTenantId } : undefined), [selectedTenantId]);
  const { data: cosList = [], isLoading } = useGetCosList({
    params: listParams,
    queryOptions: { enabled: !!listParams },
  });

  // 전체 모드일 때는 모든 테넌트의 COS를 병합 (각 테넌트 쿼리를 개별 실행 대신 전체 목록 표시)
  // 여기서는 단순히 "전체" 선택 시 첫 테넌트 자동 선택 없이 빈 상태 표시 대신
  // 각 테넌트별로 별도 fetch 없이, 선택된 테넌트만 표시하는 패턴 사용
  const isAllSelected = selectedTenantId === -1;

  // 검색 필터
  const filteredCosList = useMemo(() => {
    if (!searchText.trim()) return cosList;
    const kw = searchText.trim().toLowerCase();
    return cosList.filter((cos) => cos.cosName?.toLowerCase().includes(kw) || String(cos.cosId).includes(kw));
  }, [cosList, searchText]);

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteCos } = useDeleteCos({
    mutationOptions: {
      onSuccess: () => {
        toast.success('COS가 삭제되었습니다.');
        invalidateList();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateList = useCallback(() => {
    if (listParams) {
      queryClient.invalidateQueries({
        queryKey: cosQueryKeys.getList(listParams).queryKey,
      });
    }
  }, [queryClient, listParams]);

  // Auto-select: 첫 번째 테넌트 자동 선택
  useEffect(() => {
    if (selectedTenantId === null && tenants.length > 0) {
      setSelectedTenantId(tenants[0].tenantId);
    }
  }, [tenants, selectedTenantId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTenantSelect = (tenantId: number) => {
    setSelectedTenantId(tenantId);
    setSearchText('');
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleCreate = useCallback(() => {
    navigate('/ipron/cos/create' + (selectedTenantId && selectedTenantId > 0 ? `?tenantId=${selectedTenantId}` : ''));
  }, [navigate, selectedTenantId]);

  const handleEdit = useCallback(
    (cos: Cos) => {
      navigate(`/ipron/cos/${cos.cosId}/edit`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (cos: Cos) => {
      // 기본 COS 삭제 방지 (tenantId == cosId)
      if (cos.tenantId === cos.cosId) {
        Modal.warning({
          title: '삭제 불가',
          content: '기본 COS로 등록된 항목은 삭제할 수 없습니다.',
        });
        return;
      }

      // 참조 DN 수 확인
      try {
        const refCount = await cosApi.getRefCount(cos.cosId);
        if (refCount > 0) {
          Modal.warning({
            title: '삭제 불가',
            content: `선택한 COS 설정을 사용하는 DN이 ${refCount}개가 있습니다. 삭제할 수 없습니다.`,
          });
          return;
        }
      } catch {
        toast.error('참조 DN 수 조회에 실패하였습니다.');
        return;
      }

      modal.confirm.execute({
        onOk: () => deleteCos({ cosId: cos.cosId }),
        options: {
          title: 'COS 삭제',
          content: `"${cos.cosName}" COS를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteCos],
  );

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<Cos>[] = useMemo(
    () => [
      { headerName: 'COS 이름', field: 'cosName', flex: 1, minWidth: 160 },
      { headerName: '착신금지', field: 'dnTblSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '발신금지', field: 'dnOblSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '픽업사용', field: 'pickupSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '코칭사용', field: 'coachingSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '감청사용', field: 'monitorSvc', width: 100, cellRenderer: StatusBadgeRenderer },
      { headerName: '피감청/피코칭', field: 'ignoreBugsCoaching', width: 120, cellRenderer: StatusBadgeRenderer },
      { headerName: '특정번호발신허용', field: 'dodNumAllow', width: 140, cellRenderer: StatusBadgeRenderer },
      { headerName: '특정번호착신금지', field: 'callScreenSvc', width: 140, cellRenderer: StatusBadgeRenderer },
      {
        headerName: '',
        colId: 'actions',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<Cos>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              className="flex items-center justify-center w-full h-full"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleDelete],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 테넌트 탭 바 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 좌측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
              aria-label="이전 탭"
            >
              <ChevronLeft className="size-4 text-gray-500" />
            </button>

            {/* 탭 스크롤 컨테이너 */}
            <div
              ref={tabScrollRef}
              className="flex items-stretch max-w-[900px] min-w-0 overflow-x-auto divide-x divide-gray-200"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {/* 테넌트 탭들 */}
              {tenants.map((tenant) => {
                const isActive = selectedTenantId === tenant.tenantId;
                return (
                  <button
                    key={tenant.tenantId}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] max-w-[200px] flex-shrink-0 transition-colors ${
                      isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleTenantSelect(tenant.tenantId);
                      (e.currentTarget as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                    }}
                  >
                    <Building2 className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{tenant.tenantName}</span>
                  </button>
                );
              })}
            </div>

            {/* 우측 스크롤 버튼 */}
            <button
              type="button"
              className="flex-shrink-0 w-8 flex items-center justify-center hover:bg-gray-100 border-l border-r border-gray-200 cursor-pointer"
              onClick={() => tabScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
              aria-label="다음 탭"
            >
              <ChevronRight className="size-4 text-gray-500" />
            </button>

            {/* 우측: 검색 + 추가 버튼 */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="COS 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} disabled={!selectedTenantId || selectedTenantId < 0} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 하단: COS 그리드 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          {selectedTenantId && selectedTenantId > 0 ? (
            <>
              {/* Grid header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-semibold text-gray-800">COS 설정 ({filteredCosList.length}건)</span>
              </div>

              {/* Grid */}
              <div className="flex-1">
                {filteredCosList.length === 0 && !isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                    <Empty description={false} />
                    <span className="text-sm">{searchText.trim() ? '검색 결과가 없습니다' : '등록된 COS가 없습니다'}</span>
                  </div>
                ) : (
                  <AgGridReact<Cos>
                    rowData={filteredCosList}
                    columnDefs={columnDefs}
                    gridOptions={{
                      ...gridOptions,
                      statusBar: undefined,
                      pagination: false,
                      sideBar: false,
                    }}
                    loading={isLoading}
                    getRowId={(params) => String(params.data.cosId)}
                    defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
                    onRowDoubleClicked={(e) => {
                      if (e.data) handleEdit(e.data);
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">상단에서 테넌트를 선택하세요</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
