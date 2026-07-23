import CampaignProgressRateGaugeChart from '../components/CampaignProgressRateGaugeChart';
import IntentTopBarChart from '../components/IntentTopBarChart';
import { type CampaignDashboardResponse, type IntentTopItem } from '../types';

/** 레이아웃 렌더 매퍼 항목 */
export interface CampaignLayoutRenderEntry {
  title: string;
  filterLabel?: string;
  renderContent?: (data?: CampaignDashboardResponse) => React.ReactNode;
}

const toIntentTopForAttempt = (items?: IntentTopItem[], cnt?: number): IntentTopItem[] => {
  if (items?.length) return items;
  if (cnt == null || Number.isNaN(cnt)) return [];
  return [{ rank: 1, intent: '총 발신 시도', detectCnt: cnt }];
};

const toIntentTopForRealtimeProgress = (cnt?: number): IntentTopItem[] => {
  if (cnt == null || Number.isNaN(cnt)) return [];
  return [{ rank: 1, intent: '발신 진행 건수', detectCnt: cnt }];
};

const toIntentTopForAttemptPerMinute = (value?: number): IntentTopItem[] => {
  if (value == null || Number.isNaN(value)) return [];
  return [{ rank: 1, intent: '분당 발신 시도 건수', detectCnt: value }];
};

export const campaignDashboardLayoutRenderMapper: Record<string, CampaignLayoutRenderEntry> = {
  campaignProgressRate: {
    title: '진행률',
    renderContent: (d) => <CampaignProgressRateGaugeChart data={d?.campaignProgressRate} />,
  },
  campaignOutboundAttempt: {
    title: '현황',
    renderContent: (d) => <IntentTopBarChart data={toIntentTopForAttempt(d?.campaignOutboundAttempt?.outboundAttemptTop, d?.campaignOutboundAttempt?.outboundAttemptCnt)} />,
  },
  campaignOutboundProgressRealtime: {
    title: '발신 진행 건수(실시간)',
    renderContent: (d) => <IntentTopBarChart data={toIntentTopForRealtimeProgress(d?.campaignOutboundProgressRealtime?.count)} />,
  },
  campaignCompleteCallRate: {
    title: '본인 통화 완료율',
    renderContent: (d) => <CampaignProgressRateGaugeChart valueType="percent" value={d?.campaignCompleteCallRate?.ratePct} showTargetCount={false} showSeriesData={false} />,
  },
  campaignOutboundAttemptPerMinute: {
    title: '분당 발신 시도 건수',
    renderContent: (d) => <IntentTopBarChart data={toIntentTopForAttemptPerMinute(d?.campaignOutboundAttemptPerMinute?.count)} />,
  },
  campaignVerificationFailRate: {
    title: '검증 실패율',
    renderContent: (d) => <CampaignProgressRateGaugeChart valueType="percent" value={d?.campaignVerificationFailRate?.ratePct} showTargetCount={false} showSeriesData={false} />,
  },
};
