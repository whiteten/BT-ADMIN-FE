import { Button, Divider } from 'antd';
import TrainStatusBadge from './TrainStatusBadge';
import { useModelAction } from '../hooks/useModelAction';
import type { TrainStatus } from '../types';
import { IconBot } from '@/libs/shared-ui/src/components/custom/Icons';

interface ModelToolbarProps {
  modelId: string | undefined;
}

export default function ModelToolbar({ modelId }: ModelToolbarProps) {
  const { train, deploy, isTraining, isDeploying, isModelLoading, model } = useModelAction({ modelId });

  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          <IconBot className="size-5 text-[#888B9A] mr-0.5" />
          <span className="text-[#495057]">{model?.modelName}</span>
        </div>
        <TrainStatusBadge status={model?.trainStatus as TrainStatus} />
        <Divider orientation="vertical" />
        <Button variant="solid" loading={isModelLoading || isTraining} onClick={train}>
          모델 학습
        </Button>
        <Button variant="solid" loading={isModelLoading || isDeploying} onClick={deploy}>
          모델 배포
        </Button>
      </div>
    </div>
  );
}
