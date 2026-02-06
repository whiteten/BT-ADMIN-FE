import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Divider, Modal } from 'antd';
import dayjs from 'dayjs';
import { CircleAlert } from 'lucide-react';
import { toast } from '@/shared-util';
import { modelQueryKeys, useCreateSnapshot, useDeployModel, useGetModel, useTrainModel } from '../hooks/useModelQueries';
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
  const [trainModalOpen, setTrainModalOpen] = useState(false);

  const { data: model, isLoading: isModelLoading } = useGetModel({ params: { modelId }, queryOptions: { enabled: !!modelId } });

  const { mutate: createSnapshot, isPending: isCreatingSnapshot } = useCreateSnapshot({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스냅샷 생성이 완료되었습니다.');
        trainModel({ params: { modelId, tenantId: model?.tenantId }, data: {} });
      },
    },
  });

  const { mutate: trainModel, isPending: isTraining } = useTrainModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델 학습 요청이 전송되었습니다.');
        setTrainModalOpen(false);
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

  const handleTrainWithSnapshot = () => {
    const tenantId = model?.tenantId;
    const modelVersion = Math.random().toString(36).substring(2, 12);
    const modelVersionName = `${model?.modelName}_SNAPSHOT_${dayjs().format('YYYYMMDDHHmmss')}`;
    createSnapshot({ params: { modelId, tenantId }, data: { modelVersion, modelVersionName } });
  };

  const handleTrainDirect = () => {
    const tenantId = model?.tenantId;
    trainModel({ params: { modelId, tenantId }, data: {} });
  };

  const deploy = () => {
    if (model?.trainStatus !== 2) {
      toast.warning('학습이 완료된 모델만 배포할 수 있습니다.');
      return;
    }
    const tenantId = model?.tenantId;
    modal.confirm.execute({
      options: {
        title: '모델배포 확인',
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
          <Button variant="solid" loading={isModelLoading || isTraining || isCreatingSnapshot} disabled={model?.trainStatus === 1} onClick={() => setTrainModalOpen(true)}>
            모델 학습
          </Button>
          <Button variant="solid" loading={isModelLoading || isDeploying} disabled={model?.trainStatus === 1} onClick={deploy}>
            모델 배포
          </Button>
        </div>
      </div>

      <Modal
        title={
          <span className="flex items-center gap-2">
            <CircleAlert className="size-5 text-[#faad14]" />
            모델학습 확인
          </span>
        }
        open={trainModalOpen}
        onCancel={() => setTrainModalOpen(false)}
        centered
        footer={[
          <Button key="cancel" onClick={() => setTrainModalOpen(false)}>
            취소
          </Button>,
          <Button key="direct" variant="solid" color="orange" onClick={handleTrainDirect} loading={isCreatingSnapshot || isTraining}>
            바로 학습하기
          </Button>,
          <Button key="snapshot" variant="solid" color="cyan" onClick={handleTrainWithSnapshot} loading={isCreatingSnapshot || isTraining}>
            스냅샷 저장 후 학습하기
          </Button>,
        ]}
      >
        <p className="m-0 mb-2">모델({model?.modelName}) 학습을 진행하시겠습니까?</p>
        <p className="m-0">
          ※ 복구를 위해 <span className="text-orange-500">스냅샷 저장 후, 학습 진행을 권장</span>합니다.
        </p>
      </Modal>
    </div>
  );
}
