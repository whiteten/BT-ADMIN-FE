/**
 * 시나리오 분석 결과 (AS-IS IPR20S6050 시나리오별 메뉴관리, IPR20S6070 시나리오 코드관리,
 * IPR20S6075 트래킹 아이템 관리, IPR20S6076 트래킹 패킷전문 관리, IPR20S6077 사용자정의통계 관리).
 * 시나리오 업로드 시점 SXML 분석으로 적재된 데이터 — 주요서비스(majorYn)만 예외적으로 편집 가능,
 * 나머지는 모두 읽기 전용.
 */

/** 서비스 메뉴 트리 행 (TB_IR_SERVICEMENU). */
export interface ScenarioAnalysisMenuRow {
  serviceId: number;
  serviceVer: string;
  menuId: string;
  menuName: string | null;
  priorMenuId: string | null;
  sortSeq: number | null;
  menuDepth: number | null;
  custMenu: string | null;
  menuFilter: string | null;
  /** 현재 활성 버전 표시 — 1=활성, 0=이전. */
  lastFlag: number | null;
  /** 메뉴 표시 여부(ON_OFF_STATUS 공통코드 기준) — 0=OFF, 1=ON. 분석 시점엔 항상 0(OFF)으로만 저장됨(AS-IS 동일). */
  visibleYn: number | null;
  /** 주요서비스 여부 — 0=아니오, 1=예. 분석 후 이 화면에서 운영자가 행 더블클릭 → 수정 Drawer로 편집. */
  majorYn: number | null;
  version: string | null;
  workUser: number | null;
  workTime: string | null;
}

/** 서비스 코드 항목 행 (TB_IR_SERVICECODEITEM). */
export interface ScenarioAnalysisCodeRow {
  serviceId: number;
  serviceVer: string;
  serviceCode: string;
  serviceCodeName: string | null;
  serviceDesc: string | null;
}

/** 트래킹 아이템 행 (TB_IR_SVCTRACKINGITEM, AS-IS IPR20S6075). */
export interface ScenarioAnalysisTrackingItemRow {
  serviceId: number;
  serviceVer: string;
  itemCode: string;
  /** 1=getDigit, 2=mentPlay, 3=packet, 4=cti, 5=query, 6=userdef, 99=공통 (AS-IS IR_TRACKING_ITEM_TYPE). */
  itemType: number | null;
  itemName: string | null;
  itemDesc: string | null;
}

/** 패킷 마스터 행 (TB_IR_PACKETMASTER, AS-IS IPR20S6076 좌측 그리드). */
export interface ScenarioAnalysisPacketRow {
  serviceId: number;
  serviceVer: string;
  packetId: string;
  packetName: string | null;
  commPacketId: string | null;
}

/** 패킷 항목 행 (TB_IR_PACKETITEM, AS-IS IPR20S6076 우측 그리드). */
export interface ScenarioAnalysisPacketItemRow {
  serviceId: number;
  serviceVer: string;
  packetId: string;
  sendRecv: string | null;
  itemSeq: number | null;
  repeatSeq: number | null;
  itemName: string | null;
  itemDesc: string | null;
  length: string | null;
  fill: string | null;
  align: string | null;
  defaultValue: string | null;
  encryptYn: number | null;
  responseCode: string | null;
}

/** 사용자정의통계 카테고리 행 (TB_IR_USERSTATCATEGORY, AS-IS IPR20S6077 좌측 그리드). */
export interface ScenarioAnalysisUserStatCategoryRow {
  serviceId: number;
  serviceVer: string;
  categoryId: string;
  categoryName: string | null;
  categoryDesc: string | null;
}

/** 사용자정의통계 항목 행 (TB_IR_USERSTATITEM, AS-IS IPR20S6077 우측 그리드). */
export interface ScenarioAnalysisUserStatItemRow {
  serviceId: number;
  serviceVer: string;
  categoryId: string;
  itemSeq: number | null;
  itemName: string | null;
  itemDesc: string | null;
}
