import { Card } from 'antd';
import dayjs from 'dayjs';
import { ReactComponent as IconLinkAoeStudio } from '../../../../assets/images/icon/icon-link-aoe-studio.svg';
import type { AgentDeleteDatas, AgentListItem, AoeDeployFlag } from '../types';
import DeployFlagBadge from './DeployFlagBadge';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type AgentCardProps = AgentListItem & {
  canWrite?: boolean;
  onDetail?: (agentId: string) => void;
  onOpenStudio?: (agentId: string) => void;
  onDelete?: (data: AgentDeleteDatas) => void;
  onPlayground?: (agentId: string) => void;
  onDuplicate?: (agentId: string) => void;
};

export default function AgentCard({
  agentId,
  agentName,
  agentTypeName,
  aoeDeployFlag,
  aoeApiKey,
  deployTime,
  canWrite = false,
  onDetail,
  onOpenStudio,
  onDelete,
  onPlayground,
  onDuplicate,
}: AgentCardProps) {
  const title = (
    <span
      className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]"
      onClick={(e) => {
        e.stopPropagation();
        onDetail?.(agentId);
      }}
    >
      {agentName}
    </span>
  );

  const extra = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
          <IconMoreVertical />
          <span className="sr-only">더보기</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dark" align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onDetail?.(agentId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPlayground?.(agentId)} className="hover:cursor-pointer">
          Playground
        </DropdownMenuItem>
        {canWrite && (
          <DropdownMenuItem onClick={() => onDuplicate?.(agentId)} className="hover:cursor-pointer">
            복제
          </DropdownMenuItem>
        )}
        {canWrite && (
          <DropdownMenuItem onClick={() => onDelete?.({ agentId, aoeDeployFlag, aoeApiKey })} className="hover:cursor-pointer">
            삭제
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card
      title={title}
      styles={{ header: { padding: '0 20px' }, body: { padding: '20px', paddingTop: '16px', minHeight: '148px' } }}
      extra={extra}
      className="transition-all duration-200 hover:-translate-y-0.5 hover:!border-[var(--color-bt-primary)] hover:shadow-[0px_6px_16px_0px_#38414A1f] hover:cursor-pointer"
      onClick={() => onPlayground?.(agentId)}
    >
      <div className="flex flex-col text-[#495057] gap-2.5">
        <div className="flex">
          <span className="w-[104px] text-[#888B9A]">에이전트 타입</span>
          <span className="mr-2">{agentTypeName ?? '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px] text-[#888B9A]">배포 여부</span>
          <DeployFlagBadge flag={aoeDeployFlag as AoeDeployFlag} />
        </div>
        <div className="flex">
          <span className="w-[104px] text-[#888B9A]">배포 시간</span>
          <span className="mr-2">{deployTime ? dayjs(deployTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </div>
        <div className="flex items-center">
          <span className="w-[104px] text-[#888B9A]">워크플로우</span>
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
