import { Card } from 'antd';
import dayjs from 'dayjs';
import type { CampaignScenarioListItem } from '../types/campaignScenario';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type CampaignScenarioCardProps = CampaignScenarioListItem & {
  selected?: boolean;
  onSelect?: (scenarioId: string) => void;
  onDetail?: (scenarioId: string) => void;
  onDelete?: (scenarioId: string) => void;
};

const formatDateTime = (value?: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-');

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  const textValue = typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;

  return (
    <div className="flex gap-2 min-w-0 text-sm leading-5">
      <span className="w-[76px] shrink-0 text-[#868e96]">{label}</span>
      <span className="flex-1 min-w-0 truncate" title={textValue}>
        {value}
      </span>
    </div>
  );
}

export default function CampaignScenarioCard({
  scenarioId,
  scenario,
  scenarioName,
  fileIdentifier,
  conditionNumber,
  callerNumber,
  campaignCode,
  transferDn,
  callMultiplier,
  notificationCriteria,
  priority,
  inUse,
  sequence,
  sequenceDescription,
  campaignStatus,
  targetStatus,
  workDateTime,
  selected = false,
  onSelect,
  onDetail,
  onDelete,
}: CampaignScenarioCardProps) {
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDetail?.(scenarioId);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const title = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs font-normal text-[#868e96]">{scenario}</span>
      <span className="min-w-0 truncate hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={handleTitleClick} title={scenarioName}>
        {scenarioName}
      </span>
    </div>
  );

  const extra = (
    <div onClick={handleMenuClick}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-6 h-6 flex items-center justify-center hover:cursor-pointer">
            <IconMoreVertical />
            <span className="sr-only">더보기</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="dark" align="end">
          <DropdownMenuItem onClick={() => onDetail?.(scenarioId)} className="hover:cursor-pointer">
            상세보기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete?.(scenarioId)} className="hover:cursor-pointer">
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const fields: { label: string; value: React.ReactNode }[] = [
    { label: '파일식별자', value: fileIdentifier },
    { label: '조건', value: conditionNumber },
    { label: '발신번호', value: callerNumber },
    { label: '캠페인코드', value: campaignCode },
    { label: '호전환DN', value: transferDn },
    { label: '콜배수', value: callMultiplier },
    { label: '알림기준', value: notificationCriteria },
    { label: '우선순위', value: priority },
    { label: '사용여부', value: inUse ? '사용' : '미사용' },
    { label: '차수', value: sequence },
    { label: '차수설명', value: sequenceDescription },
    { label: '캠페인상태', value: campaignStatus },
    { label: '대상자상태', value: targetStatus },
    { label: '작업일시', value: formatDateTime(workDateTime) },
  ];

  return (
    <Card
      title={title}
      styles={{ header: { paddingRight: '0 20px 0 20px', minHeight: 48 }, body: { padding: '12px 16px' } }}
      extra={extra}
      onClick={() => onSelect?.(scenarioId)}
      className={cn('hover:!border-[var(--color-bt-primary)] cursor-pointer', selected && '!border-[var(--color-bt-primary)] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]')}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[#495057]">
        {fields.map(({ label, value }) => (
          <FieldRow key={label} label={label} value={value} />
        ))}
      </div>
    </Card>
  );
}
