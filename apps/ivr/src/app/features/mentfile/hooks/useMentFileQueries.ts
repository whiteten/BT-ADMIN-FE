/**
 * IVR 멘트파일 React Query 훅 (AS-IS IPR30S3020)
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { type MutationHookOptions, type QueryHookOptions, type QueryHookWithParamsOptions, downloadBlob, extractApiErrorMessage, extractFileName, toast } from '@/shared-util';
import { createAppQueryKeys } from '../../../shared/queryKeys';
import { mentFileApi } from '../api/mentFileApi';
import type { MentApplyRequest, MentApplyResponse, MentApplyTarget, MentFile, MentFileHistoryRow } from '../types';

export const mentFileQueryKeys = createAppQueryKeys('ivrMentFile', {
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

export const useCreateMentFilesBatch = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mentFileApi.createMentFilesBatch,
    ...mutationOptions,
  });
};

export const useParseMentDesc = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: mentFileApi.parseMentDesc,
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
      try {
        const response = await mentFileApi.downloadMentFile(params);
        const fallback = `mentfile_${params['mentfileId']}`;
        const fileName = extractFileName(response.headers['content-disposition'], fallback);
        downloadBlob(response.data, fileName);
      } catch (err) {
        // blob 응답이라 에러 본문도 Blob → 헬퍼로 백엔드 message 추출 후 토스트
        toast.error(await extractApiErrorMessage(err, '다운로드에 실패했습니다.'));
        throw err;
      }
    },
    ...mutationOptions,
  });
};

/** 멘트파일 목록 엑셀 내보내기 (Blob → 브라우저 다운로드). AS-IS doExcel. */
export const useExportMentFiles = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async () => {
      try {
        const response = await mentFileApi.exportMentFiles();
        const fileName = extractFileName(response.headers['content-disposition'], 'mentfile_list.xlsx');
        downloadBlob(response.data, fileName);
      } catch (err) {
        toast.error(await extractApiErrorMessage(err, '엑셀 내보내기에 실패했습니다.'));
        throw err;
      }
    },
    ...mutationOptions,
  });
};

/** 멘트설명 입력 양식(xlsx) 다운로드 (Blob). */
export const useDownloadDescTemplate = ({ mutationOptions }: MutationHookOptions = {}) => {
  return useMutation({
    mutationFn: async () => {
      try {
        const response = await mentFileApi.downloadDescTemplate();
        const fileName = extractFileName(response.headers['content-disposition'], 'ment_desc_template.xlsx');
        downloadBlob(response.data, fileName);
      } catch (err) {
        toast.error(await extractApiErrorMessage(err, '양식 다운로드에 실패했습니다.'));
        throw err;
      }
    },
    ...mutationOptions,
  });
};
