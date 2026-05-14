import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { conditionApi, datasourceApi, statQueryApi, widgetApi } from '../api/statApi';
import type { SearchConditionItem } from '../types/condition';
import type { DataSourceItem, PrefixCandidate } from '../types/datasource';
import type { StatisticsPreviewRequest, StatisticsQueryResponse } from '../types/query';
import type { WidgetItem } from '../types/widget';

// Widget
export const widgetQueryKeys = createQueryKeys('stat-widget', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
});

export const useGetWidgetList = ({ params, queryOptions }: QueryHookWithParamsOptions<WidgetItem[]> = {}) =>
  useQuery({ queryKey: widgetQueryKeys.getList(params).queryKey, queryFn: () => widgetApi.getList(params), ...queryOptions });

export const useGetWidgetDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<WidgetItem> = {}) =>
  useQuery({ queryKey: widgetQueryKeys.getDetail(params).queryKey, queryFn: () => widgetApi.getDetail(params), ...queryOptions });

export const useCreateWidget = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: widgetApi.create, ...mutationOptions });

export const useUpdateWidget = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: widgetApi.update, ...mutationOptions });

export const useDeleteWidget = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: widgetApi.delete, ...mutationOptions });

export const useValidateFormula = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: widgetApi.validateFormula, ...mutationOptions });

// Datasource
export const datasourceQueryKeys = createQueryKeys('stat-datasource', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
  getCandidates: (params?: Record<string, unknown>) => [params],
});

export const useGetDatasourceList = ({ params, queryOptions }: QueryHookWithParamsOptions<DataSourceItem[]> = {}) =>
  useQuery({ queryKey: datasourceQueryKeys.getList(params).queryKey, queryFn: () => datasourceApi.getList(params), ...queryOptions });

export const useGetDatasourceDetail = ({ params, queryOptions }: QueryHookWithParamsOptions<DataSourceItem> = {}) =>
  useQuery({ queryKey: datasourceQueryKeys.getDetail(params).queryKey, queryFn: () => datasourceApi.getDetail(params), ...queryOptions });

export const useGetPrefixCandidates = ({ params, queryOptions }: QueryHookWithParamsOptions<PrefixCandidate[]> = {}) =>
  useQuery({ queryKey: datasourceQueryKeys.getCandidates(params).queryKey, queryFn: () => datasourceApi.getCandidates(params), ...queryOptions });

export const useCreateDatasource = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: datasourceApi.create, ...mutationOptions });

export const useUpdateDatasource = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: datasourceApi.update, ...mutationOptions });

export const useDeleteDatasource = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: datasourceApi.delete, ...mutationOptions });

export const useLoadSchema = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: datasourceApi.loadSchema, ...mutationOptions });

// Condition
export const conditionQueryKeys = createQueryKeys('stat-condition', {
  getList: (params?: Record<string, unknown>) => [params],
  getDetail: (params?: Record<string, unknown>) => [params],
});

export const useGetConditionList = ({ params, queryOptions }: QueryHookWithParamsOptions<SearchConditionItem[]> = {}) =>
  useQuery({ queryKey: conditionQueryKeys.getList(params).queryKey, queryFn: () => conditionApi.getList(params), ...queryOptions });

export const useCreateCondition = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: conditionApi.create, ...mutationOptions });

export const useUpdateCondition = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: conditionApi.update, ...mutationOptions });

export const useDeleteCondition = ({ mutationOptions }: MutationHookOptions = {}) => useMutation({ mutationFn: conditionApi.delete, ...mutationOptions });

// Stat Query
export const usePreviewStatQuery = ({ mutationOptions }: MutationHookOptions<StatisticsQueryResponse, StatisticsPreviewRequest> = {}) =>
  useMutation({ mutationFn: statQueryApi.preview, ...mutationOptions });
