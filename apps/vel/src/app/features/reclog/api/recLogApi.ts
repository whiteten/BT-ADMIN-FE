import ApiClient, { withBasePath } from '@/shared-util';
import type { RecLogPagedResult, RecLogSearchParams, RecReasonType, RecReasonTypeRequest, RecReasonTypeSearchParams } from '../types/rec-log';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const recLogApi = {
  getRecLogs: async (params: RecLogSearchParams): Promise<RecLogPagedResult> => {
    const response = await apiClient.get<{ data: RecLogPagedResult }>('/vel-reclog-list', { params });
    return (response as { data: { data: RecLogPagedResult } }).data.data;
  },

  getReasonTypes: async (params: RecReasonTypeSearchParams): Promise<RecReasonType[]> => {
    const response = await apiClient.get('/vel-reason-type-list', { params });
    const data = (response as { data: { data: { value: RecReasonType[] } | RecReasonType[] } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: RecReasonType[] }).value ?? []);
  },

  createReasonType: async (data: RecReasonTypeRequest): Promise<void> => {
    await apiClient.post('/vel-reason-type-create', data);
  },

  updateReasonType: async (tenantId: string, code: string, data: RecReasonTypeRequest): Promise<void> => {
    await apiClient.put('/vel-reason-type-update', data, { params: { tenantId, code } });
  },

  deleteReasonType: async (tenantId: string, code: string): Promise<void> => {
    await apiClient.delete('/vel-reason-type-delete', { params: { tenantId, code } });
  },

  exportExcel: (params: Omit<RecLogSearchParams, 'page' | 'size'>): void => {
    const qs = new URLSearchParams();
    (Object.entries(params) as [string, string | undefined][]).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.append(k, v);
    });
    window.open(withBasePath(`/api/bff/vel-reclog-excel?${qs.toString()}`), '_blank');
  },
};
