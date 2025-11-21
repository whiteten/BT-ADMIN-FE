import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookWithIdOptions, MutationHookWithParamsOptions, QueryHookWithIdOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { phoneService } from '../services/phoneService';

export const phoneQueryKeys = createQueryKeys('phone', {
  getPhones: (params?: Record<string, unknown> | undefined) => [params],
  getPhone: (id: string, params?: Record<string, unknown> | undefined) => [id, params],
});

export const useGetPhones = ({ params, queryOptions }: QueryHookWithParamsOptions = {}) => {
  return useQuery({
    queryKey: phoneQueryKeys.getPhones(params).queryKey,
    queryFn: () => phoneService.getPhones(params),
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
};

export const useGetPhone = ({ id, params, queryOptions }: QueryHookWithIdOptions) => {
  return useQuery({
    queryKey: phoneQueryKeys.getPhone(id, params).queryKey,
    queryFn: () => phoneService.getPhone(id, params),
    ...queryOptions,
  });
};

export const useCreatePhone = ({ params, mutationOptions }: MutationHookWithParamsOptions = {}) => {
  return useMutation({
    mutationFn: () => phoneService.createPhone(params),
    ...mutationOptions,
  });
};

export const useUpdatePhone = ({ id, params, mutationOptions }: MutationHookWithIdOptions) => {
  return useMutation({
    mutationFn: () => phoneService.updatePhone(id, params),
    ...mutationOptions,
  });
};

export const useDeletePhone = ({ id, mutationOptions }: MutationHookWithIdOptions) => {
  return useMutation({
    mutationFn: () => phoneService.deletePhone(id),
    ...mutationOptions,
  });
};
