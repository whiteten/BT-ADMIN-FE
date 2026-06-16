/**
 * IVR 시나리오/버전 관리 타입 정의
 * AS-IS: IPR20S6020 (TB_IR_SERVICEMASTER, TB_IR_SERVICEVERSION, TB_IR_DNISSERVICE)
 * TO-BE: BT-ADMIN-SERVICE-IVR scenario feature
 *
 * ⚠ BOT(90)은 FCA 봇운영 관리에서 별도 처리 — IVR 화면에서 SERVICE_TYPE != 90만 노출
 */

// ─── 시나리오 종류 (SERVICE_TYPE) ───────────────────────────────────────────

export const SCENARIO_TYPE_OPTIONS = [
  { label: '기본시나리오', value: '10', color: 'violet' },
  { label: 'ACS시나리오', value: '20', color: 'amber' },
  { label: '인증시나리오', value: '30', color: 'emerald' },
  { label: '콜백시나리오', value: '40', color: 'pink' },
  { label: '정책시나리오', value: '50', color: 'cyan' },
  { label: '영업점시나리오', value: '60', color: 'rose' },
  { label: 'ACS O/B(2CH)', value: '70', color: 'orange' },
  { label: 'AI시나리오', value: '80', color: 'sky' },
] as const;

export const SCENARIO_TYPE_LABELS: Record<string, string> = {
  '10': '기본시나리오',
  '20': 'ACS시나리오',
  '30': '인증시나리오',
  '40': '콜백시나리오',
  '50': '정책시나리오',
  '60': '영업점시나리오',
  '70': 'ACS O/B(2CH)',
  '80': 'AI시나리오',
};

export const SCENARIO_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '10': { bg: 'bg-violet-100', text: 'text-violet-700' },
  '20': { bg: 'bg-amber-100', text: 'text-amber-700' },
  '30': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  '40': { bg: 'bg-pink-100', text: 'text-pink-700' },
  '50': { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  '60': { bg: 'bg-rose-100', text: 'text-rose-700' },
  '70': { bg: 'bg-orange-100', text: 'text-orange-700' },
  '80': { bg: 'bg-sky-100', text: 'text-sky-700' },
};

export type ScenarioType = '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80';

// ─── 적용 방식 (RT_RESV_KIND) ──────────────────────────────────────────────

// 백엔드 enum code(Integer)와 1:1. 비교 시 매직넘버 대신 이 상수 사용.
export const APPLY_TIMING = { REALTIME: 1, RESERVED: 2, CANCEL_APPLY: 3 } as const;
export type ApplyTimingKind = (typeof APPLY_TIMING)[keyof typeof APPLY_TIMING]; // 1 | 2 | 3

export const APPLY_TIMING_LABELS: Record<number, string> = {
  [APPLY_TIMING.REALTIME]: '실시간',
  [APPLY_TIMING.RESERVED]: '예약',
  [APPLY_TIMING.CANCEL_APPLY]: '적용해제',
};

// ─── 적용 상태 (APPLY_STATUS) — 공통코드 IR_APPLY_STATUS와 1:1 매핑 ──────────

export const APPLY_STATUS = {
  PENDING: 10,
  SEND_OK: 20,
  SEND_FAIL: 25,
  CMD_OK: 30,
  CMD_FAIL: 35,
  APPLIED: 50,
  APPLY_FAIL: 55,
} as const;
export type ApplyStatus = (typeof APPLY_STATUS)[keyof typeof APPLY_STATUS];

export const APPLY_STATUS_LABELS: Record<number, string> = {
  [APPLY_STATUS.PENDING]: '예약',
  [APPLY_STATUS.SEND_OK]: '파일전송성공',
  [APPLY_STATUS.SEND_FAIL]: '파일전송실패',
  [APPLY_STATUS.CMD_OK]: '제어명령성공',
  [APPLY_STATUS.CMD_FAIL]: '제어명령실패',
  [APPLY_STATUS.APPLIED]: '적용완료',
  [APPLY_STATUS.APPLY_FAIL]: '적용실패',
};

// ─── 적용 결과 (APPLY_RESULT) — 1=성공, 9=실패 ─────────────────────────────

export const APPLY_RESULT = { SUCCESS: 1, FAIL: 9 } as const;
export type ApplyResult = (typeof APPLY_RESULT)[keyof typeof APPLY_RESULT];

export const APPLY_RESULT_LABELS: Record<number, string> = {
  [APPLY_RESULT.SUCCESS]: '성공',
  [APPLY_RESULT.FAIL]: '실패',
};

// ─── 시나리오 마스터 ────────────────────────────────────────────────────────

export interface Scenario {
  serviceId: number;
  serviceName: string;
  tenantId: number;
  tenantName?: string;
  serviceType: ScenarioType;
  serviceTypeLabel?: string;
  mentfilePath?: string | null;
  commonPath?: string | null;
  maxKeepTime?: number | null;
  daemonPeriod?: number | null;
  defaultFilename: string;
  serviceDesc?: string | null;
  versionCount?: number;
  workUser?: number | null;
  workUserName?: string | null;
  workTime?: string | null;
}

export interface ScenarioCreateRequest {
  serviceName: string;
  serviceType: ScenarioType;
  mentfilePath?: string;
  commonPath?: string;
  maxKeepTime?: number;
  daemonPeriod?: number;
  defaultFilename: string;
  serviceDesc?: string;
}

export interface ScenarioUpdateRequest {
  serviceName?: string;
  mentfilePath?: string;
  commonPath?: string;
  maxKeepTime?: number;
  daemonPeriod?: number;
  serviceDesc?: string;
}

// ─── 시나리오 버전 ──────────────────────────────────────────────────────────

export interface ScenarioVersion {
  serviceId: number;
  serviceVer: string;
  versionName?: string | null;
  scenarioFile?: string | null;
  scenarioDocument?: string | null;
  scenarioDocumentId?: number | null;
  irFilePath?: string | null;
  emsFilePath?: string | null;
  versionDesc?: string | null;
  statVisible?: number | null;
  charsetType?: string | null;
  flowEditorId?: number | null;
  workUser?: number | null;
  workUserName?: string | null;
  workTime?: string | null;
}

export type ScenarioCharsetType = 'euc-kr' | 'utf-8';

export interface ScenarioVersionCreateRequest {
  serviceVer: string;
  versionName?: string;
  versionDesc?: string;
  sourcever?: string; // 복사 시 원본 버전
  statVisible?: number; // 1=사용(기본), 0=사용안함 (AS-IS IPR20S6020 statVisible)
  charsetType?: ScenarioCharsetType; // 기본 'euc-kr' (AS-IS IPR20S6020 charsetType)
  doScenarioAnal?: boolean; // 등록 후 분석 실행 여부 (기본 true)
}

export interface ScenarioVersionUpdateRequest {
  versionName?: string;
  versionDesc?: string;
  statVisible?: number;
  charsetType?: ScenarioCharsetType;
  /** SXML 재업로드 후 자동 분석 실행 여부. multipart with-file 흐름에서만 의미 있음. 기본 true. */
  doScenarioAnal?: boolean;
}

// ─── 시나리오 배포 ──────────────────────────────────────────────────────────

export interface ScenarioPublishRequest {
  rtResvKind: ApplyTimingKind;
  applyDatetime?: string; // ISO 8601, RESERVED 시 필수
}

export interface DeployedSystem {
  systemId: number;
  systemName?: string | null;
  systemRole?: string | null; // HA 그룹명 또는 Role
  ipAddress?: string | null;
  nodeId?: number | null;
  haGroupId?: number | null;
  serviceVer?: string | null; // 현재 적용 버전
  priorVer?: string | null; // 이전 적용 버전
  applyVer?: string | null; // 예약 대기 버전
  applyStatus?: ApplyStatus | null;
  applyResult?: ApplyResult | null;
  applyDatetime?: string | null;
  rtResvKind?: ApplyTimingKind | null;
  svcResvId?: string | null;
  workUser?: number | null;
  workUserName?: string | null;
  workTime?: string | null;
}

/** 배포 대상 시스템 — 사이드바 표시용. 할당(assignSystem=1) + HA 백업(assignSystem=0). */
export interface DeployTargetSystem {
  systemId: number;
  systemName: string;
  serviceVer?: string | null;
  haGroupId?: number | null;
  haGroupName?: string | null;
  assignSystem: number; // 1=할당, 0=HA 백업
}

// ─── 시나리오 배포 결과 (publish 응답) ──────────────────────────────────────

/** 배포 결과 항목 — 시스템별 파일전송(deploy) / 적용(apply) 결과. */
export interface ScenarioPublishResultItem {
  systemId: number;
  systemName?: string | null;
  success: boolean;
  errorCode: string;
  message: string;
}

/**
 * 시나리오 배포 응답 — 백엔드 ScenarioDeployResponseDto와 1:1.
 * REALTIME: deployResults/applyResults 시스템별 채움, svcResvId=null.
 * RESERVED: deployResults/applyResults 비고 svcResvId 채워짐.
 */
export interface ScenarioPublishResult {
  accessId?: string | null;
  totalCount: number;
  deployResults: ScenarioPublishResultItem[];
  deploySuccessCount: number;
  deployFailCount: number;
  applyResults: ScenarioPublishResultItem[];
  applySuccessCount: number;
  applyFailCount: number;
  svcResvId?: string | null;
}

// ─── 배포 설정 (FCA 봇 BotDeployConfig 패턴 미러링) ─────────────────────────

/**
 * 시나리오 배포 설정 — 후보 시스템 + 할당 여부.
 * FCA BotDeployConfig 와 동일 구조.
 */
export interface SystemDeployItem {
  systemId: number;
  systemName: string;
  serviceId: number;
  /** 이전 적용 버전 (할당된 경우) */
  priorVer?: string | null;
  /** 현재 적용 버전 (할당된 경우) */
  applyVer?: string | null;
  /** 0=미할당, 1=할당 */
  assignYn: 0 | 1;
}

/** 배포 설정 저장 요청 — systemIds 리스트 (delta apply). */
export type SystemDeployConfigSaveRequest = { systemIds: number[] };

// ─── IFE 토큰 ──────────────────────────────────────────────────────────────

export interface IfeTokenInfo {
  accessToken: string | null;
  refreshToken: string | null;
  redirectUrl: string | null;
  token: string | null;
  editorUrl: string | null;
  expireAt: string | null;
}
