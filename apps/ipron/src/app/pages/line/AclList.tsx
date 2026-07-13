/**
 * IP 접근관리 목록 페이지 (PBX + CTI 통합)
 *
 * 상단: PBX/CTI 탭 + 노드 Select(전체 포함) + 검색 + 추가
 * 하단: ACL 그리드
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [PBX] [CTI] | [노드 ▼] 총 ACL n     [검색] [+ 추가]   │
 * ├──────────────────────────────────────────────────────┤
 * │ {카테고리} {노드명|전체} IP 접근관리 (n건)             │
 * │ ag-Grid: 노드명│접근제어명│IP NET│IP MASK│활성│비고│   │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Input, Select } from 'antd';
import { Network, Phone, Plus, Radio, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import AclDrawer, { type AclDrawerRef } from '../../features/acl/components/AclDrawer';
import { aclQueryKeys, useDeleteAclBatch, useDeleteCtiAclBatch, useGetAcls, useGetCtiAcls, useGetNodes } from '../../features/acl/hooks/useAclQueries';
import { ACL_TYPE_LABELS, type Acl, USE_YN_LABELS } from '../../features/acl/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type AclCategory = 'pbx' | 'cti';

const breadcrumb = [{ title: '회선관리' }, { title: '제어' }, { title: 'IP접근관리', path: '/ipron/line/acl' }];

const CATEGORY_STYLES: Record<AclCategory, { label: string; icon: typeof Phone }> = {
  pbx: { label: 'PBX', icon: Phone },
  cti: { label: 'CTI', icon: Radio },
};

export default function AclList() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [category, setCategory] = useState<AclCategory>('pbx');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<Acl[]>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const aclDrawerRef = useRef<AclDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  // PBX/CTI 전체 ACL을 한 번에 가져와서 클라이언트에서 필터링/카운트
  const { data: allPbxAcls = [], isLoading: isPbxLoading } = useGetAcls({ params: undefined });
  const { data: allCtiAcls = [], isLoading: isCtiLoading } = useGetCtiAcls({ params: undefined });

  const allAclsForCategory = category === 'pbx' ? allPbxAcls : allCtiAcls;
  const isLoading = category === 'pbx' ? isPbxLoading : isCtiLoading;

  // 검색어로 필터링 (검색 필드: 접근제어명, IP NET, IP MASK, 비고, 노드명)
  const isSearching = searchText.trim().length > 0;
  const searchFilteredAcls = useMemo(() => {
    if (!isSearching) return allAclsForCategory;
    const kw = searchText.trim().toLowerCase();
    return allAclsForCategory.filter((a) => [a.aclName, a.ipNet, a.ipMask, a.aclDesc, a.nodeName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [allAclsForCategory, isSearching, searchText]);

  // 검색 중이면 노드 선택 무시 (전체 표시), 아니면 노드 선택 적용
  const acls = useMemo(
    () => (isSearching || !selectedNodeId ? searchFilteredAcls : searchFilteredAcls.filter((a) => a.nodeId === selectedNodeId)),
    [searchFilteredAcls, selectedNodeId, isSearching],
  );

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const prefix = CATEGORY_STYLES[category].label;
    const suffix = selectedNodeName ?? '전체';
    return `${prefix} ${suffix} IP접근관리 (${acls.length}건)`;
  }, [category, selectedNodeName, acls.length]);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateAcls = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: aclQueryKeys.getAcls(undefined).queryKey });
    queryClient.invalidateQueries({ queryKey: aclQueryKeys.getCtiAcls(undefined).queryKey });
  }, [queryClient]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCategorySelect = (cat: AclCategory) => {
    setCategory(cat);
    setSelectedNodeId(null);
    setSearchText('');
    setSelectedRows([]);
  };

  const handleNodeChange = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      // 검색 시작 시 노드 필터 자동 해제 → 전체 결과 표시
      setSelectedNodeId(null);
    }
  };

  const handleCreate = useCallback(() => {
    // SWAT IPR20S1073.jsp:52~56 — CTI는 노드 선택 필수, PBX는 전체 허용
    if (category === 'cti' && !selectedNodeId) {
      toast.warning('노드를 먼저 선택하세요');
      return;
    }
    aclDrawerRef.current?.open(undefined, selectedNodeId ?? undefined, selectedNodeName ?? undefined, category, selectedNodeId ? undefined : nodes);
  }, [selectedNodeId, selectedNodeName, category, nodes]);

  const handleEdit = useCallback(
    (acl: Acl) => {
      aclDrawerRef.current?.open(acl, undefined, undefined, category);
    },
    [category],
  );

  // PBX 일괄 삭제 (벌크 1콜)
  const { mutate: deletePbxAclBatch } = useDeleteAclBatch({
    mutationOptions: {
      onSuccess: () => {
        invalidateAcls();
        setSelectedRows([]);
      },
    },
  });

  // CTI 일괄 삭제 (벌크 1콜)
  const { mutate: deleteCtiAclBatch } = useDeleteCtiAclBatch({
    mutationOptions: {
      onSuccess: () => {
        invalidateAcls();
        setSelectedRows([]);
      },
    },
  });

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    const deleteBatchFn = category === 'pbx' ? deletePbxAclBatch : deleteCtiAclBatch;
    modal.confirm.execute({
      onOk: () => deleteBatchFn(selectedRows.map((acl) => acl.aclId)),
      options: {
        title: 'IP 접근제어 삭제',
        content: `선택한 ${selectedRows.length}건의 접근제어를 삭제하시겠습니까?`,
      },
    });
  }, [modal, category, selectedRows, deletePbxAclBatch, deleteCtiAclBatch]);

  const handleDrawerSuccess = useCallback(() => {
    invalidateAcls();
  }, [invalidateAcls]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<Acl>[] = useMemo(
    () => [
      { headerName: '노드명', field: 'nodeName', flex: 1, minWidth: 100, tooltipField: 'nodeName' },
      { headerName: '접근제어명', field: 'aclName', flex: 2, minWidth: 140, tooltipField: 'aclName' },
      {
        headerName: '허용/금지',
        field: 'aclType',
        flex: 1,
        minWidth: 90,
        filterValueGetter: (params) => (params.data ? (ACL_TYPE_LABELS[params.data.aclType] ?? String(params.data.aclType)) : null),
        cellRenderer: (params: ICellRendererParams<Acl>) => {
          if (!params.data) return null;
          const aclType = params.data.aclType;
          const label = ACL_TYPE_LABELS[aclType] ?? String(aclType);
          const color = aclType === 1 ? 'var(--color-bt-primary)' : '#dc2626';
          return <span style={{ color, fontWeight: 500 }}>{label}</span>;
        },
      },
      { headerName: 'IP NET', field: 'ipNet', flex: 2, minWidth: 130, tooltipField: 'ipNet' },
      { headerName: 'IP MASK', field: 'ipMask', flex: 2, minWidth: 130, tooltipField: 'ipMask' },
      {
        headerName: '활성화 여부',
        field: 'useYn',
        flex: 1,
        minWidth: 100,
        filterValueGetter: (params) => (params.data ? (USE_YN_LABELS[params.data.useYn] ?? String(params.data.useYn)) : null),
        cellRenderer: (params: ICellRendererParams<Acl>) => {
          if (!params.data) return null;
          const useYn = params.data.useYn;
          const label = USE_YN_LABELS[useYn] ?? String(useYn);
          const color = useYn === 1 ? 'var(--color-bt-primary)' : '#6b7280';
          return <span style={{ color, fontWeight: 500 }}>{label}</span>;
        },
      },
      {
        headerName: '비고',
        field: 'aclDesc',
        flex: 2,
        minWidth: 140,
        tooltipField: 'aclDesc',
        valueFormatter: (params) => params.data?.aclDesc ?? '-',
      },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 노드 Select + 검색 + 추가 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 선택 */}
            <div className="inline-flex items-center gap-1 h-8 pl-2 rounded-md border border-gray-200 bg-white">
              <Network className="size-3.5 shrink-0 text-blue-600" />
              <Select
                size="small"
                variant="borderless"
                value={selectedNodeId ?? '__all__'}
                onChange={(v) => handleNodeChange(v === '__all__' ? null : Number(v))}
                options={[{ value: '__all__', label: '전체' }, ...nodes.map((n) => ({ value: n.nodeId, label: n.nodeName }))]}
                style={{ width: 150 }}
                popupMatchSelectWidth={false}
              />
            </div>

            {/* 요약 — 총 ACL (노드 필터 적용 기준) */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 ACL <b className="text-gray-800 font-semibold">{acls.length.toLocaleString()}</b>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="IP접근관리 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 하단: ACL 그리드 (헤더에 PBX/CTI 탭) ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex items-stretch border-b border-gray-200 pr-5 flex-shrink-0 h-[48px]">
            {(Object.keys(CATEGORY_STYLES) as AclCategory[]).map((cat) => {
              const style = CATEGORY_STYLES[cat];
              const Icon = style.icon;
              const isActive = category === cat;
              const total = cat === 'pbx' ? allPbxAcls.length : allCtiAcls.length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`flex items-center justify-center gap-2 px-5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] transition-colors ${
                    isActive ? 'text-[var(--color-bt-primary)] border-b-[var(--color-bt-primary)]' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                  }`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  <Icon className="size-3.5" />
                  <span>{style.label}</span>
                  <span className="text-[11px] text-gray-400">({total})</span>
                </button>
              );
            })}
            <span className="flex items-center pl-4 ml-1 text-[13px] text-gray-500">{gridHeaderText}</span>
            <div className="ml-auto flex items-center">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleDeleteSelected}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 항목을 선택하세요' : `선택한 ${selectedRows.length}건 삭제`}
              >
                삭제
              </Button>
            </div>
          </div>

          <div className="flex-1">
            <AgGridReact<Acl>
              rowData={acls}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
              loading={isLoading}
              getRowId={(params) => String(params.data.aclId)}
              defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
              onSelectionChanged={(e) => setSelectedRows(e.api.getSelectedRows())}
            />
          </div>
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <AclDrawer ref={aclDrawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
