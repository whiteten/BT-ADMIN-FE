import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { faultNotificationApi } from '../api/faultNotificationApi';
import type { ExceptCode, ExceptCodeCreateItem, NotiSystem, NotiTarget, NotiTargetCreateDatas, NotiTargetUpdateDatas, NoticeCode } from '../types';

/** 장애통보 관리 쿼리 키 팩토리 */
export const faultNotificationQueryKeys = createQueryKeys('faultNotification', {
  getNotiTargets: (params?: Record<string, unknown>) => [params],
  getNotiSystems: (params?: Record<string, unknown>) => [params],
  getExceptCodes: (params?: Record<string, unknown>) => [params],
  getNoticeCodes: (params?: Record<string, unknown>) => [params],
});

/** 통보 대상 목록 조회 훅 */
export const useGetNotiTargets = ({ queryOptions }: QueryHookWithParamsOptions<NotiTarget[]> = {}) => {
  return useQuery({
    queryKey: faultNotificationQueryKeys.getNotiTargets().queryKey,
    queryFn: () => faultNotificationApi.getTargets(),
    ...queryOptions,
  });
};

/** 통보 시스템 페어 목록 조회 훅 — params.targetId 필수, 사용처에서 queryOptions.enabled 로 제어 */
export const useGetNotiSystems = ({ params, queryOptions }: QueryHookWithParamsOptions<NotiSystem[]> = {}) => {
  return useQuery({
    queryKey: faultNotificationQueryKeys.getNotiSystems(params).queryKey,
    queryFn: () => faultNotificationApi.getSystems(params?.targetId as string),
    ...queryOptions,
  });
};

/** 제외코드 목록 조회 훅 — params.targetId 필수, 사용처에서 queryOptions.enabled 로 제어 */
export const useGetExceptCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<ExceptCode[]> = {}) => {
  return useQuery({
    queryKey: faultNotificationQueryKeys.getExceptCodes(params).queryKey,
    queryFn: () => faultNotificationApi.getExceptCodes(params?.targetId as string),
    ...queryOptions,
  });
};

/** 제외코드 피커 후보 조회 훅 — params.targetId 필수(+선택 sysClassCd/query), 사용처에서 queryOptions.enabled 로 제어 */
export const useGetNoticeCodes = ({ params, queryOptions }: QueryHookWithParamsOptions<NoticeCode[]> = {}) => {
  return useQuery({
    queryKey: faultNotificationQueryKeys.getNoticeCodes(params).queryKey,
    queryFn: () =>
      faultNotificationApi.getNoticeCodes({
        targetId: params?.targetId as string,
        sysClassCd: params?.sysClassCd as string | undefined,
        query: params?.query as string | undefined,
      }),
    ...queryOptions,
  });
};

/** 통보 대상 등록 훅 — 캐시 무효화는 호출 컴포넌트의 mutationOptions.onSuccess 에서 처리 */
export const useCreateNotiTarget = ({ mutationOptions }: MutationHookOptions<NotiTarget, NotiTargetCreateDatas> = {}) => {
  return useMutation({
    mutationFn: (data: NotiTargetCreateDatas) => faultNotificationApi.createTarget(data),
    ...mutationOptions,
  });
};

/** 통보 대상 수정 훅 (연락처·일시정지) */
export const useUpdateNotiTarget = ({ mutationOptions }: MutationHookOptions<NotiTarget, { targetId: string; data: NotiTargetUpdateDatas }> = {}) => {
  return useMutation({
    mutationFn: ({ targetId, data }: { targetId: string; data: NotiTargetUpdateDatas }) => faultNotificationApi.updateTarget(targetId, data),
    ...mutationOptions,
  });
};

/** 통보 대상 삭제 훅 — 시스템 페어·제외코드 연쇄 삭제 */
export const useDeleteNotiTarget = ({ mutationOptions }: MutationHookOptions<void, string> = {}) => {
  return useMutation({
    mutationFn: (targetId: string) => faultNotificationApi.deleteTarget(targetId),
    ...mutationOptions,
  });
};

/** 새 시스템 반영 훅 — 등록 이후 추가된 시스템·모듈을 페어로 보충 (멱등). data = 추가된 페어 수 */
export const useSyncNotiSystems = ({ mutationOptions }: MutationHookOptions<number, string> = {}) => {
  return useMutation({
    mutationFn: (targetId: string) => faultNotificationApi.syncNotiSystems(targetId),
    ...mutationOptions,
  });
};

/** 통보 시스템 발송 토글 훅 — stopped UPDATE (행 유지) */
export const useToggleNotiSystem = ({ mutationOptions }: MutationHookOptions<void, { targetId: string; sysClassCd: string; systemId: number; stopped: boolean }> = {}) => {
  return useMutation({
    mutationFn: (params: { targetId: string; sysClassCd: string; systemId: number; stopped: boolean }) => faultNotificationApi.toggleSystem(params),
    ...mutationOptions,
  });
};

/** 제외코드 추가 훅 — 다건 일괄 POST 1회 */
export const useCreateExceptCodes = ({ mutationOptions }: MutationHookOptions<void, { targetId: string; codes: ExceptCodeCreateItem[] }> = {}) => {
  return useMutation({
    mutationFn: ({ targetId, codes }: { targetId: string; codes: ExceptCodeCreateItem[] }) => faultNotificationApi.createExceptCodes(targetId, codes),
    ...mutationOptions,
  });
};

/** 제외 해제 훅 */
export const useDeleteExceptCode = ({ mutationOptions }: MutationHookOptions<void, { targetId: string; categoryCd: string; errCode: string }> = {}) => {
  return useMutation({
    mutationFn: (params: { targetId: string; categoryCd: string; errCode: string }) => faultNotificationApi.deleteExceptCode(params),
    ...mutationOptions,
  });
};
