export interface SleeConfigFile {
  tenantId: number;
  tenantName: string | null;
  configFile: string;
  categoryCount: number;
  propertyCount: number;
}

export interface SleeConfigCategory {
  tenantId: number;
  configFile: string;
  category: string;
  propertyCount: number;
  lastModified?: string;
}

export interface SleeConfigProperty {
  tenantId: number;
  configFile: string;
  classCd: number;
  category: string;
  property: string;
  value: string;
  chgValue?: string;
  masking?: string;
  ptyDesc?: string;
  workUser?: number;
  workTime?: string;
}

export interface SleeConfigIrSystem {
  systemId: number;
  systemName: string;
  nodeId: number;
  nodeName?: string;
  ioSystemId?: number;
  ioIpAddress?: string;
  idSystemId?: number;
  idIpAddress?: string;
  svcResvId?: string;
}

export interface SleeConfigItemApplyRequest {
  tenantId: number;
  configFile: string;
  /** Optional — null/empty 이면 파일단위. */
  category?: string;
  /** Optional — null/empty 이면 카테고리/파일 단위. */
  properties?: string[];
  targetSystemIds: number[];
  applyReason?: string;
  /** Overwrite ON (default: false) — USERCONFIG 기준 강제 재구성. */
  chgOverride?: boolean;
  /** USERCONFIG 백업 (default: false) — 적용 전 (tenantId, configFile) 전체 스냅샷. */
  useBackup?: boolean;
  /** HA 분리용 (default: systemId 그대로). */
  roleSystemId?: number;
}

export interface SleeConfigApplyResult {
  systemId: number;
  systemName: string;
  success: boolean;
  errorCode: string;
  message: string;
  /** CONFIGSYSTEM 반영 카운트 (실패/업로드단계 결과는 0). */
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
  /** 실제 변경(I/U/D) 발생 여부. false면 "변경사항 없음"(전부 동일). */
  changed: boolean;
}

/** 예약 적용 시 property 별 변경 예정값. */
export interface SleeConfigPropertyChange {
  property: string;
  chgValue: string;
}

/**
 * 예약 적용 요청 — 항목/카테고리/파일 단위 통합.
 * - propertyChanges 있음 → ITEM
 * - propertyChanges 없음 + category 있음 → CATEGORY
 * - 둘 다 없음 → FILE
 */
export interface SleeConfigReservationRequest {
  tenantId: number;
  configFile: string;
  category?: string;
  propertyChanges?: SleeConfigPropertyChange[];
  targetSystemIds: number[];
  /** ISO datetime string. */
  applyDatetime: string;
  /** 기존 예약 ID. 없으면 신규 채번. */
  svcResvId?: string;
  applyReason?: string;
  roleSystemId?: number;
}

/** 속성 신규 등록 요청 — AS-IS IPR20S6060I.do 동등. */
export interface SleeUserconfigCreateRequest {
  tenantId: number;
  configFile: string;
  category: string;
  property: string;
  value: string;
  ptyDesc?: string;
}

/** 속성 수정 요청 — VALUE, PTY_DESC 만. */
export interface SleeUserconfigUpdateRequest {
  value: string;
  ptyDesc?: string;
}

export interface SleeConfigReservationResult {
  svcResvId: string;
  chgValueUpdated: number;
  configSystemInserted: number;
  configSystemUpdated: number;
}

// === SLEE 환경변수 cfg 다중 Import (AS-IS IPR20S6060MFU) ===
export interface SleeUserconfigImportFileResult {
  configFile: string;
  success: boolean;
  parsedCategories: number;
  parsedProperties: number;
  upsertedRows: number;
  detectedEncoding: string | null;
  errorMessage: string | null;
}

export interface SleeUserconfigImportResponse {
  totalFiles: number;
  successCount: number;
  failCount: number;
  totalUpsertedRows: number;
  fileResults: SleeUserconfigImportFileResult[];
}

// === 환경파일 삭제 (Phase 1) ===
export interface SleeConfigDeleteFileResponse {
  deletedRows: number;
  /** USERCONFIG 잔여 0 → GRANT 도 삭제됐는지. 1차 범위에서 GRANT entity 미구현이라 항상 false. */
  grantRemoved: boolean;
}

// === 적용 이력 (Phase 2 — 즉시/예약 통합) ===

/** rtResvKind: 1=즉시, 2=예약. null=전체 필터. */
export type RtResvKind = 1 | 2;

export interface SleeConfigHistoryRow {
  systemName: string;
  configFile: string;
  rtResvKind: number | null;
  /** 1=파일단위, 9=항목단위 */
  setStatus: number | null;
  /** 10=대기, 50=성공, 55=실패 (HIST 의 APPLY_STATUS) */
  applyStatus: number | null;
  /** 1=성공, 2=실패, 9=미실행 (RESERVE 실시간 결과, 예약일 때만) */
  applyResult: number | null;
  applyDatetime: string | null;
  cancelTime: string | null;
  workTime: string | null;
  svcResvId: string | null;
  applyReason: string | null;
  workUserName: string | null;
}

// === 예약 적용 결과 (AS-IS IPR30S3030L3 / selectApplyList) ===

/**
 * 예약 적용 결과 한 행 — (tenant, configFile) 의 CONFIGSYSTEM 을 시스템별로 그룹핑한 적용 상태.
 * 공통코드명은 BE 조인 대신 코드만 내려주고 FE 가 라벨 매핑(멘트파일 이력 패턴 동일).
 * 예약취소는 상태코드가 아니라 canceled 플래그로 처리.
 */
export interface SleeConfigApplyResultRow {
  systemId: number;
  systemName: string | null;
  rtResvKind: number | null;
  /** IR_APPLY_STATUS 원시코드: 10 예약/20 파일전송성공/25 파일전송실패/30 제어명령성공/35 제어명령실패/50 적용완료/55 적용실패 */
  applyStatusCode: number | null;
  /** IR_APPLY_RESULT: 1 성공/2 실패/9 미처리(2h 초과 미실행, BE 파생) */
  applyResultCode: number | null;
  /** 예약취소 여부 — true 면 상태 라벨을 "예약취소"로 표시 */
  canceled: boolean;
  applyDatetime: string | null;
  svcResvId: string | null;
  workUserName: string | null;
}

/** 예약 적용 결과 — IR_APPLY_STATUS 전체 라벨 (이력의 축약 라벨과 별개). */
export const SLEE_APPLY_RESULT_STATUS_LABELS: Record<number, string> = {
  10: '예약',
  20: '파일전송성공',
  25: '파일전송실패',
  30: '제어명령성공',
  35: '제어명령실패',
  50: '적용완료',
  55: '적용실패',
};

/** 예약 적용 결과 — IR_APPLY_RESULT 라벨. */
export const SLEE_APPLY_RESULT_LABELS: Record<number, string> = {
  1: '성공',
  2: '실패',
  9: '미처리',
};

// === 백업 이력 (Phase 2) ===

export interface SleeConfigBackupHeader {
  backupListId: number;
  workUserName: string | null;
  workTime: string | null;
}

export interface SleeConfigBackupCompareRow {
  category: string;
  property: string;
  /** 현재 USERCONFIG.VALUE — 없으면 null */
  currentValue: string | null;
  backupValue: string | null;
  changed: boolean;
}

export interface SleeConfigBackupRestoreResponse {
  /** 복구 전 USERCONFIG 삭제된 row 수 */
  deletedRows: number;
  /** BK_DATA → USERCONFIG 로 INSERT 된 row 수 */
  restoredRows: number;
}

// === 라벨 매핑 (UI 표시용) ===

export const RT_RESV_KIND_LABELS: Record<number, string> = {
  1: '즉시',
  2: '예약',
};

export const APPLY_STATUS_LABELS: Record<number, string> = {
  10: '대기',
  50: '성공',
  55: '실패',
};

export const APPLY_RESULT_LABELS: Record<number, string> = {
  1: '성공',
  2: '실패',
  9: '미실행',
};

export const SET_STATUS_LABELS: Record<number, string> = {
  1: '파일단위',
  9: '항목단위',
};
