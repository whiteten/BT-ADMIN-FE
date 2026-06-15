/**
 * BE INSIGHT ChannelDetailWidget(`widgetType = "channel-detail"`) 응답 row 타입.
 *
 * 레거시 SWAT `sleeSipSystemChannelStatus.jsp` 의 Redis row(`CH:IVR:{SYSTEM_ID}`,
 * DS_SLEE_CH_STATE)와 1:1 매핑. BE 는 Redis 값을 그대로 직렬화 + SYSTEM_NAME 조인만 적용.
 * 모든 필드는 선택적.
 */
export interface ChannelRow {
  // ─── 식별 / 시스템 ─────────────────────────────────────────────
  CENTER_ID?: number | string;
  SYSTEM_ID?: number | string;
  /** BE 가 TB_CC_SYSTEMMASTER 에서 조인한 시스템명 (없으면 FE 가 `SLEE {id}` 폴백). */
  SYSTEM_NAME?: string;
  /** 1:TDM · 2:SIP */
  IR_TYPE?: number | string;
  /** SLEE 채널 번호 (Hash field). */
  CHNL_NO?: number | string;
  SLEE_CH?: number | string;

  // ─── 상태 ─────────────────────────────────────────────────────
  /** 채널 서비스 상태 (0:초기·1:대기·2:인입·3:점유·4:O/B·5:종료·6:블럭·7:해제·8:경고·9:에러). */
  CHNL_STATUS?: number | string;
  /** (신규) 미디어 타입 — 0:Voice·1:Web·2:Chat. */
  MEDIA_TYPE?: number | string;
  /** (신규) 진입 경로 — 0:Unknown·10:Call gate·20:T전화·30:SMS. */
  ENTRY_PATH?: number | string;
  /** INOUT_KIND — 10:OUT·20:IN·30:BOTH (Bulk용). */
  INOUT_KIND?: number | string;
  /** 프로토콜 — 1:sip·2:nocc 등 (Bulk용). */
  PROTOCOL?: number | string;

  // ─── 서비스 / 호 컨텍스트 ──────────────────────────────────────
  SERVICE_ID?: number | string;
  /** BE 가 TB_IR_SERVICEMASTER 에서 조인한 시나리오명 (SERVICE_ID 매핑). */
  SERVICE_NAME?: string;
  /** BE 가 TB_IR_SERVICEMENU 에서 조인한 현재 메뉴명 ((SYSTEM_ID, SERVICE_ID, CHNL_MENUSEQ) 매핑). */
  MENU_NAME?: string;
  SERVICE_DNIS?: string;
  SERVICE_ANI?: string;
  ORG_DNIS?: string;
  UCID?: string;
  TENANT_ID?: number | string;

  // ─── 신선도 ───────────────────────────────────────────────────
  DB_UPDATE_TIME?: number | string;

  [extra: string]: unknown;
}

/** 시스템(SLEE)별 채널 그룹 + 점유 집계. */
export interface SystemGroup {
  systemId: number;
  systemName: string;
  /** 1:TDM · 2:SIP (그룹 첫 행 기준). */
  irType: number | null;
  rows: ChannelRow[];
  total: number;
  busy: number;
  inBusy: number;
  outBusy: number;
  /** 장애·경고 채널수 (CHNL_STATUS 8·9). */
  errCnt: number;
  /** 점유율 % (busy / total · 0~100). */
  occPct: number;
  /** 인바운드 점유율 % (inBusy / total). */
  inPct: number;
}

/**
 * 영속화 UI 상태 — localStorage `bt-admin.insight.monitoring.widget.{widgetId}.ui` 에 저장.
 * CtiqStatusWidget 와 같은 키 패턴.
 */
export interface ChannelUiState {
  /** 숨긴 상태코드 (레전드 칩 토글). */
  hiddenStatuses: number[];
  /** 선택 시스템(SLEE) ID — null 이면 점유율 1위 시스템 자동 선택. */
  systemId: number | null;
  /** KPI Strip 접기. */
  summaryCollapsed: boolean;
}
