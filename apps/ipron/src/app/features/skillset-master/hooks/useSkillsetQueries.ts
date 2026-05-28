/**
 * skillset-master 쿼리 훅 (Phase 1 stub).
 * TODO Phase 2: 실제 API 연동
 */
import { useQuery } from '@tanstack/react-query';
import type { SkillsetGroupResponse, SkillsetResponse } from '../types';

interface QueryOptions<T> {
  params?: Record<string, unknown>;
  queryOptions?: { enabled?: boolean };
  initialData?: T;
}

export function useGetSkillsetGroups(options?: QueryOptions<SkillsetGroupResponse[]>) {
  return useQuery<SkillsetGroupResponse[]>({
    queryKey: ['skillset-groups', options?.params],
    queryFn: async () => [],
    initialData: options?.initialData,
    enabled: options?.queryOptions?.enabled,
  });
}

export function useGetSkillsets(options?: QueryOptions<SkillsetResponse[]>) {
  return useQuery<SkillsetResponse[]>({
    queryKey: ['skillsets', options?.params],
    queryFn: async () => [],
    initialData: options?.initialData,
    enabled: options?.queryOptions?.enabled,
  });
}
