/**
 * SLEE 환경변수 React Query 훅
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { sleeConfigApi } from '../api/sleeConfigApi';
import type {
  SleeConfigApplyResult,
  SleeConfigCategory,
  SleeConfigFile,
  SleeConfigIrSystem,
  SleeConfigItemApplyRequest,
  SleeConfigProperty,
  SleeConfigReservationRequest,
  SleeConfigReservationResult,
  SleeConfigTenant,
  SleeUserconfigCreateRequest,
  SleeUserconfigUpdateRequest,
} from '../types/sleeConfig.types';

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
