import { Badge, Card, Tag } from 'antd';
import { CONTRACT_STATUS_COLORS, type TenantListItem } from '../types';
import { IconMoreVertical } from '@/components/custom/Icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type TenantCardProps = TenantListItem & {
  onDetail?: (tenantId: number) => void;
  onDelete?: (tenantId: number) => void;
};

const formatNumber = (value: number | null): string => {
  if (value == null || value === 0) return '0';
  return value.toLocaleString();
};

export default function TenantCard({
  tenantId,
  tenantName,
  tenantAlias,
  contractStatus,
  contractStatusName,
  contractStartDate,
  contractFinshDate,
  maxCoAmount,
  didLicAmount,
  maxCtiAmount,
  maxExtAmount,
  activeYn,
  onDetail,
  onDelete,
}: TenantCardProps) {
  const isActive = activeYn === 1;

  const title = (
    <div className="flex items-center gap-2">
      <Badge status={isActive ? 'success' : 'default'} />
      <span className="hover:cursor-pointer hover:!text-[var(--color-bt-primary)]" onClick={() => onDetail?.(tenantId)}>
        {tenantName}
      </span>
    </div>
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
        <DropdownMenuItem onClick={() => onDetail?.(tenantId)} className="hover:cursor-pointer">
          상세보기
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete?.(tenantId)} className="hover:cursor-pointer">
          비활성화
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const contractPeriod = contractStartDate && contractFinshDate ? `${contractStartDate} ~ ${contractFinshDate}` : '-';

  const statusColor = contractStatus ? (CONTRACT_STATUS_COLORS[contractStatus] ?? '#868e96') : '#868e96';

  const hasTags = (maxCoAmount ?? 0) > 0 || (didLicAmount ?? 0) > 0 || (maxCtiAmount ?? 0) > 0 || (maxExtAmount ?? 0) > 0;

  return (
    <Card
      title={title}
      styles={{ header: { paddingRight: '0 20px 0 20px' }, body: { padding: '20px', paddingTop: '16px' } }}
      extra={extra}
      className="hover:!border-[var(--color-bt-primary)] cursor-pointer"
      onClick={() => onDetail?.(tenantId)}
    >
      <div className="flex flex-col text-[#495057] gap-2">
        <div className="flex">
          <span className="w-[104px]">별칭</span>
          <span>{tenantAlias ?? '-'}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">계약상태</span>
          <span className="font-medium" style={{ color: statusColor }}>
            {contractStatusName ?? '-'}
          </span>
        </div>
        <div className="flex">
          <span className="w-[104px]">계약기간</span>
          <span>{contractPeriod}</span>
        </div>
        <div className="flex">
          <span className="w-[104px]">활성</span>
          <Tag color={isActive ? 'green' : 'default'} className="!m-0">
            {isActive ? '활성' : '비활성'}
          </Tag>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1 pt-3 border-t border-[#f1f3f5]">
          {hasTags ? (
            <>
              {(maxCoAmount ?? 0) > 0 && (
                <Tag variant="filled" className="!inline-flex items-center !px-2 !py-1 !m-0">
                  국선 {formatNumber(maxCoAmount)}
                </Tag>
              )}
              {(didLicAmount ?? 0) > 0 && (
                <Tag variant="filled" className="!inline-flex items-center !px-2 !py-1 !m-0">
                  DID {formatNumber(didLicAmount)}
                </Tag>
              )}
              {(maxCtiAmount ?? 0) > 0 && (
                <Tag variant="filled" className="!inline-flex items-center !px-2 !py-1 !m-0">
                  CTI {formatNumber(maxCtiAmount)}
                </Tag>
              )}
              {(maxExtAmount ?? 0) > 0 && (
                <Tag variant="filled" className="!inline-flex items-center !px-2 !py-1 !m-0">
                  내선 {formatNumber(maxExtAmount)}
                </Tag>
              )}
            </>
          ) : (
            <span className="text-xs text-[#ced4da]">미계약</span>
          )}
        </div>
      </div>
    </Card>
  );
}
