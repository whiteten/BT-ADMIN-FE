/**
 * 교환기 번호자원 현황 — 페이지 셸 (menuKey ipron-dn-status, route /ipron/dn-status).
 *
 * IPRON 표준 2단 + 드릴다운 재설계(2026-06-16 검수 반영):
 *  [1층] 전역 KPI 배너 (노드 무관 집계) — 로딩 중에도 항상 노출.
 *  [2층] 노드별 카드 가로 슬라이더 (클러스터 그룹 박스). 카드 단일 클릭 → 하단 상세 패널.
 *  [3층] 하단 전폭 인라인 상세 패널 (탭 4종) — 우측 540px 사이드바 폐기. DN 목록 그리드가 화면 전폭 사용.
 *
 * 진입 즉시 첫 노드 자동 선택(빈 보이드 최소화). 데이터 = BE 집계 7엔드포인트 + TanStack Query(계약 그대로).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import DnNodeCardSlider from '../../features/dn-status/components/DnNodeCardSlider';
import DnStatusDetailPanel from '../../features/dn-status/components/DnStatusDetailPanel';
import DnStatusKpiBanner from '../../features/dn-status/components/DnStatusKpiBanner';
import { useDnStatusDrLinks, useDnStatusGdnStats, useDnStatusNodes } from '../../features/dn-status/hooks/useDnStatusQueries';
import type { SidebarTab } from '../../features/dn-status/types';
import { bucketByCluster, buildKpi, buildNodeCard } from '../../features/dn-status/utils/buildModels';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const breadcrumb = [{ title: '번호자원관리' }, { title: '교환기 번호관리' }, { title: '번호자원현황', path: '/ipron/dn-status' }];

export default function DnResourceStatus() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  // ── 상태 ──────────────────────────────────────────────────────────────
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
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

  const selectedNode = useMemo(() => nodes.find((n) => n.nodeId === selectedNodeId) ?? null, [nodes, selectedNodeId]);

  // ── 모델 합성 (1층 KPI / 2층 카드 / 클러스터 버킷) ──────────────────────
  const kpi = useMemo(() => buildKpi({ nodes, gdnStats, common: overview?.common }), [nodes, gdnStats, overview]);
  const cards = useMemo(() => nodes.map((n) => buildNodeCard(n, gdnStats, drLinks)), [nodes, gdnStats, drLinks]);
  const buckets = useMemo(() => bucketByCluster(cards), [cards]);

  // ── 첫 노드 자동 선택 (진입 직후 빈 보이드 최소화) ─────────────────────
  useEffect(() => {
    if (selectedNodeId == null && nodes.length > 0) setSelectedNodeId(nodes[0].nodeId);
  }, [nodes, selectedNodeId]);

  // ── 인터랙션 ───────────────────────────────────────────────────────────
  // 카드 단일 클릭 → 개요 탭으로 상세 패널 전환(재선택은 노드 컨텍스트만 교체, 탭/링크 초기화).
  const handleSelectNode = useCallback((nodeId: number, el: HTMLElement) => {
    setSelectedNodeId(nodeId);
    setDetailTab('overview');
    setDrLink(null);
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedNodeId(null);
    setDrLink(null);
  }, []);

  const handleRefresh = useCallback(() => {
    nodesQuery.refetch();
    drQuery.refetch();
    gdnQuery.refetch();
  }, [nodesQuery, drQuery, gdnQuery]);

  const isLoading = nodesQuery.isLoading || drQuery.isLoading || gdnQuery.isLoading;
  const isError = nodesQuery.isError;
  const isEmpty = !isLoading && nodes.length === 0;

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {/* 1층 — 전역 KPI 배너 (로딩 중에도 항상 노출) */}
      <DnStatusKpiBanner
        kpi={kpi}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
        onRefresh={handleRefresh}
        lastUpdated={nodesQuery.dataUpdatedAt}
      />

      {/* 2층 — 노드 카드 슬라이더 (스피너는 이 영역에만) */}
      {isLoading ? (
        <div className="bg-white bt-shadow flex min-h-[180px] flex-shrink-0 items-center justify-center">
          <FallbackSpinner />
        </div>
      ) : isError ? (
        <div className="bg-white bt-shadow flex min-h-[180px] flex-shrink-0 items-center justify-center text-sm text-gray-400">번호자원 현황을 불러오지 못했습니다.</div>
      ) : (
        <DnNodeCardSlider buckets={buckets} selectedNodeId={selectedNodeId} onSelectNode={handleSelectNode} isEmpty={isEmpty} />
      )}

      {/* 3층 — 하단 전폭 인라인 상세 패널 */}
      {!isLoading && !isError && (
        <DnStatusDetailPanel
          node={selectedNode}
          tab={detailTab}
          drLink={drLink}
          drLinks={drLinks}
          gdnStats={gdnStats}
          onClose={closeDetail}
          onTabChange={setDetailTab}
          onSelectDrLink={(from, to) => setDrLink({ fromNodeId: from, toNodeId: to })}
          onClearDrLink={() => setDrLink(null)}
        />
      )}
    </div>
  );
}
