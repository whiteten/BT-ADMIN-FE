import DashboardCampaignStatCard from './DashboardCampaignStatCard';
import type { CampaignStatsOverview } from '../types/dashboard.types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CampaignStatsOverviewPanelProps {
  data?: CampaignStatsOverview;
}

type StatFormat = 'int' | 'pct';

interface StatDef {
  key: string;
  label: string;
  badge?: string;
  format: StatFormat;
  pick: (d: CampaignStatsOverview | undefined) => number | undefined;
  valueClassName?: string;
}

const formatInt = (n: number | undefined) => (n != null && !Number.isNaN(n) ? n.toLocaleString() : '–');
const formatPct = (n: number | undefined) => (n != null && !Number.isNaN(n) ? `${Number(n).toFixed(1)}%` : '–');

/** 1열: 주요 건수 2개 (큰 카드) */
const COL_PRIMARY: StatDef[] = [
  { key: 'totalTarget', label: '총 대상 건수', format: 'int', pick: (d) => d?.totalTargetCnt },
  { key: 'outboundProgress', label: '발신 진행 건수', badge: '실시간', format: 'int', pick: (d) => d?.outboundProgressCnt },
];

/** 2열: 발신·진행률 */
const COL_SECONDARY: StatDef[] = [
  { key: 'outboundAttempt', label: '총 발신 시도 건수', badge: '누적', format: 'int', pick: (d) => d?.outboundAttemptCnt },
  { key: 'progressRate', label: '진행률', format: 'pct', pick: (d) => d?.progressRatePct },
];

/** 3열: 본인 확인 관련 (중간 밀도) */
const COL_IDENTITY: StatDef[] = [
  { key: 'selfVerification', label: '본인 확인 건수', format: 'int', pick: (d) => d?.selfVerificationCnt },
  { key: 'selfCallComplete', label: '본인 통화 완료 건수', format: 'int', pick: (d) => d?.selfCallCompleteCnt },
  { key: 'selfCallRate', label: '본인 통화 완료율', badge: 'RPC', format: 'pct', pick: (d) => d?.selfCallCompleteRatePct },
];

/** 4열: 부가 지표 (촘촘) */
const COL_EXTRA: StatDef[] = [
  { key: 'retry', label: '재시도 발신 건수', format: 'int', pick: (d) => d?.retryOutboundCnt },
  { key: 'fail', label: '실패 건수', format: 'int', pick: (d) => d?.failCnt, valueClassName: 'text-[#2563eb]' },
  { key: 'absent', label: '부재 건수', format: 'int', pick: (d) => d?.absentCnt },
  { key: 'sms', label: '문자 발송 건수', format: 'int', pick: (d) => d?.smsSendCnt },
];

const COLUMNS: { stats: StatDef[]; compact: boolean }[] = [
  { stats: COL_PRIMARY, compact: false },
  { stats: COL_SECONDARY, compact: false },
  { stats: COL_IDENTITY, compact: true },
  { stats: COL_EXTRA, compact: true },
];

interface StatRowProps {
  item: StatDef;
  data?: CampaignStatsOverview;
  compact: boolean;
}

const StatRow = ({ item, data, compact }: StatRowProps) => {
  const raw = item.pick(data);
  const display = item.format === 'pct' ? formatPct(raw) : formatInt(raw);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <span className={cn('font-medium text-[#495057]', compact ? 'text-[11px] leading-snug' : 'text-xs')}>{item.label}</span>
        {item.badge != null && item.badge !== '' ? (
          <Badge variant="secondary" className={cn('shrink-0 font-normal', compact ? 'px-1.5 py-0 text-[10px]' : undefined)}>
            {item.badge}
          </Badge>
        ) : null}
      </div>
      <DashboardCampaignStatCard compact={compact} className="min-h-0 flex-1" value={display} valueClassName={item.valueClassName} />
    </div>
  );
};

/**
 * `campaignStatsOverview` 위젯 본문 — 하나의 구독으로 여러 지표를 4열 가로 배치한다.
 */
const CampaignStatsOverviewPanel = ({ data }: CampaignStatsOverviewPanelProps) => {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden md:flex-row md:gap-2 lg:gap-3">
      {COLUMNS.map(({ stats, compact }, colIdx) => (
        <div key={colIdx} className={cn('flex min-h-0 min-w-0 flex-1 flex-col gap-2', colIdx < 2 ? 'md:basis-[26%]' : 'md:basis-[24%]')}>
          {stats.map((item) => (
            <StatRow key={item.key} item={item} data={data} compact={compact} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default CampaignStatsOverviewPanel;
