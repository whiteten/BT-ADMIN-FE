/**
 * IVR 시나리오/버전 관리 타입 정의
 * AS-IS: IPR20S6020 (TB_IR_SERVICEMASTER, TB_IR_SERVICEVERSION, TB_IR_DNISSERVICE)
 * TO-BE: BT-ADMIN-SERVICE-IVR scenario feature
 *
 * ⚠ BOT(90)은 FCA 봇운영 관리에서 별도 처리 — IVR 화면에서 SERVICE_TYPE != 90만 노출
 */

// ─── 시나리오 종류 (SERVICE_TYPE) ───────────────────────────────────────────

export const SCENARIO_TYPE_OPTIONS = [
  { label: '기본시나리오', value: 'IVR', code: '10', color: 'violet' },
  { label: 'ACS시나리오', value: 'ACS', code: '20', color: 'amber' },
  { label: '인증시나리오', value: 'AUTH', code: '30', color: 'emerald' },
  { label: '콜백시나리오', value: 'CALLBACK', code: '40', color: 'pink' },
  { label: '정책시나리오', value: 'POLICY', code: '50', color: 'cyan' },
  { label: '영업점시나리오', value: 'BRANCH', code: '60', color: 'rose' },
  { label: 'ACS O/B(2CH)', value: 'ACS_OB_2CH', code: '70', color: 'orange' },
  { label: 'AI시나리오', value: 'AI', code: '80', color: 'sky' },
] as const;

export const SCENARIO_TYPE_LABELS: Record<string, string> = {
  IVR: '기본시나리오',
  ACS: 'ACS시나리오',
  AUTH: '인증시나리오',
  CALLBACK: '콜백시나리오',
  POLICY: '정책시나리오',
  BRANCH: '영업점시나리오',
  ACS_OB_2CH: 'ACS O/B(2CH)',
  AI: 'AI시나리오',
};

export const SCENARIO_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  IVR: { bg: 'bg-violet-100', text: 'text-violet-700' },
  ACS: { bg: 'bg-amber-100', text: 'text-amber-700' },
  AUTH: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CALLBACK: { bg: 'bg-pink-100', text: 'text-pink-700' },
  POLICY: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  BRANCH: { bg: 'bg-rose-100', text: 'text-rose-700' },
  ACS_OB_2CH: { bg: 'bg-orange-100', text: 'text-orange-700' },
  AI: { bg: 'bg-sky-100', text: 'text-sky-700' },
};

export type ScenarioType = 'IVR' | 'ACS' | 'AUTH' | 'CALLBACK' | 'POLICY' | 'BRANCH' | 'ACS_OB_2CH' | 'AI';

// ─── 적용 방식 (RT_RESV_KIND) ──────────────────────────────────────────────

export const APPLY_TIMING_LABELS: Record<string, string> = {
  REALTIME: '실시간',
  RESERVED: '예약',
  CANCEL_APPLY: '적용해제',
};

export type ApplyTimingKind = 'REALTIME' | 'RESERVED' | 'CANCEL_APPLY';

// ─── 적용 상태 (APPLY_STATUS) — 공통코드 IR_APPLY_STATUS와 1:1 매핑 ──────────

export const APPLY_STATUS_LABELS: Record<string, string> = {
  PENDING: '예약',
  SEND_OK: '파일전송성공',
  SEND_FAIL: '파일전송실패',
  CMD_OK: '제어명령성공',
  CMD_FAIL: '제어명령실패',
  APPLIED: '적용완료',
  APPLY_FAIL: '적용실패',
};

export type ApplyStatus = 'PENDING' | 'SEND_OK' | 'SEND_FAIL' | 'CMD_OK' | 'CMD_FAIL' | 'APPLIED' | 'APPLY_FAIL';

// ─── 적용 결과 (APPLY_RESULT) ─────────────────────────────────────────────

export const APPLY_RESULT_LABELS: Record<string, string> = {
  SUCCESS: '성공',
  FAIL: '실패',
};

export type ApplyResult = 'SUCCESS' | 'FAIL';

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
  irFilePath?: string | null;
  emsFilePath?: string | null;
  versionDesc?: string | null;
  statVisible?: number | null;
  flowEditorId?: number | null;
  workUser?: number | null;
  workUserName?: string | null;
  workTime?: string | null;
}

export interface ScenarioVersionCreateRequest {
  serviceVer: string;
  versionName?: string;
  versionDesc?: string;
  sourcever?: string; // 복사 시 원본 버전
}

// ─── 시나리오 배포 ──────────────────────────────────────────────────────────

export interface ScenarioPublishRequest {
  rtResvKind: ApplyTimingKind;
  applyDatetime?: string; // ISO 8601, RESERVED 시 필수
  targetSystemIds: number[];
}

export interface DeployedSystem {
  systemId: number;
  systemName?: string | null;
  systemRole?: string | null; // Master / Slave / Standby
  ipAddress?: string | null;
  serviceVer: string;
  applyStatus: ApplyStatus;
  applyResult: ApplyResult;
  applyDatetime?: string | null;
  rtResvKind?: ApplyTimingKind | null;
  svcResvId?: string | null;
}

// ─── IFE 토큰 ──────────────────────────────────────────────────────────────

export interface IfeTokenInfo {
  accessToken: string | null;
  refreshToken: string | null;
  redirectUrl: string | null;
  token: string | null;
  editorUrl: string | null;
  expireAt: string | null;
}
