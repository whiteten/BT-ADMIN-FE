import { useMutation, useQuery } from '@tanstack/react-query';
import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { MutationHookOptions, QueryHookWithParamsOptions } from '@/shared-util';
import { trainingApi } from '../api/trainingApi';
import type { TrainingItem, TrainingRegisterDatas, TrainingSearchParams } from '../types';

export const trainingQueryKeys = createQueryKeys('training', {
  getTrainingList: (params?: TrainingSearchParams) => [params],
});

export const useGetTrainingList = ({ params, queryOptions }: QueryHookWithParamsOptions<TrainingItem[]> = {}) => {
  return useQuery({
    queryKey: trainingQueryKeys.getTrainingList(params as TrainingSearchParams).queryKey,
    queryFn: () => trainingApi.getTrainingList(params as TrainingSearchParams),
    ...queryOptions,
  });
};

export const useRegisterTraining = ({ mutationOptions }: MutationHookOptions<unknown, TrainingRegisterDatas> = {}) => {
  return useMutation({
    mutationFn: trainingApi.registerTraining,
    ...mutationOptions,
  });
};
