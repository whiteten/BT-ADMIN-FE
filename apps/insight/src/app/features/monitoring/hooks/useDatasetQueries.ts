import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { datasetApi } from '../api/datasetApi';
import type { DatasetCreateDatas, DatasetDetail, DatasetListItem } from '../types';

export const monitoringDatasetKeys = createQueryKeys('monitoring-datasets', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (datasetId: number) => [datasetId],
});

export const useGetMonitoringDatasets = ({
  params,
  queryOptions,
}: { params?: Record<string, unknown>; queryOptions?: Omit<UseQueryOptions<DatasetListItem[]>, 'queryKey' | 'queryFn'> } = {}) =>
  useQuery({ ...monitoringDatasetKeys.list(params), queryFn: () => datasetApi.getDatasets(params), ...queryOptions });

export const useGetMonitoringDataset = ({
  params: { datasetId },
  queryOptions,
}: {
  params: { datasetId: number };
  queryOptions?: Omit<UseQueryOptions<DatasetDetail>, 'queryKey' | 'queryFn'>;
}) => useQuery({ ...monitoringDatasetKeys.detail(datasetId), queryFn: () => datasetApi.getDataset(datasetId), ...queryOptions });

export const useCreateMonitoringDataset = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<DatasetDetail, Error, DatasetCreateDatas> } = {}) =>
  useMutation({ mutationFn: (data: DatasetCreateDatas) => datasetApi.createDataset(data), ...mutationOptions });

export const useUpdateMonitoringDataset = ({
  mutationOptions,
}: { mutationOptions?: UseMutationOptions<DatasetDetail, Error, { datasetId: number; data: Partial<DatasetCreateDatas> }> } = {}) =>
  useMutation({ mutationFn: ({ datasetId, data }) => datasetApi.updateDataset(datasetId, data), ...mutationOptions });

export const useDeleteMonitoringDataset = ({ mutationOptions }: { mutationOptions?: UseMutationOptions<void, Error, number> } = {}) =>
  useMutation({ mutationFn: (datasetId: number) => datasetApi.deleteDataset(datasetId), ...mutationOptions });

/** 위저드 Step 2 전용 — 데이터 소스(XML/SQL) 검증. SQL 베이스는 dry-run 컬럼 자동 추출 포함. */
export type ValidateSourceResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  detectedColumns: { columnName: string; dataType: string; columnFormat: string }[];
};
export const useValidateMonitoringDatasetSource = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<ValidateSourceResult, Error, { baseType: 'XML' | 'SQL'; schemaSnapshot: string }>;
} = {}) =>
  useMutation({
    mutationFn: (data: { baseType: 'XML' | 'SQL'; schemaSnapshot: string }) => datasetApi.validateDatasetSource(data),
    ...mutationOptions,
  });
