import type { LayoutItem } from 'react-grid-layout';

export interface IntentTopItem {
  rank: number;
  intent: string;
  detectCnt: number;
}

export interface CampaignProgressRateData {
  outboundAttemptCnt: number;
  totalTargetCnt: number;
}

export interface CampaignDashboardResponse {
  campaignProgressRate: CampaignProgressRateData;
  campaignOutboundAttempt: {
    outboundAttemptCnt: number;
    outboundAttemptTop?: IntentTopItem[];
  };
  campaignCompleteCallRate: { ratePct: number };
  campaignOutboundProgressRealtime: { count: number };
  campaignOutboundAttemptPerMinute: { count: number };
  campaignVerificationFailRate: { ratePct: number };
}

export type CampaignDashboardWidgetType = keyof CampaignDashboardResponse;

export interface CampaignDashboardLayoutItem extends LayoutItem {
  widgetType: CampaignDashboardWidgetType;
}
