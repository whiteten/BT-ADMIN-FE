import CampaignProgressRateGaugeChart from '../components/CampaignProgressRateGaugeChart';
import DialogIncompleteTopBarChart from '../components/DialogIncompleteTopBarChart';
import { type CampaignDashboardResponse, type DialogIncompleteTopItem } from '../types';

/** API 연동 전 차트 UI 확인용. BE 연동 시 `false`로 전환 */
export const CAMPAIGN_DASHBOARD_USE_MOCK = true;

export const CAMPAIGN_DASHBOARD_MOCK_RESPONSE: CampaignDashboardResponse = {
  campaignProgressRate: {
    progressRatePct: 99.9,
    totalTargetCnt: 99999,
  },
  campaignOutboundAttempt: {
    outboundAttemptCnt: 10000,
  },
};

/** `DialogIncompleteTopBarChart` 확인용 */
export const CAMPAIGN_MOCK_OUTBOUND_ATTEMPT_TOP: DialogIncompleteTopItem[] = [
  {
    rank: 1,
    serviceName: '본인확인 캠페인',
    dialogName: '1차 발신',
    entryCnt: 10000,
    completeCnt: 8500,
    completeRate: 85,
    incompleteCnt: 1500,
    incompleteRate: 15,
  },
  {
    rank: 2,
    serviceName: '본인확인 캠페인',
    dialogName: '2차 발신',
    entryCnt: 7500,
    completeCnt: 6000,
    completeRate: 80,
    incompleteCnt: 1500,
    incompleteRate: 20,
  },
  {
    rank: 3,
    serviceName: '안내 캠페인',
    dialogName: '1차 발신',
    entryCnt: 5200,
    completeCnt: 4680,
    completeRate: 90,
    incompleteCnt: 520,
    incompleteRate: 10,
  },
  {
    rank: 4,
    serviceName: '안내 캠페인',
    dialogName: '2차 발신',
    entryCnt: 3100,
    completeCnt: 2480,
    completeRate: 80,
    incompleteCnt: 620,
    incompleteRate: 20,
  },
  {
    rank: 5,
    serviceName: '리마인드 캠페인',
    dialogName: '1차 발신',
    entryCnt: 1800,
    completeCnt: 1620,
    completeRate: 90,
    incompleteCnt: 180,
    incompleteRate: 10,
  },
];

/** 레이아웃 렌더 매퍼 항목 */
export interface CampaignLayoutRenderEntry {
  title: string;
  filterLabel?: string;
  renderContent?: (data?: CampaignDashboardResponse) => React.ReactNode;
}

const toDialogIncompleteTopForAttempt = (items?: DialogIncompleteTopItem[], cnt?: number): DialogIncompleteTopItem[] => {
  if (items?.length) return items;
  if (cnt == null || Number.isNaN(cnt)) return [];
  return [
    {
      rank: 1,
      serviceName: '캠페인',
      dialogName: '총 발신 시도',
      entryCnt: cnt,
      completeCnt: 0,
      completeRate: 0,
      incompleteCnt: cnt,
      incompleteRate: 100,
    },
  ];
};

export const campaignDashboardLayoutRenderMapper: Record<string, CampaignLayoutRenderEntry> = {
  campaignProgressRate: {
    title: '진행률',
    renderContent: (d) => <CampaignProgressRateGaugeChart data={CAMPAIGN_DASHBOARD_USE_MOCK ? CAMPAIGN_DASHBOARD_MOCK_RESPONSE.campaignProgressRate : d?.campaignProgressRate} />,
  },
  campaignOutboundAttempt: {
    title: '총 발신 시도 건수 (누적)',
    renderContent: (d) => (
      <DialogIncompleteTopBarChart
        data={
          CAMPAIGN_DASHBOARD_USE_MOCK
            ? CAMPAIGN_MOCK_OUTBOUND_ATTEMPT_TOP
            : toDialogIncompleteTopForAttempt(d?.campaignOutboundAttemptTop, d?.campaignOutboundAttempt?.outboundAttemptCnt)
        }
      />
    ),
  },
};
