/**
 * 메뉴 관리 API
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { Menu, MenuUpsertRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const menuApi = {
  /**
   * 전체 메뉴 목록 조회 (flat)
   */
  getMenus: async (): Promise<Menu[]> => {
    const response = await apiClient.get<ApiResponse<{ items: Menu[] }>>('/menu-list');
    return response.data?.data?.items ?? [];
  },

  /**
   * 메뉴 생성
   */
  create: async (data: MenuUpsertRequest): Promise<Menu> => {
    const response = await apiClient.post<ApiResponse<Menu>>('/menu-create', data);
    return response?.data?.data;
  },

  /**
   * 메뉴 수정 (IAM v2.3: menuKey 기반).
   * BFF flow URI가 `/api/manager/menus/{id}` 이므로 query param 이름은 id로 유지.
   */
  update: async ({ menuKey, data }: { menuKey: string; data: MenuUpsertRequest }): Promise<Menu> => {
    const response = await apiClient.put<ApiResponse<Menu>>('/menu-update', data, { params: { id: menuKey } });
    return response?.data?.data;
  },

  /**
   * 메뉴 삭제 (menuKey 기반).
   */
  delete: async (menuKey: string): Promise<void> => {
    await apiClient.delete('/menu-delete', { params: { id: menuKey } });
  },
};
