import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared-util';
import { modelQueryKeys, useDeployModel, useGetModel, useTrainModel } from './useModelQueries';
import type { ModelItem } from '../types/model';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface UseModelActionParams {
  modelId: string | undefined;
}

interface UseModelActionReturn {
  train: () => void;
  deploy: () => void;
  isTraining: boolean;
  isDeploying: boolean;
  isModelLoading: boolean;
  model: ModelItem | undefined;
}

export const useModelAction = ({ modelId }: UseModelActionParams): UseModelActionReturn => {
  const queryClient = useQueryClient();
  const modal = useModal();

  const { data: model, isLoading: isModelLoading } = useGetModel({
    params: { modelId },
    queryOptions: {
      enabled: !!modelId,
      refetchInterval: 5000,
    },
  });

  const { mutate: trainModel, isPending: isTraining } = useTrainModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델 학습 요청이 전송되었습니다.');
        queryClient.invalidateQueries({
          queryKey: modelQueryKeys.getModel({ modelId }).queryKey,
        });
      },
    },
  });

  const { mutate: deployModel, isPending: isDeploying } = useDeployModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델 배포가 완료되었습니다.');
        queryClient.invalidateQueries({
          queryKey: modelQueryKeys.getModel({ modelId }).queryKey,
        });
      },
    },
  });

  const train = () => {
    const tenantId = model?.tenantId;
    modal.confirm.execute({
      options: {
        content: `모델(${model?.modelName}) 학습을 진행하시겠습니까?`,
      },
      onOk: () => {
        trainModel({ params: { modelId, tenantId }, data: {} });
      },
    });
  };

  const deploy = () => {
    const tenantId = model?.tenantId;
    modal.confirm.execute({
      options: {
        content: `모델(${model?.modelName}) 배포를 진행하시겠습니까?`,
      },
      onOk: () => {
        deployModel({ params: { modelId, tenantId }, data: {} });
      },
    });
  };

  return {
    train,
    deploy,
    isTraining,
    isDeploying,
    isModelLoading,
    model,
  };
};
