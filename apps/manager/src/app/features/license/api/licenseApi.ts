/**
 * 라이선스 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - license-list:            GET    라이선스 목록 조회
 * - license-detail:          GET    라이선스 상세 조회
 * - license-create:          POST   라이선스 등록 (multipart)
 * - license-delete:          DELETE 라이선스 삭제
 * - license-summary:         GET    활성 라이선스 전체 사용 현황
 * - license-clusters:        GET    클러스터별 할당 조회
 * - license-clusters-update: PUT    클러스터 할당 수정
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import {
  type ClusterAllocation,
  type KindSummaryBackend,
  LICENSE_GROUP_LABELS,
  type License,
  type LicenseBackendResponse,
  type LicenseDetailAggregated,
  type LicenseDetailBackendResponse,
  type LicenseItemBackendResponse,
  type LicenseItemInfo,
  type LicenseSummaryBackendResponse,
  type LicenseUsageItem,
  type LicenseUsageResponse,
  type ServerGroupUsage,
  type UpdateClusterRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 백엔드 응답을 프론트엔드 License 타입으로 변환
 */
function transformLicense(raw: LicenseBackendResponse): License {
  return {
    licenseId: raw.licenseId,
    licenseName: raw.licenseName,
    licenseType: raw.licenseType,
    status: raw.computedStatus,
    startDate: formatDateString(raw.startDate),
    finishDate: raw.finishDate,
    validMonth: raw.validMonth,
    itemCount: raw.itemCount,
  };
}

/**
 * licenseKind 코드 → 서버 그룹 매핑
 * IE: 10-19, IC: 20-29, IR: 40-49, VELOCE: 50-59, CATCHBOT: 60-69
 */
function getServerGroup(kindCode: string): string {
  const code = parseInt(kindCode, 10);
  if (code >= 10 && code < 20) return 'IE';
  if (code >= 20 && code < 30) return 'IC';
  if (code >= 40 && code < 50) return 'IR';
  if (code >= 50 && code < 60) return 'VELOCE';
  if (code >= 60 && code < 70) return 'CATCHBOT';
  return 'ETC';
}

/**
 * KindSummaryBackend → LicenseUsageItem 변환
 */
function transformKindToUsageItem(kind: KindSummaryBackend): LicenseUsageItem {
  const isFeature = kind.licenseKindType === 'FUNCTION';
  return {
    licenseKind: kind.licenseKind,
    licenseKindName: kind.licenseKindName,
    isFeature,
    totalQuantity: isFeature ? null : kind.totalQty,
    usedQuantity: isFeature ? null : kind.usedQty,
    remainQuantity: isFeature ? null : kind.spareQty,
    usageRate: isFeature ? null : kind.totalQty && kind.totalQty > 0 ? Math.round(((kind.usedQty ?? 0) / kind.totalQty) * 100) : 0,
    featureEnabled: isFeature ? kind.isEnabled : null,
    hasClusterAlloc: kind.licenseKind === '21' || kind.licenseKind === '26',
  };
}

/**
 * 백엔드 LicenseSummaryResponse → 프론트엔드 LicenseUsageResponse 변환
 * numberItems + functionItems를 serverGroup별로 그룹핑
 */
function transformSummaryToUsageResponse(summary: LicenseSummaryBackendResponse): LicenseUsageResponse {
  const allItems = [...summary.numberItems, ...summary.functionItems];
  const groupMap = new Map<string, LicenseUsageItem[]>();

  for (const item of allItems) {
    const group = getServerGroup(item.licenseKind);
    const existing = groupMap.get(group) ?? [];
    existing.push(transformKindToUsageItem(item));
    groupMap.set(group, existing);
  }

  const serverGroups: ServerGroupUsage[] = [];
  for (const [groupCode, items] of groupMap) {
    serverGroups.push({
      serverGroup: groupCode,
      serverGroupName: LICENSE_GROUP_LABELS[groupCode] ?? groupCode,
      items,
    });
  }

  return { serverGroups };
}

/**
 * 백엔드 LicenseItemResponse → LicenseUsageItem 변환
 */
function transformItemToUsageItem(item: LicenseItemBackendResponse): LicenseUsageItem {
  const isFeature = item.licenseKindType === 'FUNCTION';
  return {
    licenseKind: item.licenseKind,
    licenseKindName: item.licenseKindName,
    isFeature,
    totalQuantity: isFeature ? null : item.totalQty,
    usedQuantity: isFeature ? null : item.usedQty,
    remainQuantity: isFeature ? null : item.spareQty,
    usageRate: isFeature ? null : item.totalQty && item.totalQty > 0 ? Math.round(((item.usedQty ?? 0) / item.totalQty) * 100) : 0,
    featureEnabled: isFeature ? item.isEnabled : null,
    hasClusterAlloc: item.hasClusterAlloc === true,
  };
}

/**
 * 백엔드 LicenseDetailResponse (flat) → 프론트엔드 LicenseDetailAggregated 변환
 */
function transformDetailResponse(raw: LicenseDetailBackendResponse): LicenseDetailAggregated {
  // license 정보
  const license = {
    licenseId: raw.licenseId,
    licenseName: raw.licenseName,
    licenseType: raw.licenseType,
    status: raw.computedStatus,
    startDate: formatDateString(raw.startDate),
    finishDate: raw.finishDate,
    validMonth: raw.validMonth,
    itemCount: raw.items.length,
    items: raw.items.map(
      (item): LicenseItemInfo => ({
        licenseKind: item.licenseKind,
        licenseKindName: item.licenseKindName,
        serverType: item.licenseKindType,
        isFeature: item.licenseKindType === 'FUNCTION',
        totalQuantity: item.totalQty,
        featureEnabled: item.isEnabled === true,
      }),
    ),
  };

  // items → serverGroups 변환
  const groupMap = new Map<string, LicenseUsageItem[]>();
  for (const item of raw.items) {
    const group = getServerGroup(item.licenseKind);
    const existing = groupMap.get(group) ?? [];
    existing.push(transformItemToUsageItem(item));
    groupMap.set(group, existing);
  }

  const serverGroups: ServerGroupUsage[] = [];
  for (const [groupCode, items] of groupMap) {
    serverGroups.push({
      serverGroup: groupCode,
      serverGroupName: LICENSE_GROUP_LABELS[groupCode] ?? groupCode,
      items,
    });
  }

  return {
    license,
    usage: { serverGroups },
  };
}

/**
 * yyyyMMdd → yyyy-MM-dd 변환
 */
function formatDateString(date: string): string {
  if (date.length === 8) {
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }
  return date;
}

export const licenseApi = {
  /**
   * 라이선스 목록 조회
   * @flow license-list
   * @returns License[] (백엔드 응답을 변환)
   */
  getLicenses: async (params?: Record<string, unknown>): Promise<License[]> => {
    const response = await apiClient.get<ApiResponse<{ items: LicenseBackendResponse[] }>>('/license-list', { params });
    const rawList = response.data?.data?.items ?? [];
    return rawList.map(transformLicense);
  },

  /**
   * 라이선스 상세 조회
   * BFF 단일 step → 백엔드 LicenseDetailResponse (flat)
   * @flow license-detail
   * @returns 프론트엔드 LicenseDetailAggregated로 변환
   */
  getLicenseDetail: async (params: Record<string, unknown>): Promise<LicenseDetailAggregated> => {
    const response = await apiClient.get<ApiResponse<LicenseDetailBackendResponse>>('/license-detail', { params });
    const raw = response.data?.data;
    return transformDetailResponse(raw);
  },

  /**
   * 라이선스 등록
   * @flow license-create
   * @param data licenseKey (암호화 키 텍스트)
   */
  createLicense: async (data: { licenseKey: string }): Promise<License> => {
    const response = await apiClient.post<ApiResponse<LicenseBackendResponse>>('/license-create', data);
    return transformLicense(response.data?.data);
  },

  /**
   * 라이선스 삭제
   * @flow license-delete
   */
  deleteLicense: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/license-delete', { params });
    return response;
  },

  /**
   * 활성 라이선스 전체 사용 현황
   * @flow license-summary
   * @returns 백엔드 LicenseSummaryResponse → 프론트엔드 LicenseUsageResponse로 변환
   */
  getTotalUsage: async (): Promise<LicenseUsageResponse> => {
    const response = await apiClient.get<ApiResponse<LicenseSummaryBackendResponse>>('/license-summary');
    const summary = response.data?.data;
    return transformSummaryToUsageResponse(summary);
  },

  /**
   * 클러스터별 할당 조회
   * @flow license-clusters
   */
  getClusterAllocations: async (params: Record<string, unknown>): Promise<ClusterAllocation[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ClusterAllocation[] }>>('/license-clusters', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 클러스터 할당 수정
   * @flow license-clusters-update
   */
  updateClusterAllocations: async ({ licenseKind, data }: { licenseKind: string; data: UpdateClusterRequest }) => {
    const response = await apiClient.put('/license-clusters-update', data, {
      params: { licenseKind },
    });
    return response;
  },
};
