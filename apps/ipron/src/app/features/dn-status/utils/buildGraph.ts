/**
 * nodes + drLinks + clusters → react-flow Node[]/Edge[] 변환 (PLAN-FE §4·§7.2).
 *
 * 목업의 손-SVG CARD_BASE/renderClusterBoxes/renderDrSvg 를 react-flow 모델로 옮긴다:
 *  - 서버 카드 = 커스텀 노드(type 'dnServerCard'), 클러스터 = group 노드(type 'group', 자식 parentId).
 *  - DR = 엣지(쌍당 방향 1개). 같은 쌍 양방향이면 2 엣지(반대 곡률).
 *  - 레이아웃: 클러스터별 가로 배치(카드폭 360 + gap), 미소속 노드 단독. 초기 fitView 가 화면 맞춤.
 *  - dagre 미도입(노드 수 적음 — 스코프 규율).
 */
import { type Edge, MarkerType, type Node } from '@xyflow/react';
import type { DnServerCardData } from '../components/nodes/DnServerCardNode';
import { type DnStatusNode, type DrLink, GDN_TYPE_TO_KEY, type GdnTypeStat } from '../types';

// 카드/레이아웃 치수 (목업 CARD_W 360 + gap 계승)
const CARD_W = 360;
const GAP_X = 56; // 카드 간 수평 간격 (클러스터 내부)
const CLUSTER_GAP_X = 120; // 클러스터(또는 단독 노드) 그룹 간 간격
const GROUP_PAD = 16; // group 박스 패딩 (목업 PAD 14 + 여유)
const GROUP_LABEL_H = 22; // group 라벨 공간 (목업 라벨 16 + 여유)
const CARD_EST_H = 360; // 카드 예상 높이(헤더+자원행 5~6 + GDN 3 + 플래그) — group 박스/엣지 y 기준
const ROW_TOP = 60; // group 박스 상단 여백

export interface GraphInput {
  nodes: DnStatusNode[];
  drLinks: DrLink[];
  gdnStats: GdnTypeStat[];
  /** GlobalDN 강조 토글 상태 — 노드 카드에 전달 */
  globalEmphasis: boolean;
  /** 현재 선택 노드 id (active 강조) */
  selectedNodeId: number | null;
  /** 노드 카드 인터랙션 콜백 — RF data 에 주입(AOE onCopy 패턴) */
  onOpenSidebar: (nodeId: number, tab: 'overview' | DnServerCardData['gdnRows'][number]['key'] | string) => void;
}

interface ClusterBucket {
  clusterGrpId: number | null;
  clusterGrpName: string | null;
  nodes: DnStatusNode[];
}

/** 노드들을 클러스터 단위로 묶음 (미소속 = 각각 단독 버킷, 빈 그룹 미표시) */
function bucketByCluster(nodes: DnStatusNode[]): ClusterBucket[] {
  const grouped = new Map<number, ClusterBucket>();
  const solo: ClusterBucket[] = [];
  for (const n of nodes) {
    if (n.clusterGrpId == null) {
      solo.push({ clusterGrpId: null, clusterGrpName: null, nodes: [n] });
    } else {
      const existing = grouped.get(n.clusterGrpId);
      if (existing) existing.nodes.push(n);
      else grouped.set(n.clusterGrpId, { clusterGrpId: n.clusterGrpId, clusterGrpName: n.clusterGrpName, nodes: [n] });
    }
  }
  return [...grouped.values(), ...solo];
}

/** ④ gdnStats 에서 노드별 GDN 3행(ACD/CTI큐/SIP트렁크) 추출 */
function gdnRowsForNode(nodeId: number, gdnStats: GdnTypeStat[]): DnServerCardData['gdnRows'] {
  return gdnStats
    .filter((g) => g.nodeId === nodeId && GDN_TYPE_TO_KEY[g.gdnType])
    .map((g) => ({
      key: GDN_TYPE_TO_KEY[g.gdnType],
      label: g.typeLabel,
      total: g.total,
      globalDnCount: g.globalDnCount,
      backupCount: g.backupCount,
    }));
}

/**
 * RF 노드 빌드. 클러스터 group 노드는 자식보다 먼저 배열에 두어야 react-flow 가 부모를 먼저 마운트.
 */
export function buildNodes(input: GraphInput): Node[] {
  const { nodes, gdnStats, globalEmphasis, selectedNodeId, onOpenSidebar } = input;
  const buckets = bucketByCluster(nodes);
  const groupNodes: Node[] = [];
  const cardNodes: Node[] = [];

  let cursorX = 0;
  for (const bucket of buckets) {
    const isCluster = bucket.clusterGrpId != null;
    const innerW = bucket.nodes.length * CARD_W + (bucket.nodes.length - 1) * GAP_X;
    const groupW = innerW + GROUP_PAD * 2;
    const groupH = CARD_EST_H + GROUP_PAD * 2 + GROUP_LABEL_H;

    if (isCluster) {
      groupNodes.push({
        id: `cluster-${bucket.clusterGrpId}`,
        type: 'dnCluster',
        position: { x: cursorX, y: ROW_TOP - GROUP_LABEL_H - GROUP_PAD },
        data: { label: bucket.clusterGrpName ?? `클러스터 ${bucket.clusterGrpId}` },
        draggable: false,
        selectable: false,
        style: { width: groupW, height: groupH },
      });
    }

    bucket.nodes.forEach((n, idx) => {
      const localX = GROUP_PAD + idx * (CARD_W + GAP_X);
      const data: DnServerCardData = {
        nodeId: n.nodeId,
        nodeName: n.nodeName,
        dnTypes: n.dnTypes,
        scaCount: n.scaCount,
        globalDnTotal: n.globalDnTotal,
        globalDnAssigned: n.globalDnAssigned,
        gdnGlobalDnTotal: n.gdnGlobalDnTotal,
        gdnRows: gdnRowsForNode(n.nodeId, gdnStats),
        globalEmphasis,
        active: selectedNodeId === n.nodeId,
        onOpenSidebar,
      };
      cardNodes.push(
        isCluster
          ? {
              id: `node-${n.nodeId}`,
              type: 'dnServerCard',
              position: { x: localX, y: GROUP_LABEL_H + GROUP_PAD },
              parentId: `cluster-${bucket.clusterGrpId}`,
              extent: 'parent',
              draggable: false,
              selectable: true,
              data,
            }
          : {
              id: `node-${n.nodeId}`,
              type: 'dnServerCard',
              position: { x: cursorX + localX, y: ROW_TOP },
              draggable: false,
              selectable: true,
              data,
            },
      );
    });

    cursorX += groupW + CLUSTER_GAP_X;
  }

  return [...groupNodes, ...cardNodes];
}

/**
 * RF 엣지 빌드 (DR 링크). drLinks 행 = 방향 1개. 같은 노드쌍 양방향이면 2 엣지(곡률 반대).
 * GDN = gdnReservedCount + gdnMasterCount 합산 라벨(IMPL-BE §②).
 */
export function buildEdges(drLinks: DrLink[]): Edge[] {
  // 같은 노드쌍(정규화 키)에 양방향이 있으면 위/아래로 분리하기 위해 방향 집합 파악
  const pairDirs = new Map<string, Set<string>>();
  for (const l of drLinks) {
    const key = [l.fromNodeId, l.toNodeId].sort((a, b) => a - b).join('-');
    if (!pairDirs.has(key)) pairDirs.set(key, new Set());
    pairDirs.get(key)!.add(`${l.fromNodeId}>${l.toNodeId}`);
  }

  return drLinks.map((l) => {
    const gdnTotal = l.gdnReservedCount + l.gdnMasterCount;
    const parts: string[] = [];
    if (l.ednCount > 0) parts.push(`내선 ${l.ednCount}`);
    if (l.tdnCount > 0) parts.push(`SIP트렁크 채널 ${l.tdnCount}`);
    if (l.scaCount > 0) parts.push(`SCA ${l.scaCount}`);
    if (gdnTotal > 0) parts.push(`GDN ${gdnTotal}`);
    const label = parts.length > 0 ? `DR ${parts.join(' · ')}` : `DR ${l.totalCount}`;

    const pairKey = [l.fromNodeId, l.toNodeId].sort((a, b) => a - b).join('-');
    const bidirectional = (pairDirs.get(pairKey)?.size ?? 0) > 1;
    // 양방향이면 from<to 방향을 위(음수 곡률), 반대 방향을 아래(양수 곡률)로 분리
    const isUpper = l.fromNodeId < l.toNodeId;

    return {
      id: `dr-${l.fromNodeId}-${l.toNodeId}`,
      source: `node-${l.fromNodeId}`,
      target: `node-${l.toNodeId}`,
      type: 'default',
      label,
      labelShowBg: true,
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      labelBgStyle: { fill: isUpper ? '#eef2ff' : '#dcfce7', stroke: isUpper ? '#6779b4' : '#4a9d6f' },
      labelStyle: { fill: isUpper ? '#405189' : '#166534', fontSize: 11, fontWeight: 600 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: isUpper ? '#6779b4' : '#4a9d6f' },
      style: { stroke: isUpper ? '#6779b4' : '#4a9d6f', strokeWidth: 1.5 },
      data: {
        ...l,
        bidirectional,
      },
    } satisfies Edge;
  });
}
