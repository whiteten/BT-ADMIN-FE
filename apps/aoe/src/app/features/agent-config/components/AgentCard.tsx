import { Card } from 'antd';
import { ReactComponent as IconLinkAoeStudio } from '../../../../assets/images/icon/icon-link-aoe-studio.svg';
import type { AgentListItem, AoeDeployFlag } from '../types';
import DeployFlagBadge from './DeployFlagBadge';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type AgentCardProps = AgentListItem & {
  onDetail?: (agentId: string) => void;
  onOpenStudio?: (agentId: string) => void;
};

export default function AgentCard({ agentId, agentName, agentTypeName, aoeDeployFlag, deployTime, onDetail, onOpenStudio }: AgentCardProps) {
  const title = (
    <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => onDetail?.(agentId)}>
      {agentName}
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
        <DropdownMenuItem onClick={() => onDetail?.(agentId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
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
          <span className="mr-2">{deployTime ?? '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px]">워크플로우</span>
          <IconLinkAoeStudio width={20} height={20} className="hover:cursor-pointer" onClick={() => onOpenStudio?.(agentId)} />
        </div>
      </div>
    </Card>
  );
}
