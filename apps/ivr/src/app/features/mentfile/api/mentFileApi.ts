/**
 * IVR 멘트파일 API 클라이언트 — AS-IS IPR30S3020.
 *
 * BFF Aggregation Flow:
 *   - ivr-mentfile-list                GET    목록
 *   - ivr-mentfile-detail              GET    단건
 *   - ivr-mentfile-create              POST   등록 (multipart, uploadFile 필수)
 *   - ivr-mentfile-update              PUT    메타 수정 (JSON, null IGNORE)
 *   - ivr-mentfile-update-with-file    POST   파일 교체 + 메타 수정 (multipart, PUT 위장)
 *   - ivr-mentfile-delete              DELETE 삭제
 *   - ivr-mentfile-apply-targets       GET    적용 대상 시스템 목록
 *   - ivr-mentfile-apply               POST   즉시/예약 적용 통합
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type {
  MentApplyRequest,
  MentApplyResponse,
  MentApplyTarget,
  MentDescRow,
  MentFile,
  MentFileBatchResult,
  MentFileCreateRequest,
  MentFileHistoryRow,
  MentFileUpdateRequest,
} from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mentFileApi = {
  // ─── CRUD ────────────────────────────────────────────────────────────────

  getMentFiles: async (): Promise<MentFile[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MentFile[] }>>('/ivr-mentfile-list');
    return response.data?.data?.value ?? [];
  },

  getMentFile: async (params: { mentfileId: number }): Promise<MentFile> => {
    const response = await apiClient.get<ApiResponse<MentFile>>('/ivr-mentfile-detail', { params });
    return response.data?.data;
  },

  /**
   * 멘트파일 등록 — multipart. 파일 필수.
   *  ⚠ Content-Type 헤더 명시하지 않음 (axios 자동 설정).
   *  @flow ivr-mentfile-create
   */
  createMentFile: async ({ data, file }: { data: MentFileCreateRequest; file: File }): Promise<MentFile> => {
    const formData = new FormData();
    formData.append('mentName', data.mentName);
    if (data.mentDesc) formData.append('mentDesc', data.mentDesc);
    formData.append('irFilePath', data.irFilePath);
    formData.append('emsFilePath', data.emsFilePath);
    formData.append('uploadFile', file);
    const response = await apiClient.post<ApiResponse<MentFile>>('/ivr-mentfile-create', formData);
    return response.data?.data;
  },

  /**
   * 멘트파일 다량추가 — multipart. AS-IS IPR30S3020M.do.
   *  files 와 mentDescs 는 인덱스 정렬 (i번째 파일 ↔ i번째 설명). comma escape 불필요 (레거시 버그 회피).
   *  @flow ivr-mentfile-batch-create
   */
  createMentFilesBatch: async ({
    emsFilePath,
    irFilePath,
    files,
    mentDescs,
  }: {
    emsFilePath: string;
    irFilePath: string;
    files: File[];
    mentDescs: string[];
  }): Promise<MentFileBatchResult> => {
    const formData = new FormData();
    formData.append('emsFilePath', emsFilePath);
    formData.append('irFilePath', irFilePath);
    // BFF 는 모든 파일 파트를 'uploadFile' 로 전달하므로 part 이름은 uploadFile.
    files.forEach((f) => formData.append('uploadFile', f));
    // BFF 폼필드는 key 당 단일값 → 설명은 파일명→설명 JSON map 한 필드로 전송 (인덱스 정렬 → 파일명 매칭).
    const descMap: Record<string, string> = {};
    files.forEach((f, i) => {
      const d = mentDescs[i];
      if (d && d.trim()) descMap[f.name] = d;
    });
    formData.append('mentDescs', JSON.stringify(descMap));
    const response = await apiClient.post<ApiResponse<MentFileBatchResult>>('/ivr-mentfile-batch-create', formData);
    return response.data?.data;
  },

  /**
   * 멘트설명 Excel/CSV 파싱 — multipart. DB 저장 없이 파일명↔설명 매핑 rows 반환.
   *  @flow ivr-mentfile-parse-desc
   */
  parseMentDesc: async (file: File): Promise<MentDescRow[]> => {
    const formData = new FormData();
    formData.append('uploadFile', file); // BFF 가 파일 파트를 uploadFile 로 전달 → 백엔드 part 이름과 일치
    const response = await apiClient.post<ApiResponse<{ value: MentDescRow[] }>>('/ivr-mentfile-parse-desc', formData);
    return response.data?.data?.value ?? [];
  },

  /** 멘트파일 목록 엑셀 내보내기 (Blob). @flow ivr-mentfile-export */
  exportMentFiles: async () => {
    return await apiClient.get<Blob>('/ivr-mentfile-export', { responseType: 'blob', silent: true });
  },

  /** 멘트설명 입력 양식(xlsx) 다운로드 (Blob). @flow ivr-mentfile-desc-template */
  downloadDescTemplate: async () => {
    return await apiClient.get<Blob>('/ivr-mentfile-desc-template', { responseType: 'blob', silent: true });
  },

  /** 메타 수정 (JSON, null IGNORE). */
  updateMentFile: async ({ params, data }: { params: { mentfileId: number }; data: MentFileUpdateRequest }): Promise<MentFile> => {
    const response = await apiClient.put<ApiResponse<MentFile>>('/ivr-mentfile-update', data, { params });
    return response.data?.data;
  },

  /**
   * 파일 교체 + 메타 수정 — multipart. POST 위장 (BFF PUT multipart 미지원).
   *  @flow ivr-mentfile-update-with-file
   */
  updateMentFileWithFile: async ({ params, data, file }: { params: { mentfileId: number }; data: MentFileUpdateRequest; file?: File }): Promise<MentFile> => {
    const formData = new FormData();
    if (data.mentName !== undefined) formData.append('mentName', data.mentName);
    if (data.mentDesc !== undefined) formData.append('mentDesc', data.mentDesc);
    if (data.irFilePath !== undefined) formData.append('irFilePath', data.irFilePath);
    if (data.emsFilePath !== undefined) formData.append('emsFilePath', data.emsFilePath);
    if (file) formData.append('uploadFile', file);
    const response = await apiClient.post<ApiResponse<MentFile>>('/ivr-mentfile-update-with-file', formData, { params });
    return response.data?.data;
  },

  deleteMentFile: async (params: { mentfileId: number }): Promise<void> => {
    await apiClient.delete<ApiResponse<unknown>>('/ivr-mentfile-delete', { params });
  },

  // ─── 적용 대상 시스템 ────────────────────────────────────────────────────

  getApplyTargets: async (params: { mentfileId: number }): Promise<MentApplyTarget[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MentApplyTarget[] }>>('/ivr-mentfile-apply-targets', { params });
    return response.data?.data?.value ?? [];
  },

  // ─── 적용 (즉시/예약 통합) ──────────────────────────────────────────────

  applyMentFile: async (data: MentApplyRequest): Promise<MentApplyResponse> => {
    const response = await apiClient.post<ApiResponse<MentApplyResponse>>('/ivr-mentfile-apply', data);
    return response.data?.data;
  },

  // ─── 적용 이력 (즉시/예약 통합) ──────────────────────────────────────────

  /**
   * 적용 이력 조회. 모든 파라미터 optional.
   *
   * - mentfileIds: 체크 선택 시 좁히기. 안 보내면 전체
   * - rtServKind: 1=즉시 / 2=예약 / undefined=전체
   * - startDate/endDate: ISO local (yyyy-MM-ddTHH:mm:ss)
   * - keyword: 멘트명/파일명 LIKE
   */
  getHistory: async (params: { mentfileIds?: number[]; rtServKind?: number; startDate?: string; endDate?: string; keyword?: string }): Promise<MentFileHistoryRow[]> => {
    const response = await apiClient.get<ApiResponse<{ value: MentFileHistoryRow[] }>>('/ivr-mentfile-history', { params });
    return response.data?.data?.value ?? [];
  },

  /**
   * 멘트 원본 파일 다운로드 (Blob). 시나리오 download 와 동일 패턴.
   *  @flow ivr-mentfile-download
   */
  downloadMentFile: async (params: Record<string, unknown>) => {
    // silent: 에러는 훅에서 blob 본문 파싱해 직접 토스트 (전역 핸들러가 blob message 못 읽음)
    const response = await apiClient.get<Blob>('/ivr-mentfile-download', { params, responseType: 'blob', silent: true });
    return response;
  },
};
