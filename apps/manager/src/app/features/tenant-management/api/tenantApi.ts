/**
 * 테넌트 관리 API 클라이언트
 * BFF Aggregation Flow 기반
 *
 * 등록된 flow (DB: TB_BT_CM_AGG_FLOW_MST):
 * - manager-tenant-list:             GET    테넌트 목록 조회
 * - manager-tenant-detail:           GET    테넌트 상세 조회
 * - manager-tenant-create:           POST   테넌트 등록
 * - manager-tenant-update:           PUT    테넌트 수정
 * - manager-tenant-delete:           DELETE 테넌트 비활성화
 * - manager-tenant-name-check:       GET    테넌트명 중복체크
 * - manager-tenant-callgroup-list:   GET    통화그룹 목록
 * - manager-tenant-callgroup-create: POST   통화그룹 등록
 * - manager-tenant-callgroup-update: PUT    통화그룹 수정
 * - manager-tenant-callgroup-delete: DELETE 통화그룹 삭제
 */
import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type {
  CallGroupBackendResponse,
  CallGroupCreateData,
  CallGroupItem,
  CallGroupUpdateData,
  TenantBackendResponse,
  TenantCreateData,
  TenantDetail,
  TenantDetailBackendResponse,
  TenantListItem,
  TenantUpdateData,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

/**
 * 백엔드 응답을 프론트엔드 TenantListItem으로 변환
 */
function transformTenantListItem(raw: TenantBackendResponse): TenantListItem {
  return {
    tenantId: raw.tenantId,
    tenantName: raw.tenantName,
    tenantAlias: raw.tenantAlias,
    companyName: raw.companyName,
    contractStatus: raw.contractStatus,
    contractStatusName: raw.contractStatusName,
    contractStartDate: raw.contractStartDate,
    contractFinshDate: raw.contractFinshDate,
    contractMonth: raw.contractMonth,
    managerName: raw.managerName,
    maxCoAmount: raw.maxCoAmount,
    didLicAmount: raw.didLicAmount,
    maxCtiAmount: raw.maxCtiAmount,
    maxExtAmount: raw.maxExtAmount,
    activeYn: raw.activeYn,
  };
}

/**
 * 백엔드 상세 응답을 프론트엔드 TenantDetail로 변환
 */
function transformTenantDetail(raw: TenantDetailBackendResponse): TenantDetail {
  return {
    tenantId: raw.tenantId,
    tenantName: raw.tenantName,
    tenantAlias: raw.tenantAlias,
    companyId: raw.companyId,
    companyName: raw.companyName,
    contractStartDate: raw.contractStartDate,
    contractFinshDate: raw.contractFinshDate,
    contractMonth: raw.contractMonth,
    expireDate: raw.expireDate,
    contractStatus: raw.contractStatus,
    contractStatusName: raw.contractStatusName,
    tntAddr1: raw.tntAddr1,
    tntAddr2: raw.tntAddr2,
    tntTelNo: raw.tntTelNo,
    tntFaxNo: raw.tntFaxNo,
    managerName: raw.managerName,
    managerTelNo: raw.managerTelNo,
    managerMobileNo: raw.managerMobileNo,
    managerEmail: raw.managerEmail,
    didLicAmount: raw.didLicAmount,
    dodLicAmount: raw.dodLicAmount,
    maxCoAmount: raw.maxCoAmount,
    maxExtAmount: raw.maxExtAmount,
    maxCtiAmount: raw.maxCtiAmount,
    maxEmsAmount: raw.maxEmsAmount,
    maxArsAmount: raw.maxArsAmount,
    maxVlcAmount: raw.maxVlcAmount,
    dashInitHour: raw.dashInitHour,
    dashInitMinute: raw.dashInitMinute,
    activeYn: raw.activeYn,
    accQwaittimeUseYn: raw.accQwaittimeUseYn,
    ivrQwaittimeUseYn: raw.ivrQwaittimeUseYn,
    custTalkMax: raw.custTalkMax,
    statType: raw.statType,
  };
}

/**
 * 백엔드 CallGroup 응답을 프론트엔드 CallGroupItem으로 변환
 */
function transformCallGroup(raw: CallGroupBackendResponse): CallGroupItem {
  return {
    tenantId: raw.tenantId,
    tenantName: raw.tenantName,
    gubun: raw.gubun,
    useYn: raw.useYn,
  };
}

export const tenantApi = {
  /**
   * 테넌트 목록 조회
   * @flow manager-tenant-list
   */
  getTenants: async (params?: Record<string, unknown>): Promise<TenantListItem[]> => {
    const response = await apiClient.get<ListResponse<TenantBackendResponse>>('/manager-tenant-list', { params });
    const rawList = extractList(response);
    return rawList.map(transformTenantListItem);
  },

  /**
   * 테넌트 상세 조회
   * @flow manager-tenant-detail
   */
  getTenant: async (params: Record<string, unknown>): Promise<TenantDetail> => {
    const response = await apiClient.get<DetailResponse<TenantDetailBackendResponse>>('/manager-tenant-detail', { params });
    const raw = extractDetail(response);
    return transformTenantDetail(raw);
  },

  /**
   * 테넌트 등록
   * @flow manager-tenant-create
   */
  createTenant: async (data: TenantCreateData): Promise<TenantListItem> => {
    const response = await apiClient.post<DetailResponse<TenantBackendResponse>>('/manager-tenant-create', data);
    return transformTenantListItem(extractDetail(response));
  },

  /**
   * 테넌트 수정
   * @flow manager-tenant-update
   */
  updateTenant: async ({ id, data }: { id: number; data: TenantUpdateData }): Promise<TenantListItem> => {
    const response = await apiClient.put<DetailResponse<TenantBackendResponse>>('/manager-tenant-update', data, { params: { id } });
    return transformTenantListItem(extractDetail(response));
  },

  /**
   * 테넌트 비활성화
   * @flow manager-tenant-delete
   */
  deleteTenant: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/manager-tenant-delete', { params });
    return response;
  },

  /**
   * 테넌트명 중복체크
   * @flow manager-tenant-name-check
   */
  checkTenantName: async (params: Record<string, unknown>): Promise<boolean> => {
    const response = await apiClient.get<DetailResponse<{ value: boolean }>>('/manager-tenant-name-check', { params });
    return extractDetail(response)?.value ?? false;
  },

  /**
   * 통화그룹 목록 조회
   * @flow manager-tenant-callgroup-list
   */
  getCallGroups: async (params: Record<string, unknown>): Promise<CallGroupItem[]> => {
    const response = await apiClient.get<DetailResponse<{ value: CallGroupBackendResponse[] }>>('/manager-tenant-callgroup-list', { params });
    const rawList = extractDetail(response)?.value ?? [];
    return rawList.map(transformCallGroup);
  },

  /**
   * 통화그룹 등록
   * @flow manager-tenant-callgroup-create
   */
  createCallGroup: async ({ id, data }: { id: number; data: CallGroupCreateData }) => {
    const response = await apiClient.post('/manager-tenant-callgroup-create', data, { params: { id } });
    return response;
  },

  /**
   * 통화그룹 수정
   * @flow manager-tenant-callgroup-update
   */
  updateCallGroup: async ({ id, targetTenantId, data }: { id: number; targetTenantId: number; data: CallGroupUpdateData }) => {
    const response = await apiClient.put('/manager-tenant-callgroup-update', data, { params: { id, targetTenantId } });
    return response;
  },

  /**
   * 통화그룹 삭제
   * @flow manager-tenant-callgroup-delete
   */
  deleteCallGroup: async (params: Record<string, unknown>) => {
    const response = await apiClient.delete('/manager-tenant-callgroup-delete', { params });
    return response;
  },
};
