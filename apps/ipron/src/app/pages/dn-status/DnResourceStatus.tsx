/**
 * 교환기 번호자원 현황 — 페이지 셸 (menuKey ipron-dn-status, route /ipron/dn-status).
 *
 * 디자인 v2(2026-06-18) 레이아웃:
 *  [1층] 전역 KPI 배너 (등록DN 6종 분해 + GlobalDN 합산).
 *  [2층] 좌우 마스터-디테일:
 *    좌측 320px — PBX 노드 리스트 (첫 항목 "전체" + 클러스터 그룹 + NodeListItem). 단일 클릭 → 우측 상세.
 *    우측 flex-1  — DetailPanel (탭 3종: 개요/DR수용/번호대역).
 *
 * 진입 즉시 "전체" 선택(null = 전 노드 집계). 특정 노드 선택 시 그 노드 기준.
 * 데이터 = BE 집계 7엔드포인트 + TanStack Query.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Server } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import DnStatusDetailPanel from '../../features/dn-status/components/DnStatusDetailPanel';
import DnStatusKpiBanner from '../../features/dn-status/components/DnStatusKpiBanner';
import { useDnStatusDrLinks, useDnStatusGdnStats, useDnStatusNodes } from '../../features/dn-status/hooks/useDnStatusQueries';
import type { DnStatusNode, DrLink, GdnTypeStat, SidebarTab } from '../../features/dn-status/types';
import { buildKpi } from '../../features/dn-status/utils/buildModels';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: '번호자원현황', path: '/ipron/dn-status' }];

// ─── 노드 리스트 아이템 ──────────────────────────────────────────────────────

interface NodeListItemProps {
  node: DnStatusNode;
  gdnStats: GdnTypeStat[];
  drLinks: DrLink[];
  selected: boolean;
  onClick: () => void;
}

function NodeListItem({ node, gdnStats, drLinks, selected, onClick }: NodeListItemProps) {
  const edn = node.dnTypes.find((t) => t.typeKey === 'edn');
  const reg = node.dnTypes.reduce((s, t) => s + t.total, 0);
  const gtot = node.globalDnTotal + node.gdnGlobalDnTotal;
  const gdnCnt = gdnStats.filter((g) => g.nodeId === node.nodeId).reduce((s, g) => s + g.total, 0);
  const drInbound = drLinks.filter((l) => l.toNodeId === node.nodeId && l.totalCount > 0);
  const ednPct = edn && edn.total > 0 ? Math.round((edn.assigned / edn.total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
        selected ? 'border-[#405189] bg-[rgba(64,81,137,0.04)] shadow-[0_0_0_2px_rgba(64,81,137,0.13)]' : 'border-gray-200 bg-white hover:border-[#c5cbe0]'
      }`}
    >
      {/* 노드명 + 등록 DN */}
      <div className="flex items-center gap-1.5">
        <Server className={`size-3 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
        <span className={`truncate text-[12.5px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-800'}`}>{node.nodeName}</span>
        <span className="ml-auto flex-shrink-0 text-[10.5px] text-gray-500">
          등록 <b className="font-tabular text-gray-700">{reg.toLocaleString()}</b>
        </span>
      </div>

      {/* 내선 진행바 */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="w-7 flex-shrink-0 text-gray-400">내선</span>
        <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <span className="block h-full rounded-full" style={{ width: `${ednPct}%`, background: selected ? '#405189' : '#94a3b8' }} />
        </span>
        <span className="font-tabular w-[88px] flex-shrink-0 whitespace-nowrap text-right text-[10px] text-gray-500">
          {(edn?.assigned ?? 0).toLocaleString()} / {(edn?.total ?? 0).toLocaleString()} · {ednPct}%
        </span>
      </div>

      {/* GlobalDN + 그룹DN + DR칩 */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-0.5 text-violet-600">
          <span className="text-[9px]">◉</span>
          {gtot.toLocaleString()}
        </span>
        <span>그룹DN {gdnCnt.toLocaleString()}</span>
        {drInbound.length > 0 && <span className="ml-auto rounded-full bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-medium text-blue-700">DR 수용 {drInbound.length}</span>}
      </div>
    </button>
  );
}

// ─── 전체 노드 요약 아이템 ─────────────────────────────────────────────────────

interface AllNodeItemProps {
  nodes: DnStatusNode[];
  gdnStats: GdnTypeStat[];
  selected: boolean;
  onClick: () => void;
}

function AllNodeItem({ nodes, gdnStats, selected, onClick }: AllNodeItemProps) {
  let ednTotal = 0;
  let ednAssigned = 0;
  let regTotal = 0;
  let globalTotal = 0;
  let gdnTotal = 0;

  for (const n of nodes) {
    for (const t of n.dnTypes) {
      regTotal += t.total;
      if (t.typeKey === 'edn') {
        ednTotal += t.total;
        ednAssigned += t.assigned;
      }
    }
    globalTotal += n.globalDnTotal + n.gdnGlobalDnTotal;
  }
  for (const g of gdnStats) {
    gdnTotal += g.total;
  }

  const ednPct = ednTotal > 0 ? Math.round((ednAssigned / ednTotal) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
        selected ? 'border-[#405189] bg-[rgba(64,81,137,0.04)] shadow-[0_0_0_2px_rgba(64,81,137,0.13)]' : 'border-gray-200 bg-white hover:border-[#c5cbe0]'
      }`}
    >
      {/* 전체 + 등록 DN */}
      <div className="flex items-center gap-1.5">
        <Layers className={`size-3 flex-shrink-0 ${selected ? 'text-[#405189]' : 'text-gray-500'}`} />
        <span className={`truncate text-[12.5px] font-semibold ${selected ? 'text-[#405189]' : 'text-gray-800'}`}>전체</span>
        <span className="ml-auto flex-shrink-0 text-[10.5px] text-gray-500">
          등록 <b className="font-tabular text-gray-700">{regTotal.toLocaleString()}</b>
        </span>
      </div>

      {/* 내선 진행바 */}
      <div className="flex items-center gap-1.5 text-[10px]">
        <span className="w-7 flex-shrink-0 text-gray-400">내선</span>
        <span className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
          <span className="block h-full rounded-full" style={{ width: `${ednPct}%`, background: selected ? '#405189' : '#94a3b8' }} />
        </span>
        <span className="font-tabular w-[88px] flex-shrink-0 whitespace-nowrap text-right text-[10px] text-gray-500">
          {ednAssigned.toLocaleString()} / {ednTotal.toLocaleString()} · {ednPct}%
        </span>
      </div>

      {/* GlobalDN + 그룹DN */}
      <div className="flex items-center gap-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-0.5 text-violet-600">
          <span className="text-[9px]">◉</span>
          {globalTotal.toLocaleString()}
        </span>
        <span>그룹DN {gdnTotal.toLocaleString()}</span>
        <span className="ml-auto text-[9.5px] text-gray-400">{nodes.length}개 노드</span>
      </div>
    </button>
  );
}

// ─── 노드 리스트 패널 ─────────────────────────────────────────────────────────

interface NodeListProps {
  nodes: DnStatusNode[];
  gdnStats: GdnTypeStat[];
  drLinks: DrLink[];
  /** null = 전체 선택 */
  selectedId: number | null;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onSelect: (nodeId: number) => void;
}

function NodeListPanel({ nodes, gdnStats, drLinks, selectedId, isAllSelected, onSelectAll, onSelect }: NodeListProps) {
  // 클러스터 그룹 생성
  type NodeGroup = { key: string; name: string | null; isCluster: boolean; nodes: DnStatusNode[] };
  const groups = useMemo<NodeGroup[]>(() => {
    const map = new Map<string, NodeGroup>();
    for (const n of nodes) {
      const key = n.clusterGrpId != null ? `cl-${n.clusterGrpId}` : `solo-${n.nodeId}`;
      const existing = map.get(key);
      if (existing) {
        existing.nodes.push(n);
      } else {
        map.set(key, {
          key,
          name: n.clusterGrpName ?? (n.clusterGrpId != null ? `클러스터 ${n.clusterGrpId}` : null),
          isCluster: n.clusterGrpId != null,
          nodes: [n],
        });
      }
    }
    return [...map.values()];
  }, [nodes]);

  return (
    <div className="flex flex-col gap-3">
      {/* 전체 집계 항목 (항상 첫 번째) */}
      <AllNodeItem nodes={nodes} gdnStats={gdnStats} selected={isAllSelected} onClick={onSelectAll} />

      {/* 노드별 그룹 */}
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-1.5">
          {g.isCluster && g.name && (
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400">
              <span className="size-1.5 rounded-full bg-[#405189]" />
              {g.name}
            </span>
          )}
          {!g.isCluster && (
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-gray-400">
              <span className="size-1.5 rounded-full bg-gray-300" />
              단독 노드
            </span>
          )}
          {g.nodes.map((n) => (
            <NodeListItem key={n.nodeId} node={n} gdnStats={gdnStats} drLinks={drLinks} selected={!isAllSelected && selectedId === n.nodeId} onClick={() => onSelect(n.nodeId)} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── 페이지 ───────────────────────────────────────────────────────────────────

export default function DnResourceStatus() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ── 상태 ──────────────────────────────────────────────────────────────
  const [autoRefresh, setAutoRefresh] = useState(false);
  /** null = 전체 선택(전 노드 집계), 숫자 = 특정 노드 선택 */
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  /** true = "전체" 선택 상태 (selectedNodeId=null과 구분 — 초기값도 전체 선택) */
  const [isAllSelected, setIsAllSelected] = useState(true);
  const [detailTab, setDetailTab] = useState<SidebarTab>('overview');
  const [drLink, setDrLink] = useState<{ fromNodeId: number; toNodeId: number } | null>(null);

  // ── 쿼리 ──────────────────────────────────────────────────────────────
  const nodesQuery = useDnStatusNodes({ autoRefresh });
  const drQuery = useDnStatusDrLinks({ autoRefresh });
  const gdnQuery = useDnStatusGdnStats({ autoRefresh });

  const overview = nodesQuery.data;
  const drLinks = useMemo(() => drQuery.data ?? [], [drQuery.data]);
  const gdnStats = useMemo(() => gdnQuery.data ?? [], [gdnQuery.data]);
  const nodes = useMemo(() => overview?.nodes ?? [], [overview]);

  /** 선택된 노드(전체 선택이면 null) */
  const selectedNode = useMemo(
    () => (!isAllSelected && selectedNodeId != null ? (nodes.find((n) => n.nodeId === selectedNodeId) ?? null) : null),
    [nodes, selectedNodeId, isAllSelected],
  );

  // ── 모델 합성 ─────────────────────────────────────────────────────────
  const kpi = useMemo(() => buildKpi({ nodes, gdnStats, common: overview?.common }), [nodes, gdnStats, overview]);

  // ── 인터랙션 ───────────────────────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    setIsAllSelected(true);
    setSelectedNodeId(null);
    setDetailTab('overview');
    setDrLink(null);
  }, []);

  const handleSelectNode = useCallback((nodeId: number) => {
    setIsAllSelected(false);
    setSelectedNodeId(nodeId);
    setDetailTab('overview');
    setDrLink(null);
  }, []);

  const handleRefresh = useCallback(() => {
    void nodesQuery.refetch();
    void drQuery.refetch();
    void gdnQuery.refetch();
  }, [nodesQuery, drQuery, gdnQuery]);

  const isLoading = nodesQuery.isLoading || drQuery.isLoading || gdnQuery.isLoading;
  const isError = nodesQuery.isError;

  return (
    <div className="flex h-full w-full flex-col gap-3.5">
      {/* 1층 — 전역 KPI 배너 */}
      <DnStatusKpiBanner
        kpi={kpi}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
        onRefresh={handleRefresh}
        lastUpdated={nodesQuery.dataUpdatedAt}
      />

      {/* 2층 — 좌우 마스터-디테일 */}
      <div className="flex min-h-0 flex-1 gap-3.5">
        {/* 좌측 노드 리스트 패널 (320px 고정) */}
        <div className="bg-white bt-shadow flex w-[320px] flex-shrink-0 flex-col overflow-hidden">
          <div className="flex h-[46px] flex-shrink-0 items-center border-b border-gray-200 px-3.5 text-[12.5px] font-bold">
            PBX 노드
            <span className="ml-1.5 text-[12px] font-normal text-gray-400">· {nodes.length}개</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
            {isLoading ? (
              <div className="flex min-h-[150px] items-center justify-center">
                <FallbackSpinner />
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-[12px] text-gray-400">노드 정보를 불러오지 못했습니다.</div>
            ) : nodes.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-gray-400">표시할 PBX 노드가 없습니다.</div>
            ) : (
              <NodeListPanel
                nodes={nodes}
                gdnStats={gdnStats}
                drLinks={drLinks}
                selectedId={selectedNodeId}
                isAllSelected={isAllSelected}
                onSelectAll={handleSelectAll}
                onSelect={handleSelectNode}
              />
            )}
          </div>
        </div>

        {/* 우측 상세 패널 */}
        {!isLoading && !isError && (
          <DnStatusDetailPanel
            node={selectedNode}
            tab={detailTab}
            drLink={drLink}
            drLinks={drLinks}
            gdnStats={gdnStats}
            allNodes={nodes}
            onTabChange={setDetailTab}
            onSelectDrLink={(from, to) => setDrLink({ fromNodeId: from, toNodeId: to })}
            onClearDrLink={() => setDrLink(null)}
          />
        )}
      </div>
    </div>
  );
}
