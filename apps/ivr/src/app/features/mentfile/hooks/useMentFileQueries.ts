/**
 * IVR 멘트파일 React Query 훅 (AS-IS IPR30S3020)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import { type MutationHookOptions, type QueryHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractFileName } from '@/shared-util';
import { mentFileApi } from '../api/mentFileApi';
import type { MentApplyRequest, MentApplyResponse, MentApplyTarget, MentFile, MentFileHistoryRow } from '../types';

export const mentFileQueryKeys = createQueryKeys('ivrMentFile', {
  list: null,
  detail: (params?: Record<string, unknown>) => [params],
  applyTargets: (params?: Record<string, unknown>) => [params],
  history: (params?: Record<string, unknown>) => [params],
});

// ─── 조회 ─────────────────────────────────────────────────────────────────

export const useGetMentFiles = ({ queryOptions }: QueryHookOptions<MentFile[]> = {}) => {
  return useQuery({
    queryKey: mentFileQueryKeys.list.queryKey,
    queryFn: () => mentFileApi.getMentFiles(),
    ...queryOptions,
  });
};

export const useGetMentFile = ({ params, queryOptions }: QueryHookWithParamsOptions<MentFile> = {}) => {
  return useQuery({
    queryKey: mentFileQueryKeys.detail(params).queryKey,
    queryFn: () => mentFileApi.getMentFile(params as { mentfileId: number }),
    ...queryOptions,
  });
};

export const useGetApplyTargets = ({ params, queryOptions }: QueryHookWithParamsOptions<MentApplyTarget[]> = {}) => {
  return useQuery({
    queryKey: mentFileQueryKeys.applyTargets(params).queryKey,
    queryFn: () => mentFileApi.getApplyTargets(params as { mentfileId: number }),
    ...queryOptions,
  });
};

// ─── 변경 ─────────────────────────────────────────────────────────────────

export const useCreateMentFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mentFileApi.createMentFile,
    ...mutationOptions,
  });
};

export const useUpdateMentFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mentFileApi.updateMentFile,
    ...mutationOptions,
  });
};

export const useUpdateMentFileWithFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mentFileApi.updateMentFileWithFile,
    ...mutationOptions,
  });
};

export const useDeleteMentFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mentFileApi.deleteMentFile,
    ...mutationOptions,
  });
};

// ─── 적용 (즉시/예약 통합) ────────────────────────────────────────────────

export const useApplyMentFile = ({ mutationOptions }: MutationHookOptions<MentApplyResponse, MentApplyRequest> = {}) => {
  return useMutation({
    mutationFn: mentFileApi.applyMentFile,
    ...mutationOptions,
  });
};

// ─── 적용 이력 ─────────────────────────────────────────────────────────

interface GetHistoryParams {
  mentfileIds?: number[];
  rtServKind?: number;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

export const useGetMentFileHistory = ({
  params,
  queryOptions,
}: {
  params?: GetHistoryParams;
  queryOptions?: Omit<Parameters<typeof useQuery<MentFileHistoryRow[]>>[0], 'queryKey' | 'queryFn'>;
} = {}) => {
  return useQuery({
    queryKey: mentFileQueryKeys.history(params as Record<string, unknown> | undefined).queryKey,
    queryFn: () => mentFileApi.getHistory((params as GetHistoryParams) ?? {}),
    ...queryOptions,
  });
};

// ─── 다운로드 ─────────────────────────────────────────────────────────────

/** 멘트 원본 파일 다운로드 (Blob). 시나리오 패턴 동등. */
export const useDownloadMentFile = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      const response = await mentFileApi.downloadMentFile(params);
      const fallback = `mentfile_${params['mentfileId']}`;
      const fileName = extractFileName(response.headers['content-disposition'], fallback);
      downloadBlob(response.data, fileName);
    },
    ...mutationOptions,
  });
};
