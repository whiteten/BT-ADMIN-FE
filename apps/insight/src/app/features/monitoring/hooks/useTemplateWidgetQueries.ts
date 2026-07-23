import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { templateWidgetApi } from '../api/templateWidgetApi';
import type { TemplateWidgetDefinitionCreateDatas, TemplateWidgetDefinitionDetail, TemplateWidgetDefinitionListItem } from '../types';

export const templateWidgetKeys = createAppQueryKeys('monitoring-template-widgets', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (templateWidgetId: number) => [templateWidgetId],
});

export const useGetTemplateWidgets = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<TemplateWidgetDefinitionListItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...templateWidgetKeys.list(params), queryFn: () => templateWidgetApi.getList(params), ...queryOptions });

export const useGetTemplateWidget = ({
  params: { templateWidgetId },
  queryOptions,
}: {
  params: { templateWidgetId: number };
  queryOptions?: Omit<UseQueryOptions<TemplateWidgetDefinitionDetail>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...templateWidgetKeys.detail(templateWidgetId), queryFn: () => templateWidgetApi.getDetail(templateWidgetId), ...queryOptions });

export const useCreateTemplateWidget = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<TemplateWidgetDefinitionDetail, Error, TemplateWidgetDefinitionCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: TemplateWidgetDefinitionCreateDatas) => templateWidgetApi.create(data), ...mutationOptions });

export const useUpdateTemplateWidget = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<TemplateWidgetDefinitionDetail, Error, { templateWidgetId: number; data: TemplateWidgetDefinitionCreateDatas }> } = {}) =>
  useMutation({ mutationFn: ({ templateWidgetId, data }) => templateWidgetApi.update(templateWidgetId, data), ...mutationOptions });

export const useDeleteTemplateWidget = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (templateWidgetId: number) => templateWidgetApi.remove(templateWidgetId), ...mutationOptions });
