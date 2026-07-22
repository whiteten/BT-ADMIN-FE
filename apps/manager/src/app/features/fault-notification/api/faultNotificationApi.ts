import ApiClient, { type ApiResponse } from '@/shared-util';
import type { ExceptCode, ExceptCodeCreateItem, NotiSystem, NotiTarget, NotiTargetCreateDatas, NotiTargetUpdateDatas, NoticeCode } from '../types';

/**
 * 장애통보 관리 API 클라이언트 — BFF Flow 경유
 * (manager-fault-noti-target-* / manager-fault-noti-system-* / manager-fault-noti-except-* / manager-fault-noti-code-search)
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const faultNotificationApi = {
  /** 통보 대상 목록 — 배열 응답은 BFF 가 { value: [...] } 로 감싼다 (BFF-AGGREGATION-RESPONSE-SPEC) */
  getTargets: async (): Promise<NotiTarget[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NotiTarget[] }>>('/manager-fault-noti-target-list');
    return response.data.data?.value ?? [];
  },

  /** 통보 대상 등록 — 서버가 시스템마스터 전체를 페어로 함께 INSERT(단일 트랜잭션, 모두 활성) */
  createTarget: async (data: NotiTargetCreateDatas): Promise<NotiTarget> => {
    const response = await apiClient.post<ApiResponse<NotiTarget>>('/manager-fault-noti-target-create', data);
    return response.data.data;
  },

  /** 통보 대상 수정 (연락처·일시정지) */
  updateTarget: async (targetId: string, data: NotiTargetUpdateDatas): Promise<NotiTarget> => {
    const response = await apiClient.put<ApiResponse<NotiTarget>>('/manager-fault-noti-target-update', data, { params: { targetId } });
    return response.data.data;
  },

  /** 통보 대상 삭제 — 통보 시스템 페어·제외코드 행도 연쇄 삭제 */
  deleteTarget: async (targetId: string): Promise<void> => {
    await apiClient.delete('/manager-fault-noti-target-delete', { params: { targetId } });
  },

  /** 통보 시스템 페어 목록 */
  getSystems: async (targetId: string): Promise<NotiSystem[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NotiSystem[] }>>('/manager-fault-noti-system-list', { params: { targetId } });
    return response.data.data?.value ?? [];
  },

  /** 새 시스템 반영 — 대상 등록 이후 SYSTEMLOADMODULE 에 추가된 시스템·모듈을 페어로 보충 (멱등). 반환 = 추가된 페어 수 */
  syncNotiSystems: async (targetId: string): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/manager-fault-noti-system-sync', undefined, { params: { targetId } });
    return response.data.data;
  },

  /** 발송 토글 — 페어 행 stopped UPDATE (행 삭제 없음) */
  toggleSystem: async (params: { targetId: string; sysClassCd: string; systemId: number; stopped: boolean }): Promise<void> => {
    const { targetId, sysClassCd, systemId, stopped } = params;
    await apiClient.put('/manager-fault-noti-system-toggle', { stopped }, { params: { targetId, sysClassCd, systemId } });
  },

  /** 제외코드 목록 */
  getExceptCodes: async (targetId: string): Promise<ExceptCode[]> => {
    const response = await apiClient.get<ApiResponse<{ value: ExceptCode[] }>>('/manager-fault-noti-except-list', { params: { targetId } });
    return response.data.data?.value ?? [];
  },

  /** 제외코드 추가 — 다건 일괄 POST 1회 */
  createExceptCodes: async (targetId: string, codes: ExceptCodeCreateItem[]): Promise<void> => {
    await apiClient.post('/manager-fault-noti-except-create', { codes }, { params: { targetId } });
  },

  /** 제외 해제 — 이 코드 장애가 다시 발송된다 */
  deleteExceptCode: async (params: { targetId: string; categoryCd: string; errCode: string }): Promise<void> => {
    await apiClient.delete('/manager-fault-noti-except-delete', { params });
  },

  /** 제외코드 피커 후보 검색 (코드 사전 ALARM/INFO, excluded = 이미 제외됨) */
  getNoticeCodes: async (params: { targetId: string; sysClassCd?: string; query?: string }): Promise<NoticeCode[]> => {
    const response = await apiClient.get<ApiResponse<{ value: NoticeCode[] }>>('/manager-fault-noti-code-search', { params });
    return response.data.data?.value ?? [];
  },
};
