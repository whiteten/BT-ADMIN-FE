/**
 * 메뉴 관리 API
 */
import ApiClient, { type ListResponse, extractList } from '@/shared-util';
import type { Menu, MenuUpsertRequest } from '../types/menu.types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const menuApi = {
  /**
   * 전체 메뉴 목록 조회 (flat)
   */
  getMenus: async (): Promise<Menu[]> => {
    const response = await apiClient.get<ListResponse<Menu>>('/menu-list');
    return extractList(response);
  },

  /**
   * 메뉴 생성
   */
  create: async (data: MenuUpsertRequest): Promise<Menu> => {
    const response = await apiClient.post<{ data: Menu }>('/menu-create', data);
    return response?.data?.data;
  },

  /**
   * 메뉴 수정
   */
  update: async ({ id, data }: { id: number; data: MenuUpsertRequest }): Promise<Menu> => {
    const response = await apiClient.put<{ data: Menu }>('/menu-update', data, { params: { id } });
    return response?.data?.data;
  },

  /**
   * 메뉴 삭제
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete('/menu-delete', { params: { id } });
  },
};
