import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { trainingApi } from '../api/trainingApi';
import type {
  ConfidenceTrainingItem,
  ConfidenceTrainingSearchParams,
  TuningSentenceCreateDatas,
  TuningSentenceItem,
  TuningSentenceSearchParams,
  TuningSentenceUpdateDatas,
} from '../types';

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
    mutationFn: trainingApi.createTuningSentence,
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

export const useUpdateTunningKind = ({ mutationOptions }: MutationHookOptions<unknown, { tunningKind: string; ucidGkey: string; armsoffset: number; rxtxKind: string }> = {}) => {
  return useMutation({
    mutationFn: trainingApi.updateTunningKind,
    ...mutationOptions,
  });
};

export const useUpdateTuningSentence = ({ mutationOptions }: MutationHookOptions<unknown, TuningSentenceUpdateDatas> = {}) => {
  return useMutation({
    mutationFn: trainingApi.updateTuningSentence,
    ...mutationOptions,
  });
};
