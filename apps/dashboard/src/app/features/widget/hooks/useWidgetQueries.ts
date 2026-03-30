import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { widgetApi } from '../api/widgetApi';
import type { WidgetItem } from '../types/widget.types';

export const widgetQueryKeys = createQueryKeys('widget', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
});

export const useGetWidgetList = ({ params, queryOptions }: QueryHookWithParamsOptions<WidgetItem[]> = {}) => {
  return useQuery({
    queryKey: widgetQueryKeys.getList(params).queryKey,
    queryFn: () => widgetApi.getList(params),
    ...queryOptions,
  });
};

export const useGetWidgetDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<WidgetItem> = {}) => {
  return useQuery({
    queryKey: widgetQueryKeys.getDetail(params).queryKey,
    queryFn: () => widgetApi.getDetail(params),
    ...queryOptions,
  });
};

export const useCreateWidget = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: widgetApi.create,
    ...mutationOptions,
  });
};

export const useUpdateWidget = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: widgetApi.update,
    ...mutationOptions,
  });
};

export const useDeleteWidget = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: widgetApi.delete,
    ...mutationOptions,
  });
};

export const useValidateFormula = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: widgetApi.validateFormula,
    ...mutationOptions,
  });
};
