import { type UseQueryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { fileUploadApi } from '../api/fileUploadApi';
import type { FileUploadItem, FileUploadSearchParams } from '../types';

export const fileUploadQueryKeys = createQueryKeys('fileUpload', {
  getFileUploadList: (params?: Record<string, unknown>) => [params],
});

export const useGetFileUploadList = ({
  params,
  queryOptions,
}: { params?: FileUploadSearchParams | null; queryOptions?: Omit<UseQueryOptions<FileUploadItem[]>, 'queryKey' | 'queryFn'> } = {}) => {
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

export const useUploadSttFile = (
  { menuId, mutationOptions }: { menuId: string } & MutationHookOptions<{ uploadedFilename: string; uploadPath: string }, File> = { menuId: '' },
) => {
  return useMutation({
    mutationFn: (file: File) => fileUploadApi.uploadSttFile(file, menuId),
    ...mutationOptions,
  });
};

export const useRequestStt = ({ mutationOptions }: MutationHookOptions<unknown, { fileName: string; filePath: string }[]> = {}) => {
  return useMutation({
    mutationFn: fileUploadApi.requestStt,
    ...mutationOptions,
  });
};
