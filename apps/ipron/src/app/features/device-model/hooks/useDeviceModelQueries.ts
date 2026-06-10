/**
 * 단말모델 관리 React Query 훅 (IPR20S2120)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookOptions } from '@/shared-util';
import { deviceModelApi } from '../api/deviceModelApi';
import type { DeviceModelCreateRequest, DeviceModelResponse, DeviceModelUpdateRequest } from '../types';

export const deviceModelQueryKeys = createQueryKeys('deviceModels', {
  list: null,
  detail: (deviceType?: number) => [deviceType],
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const useGetDeviceModels = ({ queryOptions }: QueryHookOptions<DeviceModelResponse[]> = {}) =>
  useQuery({
    queryKey: deviceModelQueryKeys.list.queryKey,
    queryFn: () => deviceModelApi.list(),
    ...queryOptions,
  });

export const useGetDeviceModel = (id: number | null | undefined, { queryOptions }: QueryHookOptions<DeviceModelResponse | null> = {}) =>
  useQuery({
    queryKey: deviceModelQueryKeys.detail(id ?? undefined).queryKey,
    queryFn: () => deviceModelApi.get(id ?? -1),
    enabled: id != null,
    ...queryOptions,
  });

// ─── Mutations ───────────────────────────────────────────────────────────────

export const useCreateDeviceModel = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (data: DeviceModelCreateRequest) => deviceModelApi.create(data),
    ...mutationOptions,
  });

export const useUpdateDeviceModel = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeviceModelUpdateRequest }) => deviceModelApi.update(id, data),
    ...mutationOptions,
  });

export const useDeleteDeviceModel = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (id: number) => deviceModelApi.remove(id),
    ...mutationOptions,
  });

export const useUploadFirmware = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => deviceModelApi.uploadFirmware(id, file),
    ...mutationOptions,
  });

export const useSyncFirmware = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: (id: number) => deviceModelApi.syncFirmware(id),
    ...mutationOptions,
  });
