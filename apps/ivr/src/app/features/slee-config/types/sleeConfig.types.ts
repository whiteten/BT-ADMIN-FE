export interface SleeConfigTenant {
  tenantId: number;
  tenantName: string;
  configFileCount: number;
}

export interface SleeConfigFile {
  tenantId: number;
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
