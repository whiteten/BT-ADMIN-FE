import ApiClient, { type DetailResponse, type ListResponse, extractDetail, extractList } from '@/shared-util';
import type { PasswordChangeRequest, User, UserRequest, UserSearchParams } from '../types/user.types';

/**
 * 페이징 응답 타입 (백엔드 PagedResponse와 일치)
 */
interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * BFF Aggregation Flow를 통한 API 클라이언트
 * 모든 API는 반드시 BFF를 통해서만 호출 (bingbang2.md 규칙 참고)
 *
 * 등록된 flow:
 * - user-list: GET /api/manager/users
 * - user-detail: GET /api/manager/users/{userId}
 * - user-create: POST /api/manager/users
 * - user-update: PUT /api/manager/users/{userId}
 * - user-delete: DELETE /api/manager/users/{userId}
 * - user-search: GET /api/manager/users/search
 * - user-by-sabun: GET /api/manager/users/by-sabun/{userSabun}
 * - user-password: PUT /api/manager/users/{userId}/password
 * - user-unlock: POST /api/manager/users/{userId}/unlock
 * - user-lock: POST /api/manager/users/{userId}/lock
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

export const userApi = {
  /**
   * 사용자 목록 조회 (전체 조회, 페이징 없음)
   * @flow user-list
   */
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<ListResponse<User[]>>('/user-list');
    return extractList(response) as unknown as User[];
  },

  /**
   * 사용자 검색
   * @flow user-search
   */
  searchUsers: async (params?: UserSearchParams): Promise<PagedResponse<User>> => {
    const response = await apiClient.get<ListResponse<PagedResponse<User>>>('/user-search', { params });
    return extractList(response) as unknown as PagedResponse<User>;
  },

  /**
   * 사용자 단건 조회
   * @flow user-detail
   */
  getUser: async (userId: number): Promise<User> => {
    const response = await apiClient.get<DetailResponse<User>>('/user-detail', { params: { userId } });
    return extractDetail(response);
  },

  /**
   * 사번으로 사용자 조회
   * @flow user-by-sabun
   */
  getUserBySabun: async (userSabun: string): Promise<User> => {
    const response = await apiClient.get<DetailResponse<User>>('/user-by-sabun', { params: { userSabun } });
    return extractDetail(response);
  },

  /**
   * 사용자 생성
   * @flow user-create
   */
  createUser: async (data: UserRequest): Promise<User> => {
    const response = await apiClient.post<DetailResponse<User>>('/user-create', data);
    return extractDetail(response);
  },

  /**
   * 사용자 수정
   * @flow user-update
   */
  updateUser: async ({ userId, data }: { userId: number; data: UserRequest }): Promise<User> => {
    const response = await apiClient.put<DetailResponse<User>>('/user-update', data, { params: { userId } });
    return extractDetail(response);
  },

  /**
   * 사용자 삭제
   * @flow user-delete
   */
  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete('/user-delete', { params: { userId } });
  },

  /**
   * 비밀번호 변경
   * @flow user-password
   */
  changePassword: async ({ userId, data }: { userId: number; data: PasswordChangeRequest }): Promise<void> => {
    await apiClient.put('/user-password', data, { params: { userId } });
  },

  /**
   * 로그인 잠금 해제
   * @flow user-unlock
   */
  unlockUser: async (userId: number): Promise<void> => {
    await apiClient.post('/user-unlock', {}, { params: { userId } });
  },

  /**
   * 로그인 잠금
   * @flow user-lock
   */
  lockUser: async (userId: number): Promise<void> => {
    await apiClient.post('/user-lock', {}, { params: { userId } });
  },
};
