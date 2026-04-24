import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { trainingApi } from '../api/trainingApi';
import type { ConfidenceTrainingItem, ConfidenceTrainingSearchParams, TuningSentenceCreateDatas, TuningSentenceItem, TuningSentenceSearchParams } from '../types';

export const trainingQueryKeys = createQueryKeys('training', {
  getTrainingList: (params?: ConfidenceTrainingSearchParams) => [params],
  getTuningSentenceList: (params?: TuningSentenceSearchParams) => [params],
});

export const useGetTrainingList = ({ params, queryOptions }: QueryHookWithParamsOptions<ConfidenceTrainingItem[]> = {}) => {
  return useQuery({
    queryKey: trainingQueryKeys.getTrainingList(params as ConfidenceTrainingSearchParams).queryKey,
    queryFn: () => trainingApi.getTrainingList(params as ConfidenceTrainingSearchParams),
    ...queryOptions,
  });
};

export const useCreateTuningSentence = ({ mutationOptions }: MutationHookOptions<unknown, TuningSentenceCreateDatas> = {}) => {
  return useMutation({
    mutationFn: trainingApi.useCreateTuningSentence,
    ...mutationOptions,
  });
};

export const useGetTuningSentenceList = ({ params, queryOptions }: QueryHookWithParamsOptions<TuningSentenceItem[]> = {}) => {
  return useQuery({
    queryKey: trainingQueryKeys.getTuningSentenceList(params as TuningSentenceSearchParams).queryKey,
    queryFn: () => trainingApi.getTuningSentenceList(params as TuningSentenceSearchParams),
    ...queryOptions,
  });
};

export const useDeleteTuningSentence = ({ mutationOptions }: MutationHookOptions<unknown, { ucidGkey: string; armsoffset: number; rxtxKind: string }> = {}) => {
  return useMutation({
    mutationFn: trainingApi.deleteTuningSentence,
    ...mutationOptions,
  });
};
