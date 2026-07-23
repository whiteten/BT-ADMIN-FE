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
import { Button, Input } from 'antd';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useScopedNodes } from '../../features/node-scope/hooks/useNodeScope';
import PreNumTransDrawer, { type PreNumTransDrawerRef } from '../../features/pre-num-trans/components/PreNumTransDrawer';
import { preNumTransQueryKeys, useDeletePreNumTransBatch, useGetNodes, useGetPreNumTransList } from '../../features/pre-num-trans/hooks/usePreNumTransQueries';
import { EDIT_OPT_LABELS, type PreNumTrans, TRANS_ACTION_LABELS } from '../../features/pre-num-trans/types';
import ScopeSelect from '@/components/custom/ScopeSelect';
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

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: allNodes = [] } = useGetNodes();
  // 운영자 모드=전체 노드, 일반 테넌트 모드=로그인 테넌트에 매핑된 노드만
  const nodes = useScopedNodes(allNodes);

  // 운영자 모드 → 테넌트 모드 전환 시, 선택 노드가 스코프 밖이면 해제
  useEffect(() => {
    if (selectedNodeId != null && nodes.length > 0 && !nodes.some((n) => n.nodeId === selectedNodeId)) {
      setSelectedNodeId(null);
    }
  }, [nodes, selectedNodeId]);

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
  const handleNodeChange = (nodeId: number | null) => {
    setSelectedNodeId(nodeId);
  };

  const handleCreate = useCallback(() => {
    // 등록 시 노드는 항상 자유롭게 선택/변경 가능 — 전체 노드 목록을 전달하고
    // 리스트에서 선택 중이던 노드는 기본값으로만 채운다.
    drawerRef.current?.open(undefined, selectedNodeId ?? undefined, selectedNodeName ?? undefined, nodes);
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
        {/* ===== 상단: 노드 Select + 검색 + 추가 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          <div className="flex items-center px-4 h-[56px] gap-3">
            {/* 노드 선택 (발신 DNIS 사전변환은 노드 단위 스코프) */}
            <ScopeSelect
              kind="node"
              options={nodes.map((n) => ({ id: n.nodeId, name: n.nodeName }))}
              value={selectedNodeId == null ? null : String(selectedNodeId)}
              onChange={(id) => handleNodeChange(id == null ? null : Number(id))}
            />

            {/* 요약 — 총 사전변환 */}
            <div className="flex items-center gap-4 text-[13px] ml-1 pl-3 border-l border-gray-200">
              <span className="text-gray-500">
                총 사전변환 <b className="text-gray-800 font-semibold">{allTransList.length.toLocaleString()}</b>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2">
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

        {/* ===== 하단: 발신 DNIS 사전변환 그리드 ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between flex-shrink-0">
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
          <div className="border-t border-gray-200" />

          <div className="flex-1 min-h-0 p-5">
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
              defaultColDef={{ sortable: true, filter: true, suppressHeaderMenuButton: true }}
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
