/**
 * 교환기 번호자원 현황 — 페이지 셸 (menuKey ipron-dn-status, route /ipron/dn-status).
 *
 * 목업 A(dn-resource-status.html) "서버 카드 구성도 + 우측 사이드바" 1:1 본개발.
 * 시각화 = @xyflow/react(손-SVG 교체), 데이터 = BE 집계 7엔드포인트 + TanStack Query.
 * 레이아웃: 상단 HUD + 본문(react-flow 캔버스 + 우측 슬라이드 사이드바). IPRON 셸 하위 h-full fill.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Empty } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import DnStatusHud from '../../features/dn-status/components/DnStatusHud';
import DnStatusSidebar from '../../features/dn-status/components/DnStatusSidebar';
import DnTopologyCanvas from '../../features/dn-status/components/DnTopologyCanvas';
import { useDnStatusDrLinks, useDnStatusGdnStats, useDnStatusNodes } from '../../features/dn-status/hooks/useDnStatusQueries';
import type { DnTypeKey, SidebarTab } from '../../features/dn-status/types';
import { buildEdges, buildNodes } from '../../features/dn-status/utils/buildGraph';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const breadcrumb = [
  { title: '교환기 번호관리', path: '/ipron/dn-status' },
  { title: '번호자원현황', path: '/ipron/dn-status' },
];

/** 사이드바 콜백이 받는 tab/타입 인자 → (탭, dnListType) 분해 */
function resolveTarget(target: string): { tab: SidebarTab; dnListType?: DnTypeKey } {
  if (target === 'overview') return { tab: 'overview' };
  if (target === 'gflag') return { tab: 'dnlist', dnListType: 'gflag' };
  // 자원행 타입키(edn/tdn/gdn-acd/gdn-ctiq/gdn-sip) → DN 목록 탭
  return { tab: 'dnlist', dnListType: target as DnTypeKey };
}

export default function DnResourceStatus() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ── 상태 ──────────────────────────────────────────────────────────────
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [globalEmphasis, setGlobalEmphasis] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('overview');
  const [dnListType, setDnListType] = useState<DnTypeKey>('edn');
  const [drLink, setDrLink] = useState<{ fromNodeId: number; toNodeId: number } | null>(null);

  // ── 쿼리 ──────────────────────────────────────────────────────────────
  const nodesQuery = useDnStatusNodes({ autoRefresh });
  const drQuery = useDnStatusDrLinks({ autoRefresh });
  const gdnQuery = useDnStatusGdnStats({ autoRefresh });

  const overview = nodesQuery.data;
  const drLinks = useMemo(() => drQuery.data ?? [], [drQuery.data]);
  const gdnStats = useMemo(() => gdnQuery.data ?? [], [gdnQuery.data]);
  const nodes = useMemo(() => overview?.nodes ?? [], [overview]);

  const selectedNode = useMemo(() => nodes.find((n) => n.nodeId === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  // ── 인터랙션 ───────────────────────────────────────────────────────────
  const openSidebar = useCallback((nodeId: number, target: string) => {
    const { tab, dnListType: dlt } = resolveTarget(target);
    setSelectedNodeId(nodeId);
    setSidebarTab(tab);
    if (dlt) setDnListType(dlt);
    setDrLink(null);
    setSidebarOpen(true);
  }, []);

  const openDrFromEdge = useCallback((fromNodeId: number, toNodeId: number) => {
    // 엣지 클릭 → DR 탭 + 링크 상세. 기준 노드 = from (송출측)
    setSelectedNodeId(fromNodeId);
    setSidebarTab('dr');
    setDrLink({ fromNodeId, toNodeId });
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSelectedNodeId(null);
    setDrLink(null);
  }, []);

  // ── react-flow 노드/엣지 ────────────────────────────────────────────────
  const rfNodes = useMemo(
    () =>
      buildNodes({
        nodes,
        drLinks,
        gdnStats,
        globalEmphasis,
        selectedNodeId,
        onOpenSidebar: openSidebar,
      }),
    [nodes, drLinks, gdnStats, globalEmphasis, selectedNodeId, openSidebar],
  );
  const rfEdges = useMemo(() => buildEdges(drLinks), [drLinks]);

  const handleRefresh = useCallback(() => {
    nodesQuery.refetch();
    drQuery.refetch();
    gdnQuery.refetch();
  }, [nodesQuery, drQuery, gdnQuery]);

  const isLoading = nodesQuery.isLoading || drQuery.isLoading || gdnQuery.isLoading;
  const isError = nodesQuery.isError;
  const isEmpty = !isLoading && nodes.length === 0;

  return (
    <div className="flex h-full w-full flex-col">
      <DnStatusHud
        common={overview?.common}
        globalEmphasis={globalEmphasis}
        onToggleGlobalEmphasis={() => setGlobalEmphasis((v) => !v)}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
        onRefresh={handleRefresh}
        lastUpdated={nodesQuery.dataUpdatedAt}
      />

      {/* 본문 = 캔버스 + 사이드바 (relative — 사이드바 absolute 기준) */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <FallbackSpinner />
        ) : isError ? (
          <div className="flex h-full items-center justify-center">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="번호자원 현황을 불러오지 못했습니다." />
          </div>
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 PBX 노드가 없습니다." />
          </div>
        ) : (
          <ReactFlowProvider>
            <DnTopologyCanvas nodes={rfNodes} edges={rfEdges} onEdgeOpen={openDrFromEdge} onPaneClick={closeSidebar} />
          </ReactFlowProvider>
        )}

        <DnStatusSidebar
          open={sidebarOpen}
          node={selectedNode}
          tab={sidebarTab}
          dnListType={dnListType}
          drLink={drLink}
          drLinks={drLinks}
          gdnStats={gdnStats}
          onClose={closeSidebar}
          onTabChange={setSidebarTab}
          onSelectDrLink={(from, to) => setDrLink({ fromNodeId: from, toNodeId: to })}
          onClearDrLink={() => setDrLink(null)}
        />
      </div>
    </div>
  );
}
