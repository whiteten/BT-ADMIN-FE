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

export type MentRtServKind = 1 | 2; // 1=즉시, 2=예약

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

export interface MentFileHistoryRow {
  mentfileId: number;
  mentName: string | null;
  mentFile: string | null;
  systemId: number;
  systemName: string;
  rtServKindCode: number | null;
  rtServKindName: string | null;
  /** 10=대기, 50=성공, 55=실패 (HIST.APPLY_STATUS) */
  applyStatusCode: number | null;
  applyStatusName: string | null;
  /** 1=성공, 2=실패, null=미확정. 즉시는 HIST 기준, 예약은 RESERVE 우선 */
  applyResultCode: number | null;
  applyResultName: string | null;
  applyDatetime: string | null;
  cancelTime: string | null;
  workTime: string | null;
  svcResvId: string | null;
  workUserName: string | null;
}
