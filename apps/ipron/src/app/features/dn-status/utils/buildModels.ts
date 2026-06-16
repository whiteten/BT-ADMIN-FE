/**
 * nodes + gdnStats + drLinks → 1층 KPI 합산 + 2층 노드 카드 모델 + 클러스터 버킷.
 *
 * react-flow buildGraph.ts 대체. 좌표/엣지 생성 없음 — 순수 데이터 합성만.
 *  - KPI(1층): 전 노드 dnTypes·gdnStats·globalDn 합산 + common.adn*.
 *  - 노드 카드(2층): 노드별 내선/SIP트렁크 채널 할당, GDN 3종 건수, GlobalDN 합계, DR 수용 파트너.
 *  - 클러스터 버킷: nodes[].clusterGrpId/Name 으로 묶음(미소속 = 단독 버킷).
 */
import type { DnStatusKpi } from '../components/DnStatusKpiBanner';
import { type CommonResourceStat, type DnNodeCardModel, type DnStatusKpiSource, type DnStatusNode, type DrLink, GDN_TYPE_TO_KEY, type GdnTypeStat } from '../types';

export interface ClusterBucket {
  clusterGrpId: number | null;
  clusterGrpName: string | null;
  cards: DnNodeCardModel[];
}

/** 노드의 GDN 3종 건수 추출 (gdnStats 매칭) */
function gdnCountsForNode(nodeId: number, gdnStats: GdnTypeStat[]): { acd: number; ctiq: number; sip: number; globalDn: number } {
  let acd = 0;
  let ctiq = 0;
  let sip = 0;
  let globalDn = 0;
  for (const g of gdnStats) {
    if (g.nodeId !== nodeId) continue;
    const key = GDN_TYPE_TO_KEY[g.gdnType];
    if (key === 'gdn-acd') acd += g.total;
    else if (key === 'gdn-ctiq') ctiq += g.total;
    else if (key === 'gdn-sip') sip += g.total;
    globalDn += g.globalDnCount;
  }
  return { acd, ctiq, sip, globalDn };
}

/** 노드 1개의 카드 모델 합성 */
export function buildNodeCard(node: DnStatusNode, gdnStats: GdnTypeStat[], drLinks: DrLink[]): DnNodeCardModel {
  const edn = node.dnTypes.find((t) => t.typeKey === 'edn');
  const tdn = node.dnTypes.find((t) => t.typeKey === 'tdn');
  const ednStat = { total: edn?.total ?? 0, assigned: edn?.assigned ?? 0 };
  const tdnStat = { total: tdn?.total ?? 0, assigned: tdn?.assigned ?? 0 };
  const gdn = gdnCountsForNode(node.nodeId, gdnStats);

  // DR 수용(인바운드): 이 노드가 백업(to) — 송출(from) 파트너 + 건수
  const drPartners = drLinks.filter((l) => l.toNodeId === node.nodeId && l.totalCount > 0).map((l) => ({ nodeId: l.fromNodeId, nodeName: l.fromNodeName, count: l.totalCount }));

  return {
    nodeId: node.nodeId,
    nodeName: node.nodeName,
    clusterGrpId: node.clusterGrpId,
    clusterGrpName: node.clusterGrpName,
    // 등록 DN = 이 노드 dnTypes total 합(내선+SIP트렁크 채널+그룹DN 예약+기타) — 배너·상세 도넛과 동일 정의(합 일치)
    totalDn: node.dnTypes.reduce((sum, t) => sum + t.total, 0),
    edn: ednStat,
    tdn: tdnStat,
    gdnAcd: gdn.acd,
    gdnCtiq: gdn.ctiq,
    gdnSip: gdn.sip,
    // GlobalDN 노드 합계 = DN_MASTER globalDnTotal + GDN_MASTER 측(gdnGlobalDnTotal)
    globalDnTotal: node.globalDnTotal + node.gdnGlobalDnTotal,
    drPartners,
  };
}

/** 노드 카드들을 클러스터 단위 버킷으로 묶음 (미소속 = 각각 단독 버킷) */
export function bucketByCluster(cards: DnNodeCardModel[]): ClusterBucket[] {
  const grouped = new Map<number, ClusterBucket>();
  const solo: ClusterBucket[] = [];
  for (const c of cards) {
    if (c.clusterGrpId == null) {
      solo.push({ clusterGrpId: null, clusterGrpName: null, cards: [c] });
    } else {
      const existing = grouped.get(c.clusterGrpId);
      if (existing) existing.cards.push(c);
      else grouped.set(c.clusterGrpId, { clusterGrpId: c.clusterGrpId, clusterGrpName: c.clusterGrpName, cards: [c] });
    }
  }
  return [...grouped.values(), ...solo];
}

/**
 * 1층 전역 KPI 합산 (전 노드 + common) — 합 일치 보장.
 *
 *  - registeredDn = 전 노드 dnTypes total 합(내선 11 + SIP트렁크 채널 13 + 그룹DN 예약 14 + PARK/AA 등).
 *    배너 분해(ednTotal + tdnTotal + gdnReservedTotal + otherDnTotal) = registeredDn (항등).
 *  - 그룹DN(GDN_MASTER) 건수(gdnMasterTotal, ACD/CTI큐/SIP트렁크)는 registeredDn 과 별개 자원.
 *  - 할당률은 배너에서 내선(11) 기준으로 계산(ednTotal/ednAssigned 만 전달).
 *  - GlobalDN 전역 = 전 노드 GlobalDN 합(노드 카드 값의 합 = 전역, 부분/전체 관계 명확).
 */
export function buildKpi(source: DnStatusKpiSource): DnStatusKpi {
  const { nodes, gdnStats, common } = source;
  let ednTotal = 0;
  let ednAssigned = 0;
  let tdnTotal = 0;
  let gdnReservedTotal = 0;
  let registeredDn = 0; // 전 노드 dnTypes total 합
  let globalDnTotal = 0;
  for (const n of nodes) {
    for (const t of n.dnTypes) {
      if (t.typeKey === 'edn') {
        ednTotal += t.total;
        ednAssigned += t.assigned;
      } else if (t.typeKey === 'tdn') {
        tdnTotal += t.total;
      } else if (t.typeKey === 'gdnReserved') {
        gdnReservedTotal += t.total;
      }
      registeredDn += t.total;
    }
    globalDnTotal += n.globalDnTotal + n.gdnGlobalDnTotal;
  }
  // 합 일치 보정: 분해 3종에 안 잡힌 잔여(PARK/AA 등) = 기타
  const otherDnTotal = Math.max(0, registeredDn - ednTotal - tdnTotal - gdnReservedTotal);

  // 그룹DN(GDN_MASTER) — 별개 자원 (16 ACD / 17 CTI큐 / 18 SIP트렁크)
  let gdnAcd = 0;
  let gdnCtiq = 0;
  let gdnSip = 0;
  for (const g of gdnStats) {
    const key = GDN_TYPE_TO_KEY[g.gdnType];
    if (key === 'gdn-acd') gdnAcd += g.total;
    else if (key === 'gdn-ctiq') gdnCtiq += g.total;
    else if (key === 'gdn-sip') gdnSip += g.total;
  }
  const gdnMasterTotal = gdnAcd + gdnCtiq + gdnSip;

  return {
    registeredDn,
    ednTotal,
    ednAssigned,
    tdnTotal,
    gdnReservedTotal,
    otherDnTotal,
    gdnMasterTotal,
    gdnAcd,
    gdnCtiq,
    gdnSip,
    globalDnTotal,
    adnTotal: common?.adnTotal ?? 0,
    adnAssigned: common?.adnAssigned ?? 0,
  };
}

export type { CommonResourceStat };
