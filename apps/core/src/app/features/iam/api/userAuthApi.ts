/**
 * 사용자 권한 매핑 API
 * BFF Flow: user-auth-map-list, user-auth-map-create, user-auth-map-delete
 */
import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { UserAuthMap, UserAuthMapCreateRequest, UserAuthMapCreateResponse } from '../types/iam.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

// API 응답 구조 (단건 응답용)
interface ApiResponse<T> {
  ok: boolean;
  code: string;
  message?: string;
  data: T;
}

// BFF 이중 래핑 시 내부 에러 응답 구조
interface InnerErrorResponse {
  ok: false;
  code: string;
  message: string;
  data: null;
}

/**
 * BFF 이중 래핑 응답에서 내부 에러 확인
 * - BFF가 200 OK로 응답하더라도 내부 data에 에러가 있을 수 있음
 */
function checkInnerError(data: unknown): void {
  if (data && typeof data === 'object' && 'ok' in data) {
    const inner = data as InnerErrorResponse;
    if (inner.ok === false) {
      throw new Error(inner.message || '요청 처리 중 오류가 발생했습니다.');
    }
  }
}

export const userAuthApi = {
  /**
   * 사용자 권한 매핑 목록 조회
   * - 특정 사용자의 개별 권한 목록 조회
   * - BFF가 userId를 path variable로 변환
   */
  getList: async (userId: number): Promise<UserAuthMap[]> => {
    const response = await apiClient.get<ListResponse<UserAuthMap>>('/user-auth-map-list', { params: { userId } });
    return extractList(response);
  },

  /**
   * 사용자 권한 매핑 생성
   * - 단일 사용자에 대해 N개 권한 매핑
   * - BFF가 userId를 path variable로 변환
   * - BFF 이중 래핑 응답 처리: 내부 에러 확인
   */
  create: async (userId: number, data: UserAuthMapCreateRequest): Promise<UserAuthMapCreateResponse> => {
    const response = await apiClient.post<ApiResponse<UserAuthMapCreateResponse>>('/user-auth-map-create', data, { params: { userId } });
    const innerData = response?.data?.data;

    // BFF 이중 래핑 시 내부 에러 확인
    checkInnerError(innerData);

    return innerData ?? { totalCreated: 0, authCount: 0 };
  },

  /**
   * 사용자 권한 매핑 삭제
   * - BFF가 userId, mapId를 path variable로 변환
   */
  delete: async (userId: number, mapId: number): Promise<void> => {
    await apiClient.delete('/user-auth-map-delete', { params: { userId, mapId } });
  },
};
