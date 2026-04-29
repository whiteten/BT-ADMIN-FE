import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { fileUploadApi } from '../api/fileUploadApi';
import type { FileUploadItem, FileUploadSearchParams } from '../types';

export const fileUploadQueryKeys = createQueryKeys('fileUpload', {
  getFileUploadList: (params?: Record<string, unknown>) => [params],
});

export const useGetFileUploadList = ({ params, queryOptions }: { params?: FileUploadSearchParams | null; queryOptions?: UseQueryOptions<FileUploadItem[]> } = {}) => {
  return useQuery({
    queryKey: fileUploadQueryKeys.getFileUploadList((params as Record<string, unknown>) ?? undefined).queryKey,
    queryFn: () => fileUploadApi.getFileUploadList(params ?? undefined),
    enabled: !!params,
    ...queryOptions,
  });
};

export const useDeleteFileUpload = ({ mutationOptions }: MutationHookOptions<unknown, string> = {}) => {
  return useMutation({
    mutationFn: fileUploadApi.deleteFileUpload,
    ...mutationOptions,
  });
};

export const useRequestStt = ({ mutationOptions }: MutationHookOptions<unknown, File[]> = {}) => {
  return useMutation({
    mutationFn: fileUploadApi.requestStt,
    ...mutationOptions,
  });
};
