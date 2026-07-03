import { type UseMutationOptions, type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { datasetApi } from '../api/datasetApi';
import type { DatasetBaseType, DatasetCreateDatas, DatasetDetail, DatasetListItem } from '../types';

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

/** 위저드 Step 2 전용 — 데이터 소스(REDIS/QUERY) 검증. 베이스별 detectedColumns 자동 추출 포함. */
export type ValidateSourceResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  detectedColumns: {
    columnName: string;
    dataType: string;
    columnFormat: string;
    source?: string;
    comment?: string | null;
    /** DIM(차원) | MSR(측정값) — 필드 사전 지정값(REDIS). 없으면 null(타입으로 폴백) */
    classification?: 'DIM' | 'MSR' | null;
  }[];
  /** REDIS 검증 시 BE가 자동 추정한 값 모드. */
  valueMode?: 'JSON_PER_FIELD' | 'HASH_AS_ROW';
};
export const useValidateMonitoringDatasetSource = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<ValidateSourceResult, Error, { baseType: DatasetBaseType; schemaSnapshot: string }>;
} = {}) =>
  useMutation({
    mutationFn: (data: { baseType: DatasetBaseType; schemaSnapshot: string }) => datasetApi.validateDatasetSource(data),
    ...mutationOptions,
  });

/** 필드 구성 단계 전용 — 조립된 데이터셋(fields/calc/lookups)을 검증. */
export type ValidateDatasetResult = { ok: boolean; errors: string[]; warnings: string[] };
export const useValidateMonitoringDataset = ({
  mutationOptions,
}: {
  mutationOptions?: UseMutationOptions<ValidateDatasetResult, Error, DatasetCreateDatas>;
} = {}) => useMutation({ mutationFn: (data: DatasetCreateDatas) => datasetApi.validateDataset(data), ...mutationOptions });
