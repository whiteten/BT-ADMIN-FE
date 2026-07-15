/**
 * 시나리오 메뉴 제어 (AS-IS IPR30S3035) 타입 정의
 * TB_IR_MENUSVCCONTROL / TB_IR_MENUSVC_SUPERANI
 */

// ─── 메뉴 + 제어정보 병합 행 ─────────────────────────────────────────────────

export interface ScenarioMenuControlRow {
  menuId: string;
  menuName: string | null;
  /** 트리 부모 포인터(AS-IS treegrid parentField) — 메뉴 트리 depth 구성에 사용. */
  priorMenuId: string | null;
  menuDepth: number | null;
  sortSeq: number | null;
  activateYn: number | null;
  serviceStatus: number | null;
  startDate: string | null;
  finshDate: string | null;
  startTime: string | null;
  finshTime: string | null;
  dateType: number | null;
  dateList: string | null;
  mentType: number | null;
  serviceMent: string | null;
  serviceMentDesc: string | null;
  mentPlaySt: number | null;
  mentPlayEt: number | null;
  mentPlayPp: number | null;
  nextType: number | null;
  userMenuId: string | null;
  userMenuName: string | null;
}

export interface ScenarioMenuControlUpdateRequest {
  activateYn: number;
  serviceStatus: number | null;
  startDate: string | null;
  finshDate: string | null;
  startTime: string | null;
  finshTime: string | null;
  dateType: number;
  dateList: string | null;
  mentType: number | null;
  serviceMent: string | null;
  serviceMentDesc: string | null;
  mentPlaySt: number | null;
  mentPlayEt: number | null;
  mentPlayPp: number | null;
  nextType: number;
  userMenuId: string | null;
}

// ─── 적용일자타입 (IR_MENUSVC_DATE_TYPE) ────────────────────────────────────

export const SCENARIO_MENU_DATE_TYPE = {
  ALWAYS: 1,
  WEEKDAY: 2,
  HOLIDAY: 3,
  SPECIFIC_DAY: 4,
  SPECIFIC_WEEKDAY: 5,
} as const;
export type ScenarioMenuDateType = (typeof SCENARIO_MENU_DATE_TYPE)[keyof typeof SCENARIO_MENU_DATE_TYPE];

export const SCENARIO_MENU_DATE_TYPE_LABELS: Record<number, string> = {
  [SCENARIO_MENU_DATE_TYPE.ALWAYS]: '항상',
  [SCENARIO_MENU_DATE_TYPE.WEEKDAY]: '평일',
  [SCENARIO_MENU_DATE_TYPE.HOLIDAY]: '휴일',
  [SCENARIO_MENU_DATE_TYPE.SPECIFIC_DAY]: '특정일',
  [SCENARIO_MENU_DATE_TYPE.SPECIFIC_WEEKDAY]: '특정요일',
};

// ─── 다음이동유형 (IR_MENUSVC_NEXT_TYPE) ────────────────────────────────────

export const SCENARIO_MENU_NEXT_TYPE = {
  TOP: 0,
  PREV: 1,
  NEXT: 2,
  CUSTOM_MENU: 3,
  END: 9,
} as const;
export type ScenarioMenuNextType = (typeof SCENARIO_MENU_NEXT_TYPE)[keyof typeof SCENARIO_MENU_NEXT_TYPE];

export const SCENARIO_MENU_NEXT_TYPE_LABELS: Record<number, string> = {
  [SCENARIO_MENU_NEXT_TYPE.TOP]: '최상위',
  [SCENARIO_MENU_NEXT_TYPE.PREV]: '이전단계',
  [SCENARIO_MENU_NEXT_TYPE.NEXT]: '다음단계',
  [SCENARIO_MENU_NEXT_TYPE.CUSTOM_MENU]: '사용자 지정 메뉴',
  [SCENARIO_MENU_NEXT_TYPE.END]: '종료',
};

// ─── 멘트종류 (공통코드 IR_MENUSVC_MENT_TYPE — TB_CC_COMMONCODE 실데이터 기준) ──

export const SCENARIO_MENU_MENT_TYPE = {
  MENT_ID: 0,
  TTS_KSC5601: 1,
  TTS_STREAM: 2,
  TTS_FILE: 3,
} as const;
export type ScenarioMenuMentType = (typeof SCENARIO_MENU_MENT_TYPE)[keyof typeof SCENARIO_MENU_MENT_TYPE];

export const SCENARIO_MENU_MENT_TYPE_LABELS: Record<number, string> = {
  [SCENARIO_MENU_MENT_TYPE.MENT_ID]: 'Ment ID',
  [SCENARIO_MENU_MENT_TYPE.TTS_KSC5601]: 'TTS-KSC5601',
  [SCENARIO_MENU_MENT_TYPE.TTS_STREAM]: 'TTS-STREAM',
  [SCENARIO_MENU_MENT_TYPE.TTS_FILE]: 'TTS-FILE',
};

// ─── 서비스제어 (그리드/폼 편의 선택값 — activateYn+serviceStatus+nextType 조합) ──

export const SCENARIO_MENU_CONTROL_KIND = {
  NONE: 'none',
  BLOCK: 'block',
  NOTICE: 'notice',
} as const;
export type ScenarioMenuControlKind = (typeof SCENARIO_MENU_CONTROL_KIND)[keyof typeof SCENARIO_MENU_CONTROL_KIND];

export const SCENARIO_MENU_CONTROL_KIND_LABELS: Record<ScenarioMenuControlKind, string> = {
  [SCENARIO_MENU_CONTROL_KIND.NONE]: '없음',
  [SCENARIO_MENU_CONTROL_KIND.BLOCK]: '블럭제어',
  [SCENARIO_MENU_CONTROL_KIND.NOTICE]: '공지제어',
};

/**
 * 제어상태 판정 — AS-IS IPR30S3035.jsp의 processMenu()와 동일 로직.
 * activateYn=1 && serviceStatus=1 && nextType=2(다음단계) → 공지제어, activateYn=1 → 블럭제어, 그 외 없음.
 */
export function getScenarioMenuControlKind(row: Pick<ScenarioMenuControlRow, 'activateYn' | 'serviceStatus' | 'nextType'>): ScenarioMenuControlKind {
  if (row.activateYn === 1) {
    if (row.serviceStatus === 1 && row.nextType === SCENARIO_MENU_NEXT_TYPE.NEXT) return SCENARIO_MENU_CONTROL_KIND.NOTICE;
    return SCENARIO_MENU_CONTROL_KIND.BLOCK;
  }
  return SCENARIO_MENU_CONTROL_KIND.NONE;
}

// ─── Super ANI ───────────────────────────────────────────────────────────────

export interface ScenarioMenuSuperAni {
  ani: string;
  serviceIdList: string;
  userName: string;
  aniDesc: string | null;
  workUser: number | null;
  workTime: string | null;
}

export interface ScenarioMenuSuperAniCreateRequest {
  ani: string;
  serviceIdList: string;
  userName: string;
  aniDesc?: string;
}

export interface ScenarioMenuSuperAniUpdateRequest {
  serviceIdList: string;
  userName: string;
  aniDesc?: string;
}

/** Super ANI 시나리오 다중선택의 "전체" sentinel — AS-IS IPR30S3035_04 '*' 값과 동일. */
export const SUPER_ANI_ALL_SCENARIOS = '*';
