/**
 * IP 접근관리 목록 페이지 (PBX + CTI 통합)
 *
 * 좌측 트리 (280px):
 * ┌─────────────┐
 * │ 노드명 검색  │
 * ├─────────────┤
 * │ ▼ PBX       │  ← 클릭 시 PBX 전체 조회
 * │   C1N1      │  ← 클릭 시 PBX + 해당 노드만
 * │   C1N2      │
 * │ ▼ CTI       │  ← 클릭 시 CTI 전체 조회
 * │   C1N1      │  ← 클릭 시 CTI + 해당 노드만
 * │   C1N2      │
 * └─────────────┘
 *
 * 우측: ag-Grid (노드명, 접근제어명, IP NET, IP MASK, 활성화, 비고, 삭제)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Empty, Input } from 'antd';
import { ChevronDown, ChevronRight, Network, Phone, Plus, Radio } from 'lucide-react';
import AclDrawer, { type AclDrawerRef } from '../components/AclDrawer';
import { aclQueryKeys, useDeleteAcl, useDeleteCtiAcl, useGetAcls, useGetCtiAcls, useGetNodes } from '../hooks/useAclQueries';
import { type Acl, USE_YN_LABELS } from '../types/acl.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

type AclCategory = 'pbx' | 'cti';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/acl' },
  { title: 'IP 접근관리', path: '/ipron/line/acl' },
];

export default function AclListPage() {
  const queryClient = useQueryClient();
  const { gridOptions } = useAggridOptions();
  const modal = useModal();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [category, setCategory] = useState<AclCategory>('pbx');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [pbxExpanded, setPbxExpanded] = useState(true);
  const [ctiExpanded, setCtiExpanded] = useState(true);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const aclDrawerRef = useRef<AclDrawerRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetNodes();

  // PBX ACL (nodeId가 null이면 전체 조회)
  const pbxParams = useMemo(() => (category === 'pbx' ? (selectedNodeId ? { nodeId: selectedNodeId } : undefined) : undefined), [category, selectedNodeId]);
  const { data: pbxAcls = [], isLoading: isPbxLoading } = useGetAcls({
    params: pbxParams,
    queryOptions: { enabled: category === 'pbx' },
  });

  // CTI ACL
  const ctiParams = useMemo(() => (category === 'cti' ? (selectedNodeId ? { nodeId: selectedNodeId } : undefined) : undefined), [category, selectedNodeId]);
  const { data: ctiAcls = [], isLoading: isCtiLoading } = useGetCtiAcls({
    params: ctiParams,
    queryOptions: { enabled: category === 'cti' },
  });

  const acls = category === 'pbx' ? pbxAcls : ctiAcls;
  const isLoading = category === 'pbx' ? isPbxLoading : isCtiLoading;

  // ─── Derived data ─────────────────────────────────────────────────────────
  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  }, [nodes, selectedNodeId]);

  const gridHeaderText = useMemo(() => {
    const prefix = category === 'pbx' ? 'PBX' : 'CTI';
    const suffix = selectedNodeName ? `${selectedNodeName}` : '전체';
    return `${prefix} ${suffix} IP 접근관리 (${acls.length}건)`;
  }, [category, selectedNodeName, acls.length]);

  const filteredNodes = useMemo(() => {
    if (!searchText) return nodes;
    return nodes.filter((n) => n.nodeName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [nodes, searchText]);

  // Auto-select PBX category on mount
  useEffect(() => {
    setCategory('pbx');
  }, []);

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateAcls = useCallback(() => {
    if (category === 'pbx') {
      queryClient.invalidateQueries({ queryKey: aclQueryKeys.getAcls(pbxParams).queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey: aclQueryKeys.getCtiAcls(ctiParams).queryKey });
    }
  }, [queryClient, category, pbxParams, ctiParams]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleCategorySelect = (cat: AclCategory) => {
    setCategory(cat);
    setSelectedNodeId(null); // 카테고리 클릭 → 전체 조회
  };

  const handleNodeSelect = (cat: AclCategory, nodeId: number) => {
    setCategory(cat);
    setSelectedNodeId(nodeId);
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

  // ─── Tree Node Renderer ──────────────────────────────────────────────────
  const categoryStyles = {
    pbx: {
      icon: Phone,
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-700',
      activeBg: 'bg-blue-50',
      activeBorder: 'border-l-blue-600',
      activeText: 'text-blue-700',
    },
    cti: {
      icon: Radio,
      badgeBg: 'bg-violet-100',
      badgeText: 'text-violet-700',
      activeBg: 'bg-violet-50',
      activeBorder: 'border-l-violet-600',
      activeText: 'text-violet-700',
    },
  };

  const renderCategoryTree = (cat: AclCategory, label: string, expanded: boolean, toggle: () => void) => {
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
        {/* ===== Left Panel: PBX/CTI Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="노드명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {renderCategoryTree('pbx', 'PBX', pbxExpanded, () => setPbxExpanded((p) => !p))}
            {renderCategoryTree('cti', 'CTI', ctiExpanded, () => setCtiExpanded((p) => !p))}
          </div>
        </div>

        {/* ===== Right Panel: ACL Grid ===== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white bt-shadow rounded-md border border-gray-200">
          {/* Header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
              추가
            </Button>
          </div>

          {/* Grid */}
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
              defaultColDef={{ filter: true, sortable: true }}
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
