/**
 * 라이선스 관리 타입 정의
 * 실제 백엔드 응답 기반
 */

// ─── 제품군 상수 ────────────────────────────────────────────────────────────────

/** 라이선스 상태 (백엔드 computedStatus) */
export type LicenseStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXPIRING';

/** 제품군 그룹 순서 */
export const LICENSE_GROUP_ORDER = ['IE', 'IC', 'IR', 'VELOCE', 'CATCHBOT'] as const;

/** 제품군 그룹 라벨 */
export const LICENSE_GROUP_LABELS: Record<string, string> = {
  IE: '교환기 (PBX)',
  IC: 'CTI',
  IR: 'IVR',
  VELOCE: 'VELOCE',
  CATCHBOT: 'CatchBot',
};

/** 라이선스 유형 라벨 */
export const LICENSE_TYPE_LABELS: Record<string, string> = {
  '10': '통합',
};

// ─── Backend Response DTOs ───────────────────────────────────────────────────────

/**
 * 백엔드 라이선스 목록 응답 아이템
 * GET /api/bff/license-list
 */
export interface LicenseBackendResponse {
  licenseId: number;
  licenseName: string;
  companyId: number;
  licenseType: string;
  /** 시작일 - yyyyMMdd */
  startDate: string;
  /** 만료일 - 암호화된 값 */
  finishDate: string;
  validMonth: number;
  /** 원시 상태값 ("1" 등) */
  licenseStatus: string;
  /** 계산된 상태 */
  computedStatus: LicenseStatus;
  /** 라이선스 항목 수 */
  itemCount: number;
  workUser: number;
  workTime: string | null;
}

// ─── Frontend 변환 타입 ──────────────────────────────────────────────────────────

/**
 * 프론트엔드용 라이선스 (카드 표시용)
 * LicenseBackendResponse를 변환하여 사용
 */
export interface License {
  licenseId: number;
  licenseName: string;
  licenseType: string;
  status: LicenseStatus;
  /** 시작일 - yyyy-MM-dd (변환됨) */
  startDate: string;
  /** 만료일 - 암호화된 값이므로 표시 불가할 수 있음 */
  finishDate: string;
  /** 유효 기간 (개월) */
  validMonth: number;
  /** 라이선스 항목 수 */
  itemCount: number;
}

/**
 * 라이선스 상세 (라이선스 정보 + 항목)
 * BFF license-detail 에서 license step 응답
 */
export interface LicenseDetail extends License {
  items: LicenseItemInfo[];
}

/**
 * 라이선스 항목 정보 (상세 조회 시 포함)
 */
export interface LicenseItemInfo {
  licenseKind: string;
  licenseKindName: string;
  serverType: string;
  isFeature: boolean;
  /** NUMBER 타입: 총수량, FUNCTION: null */
  totalQuantity: number | null;
  /** FUNCTION 타입: 활성 여부 */
  featureEnabled: boolean;
}

/**
 * 서버군별 사용 현황 응답
 * GET /api/bff/license-usage-total
 * GET /api/bff/license-detail (usage step)
 */
export interface LicenseUsageResponse {
  serverGroups: ServerGroupUsage[];
}

/**
 * 서버군별 사용 현황 그룹
 */
export interface ServerGroupUsage {
  serverGroup: string;
  serverGroupName: string;
  items: LicenseUsageItem[];
}

/**
 * 개별 라이선스 사용 현황 항목
 */
export interface LicenseUsageItem {
  licenseKind: string;
  licenseKindName: string;
  isFeature: boolean;
  /** NUMBER 타입: 총수량, FUNCTION: null */
  totalQuantity: number | null;
  /** NUMBER 타입: 사용량, FUNCTION: null */
  usedQuantity: number | null;
  /** NUMBER 타입: 여유량, FUNCTION: null */
  remainQuantity: number | null;
  /** NUMBER 타입: 사용률(%), FUNCTION: null */
  usageRate: number | null;
  /** FUNCTION 타입: 활성여부, NUMBER: null */
  featureEnabled: boolean | null;
  /** 클러스터 할당 가능 여부 (kind 21, 26) */
  hasClusterAlloc?: boolean;
}

/**
 * 클러스터 할당 응답
 * GET /api/bff/license-cluster-list
 */
export interface ClusterAllocation {
  clusterId: number;
  clusterName: string;
  licenseKind: string;
  allocatedQuantity: number;
}

/**
 * BFF license-detail 집계 응답
 * { license: LicenseDetail, usage: LicenseUsageResponse }
 */
export interface LicenseDetailAggregated {
  license: LicenseDetail;
  usage: LicenseUsageResponse;
}

// ─── Backend Detail Response ─────────────────────────────────────────────────────

/**
 * 백엔드 LicenseDetailResponse (단일 step)
 * GET /api/manager/licenses/{licenseId}
 */
export interface LicenseDetailBackendResponse {
  licenseId: number;
  licenseName: string;
  companyId: number;
  licenseType: string;
  licenseKey: string;
  startDate: string;
  finishDate: string;
  validMonth: number;
  licenseStatus: string;
  computedStatus: LicenseStatus;
  items: LicenseItemBackendResponse[];
  usageOverview: {
    totalNumberItems: number;
    totalFunctionItems: number;
    activeNumberItems: number;
    activeFunctionItems: number;
  };
  workUser: number;
  workTime: string | null;
}

/**
 * 백엔드 LicenseItemResponse
 */
export interface LicenseItemBackendResponse {
  licenseId: number;
  licenseKind: string;
  licenseKindName: string;
  licenseKindType: 'NUMBER' | 'FUNCTION';
  totalQty: number | null;
  usedQty: number | null;
  spareQty: number | null;
  isEnabled: boolean | null;
  hasClusterAlloc: boolean | null;
}

// ─── Backend Summary Response ────────────────────────────────────────────────────

/**
 * 백엔드 KindSummary (LicenseSummaryResponse 내부)
 * GET /api/manager/licenses/summary
 */
export interface KindSummaryBackend {
  licenseKind: string;
  licenseKindName: string;
  licenseKindType: 'NUMBER' | 'FUNCTION';
  totalQty: number | null;
  usedQty: number | null;
  spareQty: number | null;
  isEnabled: boolean | null;
}

/**
 * 백엔드 라이선스 사용 현황 요약 응답
 * GET /api/manager/licenses/summary
 */
export interface LicenseSummaryBackendResponse {
  activeLicenseCount: number;
  numberItems: KindSummaryBackend[];
  functionItems: KindSummaryBackend[];
}

// ─── Request DTOs ───────────────────────────────────────────────────────────────

/**
 * 클러스터 할당 수정 요청
 * PUT /api/bff/license-cluster-update
 */
export interface UpdateClusterRequest {
  allocations: { clusterId: number; quantity: number }[];
}
