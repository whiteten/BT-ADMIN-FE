/**
 * SLEE 환경변수 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { type MutationHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractApiErrorMessage, extractFileName, toast } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { sleeConfigApi } from '../api/sleeConfigApi';
import type {
  SleeConfigApplyResult,
  SleeConfigApplyResultRow,
  SleeConfigBackupCompareRow,
  SleeConfigBackupHeader,
  SleeConfigBackupRestoreResponse,
  SleeConfigCategory,
  SleeConfigDeleteFileResponse,
  SleeConfigFile,
  SleeConfigHistoryRow,
  SleeConfigIrSystem,
  SleeConfigItemApplyRequest,
  SleeConfigProperty,
  SleeConfigReservationRequest,
  SleeConfigReservationResult,
  SleeUserconfigCreateRequest,
  SleeUserconfigImportResponse,
  SleeUserconfigUpdateRequest,
} from '../types';

interface PropertyKey {
  tenantId: number;
  configFile: string;
  category: string;
  property: string;
}

interface DeletePropertyParams {
  tenantId: number;
  configFile: string;
  property?: string;
  category?: string;
}

interface UpdatePropertyVariables {
  key: PropertyKey;
  data: SleeUserconfigUpdateRequest;
}

export const sleeConfigQueryKeys = createAppQueryKeys('sleeConfig', {
  getConfigFiles: (params?: Record<string, unknown>) => [params],
  getCategories: (params?: Record<string, unknown>) => [params],
  getProperties: (params?: Record<string, unknown>) => [params],
  getIrSystems: (params?: Record<string, unknown>) => [params],
  getHistory: (params?: Record<string, unknown>) => [params],
  getApplyResults: (params?: Record<string, unknown>) => [params],
  getBackups: (params?: Record<string, unknown>) => [params],
  getBackupCompare: (params?: Record<string, unknown>) => [params],
});

export const useGetSleeConfigFiles = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigFile[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getConfigFiles(params).queryKey,
    queryFn: () => sleeConfigApi.getConfigFiles(params),
    ...queryOptions,
  });
};

export const useGetSleeConfigCategories = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigCategory[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getCategories(params).queryKey,
    queryFn: () => sleeConfigApi.getCategories(params ?? {}),
    ...queryOptions,
  });
};

export const useGetSleeConfigProperties = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigProperty[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getProperties(params).queryKey,
    queryFn: () => sleeConfigApi.getProperties(params ?? {}),
    ...queryOptions,
  });
};

export const useGetSleeConfigIrSystems = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigIrSystem[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getIrSystems(params).queryKey,
    queryFn: () => sleeConfigApi.getIrSystems(params ?? {}),
    ...queryOptions,
  });
};

export const useApplyItemImmediate = ({ mutationOptions }: MutationHookOptions<SleeConfigApplyResult[], SleeConfigItemApplyRequest> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.applyItemImmediate,
    ...mutationOptions,
  });
};

export const useApplyReservation = ({ mutationOptions }: MutationHookOptions<SleeConfigReservationResult, SleeConfigReservationRequest> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.applyReservation,
    ...mutationOptions,
  });
};

export const useCreateProperty = ({ mutationOptions }: MutationHookOptions<void, SleeUserconfigCreateRequest> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.createProperty,
    ...mutationOptions,
  });
};

export const useUpdateProperty = ({ mutationOptions }: MutationHookOptions<void, UpdatePropertyVariables> = {}) => {
  return useMutation({
    mutationFn: ({ key, data }: UpdatePropertyVariables) => sleeConfigApi.updateProperty(key, data),
    ...mutationOptions,
  });
};

export const useDeleteProperty = ({ mutationOptions }: MutationHookOptions<number, DeletePropertyParams> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.deleteProperty,
    ...mutationOptions,
  });
};

/** SLEE 환경변수 cfg 파일 다중 Import — AS-IS IPR20S6060MFU 동등. */
export const useImportUserconfig = ({ mutationOptions }: MutationHookOptions<SleeUserconfigImportResponse, { params: { tenantId: number }; files: File[] }> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.importUserconfig,
    ...mutationOptions,
  });
};

/** 환경변수 cfg ZIP Export (Blob → 브라우저 다운로드) — AS-IS IPR30S3030EX. */
export const useExportSleeConfig = ({ mutationOptions }: MutationHookOptions<void, { tenantId: number; configFile: string }> = {}) => {
  return useMutation({
    mutationFn: async (params: { tenantId: number; configFile: string }) => {
      try {
        const response = await sleeConfigApi.exportConfig(params);
        const fileName = extractFileName(response.headers['content-disposition'], 'SCENARIO_CONFIG.zip');
        downloadBlob(response.data, fileName);
      } catch (err) {
        toast.error(await extractApiErrorMessage(err, '환경변수 Export에 실패했습니다.'));
        throw err;
      }
    },
    ...mutationOptions,
  });
};

// ─── Phase 1: 환경파일 전체 삭제 ─────────────────────────────────────────

export const useDeleteConfigFile = ({ mutationOptions }: MutationHookOptions<SleeConfigDeleteFileResponse, { tenantId: number; configFile: string }> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.deleteConfigFile,
    ...mutationOptions,
  });
};

// ─── Phase 2: 적용 이력 + 백업 ──────────────────────────────────────────

interface GetHistoryParams {
  tenantId: number;
  configFile: string;
  rtResvKind?: number;
  startDate?: string;
  endDate?: string;
  applyReason?: string;
}

export const useGetHistory = ({
  params,
  queryOptions,
}: {
  params?: GetHistoryParams;
  queryOptions?: Omit<Parameters<typeof useQuery<SleeConfigHistoryRow[]>>[0], 'queryKey' | 'queryFn'>;
} = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getHistory(params as Record<string, unknown> | undefined).queryKey,
    queryFn: () => sleeConfigApi.getHistory(params as GetHistoryParams),
    enabled: !!params?.tenantId && !!params?.configFile,
    ...queryOptions,
  });
};

interface GetApplyResultsParams {
  tenantId: number;
  configFile: string;
}

/** 예약 적용 결과 조회 — AS-IS IPR30S3030L3. tenant/configFile 둘 다 있을 때만 조회. */
export const useGetApplyResults = ({
  params,
  queryOptions,
}: {
  params?: GetApplyResultsParams;
  queryOptions?: Omit<Parameters<typeof useQuery<SleeConfigApplyResultRow[]>>[0], 'queryKey' | 'queryFn'>;
} = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getApplyResults(params as Record<string, unknown> | undefined).queryKey,
    queryFn: () => sleeConfigApi.getApplyResults(params as GetApplyResultsParams),
    enabled: !!params?.tenantId && !!params?.configFile,
    ...queryOptions,
  });
};

export const useGetBackups = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigBackupHeader[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getBackups(params).queryKey,
    queryFn: () => sleeConfigApi.getBackups(params as { tenantId: number; configFile: string }),
    enabled: !!(params as { tenantId?: number; configFile?: string } | undefined)?.tenantId && !!(params as { tenantId?: number; configFile?: string } | undefined)?.configFile,
    ...queryOptions,
  });
};

export const useGetBackupCompare = ({ params, queryOptions }: QueryHookWithParamsOptions<SleeConfigBackupCompareRow[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getBackupCompare(params).queryKey,
    queryFn: () => sleeConfigApi.getBackupCompare(params as { backupListId: number; tenantId: number; configFile: string }),
    enabled: !!(params as { backupListId?: number } | undefined)?.backupListId,
    ...queryOptions,
  });
};

export const useRestoreBackup = ({
  mutationOptions,
}: MutationHookOptions<SleeConfigBackupRestoreResponse, { backupListId: number; tenantId: number; configFile: string }> = {}) => {
  return useMutation({
    mutationFn: sleeConfigApi.restoreBackup,
    ...mutationOptions,
  });
};
