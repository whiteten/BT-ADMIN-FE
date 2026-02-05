import { useQueryClient } from '@tanstack/react-query';
import { Button, Divider } from 'antd';
import { toast } from '@/shared-util';
import { modelQueryKeys, useDeployModel, useGetModel, useTrainModel } from '../hooks/useModelQueries';
import type { DeployStatus, TrainStatus } from '../types';
import DeployStatusBadge from './DeployStatusBadge';
import TrainStatusBadge from './TrainStatusBadge';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface ModelToolbarProps {
  modelId: string | undefined;
}

export default function ModelToolbar({ modelId }: ModelToolbarProps) {
  const queryClient = useQueryClient();
  const modal = useModal();

  const { data: model, isLoading: isModelLoading } = useGetModel({ params: { modelId }, queryOptions: { enabled: !!modelId } });

  const { mutate: trainModel, isPending: isTraining } = useTrainModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델 학습 요청이 전송되었습니다.');
      },
      onSettled: () => {
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
      },
      onSettled: () => {
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
    if (model?.trainStatus !== 2) {
      toast.warning('학습이 완료된 모델만 배포할 수 있습니다.');
      return;
    }
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

  return (
    <div className="flex justify-end">
      <div className="flex flex-wrap items-center gap-2">
        <TrainStatusBadge status={model?.trainStatus as TrainStatus} showAlert={model?.trainChangedYn} />
        <Divider orientation="vertical" className="!mx-0.5" />
        <DeployStatusBadge status={model?.deployStatus as DeployStatus} showAlert={model?.deployChangedYn} />
        <Divider orientation="vertical" className="!mx-0.5" />
        <div className="flex items-center gap-2">
          <Button variant="solid" loading={isModelLoading || isTraining} onClick={train}>
            모델 학습
          </Button>
          <Button variant="solid" loading={isModelLoading || isDeploying} onClick={deploy}>
            모델 배포
          </Button>
        </div>
      </div>
    </div>
  );
}
