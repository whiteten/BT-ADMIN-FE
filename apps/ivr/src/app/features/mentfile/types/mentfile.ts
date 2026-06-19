/**
 * IVR 멘트파일 타입 정의
 *
 * AS-IS: IPR30S3020 (TB_IR_MENTFILE, TB_IR_MENTFILE_SYSTEM)
 * TO-BE: BT-ADMIN-SERVICE-IVR mentfile feature
 */

// ─── 멘트파일 도메인 ────────────────────────────────────────────────────────

export interface MentFile {
  mentfileId: number;
  mentFile: string;
  mentName: string;
  mentDesc?: string | null;
  irFilePath: string;
  emsFilePath: string;
  fileApplyYn: number;
  fileRestoreYn: number;
  applyId?: number | null;
  workUser?: number | null;
  workUserName?: string | null;
  workTime?: string | null;
}

export interface MentFileCreateRequest {
  mentName: string;
  mentDesc?: string;
  irFilePath: string;
  emsFilePath: string;
}

export interface MentFileUpdateRequest {
  mentName?: string;
  mentDesc?: string;
  irFilePath?: string;
  emsFilePath?: string;
}

// ─── 다량추가 (multi-file) + 설명 매핑 ──────────────────────────────────────

/** 멘트파일 다량추가 결과 (AS-IS IPR30S3020M.do). */
export interface MentFileBatchResult {
  total: number;
  created: number;
  skipped: number;
  items: MentFile[];
}

/** 멘트설명 Excel/CSV 파싱 결과 한 행 (AS-IS IPR30S3020EXL.do). 파일명 매칭용. */
export interface MentDescRow {
  mentFile: string;
  mentDesc: string;
}

// ─── 적용 대상 시스템 ──────────────────────────────────────────────────────

export interface MentApplyTarget {
  systemId: number;
  systemName: string;
  nodeId?: number | null;
  nodeName?: string | null;
  ioSystemId?: number | null;
  ioIpAddress?: string | null;
  idSystemId?: number | null;
  idIpAddress?: string | null;
  /** AS-IS DB 정책상 NULL 가능. */
  currentApplyStatus?: number | null;
  /** 1=즉시, 2=예약 */
  rtServKind?: number | null;
  applyDatetime?: string | null;
  /** 예약 중이면 set → 체크박스 disabled 판단용. */
  svcResvId?: string | null;
}

// ─── 적용 (즉시/예약) ──────────────────────────────────────────────────────

export type MentRtServKind = 0 | 2; // 0=즉시(레거시 동일), 2=예약

export interface MentApplyRequest {
  mentfileIds: number[];
  systemIds: number[];
  rtServKind: MentRtServKind;
  /** rtServKind=2 일 때만 필수 (yyyy-MM-ddTHH:mm:ss). */
  applyDatetime?: string;
}

export interface MentApplyResultItem {
  mentfileId: number;
  mentFile: string;
  mentName: string;
  systemId: number;
  systemName: string;
  success: boolean;
  applyStatus: number;
  errorCode?: string | null;
  message?: string | null;
}

export interface MentApplyResponse {
  /** 예약 적용 시에만 set. */
  svcResvId?: string | null;
  applyId: number;
  totalCount: number;
  successCount: number;
  failCount: number;
  results: MentApplyResultItem[];
}

// ─── applyStatus 라벨 ──────────────────────────────────────────────────────

export const MENT_APPLY_STATUS_LABELS: Record<number, string> = {
  10: '예약',
  50: '성공',
  55: '실패',
};

export const MENT_RT_SERV_KIND_LABELS: Record<number, string> = {
  1: '즉시',
  2: '예약',
};

// ─── 적용 이력 (즉시/예약 통합) ──────────────────────────────────────────

/** 적용 종류 라벨 (구분 컬럼) — 0=즉시 / 2,3=예약. BE 코드만 내려주고 FE 가 매핑. */
export const MENT_HIST_KIND_LABELS: Record<number, string> = {
  0: '즉시',
  2: '예약',
  3: '예약',
};

/**
 * 상태 라벨 (상태 컬럼) — 레거시 공통코드 IR_APPLY_STATUS 정합.
 * 예약취소는 상태코드가 아니라 `canceled` 플래그로 처리(레거시 IPR30S3025 동일).
 */
export const MENT_HIST_STATUS_LABELS: Record<number, string> = {
  9: '미처리', // 레거시 IR_APPLY_RESULT — 예약 도래 후 2h 초과 미실행 (BE 파생)
  10: '예약',
  20: '파일전송성공',
  25: '파일전송실패',
  30: '제어명령성공',
  35: '제어명령실패',
  50: '적용완료',
  55: '적용실패',
};

export interface MentFileHistoryRow {
  mentfileId: number;
  mentName: string | null;
  mentFile: string | null;
  systemId: number;
  systemName: string | null;
  rtServKindCode: number | null;
  /** IR_APPLY_STATUS 원시코드(+9 미처리): 9 미처리/10 예약/20 파일전송성공/25 파일전송실패/30 제어명령성공/35 제어명령실패/50 적용완료/55 적용실패. null=미확정 */
  applyStatusCode: number | null;
  /** 예약취소 여부 — true 면 상태 라벨을 "예약취소"로 표시 */
  canceled: boolean;
  applyDatetime: string | null;
  workTime: string | null;
  svcResvId: string | null;
  workUserName: string | null;
}
