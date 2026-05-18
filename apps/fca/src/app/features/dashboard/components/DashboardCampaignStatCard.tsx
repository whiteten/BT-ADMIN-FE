import type { ReactNode } from 'react';
import { Card } from 'antd';

import { cn } from '@/lib/utils';

export interface DashboardCampaignStatCardProps {
  /** 카드 중앙에 표시할 값(숫자·포맷 문자열 등) */
  value: ReactNode;
  /** 루트 카드에 추가 클래스 */
  className?: string;
  /** 좁은 열·다건 배치용(패딩·숫자 크기 축소) */
  compact?: boolean;
  /** 값 텍스트에만 적용할 클래스(예: 강조 색) */
  valueClassName?: string;
}

/**
 * 캠페인/대시보드용 단순 지표 카드. 값만 중앙에 강조 표시.
 * 스타일은 `DashboardCardItem` 등 기존 대시보드 위젯과 맞춤.
 */
const DashboardCampaignStatCard = ({ value, className, compact, valueClassName }: DashboardCampaignStatCardProps) => {
  return (
    <Card
      variant="borderless"
      className={cn('flex h-full min-h-0 flex-col', compact ? 'min-h-[52px]' : 'min-h-[72px]', className)}
      classNames={{ body: cn('flex flex-1 min-h-0 items-center justify-center', compact ? '!p-2' : '!p-4') }}
    >
      <div className={cn('text-center font-semibold tabular-nums tracking-tight text-[#343a40]', compact ? 'text-lg' : 'text-2xl xl:text-3xl', valueClassName)}>{value}</div>
    </Card>
  );
};

export default DashboardCampaignStatCard;
