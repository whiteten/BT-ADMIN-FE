import ApiClient from '@/shared-util';
import type { AgentItem, GroupItem, PopupParams, TenantListItem } from '../types/common';

const apiClient = new ApiClient({ serviceURL: '/bff' });

export const commonApi = {
  getTenants: async (): Promise<TenantListItem[]> => {
    const response = await apiClient.get('/vel-tenants');
    const data = (response as { data: { data: { value: TenantListItem[] } | TenantListItem[] } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: TenantListItem[] }).value ?? []);
  },

  getGroups: async (params: PopupParams): Promise<GroupItem[]> => {
    const response = await apiClient.get('/vel-groups', { params });
    const data = (response as { data: { data: GroupItem[] | { value: GroupItem[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: GroupItem[] }).value ?? []);
  },

  getAgents: async (params: PopupParams): Promise<AgentItem[]> => {
    const response = await apiClient.get('/vel-agents', { params });
    const data = (response as { data: { data: AgentItem[] | { value: AgentItem[] } } }).data.data;
    return Array.isArray(data) ? data : ((data as { value: AgentItem[] }).value ?? []);
  },
};
