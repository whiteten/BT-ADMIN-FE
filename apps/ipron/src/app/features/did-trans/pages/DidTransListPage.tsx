/**
 * DID 번호변환 목록 페이지 (DNIS + ANI 통합)
 *
 * 상단: DNIS/ANI 카테고리 탭 + 노드 카드 슬라이더 (전체 카드 + 노드별)
 * 하단: 번호변환 그리드
 *
 * Layout:
 * ┌──────────────────────────────────────────────────────┐
 * │ [DNIS] [ANI]                            [+ 추가]      │
 * │ [전체] [C1N1] [C1N2] [C1N3] ...                       │
 * ├──────────────────────────────────────────────────────┤
 * │ {카테고리} {노드명|전체} 번호변환 (n건)   [노드복사]    │
 * │ ag-Grid: 노드명│변환명│원본패턴│편집옵션│Digit수│...  │
 * └──────────────────────────────────────────────────────┘
 */
import { type ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Empty, Input, Select } from 'antd';
import { ChevronLeft, ChevronRight, Copy, Layers, Network, Phone, Plus, Radio, Search } from 'lucide-react';
import { toast } from '@/shared-util';
import DidTransDrawer, { type DidTransDrawerRef } from '../components/DidTransDrawer';
import {
  didTransQueryKeys,
  useCopyAniTrans,
  useCopyDnisTrans,
  useDeleteAniTrans,
  useDeleteDnisTrans,
  useGetAniTransList,
  useGetDnisTransList,
  useGetNodes,
} from '../hooks/useDidTransQueries';
import { type DidTrans, type DidTransCategory, EDIT_OPT_LABELS } from '../types/didTrans.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/did-trans' },
  { title: 'DID번호변환', path: '/ipron/line/did-trans' },
];

const CATEGORY_STYLES: Record<DidTransCategory, { label: string; icon: typeof Phone }> = {
  dnis: { label: 'DNIS', icon: Phone },
  ani: { label: 'ANI', icon: Radio },
};

export default function DidTransListPage() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [category, setCategory] = useState<DidTransCategory>('dnis');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const didTransDrawerRef = useRef<DidTransDrawerRef>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  // 양 카테고리 전체 데이터를 한 번에 가져와서 클라이언트 필터링/카운트
  const { data: allDnisTransList = [], isLoading: isDnisLoading } = useGetDnisTransList({ params: undefined });
  const { data: allAniTransList = [], isLoading: isAniLoading } = useGetAniTransList({ params: undefined });

  const allTransListForCategory = category === 'dnis' ? allDnisTransList : allAniTransList;
  const isLoading = category === 'dnis' ? isDnisLoading : isAniLoading;

  // 검색어로 필터링 (검색 필드: 변환명, 원본패턴, 비고, 노드명)
  const isSearching = searchText.trim().length > 0;
  const searchFilteredTrans = useMemo(() => {
    if (!isSearching) return allTransListForCategory;
    const kw = searchText.trim().toLowerCase();
    return allTransListForCategory.filter((t) => [t.transName, t.orgPattern, t.transDesc, t.nodeName].some((v) => v?.toString().toLowerCase().includes(kw)));
  }, [allTransListForCategory, isSearching, searchText]);

  // 검색 중이면 노드 선택 무시 (전체 표시)
  const transList = useMemo(
    () => (isSearching || !selectedNodeId ? searchFilteredTrans : searchFilteredTrans.filter((t) => t.nodeId === selectedNodeId)),
    [searchFilteredTrans, selectedNodeId, isSearching],
  );

  // 노드별 번호변환 개수 (검색 결과 기준)
  const transCountByNode = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of searchFilteredTrans) {
      map.set(t.nodeId, (map.get(t.nodeId) ?? 0) + 1);
    }
    return map;
  }, [searchFilteredTrans]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const prefix = CATEGORY_STYLES[category].label;
    const suffix = selectedNodeName ?? '전체';
    return `${prefix} ${suffix} 번호변환 (${transList.length}건)`;
  }, [category, selectedNodeName, transList.length]);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateTransList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: didTransQueryKeys.getDnisTransList(undefined).queryKey });
    queryClient.invalidateQueries({ queryKey: didTransQueryKeys.getAniTransList(undefined).queryKey });
  }, [queryClient]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCategorySelect = (cat: DidTransCategory) => {
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
      setSelectedNodeId(null);
    }
  };

  const handleCreate = useCallback(() => {
    didTransDrawerRef.current?.open(undefined, selectedNodeId ?? undefined, selectedNodeName ?? undefined, category, selectedNodeId ? undefined : nodes);
  }, [selectedNodeId, selectedNodeName, category, nodes]);

  const handleEdit = useCallback(
    (trans: DidTrans) => {
      didTransDrawerRef.current?.open(trans, undefined, undefined, category);
    },
    [category],
  );

  // DNIS 삭제
  const { mutate: deleteDnisTrans } = useDeleteDnisTrans({
    mutationOptions: { onSuccess: () => invalidateTransList() },
  });

  // ANI 삭제
  const { mutate: deleteAniTrans } = useDeleteAniTrans({
    mutationOptions: { onSuccess: () => invalidateTransList() },
  });

  const handleDelete = useCallback(
    (trans: DidTrans) => {
      const deleteFn = category === 'dnis' ? deleteDnisTrans : deleteAniTrans;
      modal.confirm.execute({
        onOk: () => deleteFn({ id: trans.transId }),
        options: {
          title: '번호변환 삭제',
          content: `"${trans.transName}" 번호변환을 삭제하시겠습니까?`,
        },
      });
    },
    [modal, category, deleteDnisTrans, deleteAniTrans],
  );

  const handleDrawerSuccess = useCallback(() => {
    invalidateTransList();
  }, [invalidateTransList]);

  // ─── 노드간 복사 ──────────────────────────────────────────────────────────
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyTargetNodeId, setCopyTargetNodeId] = useState<number | null>(null);

  const { mutate: copyDnis, isPending: isCopyingDnis } = useCopyDnisTrans({
    mutationOptions: {
      onSuccess: (count) => {
        toast.success(`${count}건이 복사되었습니다.`);
        setCopyModalOpen(false);
        setCopyTargetNodeId(null);
        invalidateTransList();
      },
    },
  });

  const { mutate: copyAni, isPending: isCopyingAni } = useCopyAniTrans({
    mutationOptions: {
      onSuccess: (count) => {
        toast.success(`${count}건이 복사되었습니다.`);
        setCopyModalOpen(false);
        setCopyTargetNodeId(null);
        invalidateTransList();
      },
    },
  });

  const handleCopy = useCallback(() => {
    if (!selectedNodeId || !copyTargetNodeId) return;
    const copyFn = category === 'dnis' ? copyDnis : copyAni;
    copyFn({ sourceNodeId: selectedNodeId, targetNodeId: copyTargetNodeId });
  }, [selectedNodeId, copyTargetNodeId, category, copyDnis, copyAni]);

  const copyNodeOptions = useMemo(() => {
    return nodes.filter((n) => n.nodeId !== selectedNodeId).map((n) => ({ label: n.nodeName, value: n.nodeId }));
  }, [nodes, selectedNodeId]);

  // ─── ag-Grid Column Defs ──────────────────────────────────────────────────
  const columnDefs: ColDef<DidTrans>[] = useMemo(
    () => [
      { headerName: '노드명', field: 'nodeName', flex: 1, minWidth: 100 },
      { headerName: '변환명', field: 'transName', flex: 2, minWidth: 140 },
      { headerName: '원본패턴', field: 'orgPattern', flex: 2, minWidth: 140 },
      {
        headerName: '편집옵션',
        field: 'editOpt',
        flex: 1,
        minWidth: 100,
        cellRenderer: (params: ICellRendererParams<DidTrans>) => {
          if (!params.data) return null;
          const editOpt = params.data.editOpt;
          const label = EDIT_OPT_LABELS[editOpt] ?? String(editOpt);
          return <span>{label}</span>;
        },
      },
      { headerName: 'Digit수', field: 'delCount', flex: 0.7, minWidth: 80 },
      {
        headerName: '추가Digit',
        field: 'addDigit',
        flex: 1,
        minWidth: 100,
        valueFormatter: (params) => params.data?.addDigit ?? '-',
      },
      { headerName: '우선순위', field: 'transPriority', flex: 0.7, minWidth: 80 },
      {
        headerName: '비고',
        field: 'transDesc',
        flex: 2,
        minWidth: 140,
        valueFormatter: (params) => params.data?.transDesc ?? '-',
      },
      {
        headerName: '',
        field: 'transId',
        width: 50,
        maxWidth: 50,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<DidTrans>) => {
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
        {/* ===== 상단: 카테고리 탭 + 노드 카드 슬라이더 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
          {/* Header: 카테고리 탭 + 추가 버튼 */}
          <div className="flex items-stretch bg-white border-b border-gray-200 pr-3 flex-shrink-0 divide-x divide-gray-200 h-[56px]">
            {(Object.keys(CATEGORY_STYLES) as DidTransCategory[]).map((cat) => {
              const style = CATEGORY_STYLES[cat];
              const Icon = style.icon;
              const isActive = category === cat;
              const total = cat === 'dnis' ? allDnisTransList.length : allAniTransList.length;
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
                placeholder="DID 번호변환 검색"
                value={searchText}
                onChange={handleSearchChange}
                style={{ width: 200 }}
              />
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>

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
                        <span className={`text-[11px] ${isAllSelected ? 'text-white/80' : 'text-gray-400'}`}>{allTransListForCategory.length}건</span>
                      </div>
                    );
                  })()}

                  {/* 노드 카드들 */}
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
                        <div className="text-xs text-gray-500">Node ID: {node.nodeId}</div>
                        <div className="flex flex-wrap gap-1 mt-auto pt-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                              count > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {count > 0 ? `${CATEGORY_STYLES[category].label} ${count}건` : '미등록'}
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

        {/* ===== 하단: DID 번호변환 그리드 ===== */}
        <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            {selectedNodeId && (
              <Button icon={<Copy className="size-3.5" />} onClick={() => setCopyModalOpen(true)}>
                노드복사
              </Button>
            )}
          </div>

          <div className="flex-1">
            <AgGridReact<DidTrans>
              rowData={transList}
              columnDefs={columnDefs}
              gridOptions={{
                ...gridOptions,
                statusBar: undefined,
                pagination: false,
                sideBar: false,
              }}
              loading={isLoading}
              getRowId={(params) => String(params.data.transId)}
              defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
              onRowDoubleClicked={(e) => {
                if (e.data) handleEdit(e.data);
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== Drawer ===== */}
      <DidTransDrawer ref={didTransDrawerRef} onSuccess={handleDrawerSuccess} />

      {/* ===== 노드간 복사 Drawer ===== */}
      <Drawer
        title={`${CATEGORY_STYLES[category].label} 번호변환 노드간 복사`}
        open={copyModalOpen}
        onClose={() => {
          setCopyModalOpen(false);
          setCopyTargetNodeId(null);
        }}
        width={420}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setCopyModalOpen(false);
                setCopyTargetNodeId(null);
              }}
            >
              취소
            </Button>
            <Button type="primary" onClick={handleCopy} loading={isCopyingDnis || isCopyingAni} disabled={!copyTargetNodeId}>
              복사
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">원본 노드</label>
            <Input value={nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? ''} disabled />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">대상 노드</label>
            <Select className="w-full" placeholder="복사할 대상 노드를 선택하세요" options={copyNodeOptions} value={copyTargetNodeId} onChange={(v) => setCopyTargetNodeId(v)} />
          </div>
          <div className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            대상 노드의 기존 {CATEGORY_STYLES[category].label} 변환규칙은 모두 삭제되고 원본 노드의 규칙으로 교체됩니다.
          </div>
        </div>
      </Drawer>
    </div>
  );
}
