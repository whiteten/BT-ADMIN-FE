import { Button, Divider } from 'antd';
import DeployStatusBadge from './DeployStatusBadge';
import TrainStatusBadge from './TrainStatusBadge';
import { useModelAction } from '../hooks/useModelAction';
import type { DeployStatus, TrainStatus } from '../types';
import { IconBot } from '@/libs/shared-ui/src/components/custom/Icons';

interface ModelToolbarProps {
  modelId: string | undefined;
}

export default function ModelToolbar({ modelId }: ModelToolbarProps) {
  const { train, deploy, isTraining, isDeploying, isModelLoading, model } = useModelAction({ modelId });
  return (
    <div className="flex justify-end">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <IconBot className="size-5 text-[#888B9A]" />
          <span className="text-[#495057]">{model?.modelName}</span>
        </div>
        <Divider orientation="vertical" className="!mx-0.5" />
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
