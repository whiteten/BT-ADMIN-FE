import ApiClient from '@/shared-util';
import type { EavesdropLogRequest, EavesdropUpdateRequest, MonitoringItem, MonitoringSearchParams, MruProcess, MruSystem } from '../types/monitoring';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const monitoringApi = {
  getList: async (params: MonitoringSearchParams): Promise<MonitoringItem[]> => {
    const response = await apiClient.get('/vel-monitoring-list', { params });
    const data = (response as { data: { data: MonitoringItem[] | { value: MonitoringItem[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: MonitoringItem[] }).value ?? []);
  },

  getSystems: async (): Promise<MruSystem[]> => {
    const response = await apiClient.get('/vel-monitoring-systems');
    const data = (response as { data: { data: MruSystem[] | { value: MruSystem[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: MruSystem[] }).value ?? []);
  },

  getProcesses: async (findSystemId: string | number): Promise<MruProcess[]> => {
    const response = await apiClient.get('/vel-monitoring-processes', { params: { findSystemId } });
    const data = (response as { data: { data: MruProcess[] | { value: MruProcess[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: MruProcess[] }).value ?? []);
  },

  // 레거시 단일 MFU 환경 전제 — 시스템 무관 단건 조회
  // 다중 MFU 환경 확인 후 systemId 파라미터 도입 검토 (todo.md 참조)
  getMfuIp: async (): Promise<string | null> => {
    const response = await apiClient.get('/vel-monitoring-mfu-ip');
    return (response as { data: { data: string | null } }).data.data;
  },

  updateRtUser: async (data: EavesdropUpdateRequest): Promise<void> => {
    await apiClient.put('/vel-monitoring-rt-user', data);
  },

  clearRtUser: async (tenantId: string, dnNo: string): Promise<void> => {
    await apiClient.post('/vel-monitoring-rt-user-clear', { tenantId, dnNo });
  },

  insertRtLog: async (data: EavesdropLogRequest): Promise<void> => {
    await apiClient.post('/vel-monitoring-rt-log', data);
  },
};
