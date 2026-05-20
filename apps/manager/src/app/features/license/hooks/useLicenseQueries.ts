/**
 * 라이선스 관리 React Query 훅
 * SD-LICENSE-MANAGEMENT.md 설계서 기반
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { licenseApi } from '../api/licenseApi';
import type { ClusterAllocation, License, LicenseDetailAggregated, LicenseUsageResponse } from '../types/license.types';

export const licenseQueryKeys = createQueryKeys('licenses', {
  getLicenses: (params?: Record<string, unknown>) => [params],
  getLicenseDetail: (params?: Record<string, unknown>) => [params],
  getTotalUsage: null,
  getClusterAllocations: (params?: Record<string, unknown>) => [params],
});

/**
 * 라이선스 목록 조회
 * overallUsageRate 포함, items 미포함 (카드 표시용)
 */
export const useGetLicenses = ({ params, queryOptions }: QueryHookWithParamsOptions<License[]> = {}) => {
  return useQuery({
    queryKey: licenseQueryKeys.getLicenses(params).queryKey,
    queryFn: () => licenseApi.getLicenses(params),
    ...queryOptions,
  });
};

/**
 * 라이선스 상세 + 사용 현황 집계 조회
 * BFF가 license + usage를 한 번에 집계
 */
export const useGetLicenseDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<LicenseDetailAggregated> = {}) => {
  return useQuery({
    queryKey: licenseQueryKeys.getLicenseDetail(params).queryKey,
    queryFn: () => licenseApi.getLicenseDetail(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 활성 라이선스 전체 사용 현황
 * serverGroups[]로 이미 그룹핑되어 응답
 */
export const useGetTotalUsage = ({ queryOptions }: QueryHookWithParamsOptions<LicenseUsageResponse> = {}) => {
  return useQuery({
    queryKey: licenseQueryKeys.getTotalUsage.queryKey,
    queryFn: () => licenseApi.getTotalUsage(),
    ...queryOptions,
  });
};

/**
 * 클러스터별 할당 조회
 */
export const useGetClusterAllocations = ({ params, queryOptions }: QueryHookWithParamsOptions<ClusterAllocation[]> = {}) => {
  return useQuery({
    queryKey: licenseQueryKeys.getClusterAllocations(params).queryKey,
    queryFn: () => licenseApi.getClusterAllocations(params ?? {}),
    ...queryOptions,
  });
};

/**
 * 라이선스 등록 (multipart/form-data)
 */
export const useCreateLicense = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: licenseApi.createLicense,
    ...mutationOptions,
  });
};

/**
 * 라이선스 삭제
 */
export const useDeleteLicense = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: licenseApi.deleteLicense,
    ...mutationOptions,
  });
};

/**
 * 클러스터 할당 수정
 */
export const useUpdateClusterAllocations = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: licenseApi.updateClusterAllocations,
    ...mutationOptions,
  });
};
