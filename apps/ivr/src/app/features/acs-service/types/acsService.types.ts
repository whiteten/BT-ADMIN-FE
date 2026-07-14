/**
 * ACS 서비스 관리 타입 (AS-IS IPR35S5010).
 */

// ─── 도메인 타입 ───────────────────────────────────────────────

export interface AcsService {
  acsId: number;
  tenantId: number;
  serviceId: number;
  serviceName: string | null;
  acsServiceName: string;
  acsType: number;
  dupYn: number;
  maxObReqCnt: number;
  controlType: number;
  startDate: string | null; // ISO yyyy-MM-dd
  finishDate: string | null;
  useYn: number;
  acsPeriod: number;
}

export interface AcsServiceUpdateDatas {
  acsServiceName: string;
  dupYn: number;
  maxObReqCnt: number;
  controlType: number;
  startDate: string | null;
  finishDate: string | null;
  useYn: number;
  acsPeriod: number;
}

export interface AcsWorktime {
  worktimeId: number;
  tenantId: number;
  worktimeName: string;
  weekdayByte: string; // 월~일 7자리 0/1 (예: 1111100)
  startTime: string; // HHmm
  finishTime: string; // HHmm
}

export type AcsWorktimeSaveDatas = Omit<AcsWorktime, 'worktimeId' | 'tenantId'>;

export interface AcsHoliday {
  holiId: number;
  tenantId: number;
  holiName: string;
  repeatOpt: number;
  holiType: number;
  startDate: string; // ISO yyyy-MM-dd
  finishDate: string;
  holiDesc: string | null;
}

export type AcsHolidaySaveDatas = Omit<AcsHoliday, 'holiId' | 'tenantId'>;

export interface AcsFailCode {
  failCode: string;
  failCodeName: string;
  retryCnt: number | null;
  retryPeriod: number | null;
  memo: string | null;
}

export interface AcsDialConfig {
  areaCallUseYn: number;
  areaCodeNumberingCycle: number;
  areaCodeNumberingCount: number;
  failCodes: AcsFailCode[];
}

export interface AcsFailCodeCreateDatas {
  failCode: string;
  failCodeName: string;
  retryCnt: number;
  retryPeriod: number;
  memo?: string | null;
}

export type AcsFailCodeUpdateDatas = Omit<AcsFailCodeCreateDatas, 'failCode'>;

export interface AcsAreaConfigUpdateDatas {
  areaCallUseYn: number;
  areaCodeNumberingCycle?: number;
  areaCodeNumberingCount?: number;
}

export interface AcsSystemControl {
  serviceId: number;
  systemId: number;
  systemName: string;
  ipAddress: string | null;
  nodeId: number | null;
  acsId: number;
  acsServiceName: string;
  blockState: number; // 1=활성화, 0=비활성화
}

export interface AcsBlockStateItem {
  serviceId: number;
  systemId: number;
  blockState: number;
}

// ─── 상태값 매핑 (as const SoT) ────────────────────────────────

export const ACS_TYPE = {
  PERIODIC: 0,
  REALTIME_2CH: 1,
} as const;
export type AcsType = (typeof ACS_TYPE)[keyof typeof ACS_TYPE];

export const ACS_TYPE_LABELS: Record<number, string> = {
  0: '주기별 작동',
  1: '실시간(2채널)',
};

export const CONTROL_TYPE_LABELS: Record<number, string> = {
  0: '미사용',
  1: '기간제어',
};

export const REPEAT_OPT_LABELS: Record<number, string> = {
  0: '없음',
  1: '매년반복',
  2: '매월반복',
};

export const HOLI_TYPE_LABELS: Record<number, string> = {
  0: '주말(토/일)',
  1: '국가공휴일',
  2: '임시공휴일',
  9: '기타',
};

export const AREA_CYCLE_LABELS: Record<number, string> = {
  0: '영구사용',
  1: '매일',
  2: '매주',
  3: '매월',
};

export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** weekdayByte("1111100") → "월,화,수,목,금" */
export function formatWeekdayByte(weekdayByte: string | null | undefined): string {
  if (!weekdayByte) return '';
  return WEEKDAY_LABELS.filter((_, i) => weekdayByte[i] === '1').join(',');
}

/** "0900" → "09:00" */
export function formatHHmm(time: string | null | undefined): string {
  if (!time || time.length !== 4) return time ?? '';
  return `${time.slice(0, 2)}:${time.slice(2)}`;
}
