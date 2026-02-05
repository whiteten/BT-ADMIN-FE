import { Card, Divider } from 'antd';
import { type DeployStatus, type ModelListItem, ModelType, type TrainStatus } from '../types';
import DeployStatusBadge from './DeployStatusBadge';
import TrainStatusBadge from './TrainStatusBadge';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type ModelCardProps = ModelListItem & {
  onDetail?: (modelId: string) => void;
  onDelete?: (modelId: string) => void;
  onExport?: (modelId: string) => void;
};

export default function ModelCard({
  modelId,
  modelName,
  modelType,
  trainStatus,
  trainChangedYn,
  trainTime,
  deployStatus,
  deployChangedYn,
  deployTime,
  intentCount,
  entityCount,
  onDetail,
  onDelete,
  onExport,
}: ModelCardProps) {
  const isPublicModel = modelType === ModelType.PUBLIC;
  const title = (
    <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => onDetail?.(modelId)}>
      {modelName}
    </span>
  );
  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end">
        <DropdownMenuItem onClick={() => onDetail?.(modelId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExport?.(modelId)} className="hover:cursor-pointer">
          Export
        </DropdownMenuItem>
        {!isPublicModel && (
          <DropdownMenuItem onClick={() => onDelete?.(modelId)} className="hover:cursor-pointer">
            삭제
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <Card
      title={title}
      styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      extra={extra}
      className="hover:!border-[var(--color-bt-primary)]"
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex items-center">
          <span className="w-[104px]">상태</span>
          <TrainStatusBadge status={trainStatus as TrainStatus} showAlert={trainChangedYn} />
          <Divider orientation="vertical" className="!mx-2" />
          <DeployStatusBadge status={deployStatus as DeployStatus} showAlert={deployChangedYn} />
        </div>
        <div className="flex">
          <span className="w-[104px]">의도</span>
          <span className="mr-2">{intentCount ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">개체</span>
          <span className="mr-2">{entityCount ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">학습날짜</span>
          <span className="mr-2">{trainTime ?? '-'}</span>
        </div>
      </div>
    </Card>
  );
}
