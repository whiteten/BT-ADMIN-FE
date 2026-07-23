/**
 * 단말기 관리 React Query 훅 (IPR20S2110)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { deviceApi } from '../api/deviceApi';
import type {
  DevMasterCreateRequest,
  DevMasterResponse,
  DevMasterUpdateRequest,
  DeviceRebootRequest,
  DeviceTypeInfoDto,
  DnAssignRequest,
  FirmwareUseRequest,
  NodeTenantStatDto,
} from '../types';

export const deviceQueryKeys = createAppQueryKeys('devices', {
  list: (params?: Record<string, unknown>) => [params],
  detail: (id?: number) => [id],
  deviceTypes: null,
  nodeTenantStats: null,
  checkMac: (macAddr?: string, excludeId?: number) => [macAddr, excludeId],
});

// ─── Queries ───────────────────────────────────────────────────────────────

export const useGetDevices = (
  params?: { nodeId?: number; deviceType?: number; macAddr?: string; devMstName?: string },
  { queryOptions }: QueryHookOptions<{ items: DevMasterResponse[]; total: number }> = {},
) =>
  useQuery({
    queryKey: deviceQueryKeys.list(params).queryKey,
    queryFn: () => deviceApi.list(params),
    ...queryOptions,
  });

export const useGetDevice = (id: number | null | undefined, { queryOptions }: QueryHookOptions<DevMasterResponse | null> = {}) =>
  useQuery({
    queryKey: deviceQueryKeys.detail(id ?? undefined).queryKey,
    queryFn: () => deviceApi.get(id!),
    enabled: !!id,
    ...queryOptions,
  });

export const useGetDeviceTypes = ({ queryOptions }: QueryHookOptions<DeviceTypeInfoDto[]> = {}) =>
  useQuery({
    queryKey: deviceQueryKeys.deviceTypes.queryKey,
    queryFn: () => deviceApi.listDeviceTypes(),
    staleTime: 5 * 60 * 1000, // 5분 캐시
    ...queryOptions,
  });

export const useGetNodeTenantStats = ({ queryOptions }: QueryHookOptions<NodeTenantStatDto[]> = {}) =>
  useQuery({
    queryKey: deviceQueryKeys.nodeTenantStats.queryKey,
    queryFn: () => deviceApi.nodeTenantStats(),
    ...queryOptions,
  });

// ─── Mutations ─────────────────────────────────────────────────────────────

export const useCreateDevice = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (data: DevMasterCreateRequest) => deviceApi.create(data),
    ...mutationOptions,
  });

export const useUpdateDevice = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: ({ id, data }: { id: number; data: DevMasterUpdateRequest }) => deviceApi.update(id, data),
    ...mutationOptions,
  });

export const useDeleteDevice = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (id: number) => deviceApi.remove(id),
    ...mutationOptions,
  });

export const useUpdateFirmwareUse = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (data: FirmwareUseRequest) => deviceApi.updateFirmwareUse(data),
    ...mutationOptions,
  });

export const useRebootDevices = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (data: DeviceRebootRequest) => deviceApi.reboot(data),
    ...mutationOptions,
  });

export const useAssignDn = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: ({ id, seq, data }: { id: number; seq: number; data: DnAssignRequest }) => deviceApi.assignDn(id, seq, data),
    ...mutationOptions,
  });

export const useDeallocateDn = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: ({ id, seq }: { id: number; seq: number }) => deviceApi.deallocateDn(id, seq),
    ...mutationOptions,
  });

export const useImportDevices = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: ({ nodeId, file }: { nodeId: number; file: File }) => deviceApi.importDevices(nodeId, file),
    ...mutationOptions,
  });
