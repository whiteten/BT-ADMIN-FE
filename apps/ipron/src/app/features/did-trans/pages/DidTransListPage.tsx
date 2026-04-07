/**
 * DID 번호변환 목록 페이지 (DNIS + ANI 통합)
 *
 * 좌측 트리 (280px):
 * ┌─────────────┐
 * │ 노드명 검색  │
 * ├─────────────┤
 * │ ▼ DNIS      │  ← 클릭 시 DNIS 전체 조회
 * │   C1N1      │  ← 클릭 시 DNIS + 해당 노드만
 * │   C1N2      │
 * │ ▼ ANI       │  ← 클릭 시 ANI 전체 조회
 * │   C1N1      │  ← 클릭 시 ANI + 해당 노드만
 * │   C1N2      │
 * └─────────────┘
 *
 * 우측: ag-Grid (변환명, 원본패턴, 편집옵션, Digit수, 추가Digit, 우선순위, 비고, 삭제)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Empty, Input, Select } from 'antd';
import { ChevronDown, ChevronRight, Copy, Network, Phone, Plus, Radio } from 'lucide-react';
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

export default function DidTransListPage() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [category, setCategory] = useState<DidTransCategory>('dnis');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [dnisExpanded, setDnisExpanded] = useState(true);
  const [aniExpanded, setAniExpanded] = useState(true);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const didTransDrawerRef = useRef<DidTransDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  // DNIS (nodeId가 null이면 전체 조회)
  const dnisParams = useMemo(() => (category === 'dnis' ? (selectedNodeId ? { nodeId: selectedNodeId } : undefined) : undefined), [category, selectedNodeId]);
  const { data: dnisTransList = [], isLoading: isDnisLoading } = useGetDnisTransList({
    params: dnisParams,
    queryOptions: { enabled: category === 'dnis' },
  });

  // ANI
  const aniParams = useMemo(() => (category === 'ani' ? (selectedNodeId ? { nodeId: selectedNodeId } : undefined) : undefined), [category, selectedNodeId]);
  const { data: aniTransList = [], isLoading: isAniLoading } = useGetAniTransList({
    params: aniParams,
    queryOptions: { enabled: category === 'ani' },
  });

  const transList = category === 'dnis' ? dnisTransList : aniTransList;
  const isLoading = category === 'dnis' ? isDnisLoading : isAniLoading;

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const prefix = category === 'dnis' ? 'DNIS' : 'ANI';
    const suffix = selectedNodeName ? `${selectedNodeName}` : '전체';
    return `${prefix} ${suffix} 번호변환 (${transList.length}건)`;
  }, [category, selectedNodeName, transList.length]);

  const filteredNodes = useMemo(() => {
    if (!searchText) return nodes;
    return nodes.filter((n) => n.nodeName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [nodes, searchText]);

  // Auto-select DNIS category on mount
  useEffect(() => {
    setCategory('dnis');
  }, []);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateTransList = useCallback(() => {
    if (category === 'dnis') {
      queryClient.invalidateQueries({ queryKey: didTransQueryKeys.getDnisTransList(dnisParams).queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey: didTransQueryKeys.getAniTransList(aniParams).queryKey });
    }
  }, [queryClient, category, dnisParams, aniParams]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCategorySelect = (cat: DidTransCategory) => {
    setCategory(cat);
    setSelectedNodeId(null); // 카테고리 클릭 → 전체 조회
  };

  const handleNodeSelect = (cat: DidTransCategory, nodeId: number) => {
    setCategory(cat);
    setSelectedNodeId(nodeId);
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

  // ─── Tree Node Renderer ──────────────────────────────────────────────────
  const categoryStyles = {
    dnis: {
      icon: Phone,
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      activeBg: 'bg-blue-50',
      activeBorder: 'border-l-blue-600',
      activeText: 'text-blue-700',
    },
    ani: {
      icon: Radio,
      badgeBg: 'bg-violet-100',
      badgeText: 'text-violet-700',
      activeBg: 'bg-violet-50',
      activeBorder: 'border-l-violet-600',
      activeText: 'text-violet-700',
    },
  };

  const renderCategoryTree = (cat: DidTransCategory, label: string, expanded: boolean, toggle: () => void) => {
    const isCategorySelected = category === cat && selectedNodeId === null;
    const isAnyCatSelected = category === cat;
    const style = categoryStyles[cat];
    const Icon = style.icon;

    return (
      <div className="mb-1">
        {/* Category header */}
        <button
          type="button"
          className={`w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-bold transition-colors border-l-[3px] ${
            isCategorySelected ? `${style.activeBg} ${style.activeBorder} ${style.activeText}` : 'border-l-transparent text-gray-800 hover:bg-gray-50'
          }`}
          onClick={() => handleCategorySelect(cat)}
        >
          <button
            type="button"
            className="p-0 bg-transparent border-none cursor-pointer flex items-center"
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          >
            {expanded ? <ChevronDown className="size-3.5 text-gray-400" /> : <ChevronRight className="size-3.5 text-gray-400" />}
          </button>
          <div className={`w-6 h-6 rounded flex items-center justify-center ${style.badgeBg} flex-shrink-0`}>
            <Icon className={`size-3.5 ${style.badgeText}`} />
          </div>
          <span>{label}</span>
        </button>

        {/* Node list */}
        {expanded &&
          filteredNodes.map((node) => {
            const isSelected = category === cat && selectedNodeId === node.nodeId;
            return (
              <button
                key={`${cat}-${node.nodeId}`}
                type="button"
                className={`w-full flex items-center gap-2 pl-10 pr-4 py-2 cursor-pointer select-none text-[13px] font-medium transition-colors border-l-[3px] ${
                  isSelected ? `${style.activeBg} ${style.activeBorder} ${style.activeText}` : 'border-l-transparent text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => handleNodeSelect(cat, node.nodeId)}
              >
                <Network className={`size-3.5 ${isSelected ? style.badgeText : 'text-gray-400'} flex-shrink-0`} />
                <span className="truncate">{node.nodeName}</span>
              </button>
            );
          })}
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: DNIS/ANI Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="노드명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {renderCategoryTree('dnis', 'DNIS', dnisExpanded, () => setDnisExpanded((p) => !p))}
            {renderCategoryTree('ani', 'ANI', aniExpanded, () => setAniExpanded((p) => !p))}
          </div>
        </div>

        {/* ===== Right Panel: DID Trans Grid ===== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white bt-shadow rounded-md border border-gray-200">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            <div className="flex gap-2">
              {selectedNodeId && (
                <Button size="small" icon={<Copy className="size-3.5" />} onClick={() => setCopyModalOpen(true)}>
                  노드복사
                </Button>
              )}
              <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                추가
              </Button>
            </div>
          </div>

          {/* Grid */}
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
              defaultColDef={{ filter: true, sortable: true }}
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
        title={`${category === 'dnis' ? 'DNIS' : 'ANI'} 번호변환 노드간 복사`}
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
            대상 노드의 기존 {category === 'dnis' ? 'DNIS' : 'ANI'} 변환규칙은 모두 삭제되고 원본 노드의 규칙으로 교체됩니다.
          </div>
        </div>
      </Drawer>
    </div>
  );
}
