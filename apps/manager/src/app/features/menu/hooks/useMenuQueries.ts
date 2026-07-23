/**
 * 메뉴 관리 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { menuApi } from '../api/menuApi';
import type { Menu, MenuUpsertRequest } from '../types';

export const menuQueryKeys = createAppQueryKeys('menus', {
  getMenus: null,
});

/**
 * 전체 메뉴 목록 조회 훅
 */
export const useGetMenus = ({ queryOptions }: QueryHookOptions<Menu[]> = {}) => {
  return useQuery({
    queryKey: menuQueryKeys.getMenus.queryKey,
    queryFn: menuApi.getMenus,
    ...queryOptions,
  });
};

/**
 * 메뉴 생성 훅
 */
export const useCreateMenu = ({ mutationOptions }: MutationHookOptions<Menu, MenuUpsertRequest> = {}) => {
  return useMutation({
    mutationFn: menuApi.create,
    ...mutationOptions,
  });
};

/**
 * 메뉴 수정 훅 (IAM v2.3: menuKey 기반)
 */
export const useUpdateMenu = ({ mutationOptions }: MutationHookOptions<Menu, { menuKey: string; data: MenuUpsertRequest }> = {}) => {
  return useMutation({
    mutationFn: menuApi.update,
    ...mutationOptions,
  });
};

/**
 * 메뉴 삭제 훅 (menuKey 기반)
 */
export const useDeleteMenu = ({ mutationOptions }: MutationHookOptions<void, string> = {}) => {
  return useMutation({
    mutationFn: menuApi.delete,
    ...mutationOptions,
  });
};
