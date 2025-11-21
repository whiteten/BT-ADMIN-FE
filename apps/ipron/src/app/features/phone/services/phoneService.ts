import ApiClient from '@/shared-util';
import type { Phone } from '../types/phone.types';

const apiClient = new ApiClient();

export const phoneService = {
  getPhones: async (params: unknown): Promise<Phone[]> => {
    const response = await apiClient.get<{ data: Phone[] }>(`/phones`, { params });
    return response?.data?.data ?? [];
  },
  getPhone: async (id: string, params: unknown): Promise<Phone> => {
    const response = await apiClient.get<{ data: Phone }>(`/phone/${id}`, { params });
    return response?.data?.data;
  },
  createPhone: async (params: unknown): Promise<Record<string, unknown> | undefined> => {
    const response = await apiClient.post<{ data: Record<string, unknown> }>(`/phone`, params);
    return response?.data?.data;
  },
  updatePhone: async (id: string, params: unknown): Promise<Record<string, unknown> | undefined> => {
    const response = await apiClient.put<{ data: Record<string, unknown> }>(`/phone/${id}`, params);
    return response?.data?.data;
  },
  deletePhone: async (id: string): Promise<Record<string, unknown> | undefined> => {
    const response = await apiClient.delete<{ data: Record<string, unknown> }>(`/phone/${id}`);
    return response?.data?.data;
  },
};
