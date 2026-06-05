/**
 * IP 접근관리 목록 페이지 (PBX + CTI 통합)
 *
 * 상단: PBX/CTI 탭 + 노드 카드 슬라이더 (전체 카드 + 노드별 카드)
 * 하단: ACL 그리드
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [PBX] [CTI]                              [+ 추가]    │
 * │ [전체] [C1N1] [C1N2] [C1N3] ...                       │
 * ├──────────────────────────────────────────────────────┤
 * │ {카테고리} {노드명|전체} IP 접근관리 (n건)             │
 * │ ag-Grid: 노드명│접근제어명│IP NET│IP MASK│활성│비고│   │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, Network, Phone, Plus, Radio, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import AclDrawer, { type AclDrawerRef } from '../../features/acl/components/AclDrawer';
import { aclQueryKeys, useDeleteAcl, useDeleteCtiAcl, useGetAcls, useGetCtiAcls, useGetNodes } from '../../features/acl/hooks/useAclQueries';
import { ACL_TYPE_LABELS, type Acl, USE_YN_LABELS } from '../../features/acl/types';
import { IconTrash } from '@/components/custom/Icons';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type AclCategory = 'pbx' | 'cti';

const breadcrumb = [
  { title: '회선관리', path: '/ipron/line/acl' },
  { title: 'IP 접근관리', path: '/ipron/line/acl' },
];

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

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const aclDrawerRef = useRef<AclDrawerRef>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

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

  // 노드별 ACL 개수 (검색 결과 기준)
  const aclCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of searchFilteredAcls) {
      map.set(a.nodeId, (map.get(a.nodeId) ?? 0) + 1);
    }
    return map;
  }, [searchFilteredAcls]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const prefix = CATEGORY_STYLES[category].label;
    const suffix = selectedNodeName ?? '전체';
    return `${prefix} ${suffix} IP 접근관리 (${acls.length}건)`;
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
  };

  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      // 검색 시작 시 노드 필터 자동 해제 → 전체 결과 표시
      setSelectedNodeId(null);
    }
  };

  const handleCreate = useCallback(() => {
    aclDrawerRef.current?.open(undefined, selectedNodeId ?? undefined, selectedNodeName ?? undefined, category, selectedNodeId ? undefined : nodes);
  }, [selectedNodeId, selectedNodeName, category, nodes]);

  const handleEdit = useCallback(
    (acl: Acl) => {
      aclDrawerRef.current?.open(acl, undefined, undefined, category);
    },
    [category],
  );

  // PBX 삭제
  const { mutate: deletePbxAcl } = useDeleteAcl({
    mutationOptions: { onSuccess: () => invalidateAcls() },
  });

  // CTI 삭제
  const { mutate: deleteCtiAcl } = useDeleteCtiAcl({
    mutationOptions: { onSuccess: () => invalidateAcls() },
  });

  const handleDelete = useCallback(
    (acl: Acl) => {
      const deleteFn = category === 'pbx' ? deletePbxAcl : deleteCtiAcl;
      modal.confirm.execute({
        onOk: () => deleteFn({ id: acl.aclId }),
        options: {
          title: 'IP 접근제어 삭제',
          content: `"${acl.aclName}" 접근제어를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, category, deletePbxAcl, deleteCtiAcl],
  );

  const handleDrawerSuccess = useCallback(() => {
    invalidateAcls();
  }, [invalidateAcls]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<Acl>[] = useMemo(
    () => [
      { headerName: '노드명', field: 'nodeName', flex: 1, minWidth: 100 },
      { headerName: '접근제어명', field: 'aclName', flex: 2, minWidth: 140 },
      {
        headerName: '허용/금지',
        field: 'aclType',
        flex: 1,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<Acl>) => {
          if (!params.data) return null;
          const aclType = params.data.aclType;
          const label = ACL_TYPE_LABELS[aclType] ?? String(aclType);
          const color = aclType === 1 ? '#16a34a' : '#dc2626';
          return <span style={{ color, fontWeight: 500 }}>{label}</span>;
        },
      },
      { headerName: 'IP NET', field: 'ipNet', flex: 2, minWidth: 130 },
      { headerName: 'IP MASK', field: 'ipMask', flex: 2, minWidth: 130 },
      {
        headerName: '활성화 여부',
        field: 'useYn',
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams<Acl>) => {
          if (!params.data) return null;
          const useYn = params.data.useYn;
          const label = USE_YN_LABELS[useYn] ?? String(useYn);
          const color = useYn === 1 ? '#16a34a' : '#6b7280';
          return <span style={{ color, fontWeight: 500 }}>{label}</span>;
        },
      },
      {
        headerName: '비고',
        field: 'aclDesc',
        flex: 2,
        minWidth: 140,
        valueFormatter: (params) => params.data?.aclDesc ?? '-',
      },
      {
        headerName: '',
        field: 'aclId',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<Acl>) => {
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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단: 카테고리 탭 + 노드 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Header: 카테고리 탭 + 추가 버튼 */}
          <div className="flex items-stretch bg-white border-b border-gray-200 pr-3 flex-shrink-0 divide-x divide-gray-200 h-[56px]">
            {(Object.keys(CATEGORY_STYLES) as AclCategory[]).map((cat) => {
              const style = CATEGORY_STYLES[cat];
              const Icon = style.icon;
              const isActive = category === cat;
              const total = cat === 'pbx' ? allPbxAcls.length : allCtiAcls.length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] min-w-[120px] transition-colors ${
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
            <div className="ml-auto flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="IP 접근관리 검색"
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

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* Card slider body */}
          <div className="flex items-center px-4 py-3 h-[170px]">
            {nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
                <Empty description={false} imageStyle={{ height: 40 }} />
                <span className="text-sm">등록된 노드가 없습니다</span>
              </div>
            ) : (
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {/* 전체 카드 (작은 사이즈) */}
                  {(() => {
                    const isAllSelected = selectedNodeId === null;
                    return (
                      <div
                        key="__all__"
                        className={`border rounded-lg p-3 cursor-pointer transition-all w-[110px] h-[130px] flex-shrink-0 flex flex-col items-center justify-center gap-1.5 ${
                          isAllSelected
                            ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-dashed border-gray-300 bg-white text-gray-500 hover:border-[#c5cbe0] hover:text-[#405189]'
                        }`}
                        onClick={() => setSelectedNodeId(null)}
                      >
                        <Layers className="size-5" />
                        <span className="text-sm font-semibold">전체</span>
                        <span className={`text-[11px] ${isAllSelected ? 'text-white/80' : 'text-gray-400'}`}>{allAclsForCategory.length}건</span>
                      </div>
                    );
                  })()}

                  {/* 노드 카드들 */}
                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.nodeId;
                    const count = aclCountByNode.get(node.nodeId) ?? 0;
                    return (
                      <div
                        key={node.nodeId}
                        className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                          isSelected
                            ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                            : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={() => handleNodeSelect(node.nodeId)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Network className={`size-4 flex-shrink-0 ${isSelected ? 'text-[#405189]' : 'text-gray-400'}`} />
                          <span className="text-sm font-semibold text-gray-800 truncate">{node.nodeName}</span>
                        </div>
                        <div className="text-xs text-gray-500">Node ID: {node.nodeId}</div>
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              count > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {count > 0 ? `ACL ${count}건` : '미등록'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
              </div>
            )}
          </div>
        </div>

        {/* ===== 하단: ACL 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
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
              loading={isLoading}
              getRowId={(params) => String(params.data.aclId)}
              defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <AclDrawer ref={aclDrawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
