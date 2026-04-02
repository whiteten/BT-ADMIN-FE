import { Card } from 'antd';
import dayjs from 'dayjs';
import { ReactComponent as IconLinkAoeStudio } from '../../../../assets/images/icon/icon-link-aoe-studio.svg';
import type { AgentDeleteDatas, AgentListItem, AoeDeployFlag } from '../types';
import DeployFlagBadge from './DeployFlagBadge';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type AgentCardProps = AgentListItem & {
  onDetail?: (agentId: string) => void;
  onOpenStudio?: (agentId: string) => void;
  onDelete?: (data: AgentDeleteDatas) => void;
};

export default function AgentCard({ agentId, agentName, agentTypeName, aoeDeployFlag, aoeApiKey, deployTime, onDetail, onOpenStudio, onDelete }: AgentCardProps) {
  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onDelete?.({ agentId, aoeDeployFlag, aoeApiKey })} className="hover:cursor-pointer">
          삭제
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={agentName}
      styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      extra={extra}
      className="hover:!border-[var(--color-bt-primary)] hover:cursor-pointer"
      onClick={() => onDetail?.(agentId)}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">에이전트 타입</span>
          <span className="mr-2">{agentTypeName ?? '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px]">배포 여부</span>
          <DeployFlagBadge flag={aoeDeployFlag as AoeDeployFlag} />
        </div>
        <div className="flex">
          <span className="w-[104px]">배포 시간</span>
          <span className="mr-2">{deployTime ? dayjs(deployTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px]">워크플로우</span>
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded cursor-pointer transition-colors hover:bg-[var(--color-bt-primary)]/15 hover:text-[var(--color-bt-primary)]"
            onClick={(e) => {
              e.stopPropagation();
              onOpenStudio?.(agentId);
            }}
          >
            <IconLinkAoeStudio width={20} height={20} />
          </span>
        </div>
      </div>
    </Card>
  );
}
