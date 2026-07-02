import ApiClient, { type ApiRequestConfig, type ApiResponse } from '@/shared-util';
import { publicAuthHeaders } from './publicAuth';
import {
  type DbQueryDef,
  type DbQueryParam,
  type RollingGroup,
  type TaskboardBg,
  type TaskboardDisplay,
  type TaskboardLayout,
  type TaskboardNotice,
} from '../types/taskboard.types';

/**
 * BFF Aggregation Flow를 통한 taskboard API 클라이언트.
 * 모든 API는 반드시 BFF를 통해서만 호출.
 */
const apiClient = new ApiClient({ serviceURL: '/bff' });

/** 공개 Bearer 토큰이 있으면 기존 config에 Authorization 헤더를 병합해 반환한다. */
const withAuth = (config?: ApiRequestConfig): ApiRequestConfig | undefined => {
  const auth = publicAuthHeaders();
  if (!auth) return config;
  return { ...config, headers: { ...(config?.headers as Record<string, string> | undefined), ...auth } };
};

/** BFF single-step 집계는 컨트롤러가 List를 그대로 반환한 응답을 { value: [...] }로 감싸므로 배열을 꺼낸다. */
function unwrapListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    if (Array.isArray(rec.value)) return rec.value as T[];
  }
  return [];
}

export const taskboardApi = {
  // ── 배경 API ─────────────────────────────────────────────────────────────

  getTaskBoardBgs: async (params?: Record<string, unknown>): Promise<TaskboardBg[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardBg[] }>>('/taskboard-bglist', withAuth({ params }));
    return response.data?.data?.items ?? [];
  },

  createTaskBoardBg: async ({ params, data }: { params: Record<string, unknown>; data: File }): Promise<TaskboardBg> => {
    const formData = new FormData();
    formData.append('uploadFile', data);
    if (params?.data) {
      formData.append('data', String(params.data));
    }
    const response = await apiClient.post<ApiResponse<TaskboardBg>>('/taskboard-bginsert', formData);
    return response.data?.data;
  },

  deleteTaskBoardBg: async (pageId: number) => {
    const response = await apiClient.delete('/taskboard-bgdelete', { params: { bgId: pageId } });
    return response;
  },

  // ── 레이아웃 API ──────────────────────────────────────────────────────────

  getLayoutList: async (): Promise<TaskboardLayout[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardLayout[] }>>('/taskboard-layoutlist', withAuth());
    return response.data?.data?.items ?? [];
  },

  createLayout: async (payload: { pageId: number; tenantId: string; layoutName: string; layoutJson: string; authorName?: string; authRole?: string }): Promise<number> => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(payload));
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-layoutinsert', formData);
    return response.data?.data ?? 0;
  },

  updateLayout: async ({ layoutId, layoutName, layoutJson }: { layoutId: number; layoutName: string; layoutJson: string }) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify({ layoutId, layoutName, layoutJson }));
    const response = await apiClient.post('/taskboard-layoutupdate', formData, { params: { layoutId } });
    return response;
  },

  deleteLayout: async (layoutId: number) => {
    const response = await apiClient.delete('/taskboard-layoutdelete', { params: { layoutId } });
    return response;
  },

  // ── 뷰 그룹 API (레이아웃과 매핑되지 않는 독립된 선택값 묶음) ───────────────────────

  getDisplayList: async (): Promise<TaskboardDisplay[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardDisplay[] }>>('/taskboard-display-list', withAuth());
    return response.data?.data?.items ?? [];
  },

  createDisplay: async (payload: { tenantId?: string; displayName: string; selectionJson: string }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-display-insert', payload);
    return response.data?.data ?? 0;
  },

  updateDisplay: async (payload: { displayId: number; displayName?: string; selectionJson?: string }) => {
    const response = await apiClient.post('/taskboard-display-update', payload);
    return response;
  },

  deleteDisplay: async (displayId: number) => {
    const response = await apiClient.delete('/taskboard-display-delete', { params: { displayId } });
    return response;
  },

  // ── 롤링 그룹 API ────────────────────────────────────────────────────────

  getRollingGroupList: async (): Promise<RollingGroup[]> => {
    const response = await apiClient.get<ApiResponse<{ items: RollingGroup[] }>>('/taskboard-rollinggroup-list', withAuth());
    return response.data?.data?.items ?? [];
  },

  createRollingGroup: async (payload: { groupName: string; displayIds: string; intervalSec: number; transitionType?: string; tenantId?: string }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-rollinggroup-insert', payload);
    return response.data?.data ?? 0;
  },

  updateRollingGroup: async (payload: { groupId: number; groupName: string; displayIds: string; intervalSec: number; transitionType?: string }) => {
    const response = await apiClient.post('/taskboard-rollinggroup-update', payload);
    return response;
  },

  deleteRollingGroup: async (groupId: number) => {
    const response = await apiClient.delete('/taskboard-rollinggroup-delete', { params: { groupId } });
    return response;
  },

  // ── 공지사항 API ─────────────────────────────────────────────────────────

  getNoticeList: async (): Promise<TaskboardNotice[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardNotice[] }>>('/taskboard-noticelist', withAuth());
    return response.data?.data?.items ?? [];
  },

  getNoticeListByKey: async (noticeKey: string): Promise<TaskboardNotice[]> => {
    const response = await apiClient.get<ApiResponse<{ items: TaskboardNotice[] }>>('/taskboard-noticelist-bykey', withAuth({ params: { noticeKey } }));
    return response.data?.data?.items ?? [];
  },

  createNotice: async (payload: Partial<TaskboardNotice>): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-noticeinsert', payload);
    return response.data?.data ?? 0;
  },

  updateNotice: async ({ noticeId, ...payload }: Partial<TaskboardNotice> & { noticeId: number }) => {
    const response = await apiClient.post('/taskboard-noticeupdate', payload, { params: { noticeId } });
    return response;
  },

  deleteNotice: async (noticeId: number) => {
    const response = await apiClient.delete('/taskboard-noticedelete', { params: { noticeId } });
    return response;
  },

  // ── 외부 API 테스트 (서버사이드 호출 — CORS 우회) ──────────────────────────
  testExternalApiUrl: async ({ url, headers }: { url: string; headers?: string }): Promise<unknown> => {
    const response = await apiClient.post<ApiResponse<unknown>>('/taskboard-external-api-test', {
      url,
      ...(headers ? { headers } : {}),
    });
    return response.data?.data;
  },

  // ── yml 기반 커스텀 DB 쿼리 실행 (custom1~custom10) ────────────────────────
  executeDbQuery: async (key: string): Promise<unknown[]> => {
    const response = await apiClient.get<ApiResponse<unknown>>('/taskboard-db-query', { params: { key } });
    return unwrapListResponse(response.data?.data);
  },

  // ── DB 쿼리 즉석 실행 (저장 없음 — SQL + named parameter 값으로 바로 실행) ──
  runDbQuery: async ({ sql, params }: { sql: string; params: DbQueryParam[] }): Promise<Record<string, unknown>[]> => {
    const response = await apiClient.post<ApiResponse<unknown>>('/taskboard-db-query-run', { sql, params });
    return unwrapListResponse(response.data?.data);
  },

  // ── 저장된 DB 쿼리 정의 (뷰그룹 체크박스 옵션 소스) ────────────────────────
  listDbQueryDefs: async (): Promise<DbQueryDef[]> => {
    const response = await apiClient.get<ApiResponse<unknown>>('/taskboard-dbquerydef-list');
    return unwrapListResponse(response.data?.data);
  },

  createDbQueryDef: async (payload: { tenantId: string; queryName: string; description?: string; sqlText: string; params?: DbQueryParam[] }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-dbquerydef-create', payload);
    return response.data?.data ?? 0;
  },

  updateDbQueryDef: async ({
    dbQueryId,
    ...payload
  }: {
    dbQueryId: number;
    tenantId: string;
    queryName: string;
    description?: string;
    sqlText: string;
    params?: DbQueryParam[];
  }): Promise<number> => {
    const response = await apiClient.post<ApiResponse<number>>('/taskboard-dbquerydef-update', payload, { params: { id: dbQueryId } });
    return response.data?.data ?? 0;
  },

  deleteDbQueryDef: async (id: number) => {
    const response = await apiClient.delete('/taskboard-dbquerydef-delete', { params: { id } });
    return response;
  },

  getDbQueryDefOptions: async (id: number): Promise<Record<string, unknown>[]> => {
    const response = await apiClient.get<ApiResponse<unknown>>('/taskboard-dbquerydef-options', { params: { id } });
    return unwrapListResponse(response.data?.data);
  },
};
