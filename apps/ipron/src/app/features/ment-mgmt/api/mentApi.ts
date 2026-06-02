/**
 * 교환기 멘트 관리 API 클라이언트.
 *
 * BE REST: BT-ADMIN-SERVICE-IPRON `/api/ipron/ments` (SWAT IPR20S1070).
 * FE 는 BFF Aggregation Flow 경유 (시드: C:\bt-admin-ipron-work\ipron-ment-mgmt\seed.sql).
 *
 * BFF flow 매핑:
 *  ipron-ment-list             GET    목록 (?nodeId&tenantId&keyword)
 *  ipron-ment-detail           GET    상세 ({mentId})
 *  ipron-ment-create           POST   단일 등록 (JSON body: nodeId,tenantId,mentName,filePath,mentDesc,createDate)
 *  ipron-ment-update           PUT    수정 (path: {id}, JSON body: mentName,filePath,mentDesc,createDate)
 *  ipron-ment-delete-batch     POST   다건 삭제 (JSON body: {ieMentIds: Long[]})
 *  ipron-ment-create-batch     POST   다량 등록 (multipart: files[] + ?nodeId&tenantId)
 *  ipron-ment-options          GET    멘트 콤보 옵션 (?nodeId&tenantId — CTI큐 멘트 콤보 등 재사용)
 *  ipron-ment-duplicate-check  GET    멘트명 중복검증 (?nodeId&tenantId&mentName&excludeMentId)
 *  ipron-ment-download         GET    멘트 파일 다운로드 ({mentId}, binary)
 *  ipron-ment-preview          GET    미리듣기용 WAV 변환 ({mentId}, binary — PCM→WAV)
 *  ipron-ment-sync             POST   선택 노드의 MS그룹 멘트파일 동기화 (?nodeId)
 */
import ApiClient, { type ApiResponse } from '@/shared-util';
import type { MentBatchCreateRequest, MentCreateRequest, MentOptionItem, MentResponse, MentUpdateRequest } from '../types';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const mentApi = {
  // ─── List / Detail ──────────────────────────────────────────────────────────

  getList: async (params?: { nodeId?: number; tenantId?: number }): Promise<MentResponse[]> => {
    const res = await apiClient.get<ApiResponse<{ value: MentResponse[] }>>('/ipron-ment-list', { params });
    return res.data?.data?.value ?? [];
  },

  getDetail: async (mentId: number): Promise<MentResponse> => {
    const res = await apiClient.get<ApiResponse<MentResponse>>('/ipron-ment-detail', { params: { mentId } });
    return res.data?.data;
  },

  /** 노드+테넌트 내 멘트명 중복검증. */
  duplicateCheck: async (params: { nodeId: number; tenantId: number; mentName: string; excludeMentId?: number }): Promise<boolean> => {
    const res = await apiClient.get<ApiResponse<{ value: boolean }>>('/ipron-ment-duplicate-check', { params });
    return res.data?.data?.value ?? false;
  },

  // ─── Mutations ────────────────────────────────────────────────────────────────

  /** 단일 등록 — JSON body. 파일 바이너리 업로드는 Phase 1 deferred(MS 동기화 미구현). */
  create: async (data: MentCreateRequest): Promise<MentResponse> => {
    const body: Record<string, unknown> = {
      nodeId: data.nodeId,
      tenantId: data.tenantId,
      mentName: data.mentName,
      filePath: data.filePath ?? '',
      mentDesc: data.mentDesc ?? '',
      createDate: data.createDate ?? '',
    };
    const res = await apiClient.post<ApiResponse<MentResponse>>('/ipron-ment-create', body);
    return res.data?.data;
  },

  /** 수정 — PUT ?id= JSON body. BFF flow 규약: id 는 쿼리파라미터. */
  update: async (ieMentId: number, data: MentUpdateRequest): Promise<MentResponse> => {
    const body: Record<string, unknown> = {
      mentName: data.mentName,
      filePath: data.filePath ?? '',
      mentDesc: data.mentDesc ?? '',
      createDate: data.createDate ?? '',
    };
    const res = await apiClient.put<ApiResponse<MentResponse>>('/ipron-ment-update', body, { params: { id: ieMentId } });
    return res.data?.data;
  },

  /** 다건 삭제 — POST JSON body { ieMentIds: Long[] }. */
  deleteBatch: async (ieMentIds: number[]): Promise<void> => {
    await apiClient.post('/ipron-ment-delete-batch', { ieMentIds });
  },

  /** 다량 등록 — 파일명=멘트명. 항목별 설명은 mentDescs 배열로 동순 매핑. */
  createBatch: async (data: MentBatchCreateRequest): Promise<MentResponse[]> => {
    const formData = new FormData();
    for (const item of data.items) {
      formData.append('files', item.file);
      formData.append('mentDescs', item.mentDesc ?? '');
    }
    const res = await apiClient.post<ApiResponse<{ value: MentResponse[] }>>('/ipron-ment-create-batch', formData, {
      params: { nodeId: data.nodeId, tenantId: data.tenantId },
    });
    return res.data?.data?.value ?? [];
  },

  /** 선택 노드의 모든 MS그룹에 멘트파일 동기화 (SWAT 동기화). */
  sync: async (nodeId: number): Promise<void> => {
    await apiClient.post('/ipron-ment-sync', undefined, { params: { nodeId } });
  },

  // ─── 콤보 옵션 (노드+테넌트 단위, CTI큐 멘트 콤보 등 재사용) ─────────────────────

  getOptions: async (params: { nodeId?: number; tenantId?: number }): Promise<MentOptionItem[]> => {
    const res = await apiClient.get<ApiResponse<{ value: MentOptionItem[] }>>('/ipron-ment-options', { params });
    return res.data?.data?.value ?? [];
  },

  // ─── 파일 다운로드 / 미리듣기 ──────────────────────────────────────────────────

  download: async (mentId: number): Promise<Blob> => {
    const res = await apiClient.get<Blob>('/ipron-ment-download', { params: { mentId }, responseType: 'blob' });
    return (res as unknown as { data: Blob }).data;
  },

  /** 미리듣기용 WAV (BE: IPR20S1070CVT PCM→WAV 변환 후 stream). */
  preview: async (mentId: number): Promise<Blob> => {
    const res = await apiClient.get<Blob>('/ipron-ment-preview', { params: { mentId }, responseType: 'blob' });
    return (res as unknown as { data: Blob }).data;
  },
};
