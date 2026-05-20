import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions } from '@/shared-util';
import { maskPolicyApi } from '../api/maskPolicyApi';
import type {
  MaskCategoryConfig,
  MaskCategoryConfigCreateRequest,
  MaskCategoryConfigUpdateRequest,
  MaskPolicy,
  MaskPolicyCreateRequest,
  MaskPolicyUpdateRequest,
} from '../types/maskPolicy.types';

export const maskPolicyQueryKeys = createQueryKeys('maskPolicy', {
  categories: (tenantId?: number | null) => [{ tenantId: tenantId ?? null }],
  category: (configId: number) => [configId],
  policies: (category: string, tenantId?: number | null) => [{ category, tenantId: tenantId ?? null }],
  policy: (policyId: number) => [policyId],
});

// ───── 카테고리 설정 ─────
export const useGetCategories = (tenantId?: number | null) =>
  useQuery({
    queryKey: maskPolicyQueryKeys.categories(tenantId).queryKey,
    queryFn: () => maskPolicyApi.listCategories(tenantId),
  });

export const useCreateCategory = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MaskCategoryConfigCreateRequest) => maskPolicyApi.createCategory(data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await qc.invalidateQueries({ queryKey: ['maskPolicy', 'categories'] });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdateCategory = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ configId, data }: { configId: number; data: MaskCategoryConfigUpdateRequest }) => maskPolicyApi.updateCategory(configId, data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await qc.invalidateQueries({ queryKey: ['maskPolicy', 'categories'] });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeleteCategory = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (configId: number) => maskPolicyApi.deleteCategory(configId),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await qc.invalidateQueries({ queryKey: ['maskPolicy', 'categories'] });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ───── 패턴 정책 ─────
export const useGetPolicies = (category: string | null, tenantId?: number | null) =>
  useQuery({
    queryKey: maskPolicyQueryKeys.policies(category ?? '', tenantId).queryKey,
    queryFn: () => maskPolicyApi.listPolicies(category!, tenantId),
    enabled: !!category,
  });

export const useCreatePolicy = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MaskPolicyCreateRequest) => maskPolicyApi.createPolicy(data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await qc.invalidateQueries({ queryKey: ['maskPolicy', 'policies'] });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useUpdatePolicy = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ policyId, data }: { policyId: number; data: MaskPolicyUpdateRequest }) => maskPolicyApi.updatePolicy(policyId, data),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await qc.invalidateQueries({ queryKey: ['maskPolicy', 'policies'] });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

export const useDeletePolicy = ({ mutationOptions }: MutationHookOptions = {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policyId: number) => maskPolicyApi.deletePolicy(policyId),
    ...mutationOptions,
    onSuccess: async (...args) => {
      await qc.invalidateQueries({ queryKey: ['maskPolicy', 'policies'] });
      mutationOptions?.onSuccess?.(...args);
    },
  });
};

// ───── 테스트 ─────
export const useMaskTest = ({ mutationOptions }: MutationHookOptions = {}) =>
  useMutation({
    mutationFn: maskPolicyApi.test,
    ...mutationOptions,
  });
