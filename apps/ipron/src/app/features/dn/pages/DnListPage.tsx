/**
 * DN 관리 목록 페이지 (IPR20S2020)
 * Pattern: 상단 노드/테넌트 탭 + 뷰 스위치 + 테넌트 카드 슬라이더(계약수량 progress) +
 *         검색 폼 + 하단 ag-Grid (대량 페이징, 체크박스)
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │ [⇅] [← 노드 탭 →]              🔍 [검색][+등록][일괄등록] │
 *  │ [전체] [테넌트 A] [테넌트 B] ... (테넌트 카드 240×130)       │
 *  ├──────────────────────────────────────────────────────────────┤
 *  │ {컨텍스트} | DN범위[~] | 상태 | COS | 프로파일 | 검색 | 초기화│
 *  ├──────────────────────────────────────────────────────────────┤
 *  │ ag-Grid (페이징 50, 체크박스 다건)                            │
 *  └──────────────────────────────────────────────────────────────┘
 *
 * 뷰 모드:
 *  - byNode: 탭=노드 / 카드=테넌트 (기본)
 *  - byTenant: 탭=테넌트 / 카드=노드
 *
 * 카드 클릭 → 해당 범위로 그리드 필터 적용
 * 더블클릭 → 수정 페이지 이동
 * 체크 다건 + 상단 "삭제 (N)" → 일괄 삭제 확인
 */
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Empty, Input } from 'antd';
import { ArrowUpDown, Building2, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Download, Network, Plus, Search, Trash2, Upload } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetDnProfileNodes, useGetDnProfileTenants } from '../../dn-profile/hooks/useDnProfileQueries';
import { dnApi } from '../api/dnApi';
import DnBatchDialog from '../components/DnBatchDialog';
import DnBulkDeleteModal from '../components/DnBulkDeleteModal';
import DnCopyDrawer from '../components/DnCopyDrawer';
import DnSearchForm, { type DnSearchFormValues } from '../components/DnSearchForm';
import DnTable from '../components/DnTable';
import DnTenantCard from '../components/DnTenantCard';
import { dnQueryKeys, useDeleteDns, useGetDnNodeTenants, useGetDnOptions, useGetDns } from '../hooks/useDnQueries';
import type { DnResponse } from '../types/dn.types';
import PageHeader from '@/components/custom/PageHeader';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb = [
  { title: 'IPRON', path: '/ipron' },
  { title: '번호자원관리', path: '/ipron/dn' },
  { title: 'DN관리', path: '/ipron/dn' },
  { title: '내선관리', path: '/ipron/dn' },
];

export default function DnListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();

  // ─── State ────────────────────────────────────────────────────────────────
  // URL query param으로 선택된 노드/테넌트 유지 — 등록/수정 후 돌아와도 컨텍스트 보존
  const [searchParams, setSearchParams] = useSearchParams();
  const initialNodeId = Number(searchParams.get('nodeId')) || null;
  const initialTenantId = Number(searchParams.get('tenantId')) || null;

  const [viewMode, setViewMode] = useState<'byNode' | 'byTenant'>('byNode');
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initialNodeId);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(initialTenantId);
  const [searchText, setSearchText] = useState('');
  const [searchFilters, setSearchFilters] = useState<DnSearchFormValues>({});
  const [selectedRows, setSelectedRows] = useState<DnResponse[]>([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(true);

  const cardScrollRef = useRef<HTMLDivElement>(null);
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const hasInitializedNodeRef = useRef(false);
  const hasInitializedTenantRef = useRef(false);

  // 선택 변경 시 URL query param 동기화 (뒤로가기/새로고침 시 상태 보존)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedNodeId) next.set('nodeId', String(selectedNodeId));
    else next.delete('nodeId');
    if (selectedTenantId) next.set('tenantId', String(selectedTenantId));
    else next.delete('tenantId');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, selectedTenantId]);

  // ─── Queries ──────────────────────────────────────────────────────────────
  const { data: nodes = [] } = useGetDnProfileNodes();
  const { data: tenants = [] } = useGetDnProfileTenants();
  const { data: nodeTenants = [] } = useGetDnNodeTenants();

  // 목록 조회 파라미터 — 탭(primary)만 서버 필터. 카드(secondary) + 텍스트 검색은 클라이언트 필터.
  // byNode: 탭=노드 → 서버 nodeId / 카드=테넌트 → 클라이언트 필터
  // byTenant: 탭=테넌트 → 서버 tenantId / 카드=노드 → 클라이언트 필터
  const listParams = useMemo(() => {
    // 백엔드가 페이징 없이 전체를 반환 (ag-Grid row 가상화 + 클라이언트 카드/검색 필터)
    const p: Record<string, unknown> = {};
    if (viewMode === 'byNode' && selectedNodeId) p.nodeId = selectedNodeId;
    if (viewMode === 'byTenant' && selectedTenantId) p.tenantId = selectedTenantId;
    if (searchFilters.dnNoStart) p.dnNoStart = searchFilters.dnNoStart;
    if (searchFilters.dnNoEnd) p.dnNoEnd = searchFilters.dnNoEnd;
    if (searchFilters.dnStatus) p.dnStatus = searchFilters.dnStatus;
    if (searchFilters.cosId) p.cosId = searchFilters.cosId;
    if (searchFilters.dnProfileId) p.dnProfileId = searchFilters.dnProfileId;
    return p;
  }, [viewMode, selectedNodeId, selectedTenantId, searchFilters]);

  const { data: dns = [], isLoading: isDnsLoading } = useGetDns({ params: listParams });

  // 폼 옵션 (COS / 프로파일) — 선택된 노드+테넌트 있을 때만
  const optionsParams = useMemo(() => {
    if (selectedNodeId && selectedTenantId) {
      return { nodeId: selectedNodeId, tenantId: selectedTenantId };
    }
    return null;
  }, [selectedNodeId, selectedTenantId]);
  const { data: options } = useGetDnOptions(optionsParams);
  const profileOptions = useMemo(() => options?.dnProfiles ?? [], [options]);
  const cosOptions = useMemo(() => options?.cos ?? [], [options]);

  // ─── Derived: 탭 / 카드 세팅 ─────────────────────────────────────────────
  // viewMode=byNode: 탭=노드, 카드=테넌트
  // viewMode=byTenant: 탭=테넌트, 카드=노드
  const assignedNodes = useMemo(() => {
    const nodeIds = new Set(nodeTenants.map((nt) => nt.nodeId));
    return nodes.filter((n) => nodeIds.has(n.nodeId));
  }, [nodes, nodeTenants]);

  const assignedTenants = useMemo(() => {
    const map = new Map<number, { tenantId: number; tenantName: string }>();
    for (const nt of nodeTenants) {
      if (!map.has(nt.tenantId)) {
        map.set(nt.tenantId, { tenantId: nt.tenantId, tenantName: nt.tenantName });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.tenantName.localeCompare(b.tenantName));
  }, [nodeTenants]);

  // 탭에 표시할 항목 리스트
  const tabItems = useMemo(() => {
    return viewMode === 'byNode' ? assignedNodes.map((n) => ({ id: n.nodeId, name: n.nodeName })) : assignedTenants.map((t) => ({ id: t.tenantId, name: t.tenantName }));
  }, [viewMode, assignedNodes, assignedTenants]);

  // 카드 통계: 선택된 탭 범위에서 집계
  // nodeTenants 매핑 기반으로 카드 시드 → 내선 0건인 테넌트/노드도 카드 표시
  const cardStats = useMemo(() => {
    const map = new Map<number, { id: number; name: string; totalCnt: number; activeCnt: number; inactiveCnt: number; maxDnCnt: number | null }>();

    // 1. 시드: 현재 탭에 매핑된 테넌트/노드를 0건으로 먼저 넣음
    if (viewMode === 'byNode' && selectedNodeId) {
      for (const nt of nodeTenants) {
        if (nt.nodeId !== selectedNodeId) continue;
        map.set(nt.tenantId, {
          id: nt.tenantId,
          name: nt.tenantName ?? '-',
          totalCnt: 0,
          activeCnt: 0,
          inactiveCnt: 0,
          maxDnCnt: nt.maxDnCnt ?? null,
        });
      }
    } else if (viewMode === 'byTenant' && selectedTenantId) {
      for (const nt of nodeTenants) {
        if (nt.tenantId !== selectedTenantId) continue;
        if (!map.has(nt.nodeId)) {
          const nodeName = nodes.find((n) => n.nodeId === nt.nodeId)?.nodeName ?? '-';
          map.set(nt.nodeId, {
            id: nt.nodeId,
            name: nodeName,
            totalCnt: 0,
            activeCnt: 0,
            inactiveCnt: 0,
            maxDnCnt: null,
          });
        }
      }
    }

    // 2. DN 순회로 카운트 증가 + 시드에 없던 케이스 추가
    for (const dn of dns) {
      const key = viewMode === 'byNode' ? dn.tenantId : dn.nodeId;
      const name = (viewMode === 'byNode' ? dn.tenantName : dn.nodeName) ?? '-';
      if (!map.has(key)) {
        let maxDnCnt: number | null = null;
        if (viewMode === 'byNode' && selectedNodeId) {
          const nt = nodeTenants.find((x) => x.nodeId === selectedNodeId && x.tenantId === key);
          maxDnCnt = nt?.maxDnCnt ?? null;
        }
        map.set(key, { id: key, name, totalCnt: 0, activeCnt: 0, inactiveCnt: 0, maxDnCnt });
      }
      const g = map.get(key)!;
      g.totalCnt += 1;
      if (dn.dnStatus === '1') g.activeCnt += 1;
      else g.inactiveCnt += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [dns, viewMode, nodeTenants, selectedNodeId, selectedTenantId, nodes]);

  // 전체 집계 (카드 맨 앞 "전체" 카드용)
  const totalStats = useMemo(() => {
    let totalCnt = 0;
    let activeCnt = 0;
    let inactiveCnt = 0;
    for (const dn of dns) {
      totalCnt += 1;
      if (dn.dnStatus === '1') activeCnt += 1;
      else inactiveCnt += 1;
    }
    return { totalCnt, activeCnt, inactiveCnt };
  }, [dns]);

  // 선택된 카드 ID
  const selectedCardId = viewMode === 'byNode' ? selectedTenantId : selectedNodeId;
  const setSelectedCardId = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') setSelectedTenantId(id);
      else setSelectedNodeId(id);
    },
    [viewMode],
  );

  // 그리드 표시용 DN — 카드 필터 + 텍스트 검색(클라이언트) 적용
  const dnsForGrid = useMemo(() => {
    let rows = dns;
    if (selectedCardId !== null) {
      rows = rows.filter((d) => (viewMode === 'byNode' ? d.tenantId === selectedCardId : d.nodeId === selectedCardId));
    }
    const kw = searchText.trim().toLowerCase();
    if (kw) {
      rows = rows.filter((d) => {
        const fields: (string | number | null | undefined)[] = [
          d.dnNo,
          d.loginAdn,
          d.ipv4Address,
          d.ipv6Address,
          d.md5Authid,
          d.dnProfileName,
          d.cosName,
          d.deviceTypeName,
          d.tenantName,
          d.nodeName,
        ];
        return fields.some((f) => f != null && String(f).toLowerCase().includes(kw));
      });
    }
    return rows;
  }, [dns, selectedCardId, viewMode, searchText]);

  // 그리드 헤더 텍스트
  const gridHeaderText = useMemo(() => {
    const tabName =
      viewMode === 'byNode'
        ? selectedNodeId
          ? (nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? '선택 노드')
          : '전체'
        : selectedTenantId
          ? (assignedTenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? '선택 테넌트')
          : '전체';
    const cardGroup = cardStats.find((g) => g.id === selectedCardId);
    if (cardGroup) {
      return `${tabName} / ${cardGroup.name} DN 목록 (${dnsForGrid.length.toLocaleString()}건)`;
    }
    return `${tabName} DN 목록 (${dnsForGrid.length.toLocaleString()}건)`;
  }, [viewMode, selectedNodeId, selectedTenantId, nodes, assignedTenants, cardStats, selectedCardId, dnsForGrid.length]);

  const contextLabel = useMemo(() => {
    if (!selectedNodeId && !selectedTenantId) return undefined;
    const parts: string[] = [];
    if (selectedTenantId) {
      const t = tenants.find((x) => x.tenantId === selectedTenantId);
      if (t) parts.push(t.tenantName);
    }
    if (selectedNodeId) {
      const n = nodes.find((x) => x.nodeId === selectedNodeId);
      if (n) parts.push(n.nodeName);
    }
    return parts.join(' / ');
  }, [selectedNodeId, selectedTenantId, tenants, nodes]);

  // ─── Auto-select ──────────────────────────────────────────────────────────
  // URL query param으로 이미 초기화된 경우는 건드리지 않음 (등록/수정 후 돌아올 때 컨텍스트 유지)
  useEffect(() => {
    if (viewMode === 'byNode') {
      if (assignedNodes.length > 0 && !hasInitializedNodeRef.current && selectedNodeId == null) {
        hasInitializedNodeRef.current = true;
        setSelectedNodeId(assignedNodes[0].nodeId);
      } else if (selectedNodeId != null) {
        hasInitializedNodeRef.current = true;
      }
    } else {
      if (assignedTenants.length > 0 && !hasInitializedTenantRef.current && selectedTenantId == null) {
        hasInitializedTenantRef.current = true;
        setSelectedTenantId(assignedTenants[0].tenantId);
      } else if (selectedTenantId != null) {
        hasInitializedTenantRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, assignedNodes, assignedTenants]);

  // 탭 변경 시 카드 자동 첫번째 선택 (단, 카드는 수동 선택 가능하도록 강제 선택은 하지 않음)
  // 선택된 카드가 현재 cardStats에 존재하지 않을 때만 해제 (선택 포커스가 비정상 전체로 튀는 것 방지)
  useEffect(() => {
    if (selectedCardId === null) return;
    // 데이터 로딩 전엔 cardStats 가 비어있을 수 있음 — 해제 로직 보류.
    // (등록/수정 후 돌아올 때 URL 로 넘긴 tenantId 가 강제로 null 되는 현상 방지)
    if (cardStats.length === 0) return;
    const stillExists = cardStats.some((g) => g.id === selectedCardId);
    if (!stillExists) {
      if (viewMode === 'byNode') setSelectedTenantId(null);
      else setSelectedNodeId(null);
    }
  }, [cardStats, selectedCardId, viewMode]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (id: number | null) => {
      if (viewMode === 'byNode') {
        setSelectedNodeId(id);
        setSelectedTenantId(null);
      } else {
        setSelectedTenantId(id);
        setSelectedNodeId(null);
      }
      setSearchText('');
      setSearchFilters({});
    },
    [viewMode],
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'byNode' ? 'byTenant' : 'byNode'));
    setSelectedNodeId(null);
    setSelectedTenantId(null);
    hasInitializedNodeRef.current = false;
    hasInitializedTenantRef.current = false;
    setSearchText('');
    setSearchFilters({});
  }, []);

  const invalidateDns = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
    queryClient.invalidateQueries({ queryKey: dnQueryKeys.getNodeTenants.queryKey });
  }, [queryClient]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const { mutate: deleteDns, isPending: isDeleting } = useDeleteDns({
    mutationOptions: {
      onSuccess: () => {
        toast.success('선택한 DN이 삭제되었습니다.');
        setSelectedRows([]);
        invalidateDns();
      },
    },
  });

  // 일괄 등록은 DnBatchDialog(Drawer) 내부에서 청크 분할 + Progress 처리.
  // 부모는 onSuccess 에서 Drawer 닫기 + 목록 갱신만 담당.

  // ─── DN actions ───────────────────────────────────────────────────────────
  const handleDnCreate = () => {
    const params = new URLSearchParams();
    if (selectedNodeId) params.set('nodeId', String(selectedNodeId));
    if (selectedTenantId) params.set('tenantId', String(selectedTenantId));
    const qs = params.toString();
    navigate(`/ipron/dn/create${qs ? `?${qs}` : ''}`);
  };

  const handleDnEdit = (dn: DnResponse) => {
    navigate(`/ipron/dn/${dn.dnId}/edit`);
  };

  const handleDnDelete = (dn: DnResponse) => {
    modal.confirm.execute({
      onOk: () => deleteDns([dn.dnId]),
      options: {
        title: '내선 삭제',
        content: `"${dn.dnNo}" 내선을 삭제하시겠습니까?\n내선에 등록된 SCA/SNR 도 함께 삭제 됩니다.`,
      },
    });
  };

  const handleDnDeleteSelected = () => {
    if (selectedRows.length === 0) return;
    // 대량/소량 모두 Bulk Delete Modal 로 통일 — 진행률 + 청크 분할 호출 일관된 UX
    setBulkDeleteOpen(true);
  };

  const handleBatchOpen = () => {
    if (!selectedNodeId || !selectedTenantId) {
      toast.warning('일괄 등록은 노드와 테넌트를 선택한 후 가능합니다.');
      return;
    }
    setBatchOpen(true);
  };

  const handleImport = () => toast.info('가져오기는 후속 단계에서 구현 예정입니다.');
  const handleExport = async () => {
    try {
      const blob = await dnApi.exportExcel(listParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      a.download = `내선관리_${ts}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('엑셀 내보내기 완료');
    } catch (e) {
      toast.error('엑셀 내보내기 실패');
      console.error(e);
    }
  };

  const selectedNodeName = nodes.find((n) => n.nodeId === selectedNodeId)?.nodeName ?? null;
  const selectedTenantName = tenants.find((t) => t.tenantId === selectedTenantId)?.tenantName ?? null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 flex-col gap-4">
        {/* ===== 탭 바 박스 (노드/테넌트 탭) ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 헤더: 뷰 전환 / 탭 / 검색·등록·일괄등록·엑셀·가져오기 */}
          <div className="flex items-stretch bg-white pr-3 flex-shrink-0 h-[56px]">
            {/* 뷰 모드 전환 버튼 */}
            <button
              type="button"
              onClick={toggleViewMode}
              title={`현재: 탭=${viewMode === 'byNode' ? '노드' : '테넌트'} / 카드=${viewMode === 'byNode' ? '테넌트' : '노드'}. 클릭 시 전환`}
              className="flex-shrink-0 flex flex-col items-center justify-center w-[44px] h-[56px] border-r border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              {viewMode === 'byNode' ? <Network size={14} className="text-blue-600" /> : <Building2 size={14} className="text-blue-600" />}
              <ArrowUpDown size={12} className="text-blue-500 my-0.5" />
              {viewMode === 'byNode' ? <Building2 size={14} className="text-gray-500" /> : <Network size={14} className="text-gray-500" />}
            </button>

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
              {tabItems.map((item) => {
                const currentSelected = viewMode === 'byNode' ? selectedNodeId : selectedTenantId;
                const isActive = currentSelected === item.id;
                const Icon = viewMode === 'byNode' ? Network : Building2;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium cursor-pointer border-b-2 -mb-[1px] w-[140px] flex-shrink-0 transition-colors ${
                      isActive ? 'bg-blue-50 text-blue-700 border-b-current' : 'text-gray-500 border-b-transparent hover:text-gray-700'
                    }`}
                    onClick={(e) => {
                      handleTabSelect(item.id);
                      (e.currentTarget as HTMLElement).scrollIntoView({
                        behavior: 'smooth',
                        inline: 'center',
                        block: 'nearest',
                      });
                    }}
                  >
                    <Icon className="size-3.5 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
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

            {/* 우측: 검색 + 내보내기/가져오기만 (등록/복사/일괄등록은 그리드 헤더로 이동) */}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0 pl-3">
              <Input
                allowClear
                prefix={<Search className="size-3.5 text-gray-400" />}
                placeholder="DN 검색"
                value={searchText}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                style={{ width: 200 }}
              />
              <Button icon={<Download className="size-3.5" />} onClick={handleExport}>
                엑셀
              </Button>
              <Button icon={<Upload className="size-3.5" />} onClick={handleImport}>
                가져오기
              </Button>
            </div>
          </div>
        </div>

        {/* ===== 카드 슬라이더 박스 ===== */}
        <div className="bg-white bt-shadow overflow-hidden flex-shrink-0">
          {/* 카드 슬라이더 body — 확장(140px): 풀 카드 / 축소(44px): 컴팩트 pill */}
          {cardExpanded ? (
            <div className="flex items-center h-[140px] px-4 py-3">
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {/* "전체" 카드 */}
                  <DnTenantCard
                    tenantId={null}
                    tenantName="전체"
                    stats={{
                      totalCnt: totalStats.totalCnt,
                      activeCnt: totalStats.activeCnt,
                      inactiveCnt: totalStats.inactiveCnt,
                    }}
                    selected={selectedCardId === null}
                    onClick={() => setSelectedCardId(null)}
                  />

                  {cardStats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-2 min-h-[100px]">
                      <Empty description={false} imageStyle={{ height: 40 }} />
                      <span className="text-sm">등록된 DN이 없습니다</span>
                    </div>
                  ) : (
                    cardStats.map((g) => (
                      <DnTenantCard
                        key={g.id}
                        tenantId={g.id}
                        tenantName={g.name}
                        stats={{
                          totalCnt: g.totalCnt,
                          activeCnt: g.activeCnt,
                          inactiveCnt: g.inactiveCnt,
                          maxDnCnt: viewMode === 'byNode' ? g.maxDnCnt : null,
                        }}
                        selected={selectedCardId === g.id}
                        onClick={(e) => {
                          setSelectedCardId(g.id);
                          (e.currentTarget as HTMLElement).scrollIntoView({
                            behavior: 'smooth',
                            inline: 'center',
                            block: 'nearest',
                          });
                        }}
                      />
                    ))
                  )}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-5" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-8 !h-8 !p-0"
                />
                <Button
                  type="text"
                  icon={<ChevronsUp className="size-4" />}
                  onClick={() => setCardExpanded(false)}
                  title="카드 접기"
                  className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center h-[44px] px-4">
              <div className="relative flex items-center gap-2 w-full">
                <Button
                  type="text"
                  icon={<ChevronLeft className="size-4" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-7 !h-7 !p-0"
                />
                <div ref={cardScrollRef} className="flex gap-2 overflow-x-auto flex-1 items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {/* "전체" pill */}
                  <CompactTenantPill name="전체" count={totalStats.totalCnt} selected={selectedCardId === null} onClick={() => setSelectedCardId(null)} />
                  {cardStats.map((g) => (
                    <CompactTenantPill
                      key={g.id}
                      name={g.name}
                      count={g.totalCnt}
                      selected={selectedCardId === g.id}
                      onClick={(e) => {
                        setSelectedCardId(g.id);
                        (e.currentTarget as HTMLElement).scrollIntoView({
                          behavior: 'smooth',
                          inline: 'center',
                          block: 'nearest',
                        });
                      }}
                    />
                  ))}
                </div>
                <Button
                  type="text"
                  icon={<ChevronRight className="size-4" />}
                  onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                  className="!flex-shrink-0 !w-7 !h-7 !p-0"
                />
                <Button
                  type="text"
                  icon={<ChevronsDown className="size-4" />}
                  onClick={() => setCardExpanded(true)}
                  title="카드 펼치기"
                  className="!flex-shrink-0 !w-8 !h-8 !p-0 !text-gray-400 hover:!text-[#405189]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 중간 검색 폼 제거 — 그리드 컬럼 필터로 대체 */}

        {/* ===== 하단 박스: ag-Grid ===== */}
        <div className="bg-white bt-shadow flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 h-[44px] flex-shrink-0">
            <span className="text-sm font-semibold text-gray-800">{gridHeaderText}</span>
            {selectedRows.length > 0 && (
              <span className="text-xs text-gray-500">
                {dnsForGrid.length.toLocaleString()}건 중 {selectedRows.length}건 선택
              </span>
            )}
            {/* 우측 액션 버튼 영역 — 항상 표시, 선택/상태에 따라 disabled */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                danger
                icon={<Trash2 className="size-3.5" />}
                onClick={handleDnDeleteSelected}
                loading={isDeleting}
                disabled={selectedRows.length === 0}
                title={selectedRows.length === 0 ? '삭제할 DN 을 선택하세요' : '선택한 DN 삭제'}
              >
                {selectedRows.length > 0 ? `삭제 (${selectedRows.length})` : '삭제'}
              </Button>
              <Button onClick={() => setCopyOpen(true)} disabled={selectedRows.length !== 1} title={selectedRows.length !== 1 ? 'DN 1건을 선택하세요' : '선택한 DN 복사 생성'}>
                복사 생성
              </Button>
              <Button onClick={handleBatchOpen} disabled={!selectedNodeId || !selectedTenantId}>
                일괄 등록
              </Button>
              <Button type="primary" icon={<Plus className="size-3.5" />} onClick={handleDnCreate}>
                등록
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <DnTable
              rowData={dnsForGrid}
              isLoading={isDnsLoading}
              onRowDoubleClicked={handleDnEdit}
              onDelete={handleDnDelete}
              onSelectionChanged={setSelectedRows}
              onBulkDelete={handleDnDeleteSelected}
              selectedCount={selectedRows.length}
            />
          </div>
        </div>
      </div>

      {/* 일괄 등록 Drawer — 청크 분할 + Progress 는 내부에서 처리 */}
      <DnBatchDialog
        open={batchOpen}
        nodeId={selectedNodeId}
        tenantId={selectedTenantId}
        nodeName={selectedNodeName}
        tenantName={selectedTenantName}
        profileOptions={profileOptions}
        cosOptions={cosOptions}
        defaultCosId={options?.defaultCosId ?? null}
        onCancel={() => setBatchOpen(false)}
        onSuccess={() => {
          setBatchOpen(false);
          setSelectedRows([]);
          invalidateDns();
        }}
      />

      {/* 복사 생성 Drawer (AS-IS IPR20S2020_Copy.jsp) */}
      <DnCopyDrawer
        open={copyOpen}
        source={selectedRows[0] ?? null}
        onCancel={() => setCopyOpen(false)}
        onSuccess={() => {
          setCopyOpen(false);
          setSelectedRows([]);
          queryClient.invalidateQueries({ queryKey: dnQueryKeys.getList._def });
        }}
      />

      {/* 다건 삭제 Modal — 500건 초과 시 자동 청크 분할 + 진행률 표시 */}
      <DnBulkDeleteModal
        open={bulkDeleteOpen}
        dnIds={selectedRows.map((r) => r.dnId)}
        onCancel={() => setBulkDeleteOpen(false)}
        onSuccess={() => {
          setBulkDeleteOpen(false);
          setSelectedRows([]);
          invalidateDns();
        }}
      />
    </div>
  );
}

// ─── 컴팩트 테넌트 pill (카드 축소 모드) ──────────────────────────────────
interface CompactTenantPillProps {
  name: string;
  count: number;
  selected: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function CompactTenantPill({ name, count, selected, onClick }: CompactTenantPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${name} · ${count.toLocaleString()}건`}
      className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition ${
        selected
          ? 'border-[#405189] bg-[#405189] text-white shadow-[0_0_0_2px_rgba(64,81,137,0.15)]'
          : 'border-gray-200 bg-white text-gray-700 hover:border-[#c5cbe0] hover:text-[#405189]'
      }`}
    >
      <span className="font-medium truncate max-w-[120px]">{name}</span>
      <span className={`text-[11px] ${selected ? 'text-white/80' : 'text-gray-400'}`}>{count.toLocaleString()}</span>
    </button>
  );
}
