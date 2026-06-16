/**
 * 발신 DNIS 사전변환 목록 페이지
 *
 * 좌측 트리 (280px) — 카테고리 없이 노드만 나열:
 * ┌─────────────┐
 * │ 노드명 검색  │
 * ├─────────────┤
 * │  C1N1       │  ← 클릭 시 해당 노드만
 * │  C1N2       │
 * │  C1N3       │
 * └─────────────┘
 *
 * 우측: ag-Grid (노드명, DNIS패턴, 편집옵션, Digit수, 추가Digit, 우선순위, 변환동작, 변환후라우트, 비고, 삭제)
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams, SelectionChangedEvent } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { ChevronLeft, ChevronRight, Layers, Network, Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import PreNumTransDrawer, { type PreNumTransDrawerRef } from '../../features/pre-num-trans/components/PreNumTransDrawer';
import { preNumTransQueryKeys, useDeletePreNumTransBatch, useGetNodes, useGetPreNumTransList } from '../../features/pre-num-trans/hooks/usePreNumTransQueries';
import { EDIT_OPT_LABELS, type PreNumTrans, TRANS_ACTION_LABELS } from '../../features/pre-num-trans/types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [{ title: '회선관리' }, { title: '번호 변환' }, { title: '발신DNIS사전변환', path: '/ipron/line/pre-num-trans' }];

export default function PreNumTransList() {
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
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRows, setSelectedRows] = useState<PreNumTrans[]>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const drawerRef = useRef<PreNumTransDrawerRef>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  // 서버사이드 검색 파라미터 — dnisPattern LIKE 검색은 BE로 위임 (SWAT IPR20S1045 기준)
  // 검색어가 있으면 dnisPattern 파라미터를 전달, 노드 선택과 함께 전달 가능
  const isSearching = searchText.trim().length > 0;
  const listParams = useMemo(
    () => ({
      ...(selectedNodeId && !isSearching ? { nodeId: selectedNodeId } : {}),
      ...(isSearching ? { dnisPattern: searchText.trim() } : {}),
    }),
    [selectedNodeId, isSearching, searchText],
  );
  const { data: allTransList = [], isLoading } = useGetPreNumTransList({
    params: listParams,
  });

  // 검색 중이거나 노드 미선택 시 전체 목록, 노드 선택 시 BE가 이미 필터링해서 반환
  const transList = useMemo(
    () => (isSearching || !selectedNodeId ? allTransList : allTransList.filter((t) => t.nodeId === selectedNodeId)),
    [allTransList, selectedNodeId, isSearching],
  );

  // 노드별 사전변환 개수 (현재 목록 기준)
  const transCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of allTransList) {
      map.set(t.nodeId, (map.get(t.nodeId) ?? 0) + 1);
    }
    return map;
  }, [allTransList]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
    if (e.target.value.trim().length > 0) {
      setSelectedNodeId(null);
    }
  };

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const suffix = selectedNodeName ? `${selectedNodeName}` : '전체';
    return `${suffix} 발신 DNIS 사전변환 (${transList.length}건)`;
  }, [selectedNodeName, transList.length]);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  // 파라미터가 동적이므로 preNumTrans getList 전체를 무효화 (특정 params 키에 한정하지 않음)
  const invalidateList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: preNumTransQueryKeys.getList._def });
  }, [queryClient]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  const handleCreate = useCallback(() => {
    drawerRef.current?.open(undefined, selectedNodeId ?? undefined, selectedNodeName ?? undefined, selectedNodeId ? undefined : nodes);
  }, [selectedNodeId, selectedNodeName, nodes]);

  const handleEdit = useCallback((trans: PreNumTrans) => {
    drawerRef.current?.open(trans);
  }, []);

  const { mutate: deletePreNumTransBatch } = useDeletePreNumTransBatch({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사전변환이 삭제되었습니다');
        invalidateList();
      },
    },
  });

  const handleDeleteSelected = useCallback(() => {
    if (selectedRows.length === 0) return;
    modal.confirm.execute({
      onOk: () => {
        deletePreNumTransBatch(selectedRows.map((trans) => trans.preTransId));
        setSelectedRows([]);
      },
      options: {
        title: '발신 DNIS 사전변환 삭제',
        content:
          selectedRows.length === 1 ? `DNIS 패턴 "${selectedRows[0].dnisPattern}" 사전변환을 삭제하시겠습니까?` : `선택한 사전변환 ${selectedRows.length}건을 삭제하시겠습니까?`,
      },
    });
  }, [modal, deletePreNumTransBatch, selectedRows]);

  const handleDrawerSuccess = useCallback(() => {
    invalidateList();
  }, [invalidateList]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<PreNumTrans>[] = useMemo(
    () => [
      { headerName: '노드명', field: 'nodeName', flex: 1, minWidth: 100, tooltipField: 'nodeName' },
      { headerName: 'DNIS패턴', field: 'dnisPattern', flex: 2, minWidth: 140, tooltipField: 'dnisPattern' },
      {
        headerName: '편집옵션',
        field: 'editOpt',
        flex: 1,
        minWidth: 100,
        filterValueGetter: (params) => {
          const v = params.data?.editOpt;
          return v != null ? (EDIT_OPT_LABELS[v] ?? String(v)) : '';
        },
        cellRenderer: (params: ICellRendererParams<PreNumTrans>) => {
          if (!params.data) return null;
          const label = EDIT_OPT_LABELS[params.data.editOpt] ?? String(params.data.editOpt);
          return <span>{label}</span>;
        },
      },
      { headerName: 'Digit 수', field: 'delCount', flex: 0.7, minWidth: 80, filter: 'agNumberColumnFilter' },
      {
        headerName: '추가 Digit',
        field: 'addDigit',
        flex: 1,
        minWidth: 100,
        valueFormatter: (params) => params.data?.addDigit ?? '-',
      },
      { headerName: '우선순위', field: 'priority', flex: 0.7, minWidth: 80, filter: 'agNumberColumnFilter' },
      {
        headerName: '변환동작',
        field: 'transAction',
        flex: 1,
        minWidth: 110,
        filterValueGetter: (params) => {
          if (params.data?.transAction == null) return '-';
          return TRANS_ACTION_LABELS[params.data.transAction] ?? String(params.data.transAction);
        },
        cellRenderer: (params: ICellRendererParams<PreNumTrans>) => {
          if (params.data?.transAction == null) return <span>-</span>;
          const label = TRANS_ACTION_LABELS[params.data.transAction] ?? String(params.data.transAction);
          return <span>{label}</span>;
        },
      },
      {
        headerName: '변환후라우트',
        field: 'routeName',
        flex: 1.2,
        minWidth: 120,
        tooltipField: 'routeName',
        valueFormatter: (params) => params.data?.routeName ?? '-',
      },
      {
        headerName: '비고',
        field: 'transDesc',
        flex: 2,
        minWidth: 140,
        tooltipField: 'transDesc',
        valueFormatter: (params) => params.data?.transDesc ?? '-',
      },
    ],
    [],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 상단 헤더 박스 (제목 + 검색 + 추가) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="px-5 h-[56px] bg-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-800">발신 DNIS 사전변환 (총 {allTransList.length}건)</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="발신 DNIS 사전변환 검색"
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
                  {/* 전체 카드 (노드 필터 해제) — 작은 사이즈 */}
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
                        <span className={`text-[11px] ${isAllSelected ? 'text-white/80' : 'text-gray-400'}`}>{allTransList.length}건</span>
                      </div>
                    );
                  })()}

                  {nodes.map((node) => {
                    const isSelected = selectedNodeId === node.nodeId;
                    const count = transCountByNode.get(node.nodeId) ?? 0;
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

                        {/* 하단 태그: 등록 건수 */}
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              count > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {count > 0 ? `사전변환 ${count}건` : '미등록'}
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

        {/* ===== 하단: 발신 DNIS 사전변환 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            <Button
              danger
              size="small"
              icon={<Trash2 className="size-3.5" />}
              disabled={selectedRows.length === 0}
              title={selectedRows.length === 0 ? '삭제할 항목을 선택하세요' : `선택한 ${selectedRows.length}건 삭제`}
              onClick={handleDeleteSelected}
            >
              삭제
            </Button>
          </div>

          <div className="flex-1">
            <AgGridReact<PreNumTrans>
              rowData={transList}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
              loading={isLoading}
              getRowId={(params) => String(params.data.preTransId)}
              defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true, wrapHeaderText: true, autoHeaderHeight: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
              onSelectionChanged={(e: SelectionChangedEvent<PreNumTrans>) => setSelectedRows(e.api.getSelectedRows())}
            />
          </div>
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <PreNumTransDrawer ref={drawerRef} onSuccess={handleDrawerSuccess} />
    </div>
  );
}
