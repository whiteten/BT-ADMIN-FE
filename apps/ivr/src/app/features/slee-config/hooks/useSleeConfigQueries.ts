/**
 * SLEE 환경변수 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { sleeConfigApi } from '../api/sleeConfigApi';
import type {
  SleeConfigApplyResult,
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
  SleeConfigTenant,
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

export const sleeConfigQueryKeys = createQueryKeys('sleeConfig', {
  getTenants: null,
  getConfigFiles: (params?: Record<string, unknown>) => [params],
  getCategories: (params?: Record<string, unknown>) => [params],
  getProperties: (params?: Record<string, unknown>) => [params],
  getIrSystems: (params?: Record<string, unknown>) => [params],
  getHistory: (params?: Record<string, unknown>) => [params],
  getBackups: (params?: Record<string, unknown>) => [params],
  getBackupCompare: (params?: Record<string, unknown>) => [params],
});

export const useGetSleeConfigTenants = ({ queryOptions }: QueryHookOptions<SleeConfigTenant[]> = {}) => {
  return useQuery({
    queryKey: sleeConfigQueryKeys.getTenants.queryKey,
    queryFn: () => sleeConfigApi.getTenants(),
    ...queryOptions,
  });
};

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
