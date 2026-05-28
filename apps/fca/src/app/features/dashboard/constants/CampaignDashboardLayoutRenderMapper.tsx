import CampaignProgressRateGaugeChart from '../components/CampaignProgressRateGaugeChart';
import IntentTopBarChart from '../components/IntentTopBarChart';
import { type CampaignDashboardResponse, type IntentTopItem } from '../types';

/** API 연동 전 차트 UI 확인용. BE 연동 시 `false`로 전환 */
export const CAMPAIGN_DASHBOARD_USE_MOCK = true;

/** `IntentTopBarChart` 확인용 — 캠페인 발신 지표 6종 */
const CAMPAIGN_OUTBOUND_ATTEMPT_MOCK_LABELS = ['본인확인건수', '본인 통화 완료 건수', '재시도 발신 건수', '실패 건수', '부재 건수', '문자 발송 건수'] as const;

const CAMPAIGN_OUTBOUND_ATTEMPT_MOCK_COUNT = 10000;

export const CAMPAIGN_MOCK_OUTBOUND_ATTEMPT_TOP: IntentTopItem[] = CAMPAIGN_OUTBOUND_ATTEMPT_MOCK_LABELS.map((intent, index) => ({
  rank: index + 1,
  intent,
  detectCnt: CAMPAIGN_OUTBOUND_ATTEMPT_MOCK_COUNT,
}));

export const CAMPAIGN_DASHBOARD_MOCK_RESPONSE: CampaignDashboardResponse = {
  campaignProgressRate: {
    outboundAttemptCnt: 90909,
    totalTargetCnt: 99999,
  },
  campaignOutboundAttempt: {
    outboundAttemptCnt: 10000,
    outboundAttemptTop: CAMPAIGN_MOCK_OUTBOUND_ATTEMPT_TOP,
  },
  campaignCompleteCallRate: { ratePct: 99.9 },
  campaignOutboundProgressRealtime: { count: 9999 },
  campaignOutboundAttemptPerMinute: { count: 300 },
  campaignVerificationFailRate: { ratePct: 99.9 },
};

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
    renderContent: (d) => <CampaignProgressRateGaugeChart data={CAMPAIGN_DASHBOARD_USE_MOCK ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE.campaignProgressRate : d?.campaignProgressRate} />,
  },
  campaignOutboundAttempt: {
    title: '현황',
    renderContent: (d) => (
      <IntentTopBarChart
        data={
          CAMPAIGN_DASHBOARD_USE_MOCK
            ? CAMPAIGN_MOCK_OUTBOUND_ATTEMPT_TOP
            : toIntentTopForAttempt(d?.campaignOutboundAttempt?.outboundAttemptTop, d?.campaignOutboundAttempt?.outboundAttemptCnt)
        }
      />
    ),
  },
  campaignOutboundProgressRealtime: {
    title: '발신 진행 건수(실시간)',
    renderContent: (d) => (
      <IntentTopBarChart
        data={toIntentTopForRealtimeProgress(
          CAMPAIGN_DASHBOARD_USE_MOCK ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE.campaignOutboundProgressRealtime.count : d?.campaignOutboundProgressRealtime?.count,
        )}
      />
    ),
  },
  campaignCompleteCallRate: {
    title: '본인 통화 완료율',
    renderContent: (d) => (
      <CampaignProgressRateGaugeChart
        valueType="percent"
        value={CAMPAIGN_DASHBOARD_USE_MOCK ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE.campaignCompleteCallRate.ratePct : d?.campaignCompleteCallRate?.ratePct}
        showTargetCount={false}
        showSeriesData={false}
      />
    ),
  },
  campaignOutboundAttemptPerMinute: {
    title: '분당 발신 시도 건수',
    renderContent: (d) => (
      <IntentTopBarChart
        data={toIntentTopForAttemptPerMinute(
          CAMPAIGN_DASHBOARD_USE_MOCK ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE.campaignOutboundAttemptPerMinute.count : d?.campaignOutboundAttemptPerMinute?.count,
        )}
      />
    ),
  },
  campaignVerificationFailRate: {
    title: '검증 실패율',
    renderContent: (d) => (
      <CampaignProgressRateGaugeChart
        valueType="percent"
        value={CAMPAIGN_DASHBOARD_USE_MOCK ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE.campaignVerificationFailRate.ratePct : d?.campaignVerificationFailRate?.ratePct}
        showTargetCount={false}
        showSeriesData={false}
      />
    ),
  },
};
