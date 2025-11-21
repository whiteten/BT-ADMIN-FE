import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query';

// Query Hook 공통 타입
export type QueryHookOptions<TData = unknown, TError = Error> = {
  queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
};

export type QueryHookWithParamsOptions<TData = unknown, TError = Error> = {
  params?: Record<string, unknown>;
  queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
};

// Mutation Hook 공통 타입
export type MutationHookOptions<TData = unknown, TVariables = unknown, TError = Error> = {
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>;
};

export type MutationHookWithParamsOptions<TData = unknown, TVariables = unknown, TError = Error> = {
  params?: Record<string, unknown>;
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>;
};

// ID가 필요한 경우
export type QueryHookWithIdOptions<TData = unknown, TError = Error> = {
  id: string;
  params?: Record<string, unknown>;
  queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
};

export type MutationHookWithIdOptions<TData = unknown, TVariables = unknown, TError = Error> = {
  id: string;
  params?: Record<string, unknown>;
  mutationOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'>;
};
