import { Button } from 'antd';
import { useModelAction } from '../hooks/useModelAction';

interface ModelToolbarProps {
  modelId: string | undefined;
}

export default function ModelToolbar({ modelId }: ModelToolbarProps) {
  const { train, deploy, isTraining, isDeploying, isModelLoading } = useModelAction({ modelId });

  return (
    <div className="flex justify-end">
      <div className="flex gap-2">
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
