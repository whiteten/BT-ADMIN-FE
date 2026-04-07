/**
 * 국선관리 목록 페이지
 * Pattern D: 좌측 노드 트리 + 우측 상단 카드 그리드 + 우측 하단 멤버/인증번호 탭 그리드
 *
 * Layout:
 * ┌────────────┬─────────────────────────────────────┐
 * │ 노드 트리   │ 카드 그리드 (flex:1, 상단)             │
 * │ (280px)    │ ┌────┐ ┌────┐ ┌────┐                │
 * │            │ │카드 │ │카드 │ │카드 │                │
 * │ ▼ C1N1 (3) │ └────┘ └────┘ └────┘                │
 * │   ● SIP-1  ├─────────────────────────────────────┤
 * │   ● SIP-2  │ 하단: 멤버/인증번호 탭 (선택된 카드)    │
 * │ ▼ C1N2 (2) │ [멤버(3)] [인증번호(2)]               │
 * │   ● GW-1   │ ag-Grid 테이블                       │
 * └────────────┴─────────────────────────────────────┘
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Dropdown, Empty, Input } from 'antd';
import { AlertTriangle, Ban, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Network, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { endpointApi } from '../api/endpointApi';
import EndpointMemberDrawer, { type EndpointMemberDrawerRef } from '../components/EndpointMemberDrawer';
import EndpointRegnumDrawer, { type EndpointRegnumDrawerRef } from '../components/EndpointRegnumDrawer';
import GwBypassDialog, { type GwBypassDialogRef } from '../components/GwBypassDialog';
import { endpointQueryKeys, useDeleteEndpoint, useDeleteMember, useDeleteRegnum, useGetEndpoints, useGetMembers, useGetNodes, useGetRegnums } from '../hooks/useEndpointQueries';
import {
  ALLOC_METHOD_LABELS,
  ENDPOINT_TYPE_LABELS,
  type Endpoint,
  type EndpointMember,
  type EndpointRegnum,
  type NodeEndpointGroup,
  REG_METHOD_LABELS,
  SSW_VENDOR_LABELS,
  TRANSPORT_OPTIONS,
  getEndpointStatusInfo,
  getEndpointTagList,
} from '../types/endpoint.types';
import { IconTrash } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '회선관리', path: '/ipron/line/endpoint' },
  { title: '국선관리', path: '/ipron/line/endpoint' },
];

type BottomTab = 'member' | 'regnum';

const TRANSPORT_LABELS: Record<number, string> = Object.fromEntries(TRANSPORT_OPTIONS.map((o) => [o.value, o.label]));

export default function EndpointListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const modal = useModal();
  const { gridOptions } = useAggridOptions();

  // URL query params로 초기 선택 (등록/수정 후 돌아올 때)
  const initNodeId = searchParams.get('nodeId') ? Number(searchParams.get('nodeId')) : null;
  const initEndptId = searchParams.get('endptId') ? Number(searchParams.get('endptId')) : null;

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initNodeId);
  const [selectedEndpointId, setSelectedEndpointId] = useState<number | null>(initEndptId);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<BottomTab>('member');
  const [searchText, setSearchText] = useState('');
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const [tenantOptions, setTenantOptions] = useState<Array<{ label: string; value: number }>>([]);

  // ─── Refs ─────────────────────────────────────────────────────────────────
  const memberDrawerRef = useRef<EndpointMemberDrawerRef>(null);
  const regnumDrawerRef = useRef<EndpointRegnumDrawerRef>(null);
  const gwBypassRef = useRef<GwBypassDialogRef>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────
  const { data: endpoints = [] } = useGetEndpoints();
  const { data: nodes = [] } = useGetNodes();

  const { data: members = [], isLoading: isMembersLoading } = useGetMembers({
    params: selectedEndpointId ? { id: selectedEndpointId } : undefined,
    queryOptions: { enabled: !!selectedEndpointId },
  });

  const { data: regnums = [], isLoading: isRegnumsLoading } = useGetRegnums({
    params: selectedEndpointId ? { id: selectedEndpointId } : undefined,
    queryOptions: { enabled: !!selectedEndpointId },
  });

  // ─── Mutations ──────────────────────────────────────────────────────────────
  const { mutate: deleteEndpoint } = useDeleteEndpoint({
    mutationOptions: {
      onSuccess: () => {
        toast.success('국선이 삭제되었습니다.');
        if (selectedEndpointId) setSelectedEndpointId(null);
        invalidateEndpoints();
      },
    },
  });

  const { mutate: deleteMember } = useDeleteMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 삭제되었습니다.');
        invalidateMembers();
        invalidateEndpoints();
      },
    },
  });

  const { mutate: deleteRegnum } = useDeleteRegnum({
    mutationOptions: {
      onSuccess: () => {
        toast.success('인증번호가 삭제되었습니다.');
        invalidateRegnums();
        invalidateEndpoints();
      },
    },
  });

  // ─── Invalidation helpers ──────────────────────────────────────────────────
  const invalidateEndpoints = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getEndpoints().queryKey });
  }, [queryClient]);

  const invalidateMembers = useCallback(() => {
    if (selectedEndpointId) {
      queryClient.invalidateQueries({
        queryKey: endpointQueryKeys.getMembers({ id: selectedEndpointId }).queryKey,
      });
    }
  }, [queryClient, selectedEndpointId]);

  const invalidateRegnums = useCallback(() => {
    if (selectedEndpointId) {
      queryClient.invalidateQueries({
        queryKey: endpointQueryKeys.getRegnums({ id: selectedEndpointId }).queryKey,
      });
    }
  }, [queryClient, selectedEndpointId]);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const nodeEndpointGroups: NodeEndpointGroup[] = useMemo(() => {
    const groupMap = new Map<number, NodeEndpointGroup>();

    for (const node of nodes) {
      groupMap.set(node.nodeId, {
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        endpoints: [],
      });
    }

    for (const ep of endpoints) {
      let group = groupMap.get(ep.nodeId);
      if (!group) {
        group = {
          nodeId: ep.nodeId,
          nodeName: ep.nodeName || `Node ${ep.nodeId}`,
          endpoints: [],
        };
        groupMap.set(ep.nodeId, group);
      }
      group.endpoints.push(ep);
    }

    return Array.from(groupMap.values())
      .map((g) => (searchText ? { ...g, endpoints: g.endpoints.filter((ep) => ep.endptName?.toLowerCase().includes(searchText.toLowerCase())) } : g))
      .filter((g) => (searchText ? g.endpoints.length > 0 : true))
      .sort((a, b) => a.nodeId - b.nodeId);
  }, [endpoints, nodes, searchText]);

  const selectedEndpoints = useMemo(() => {
    if (!selectedNodeId) return [];
    return endpoints.filter((ep) => ep.nodeId === selectedNodeId);
  }, [endpoints, selectedNodeId]);

  const selectedNodeName = useMemo(() => {
    if (!selectedNodeId) return '';
    const node = nodes.find((n) => n.nodeId === selectedNodeId);
    return node?.nodeName ?? `Node ${selectedNodeId}`;
  }, [nodes, selectedNodeId]);

  const selectedEndpoint = useMemo(() => {
    if (!selectedEndpointId) return null;
    return endpoints.find((ep) => ep.endptId === selectedEndpointId) ?? null;
  }, [endpoints, selectedEndpointId]);

  const filteredEndpoints = useMemo(() => {
    if (!searchText) return selectedEndpoints;
    return selectedEndpoints.filter((ep) => ep.endptName?.toLowerCase().includes(searchText.toLowerCase()));
  }, [selectedEndpoints, searchText]);

  // 선택된 국선의 노드 테넌트 목록 조회
  useEffect(() => {
    if (selectedEndpoint?.nodeId) {
      endpointApi
        .getNodeTenants({ nodeId: selectedEndpoint.nodeId })
        .then((list) => {
          setTenantOptions(list.map((t) => ({ label: t.tenantName, value: t.tenantId })));
        })
        .catch(() => setTenantOptions([]));
    } else {
      setTenantOptions([]);
    }
  }, [selectedEndpoint?.nodeId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const toggleNodeGroup = (nodeId: number) => {
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleNodeSelect = (nodeId: number) => {
    setSelectedNodeId(nodeId);
    setSelectedEndpointId(null);
    setSearchText('');
  };

  const handleCardSelect = (ep: Endpoint) => {
    setSelectedEndpointId(ep.endptId);
    setActiveTab('member');
  };

  const handleTreeItemClick = (ep: Endpoint) => {
    setSelectedNodeId(ep.nodeId);
    setSelectedEndpointId(ep.endptId);
    setActiveTab('member');
    // 카드 영역 스크롤
    setTimeout(() => {
      const card = document.getElementById(`ep-card-${ep.endptId}`);
      card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }, 100);
  };

  const handleCreate = useCallback(() => {
    navigate('/ipron/line/endpoint/create' + (selectedNodeId ? `?nodeId=${selectedNodeId}` : ''));
  }, [navigate, selectedNodeId]);

  const handleEdit = useCallback(
    (ep: Endpoint) => {
      navigate(`/ipron/line/endpoint/${ep.endptId}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    (ep: Endpoint) => {
      modal.confirm.execute({
        onOk: () => deleteEndpoint({ id: ep.endptId }),
        options: {
          title: '국선 삭제',
          content: `"${ep.endptName}" 국선을 삭제하시겠습니까?\n하위 멤버 및 인증번호도 함께 삭제됩니다.`,
        },
      });
    },
    [modal, deleteEndpoint],
  );

  const handleMemberDelete = useCallback(
    (member: EndpointMember) => {
      if (!selectedEndpointId) return;
      modal.confirm.execute({
        onOk: () => deleteMember({ id: selectedEndpointId, memId: member.endptMemId }),
        options: {
          title: '멤버 삭제',
          content: `"${member.endptMemName}" 멤버를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteMember, selectedEndpointId],
  );

  const handleRegnumDelete = useCallback(
    (regnum: EndpointRegnum) => {
      if (!selectedEndpointId) return;
      modal.confirm.execute({
        onOk: () => deleteRegnum({ id: selectedEndpointId, regId: regnum.endptRegnumId }),
        options: {
          title: '인증번호 삭제',
          content: `"${regnum.regNum}" 인증번호를 삭제하시겠습니까?`,
        },
      });
    },
    [modal, deleteRegnum, selectedEndpointId],
  );

  const handleMemberDrawerSuccess = useCallback(() => {
    invalidateMembers();
    invalidateEndpoints();
  }, [invalidateMembers, invalidateEndpoints]);

  const handleRegnumDrawerSuccess = useCallback(() => {
    invalidateRegnums();
    invalidateEndpoints();
  }, [invalidateRegnums, invalidateEndpoints]);

  const getCardMenuItems = (ep: Endpoint) => [
    {
      key: 'edit',
      label: '수정',
      onClick: () => handleEdit(ep),
    },
    {
      key: 'delete',
      label: '삭제',
      icon: <Trash2 className="size-4" />,
      danger: true,
      onClick: () => handleDelete(ep),
    },
  ];

  // ─── ag-Grid: Member columns ─────────────────────────────────────────────
  const memberColumnDefs: ColDef<EndpointMember>[] = useMemo(
    () => [
      {
        headerName: '멤버명',
        field: 'endptMemName',
        flex: 2,
        minWidth: 100,
      },
      {
        headerName: 'IP 주소',
        field: 'ipAddress',
        flex: 2,
        minWidth: 100,
      },
      {
        headerName: '포트',
        field: 'portNo',
        flex: 1,
        minWidth: 60,
      },
      {
        headerName: '우선순위',
        field: 'priority',
        flex: 1,
        minWidth: 70,
      },
      {
        headerName: '블럭여부',
        field: 'blockYn',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          return params.data.blockYn === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              설정
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
              해제
            </span>
          );
        },
      },
      {
        headerName: '모니터링 상태',
        field: 'monState',
        flex: 1,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          const v = params.data.monState;
          if (v === 0)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                정상
              </span>
            );
          if (v === 2)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                미사용
              </span>
            );
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              장애
            </span>
          );
        },
      },
      {
        headerName: '장비 등록 상태',
        field: 'regState',
        flex: 1,
        minWidth: 90,
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          const v = params.data.regState;
          if (v === 1)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                등록
              </span>
            );
          if (v === 2)
            return (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
                미사용
              </span>
            );
          return (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              미등록
            </span>
          );
        },
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointMember>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleMemberDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleMemberDelete],
  );

  // ─── ag-Grid: Regnum columns ──────────────────────────────────────────────
  const regnumColumnDefs: ColDef<EndpointRegnum>[] = useMemo(
    () => [
      {
        headerName: '인증번호',
        field: 'regNum',
        flex: 2,
        minWidth: 100,
      },
      {
        headerName: '테넌트',
        field: 'tenantName',
        flex: 2,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          return params.data.tenantName ?? '-';
        },
      },
      {
        headerName: '인증된 멤버',
        flex: 2,
        minWidth: 80,
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (params.data as any).regEndptMemName ?? '없음';
        },
      },
      {
        headerName: '사용여부',
        field: 'regActivateYn',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          return params.data.regActivateYn === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
              사용
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fafafa', color: '#8c8c8c' }}>
              미사용
            </span>
          );
        },
      },
      {
        headerName: '인증 상태',
        field: 'regState',
        flex: 1,
        minWidth: 70,
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          const v = params.data.regState;
          return v === 1 ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#f6ffed', color: '#52c41a' }}>
              등록
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold" style={{ background: '#fff2f0', color: '#ff4d4f' }}>
              미등록
            </span>
          );
        },
      },
      {
        headerName: '인증요청',
        colId: 'register',
        flex: 1,
        minWidth: 80,
        sortable: false,
        filter: false,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          const disabled = params.data.regActivateYn !== 1;
          return (
            <button
              type="button"
              disabled={disabled}
              className={`px-2 py-0.5 rounded text-[11px] border ${
                disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 cursor-pointer'
              }`}
              onClick={async (e) => {
                e.stopPropagation();
                if (!disabled && selectedEndpointId) {
                  try {
                    await endpointApi.registerRegnum({ id: selectedEndpointId, regId: params.data!.endptRegnumId });
                    toast.success('인증요청을 성공하였습니다.');
                  } catch {
                    toast.error('인증요청에 실패하였습니다.');
                  }
                }
              }}
            >
              REGISTER
            </button>
          );
        },
      },
      {
        headerName: '',
        colId: 'actions',
        maxWidth: 50,
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params: ICellRendererParams<EndpointRegnum>) => {
          if (!params.data) return null;
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRegnumDelete(params.data!);
              }}
            >
              <IconTrash className="size-5 text-red-500 hover:cursor-pointer" />
            </button>
          );
        },
      },
    ],
    [handleRegnumDelete],
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      {/* Split container: Left Tree + Right (Cards + Bottom Panel) */}
      <div className="flex flex-1 min-h-0 gap-4">
        {/* ===== Left Panel: Node Tree (280px) ===== */}
        <div className="w-[280px] min-w-[280px] bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Input placeholder="국선명 검색" size="small" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {nodeEndpointGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 px-4">
                <span className="text-sm">등록된 국선이 없습니다</span>
              </div>
            ) : (
              nodeEndpointGroups.map((group) => {
                const isCollapsed = collapsedNodes.has(group.nodeId);
                const isNodeSelected = selectedNodeId === group.nodeId;
                return (
                  <div key={group.nodeId} className="mb-0.5">
                    {/* Node group header */}
                    <button
                      type="button"
                      className={`w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none text-[13px] font-semibold transition-colors border-l-[3px] ${
                        isNodeSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189]' : 'border-l-transparent text-gray-800 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleNodeSelect(group.nodeId);
                        if (isCollapsed) toggleNodeGroup(group.nodeId);
                      }}
                    >
                      <button
                        type="button"
                        className="p-0 bg-transparent border-none cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeGroup(group.nodeId);
                        }}
                      >
                        {isCollapsed ? <ChevronRight className="size-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="size-3.5 text-gray-400 flex-shrink-0" />}
                      </button>
                      <Network className="size-4 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{group.nodeName}</span>
                      <span className="ml-auto text-[11px] text-gray-400 font-normal">{group.endpoints.length}</span>
                    </button>

                    {/* Endpoint items under node */}
                    {!isCollapsed && (
                      <div>
                        {group.endpoints.map((ep) => {
                          const isItemSelected = selectedEndpointId === ep.endptId;
                          return (
                            <div
                              key={ep.endptId}
                              className={`group flex items-center gap-2 pl-[42px] pr-4 py-1.5 cursor-pointer text-[12px] transition-colors border-l-[3px] ${
                                isItemSelected ? 'bg-[#e8ecf4] border-l-[#405189] text-[#405189] font-medium' : 'border-l-transparent text-gray-500 hover:bg-gray-50'
                              }`}
                              onClick={() => handleTreeItemClick(ep)}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  isItemSelected ? 'bg-[#405189]' : ep.blockYn === 1 || ep.epStatus === 0 ? 'bg-red-500' : 'bg-green-500'
                                }`}
                              />
                              <span className="truncate flex-1">{ep.endptName}</span>
                              {ep.epStatus === 0 && <AlertTriangle className="size-3 text-red-500 flex-shrink-0" />}
                              {ep.blockYn === 1 && <Ban className="size-3 text-orange-500 flex-shrink-0" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ===== Right Panel: Cards (top) + Member/Regnum (bottom) ===== */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {selectedNodeId ? (
            <>
              {/* ── Top: Card Slider Area ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col overflow-hidden flex-shrink-0">
                {/* Card grid header */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800">
                      {selectedNodeName} 국선 ({filteredEndpoints.length})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="small" onClick={() => gwBypassRef.current?.open(selectedNodeId!, selectedNodeName)}>
                      G/W 우회설정
                    </Button>
                    <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
                      국선 추가
                    </Button>
                  </div>
                </div>

                {/* Card slider body */}
                <div className="flex items-center px-4 py-3">
                  {filteredEndpoints.length === 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-3">
                      <Empty description={false} />
                      <span className="text-sm">{searchText ? '검색 결과가 없습니다' : '이 노드에 등록된 국선이 없습니다'}</span>
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
                        {filteredEndpoints.map((ep) => {
                          const isCardSelected = selectedEndpointId === ep.endptId;
                          const tags = getEndpointTagList(ep);
                          const status = getEndpointStatusInfo(ep);
                          return (
                            <div
                              key={ep.endptId}
                              id={`ep-card-${ep.endptId}`}
                              className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all min-w-[220px] max-w-[260px] flex-shrink-0 ${
                                isCardSelected
                                  ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
                                  : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                              }`}
                              onClick={() => handleCardSelect(ep)}
                              onDoubleClick={() => navigate(`/ipron/line/endpoint/${ep.endptId}`)}
                            >
                              {/* Card header: 국선명 + 상태 배지 + 더보기 */}
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border flex-shrink-0"
                                    style={{ color: status.color, backgroundColor: status.bgColor, borderColor: status.color + '40' }}
                                  >
                                    {status.label}
                                  </span>
                                  <span className="text-sm font-semibold text-gray-800 truncate">{ep.endptName}</span>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                  <Dropdown menu={{ items: getCardMenuItems(ep) }} trigger={['click']} placement="bottomRight">
                                    <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                                      <MoreVertical className="size-4 text-gray-400" />
                                    </button>
                                  </Dropdown>
                                </div>
                              </div>

                              {/* Card info */}
                              <div className="text-xs text-gray-500 space-y-0.5">
                                <div>
                                  구분: {ENDPOINT_TYPE_LABELS[ep.endptType] ?? ep.endptType}
                                  {ep.sswVendor && ep.sswVendor !== '0' ? ` | 벤더: ${SSW_VENDOR_LABELS[ep.sswVendor] ?? ep.sswVendor}` : ''}
                                </div>
                                <div>
                                  채널: {ep.endptMaxchnl ?? 0} / OB: {ep.endptDodchnl ?? 0}
                                </div>
                                <div>
                                  서버할당: {ALLOC_METHOD_LABELS[ep.allocMethod] ?? '-'}
                                  {' | '}REG방식: {REG_METHOD_LABELS[ep.regMethod] ?? '-'}
                                </div>
                                <div>프로파일: {ep.sipProfileName ?? '-'}</div>
                              </div>

                              {/* Tags */}
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {tags.map((tag) => (
                                    <span
                                      key={tag.label}
                                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border"
                                      style={{ color: tag.color, backgroundColor: tag.bgColor, borderColor: tag.borderColor }}
                                    >
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              )}
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

              {/* ── Bottom: Member/Regnum Tab Panel ── */}
              <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col flex-1 min-h-0 overflow-hidden">
                {selectedEndpoint ? (
                  <div className="flex flex-col flex-1 min-h-0">
                    {/* Bottom header: selected endpoint name + status */}
                    <div className="px-5 py-2 flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-800">{selectedEndpoint.endptName}</span>
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-b-2 border-gray-200 flex-shrink-0">
                      <button
                        type="button"
                        className={`px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors ${
                          activeTab === 'member' ? 'text-[#405189] border-b-[#405189]' : 'text-gray-400 border-b-transparent hover:text-gray-600'
                        }`}
                        onClick={() => setActiveTab('member')}
                      >
                        멤버 ({members.length})
                      </button>
                      <button
                        type="button"
                        className={`px-5 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[2px] transition-colors ${
                          activeTab === 'regnum' ? 'text-[#405189] border-b-[#405189]' : 'text-gray-400 border-b-transparent hover:text-gray-600'
                        }`}
                        onClick={() => setActiveTab('regnum')}
                      >
                        인증번호 ({regnums.length})
                      </button>
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Member tab */}
                      {activeTab === 'member' && (
                        <>
                          <div className="px-5 py-2 flex items-center justify-end flex-shrink-0 border-b border-gray-100">
                            <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={() => memberDrawerRef.current?.open()}>
                              멤버 추가
                            </Button>
                          </div>
                          <div className="flex-1">
                            <AgGridReact<EndpointMember>
                              rowData={members}
                              columnDefs={memberColumnDefs}
                              gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                              loading={isMembersLoading}
                              getRowId={(params) => String(params.data.endptMemId)}
                              defaultColDef={{ filter: true, sortable: true }}
                              onRowDoubleClicked={(e) => {
                                if (e.data) memberDrawerRef.current?.open(e.data);
                              }}
                            />
                          </div>
                        </>
                      )}

                      {/* Regnum tab */}
                      {activeTab === 'regnum' && (
                        <>
                          <div className="px-5 py-2 flex items-center justify-end flex-shrink-0 border-b border-gray-100">
                            <Button type="primary" size="small" icon={<Plus className="size-3.5" />} onClick={() => regnumDrawerRef.current?.open()}>
                              인증번호 추가
                            </Button>
                          </div>
                          <div className="flex-1">
                            <AgGridReact<EndpointRegnum>
                              rowData={regnums}
                              columnDefs={regnumColumnDefs}
                              gridOptions={{ ...gridOptions, statusBar: undefined, pagination: false, sideBar: false }}
                              loading={isRegnumsLoading}
                              getRowId={(params) => String(params.data.endptRegnumId)}
                              defaultColDef={{ filter: true, sortable: true }}
                              onRowDoubleClicked={(e) => {
                                if (e.data) regnumDrawerRef.current?.open(e.data);
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
                    <Empty description={false} />
                    <span className="text-sm">국선을 선택하면 멤버/인증번호를 확인할 수 있습니다</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state when no node selected */
            <div className="bg-white bt-shadow rounded-md border border-gray-200 flex flex-col items-center justify-center h-full text-gray-400 gap-3 px-8">
              <Empty description={false} />
              <span className="text-sm">좌측에서 노드를 선택하세요</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== Drawers ===== */}
      {selectedEndpointId && (
        <>
          <EndpointMemberDrawer ref={memberDrawerRef} endptId={selectedEndpointId} onSuccess={handleMemberDrawerSuccess} />
          <EndpointRegnumDrawer ref={regnumDrawerRef} endptId={selectedEndpointId} tenantOptions={tenantOptions} onSuccess={handleRegnumDrawerSuccess} />
        </>
      )}

      {/* G/W 우회설정 다이얼로그 */}
      <GwBypassDialog
        ref={gwBypassRef}
        endpoints={endpoints}
        nodeOptions={nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }))}
        onApply={async (endptIds, routingNodeId) => {
          await endpointApi.gwBypass({ endptIds, routingNodeId });
          queryClient.invalidateQueries({ queryKey: endpointQueryKeys.getEndpoints().queryKey });
        }}
      />
    </div>
  );
}
