/**
 * 시나리오 분석 결과 (AS-IS IPR20S6050 시나리오별 메뉴관리, IPR20S6070 시나리오 코드관리).
 * 시나리오 업로드 시점 SXML 분석으로 적재된 데이터 — 주요서비스(majorYn)만 예외적으로 편집 가능.
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
