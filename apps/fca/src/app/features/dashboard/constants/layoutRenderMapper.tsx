import DialogIncompleteTopBarChart from '../components/DialogIncompleteTopBarChart';
import DialogIncompleteTopGrid from '../components/DialogIncompleteTopGrid';
import DialogSummaryGrid from '../components/DialogSummaryGrid';
import DialogSummaryPieChart from '../components/DialogSummaryPieChart';
import EntityTopBarChart from '../components/EntityTopBarChart';
import EntityTopGrid from '../components/EntityTopGrid';
import HourlyBusyTimeGrid from '../components/HourlyBusyTimeGrid';
import HourlyBusyTimeLineChart from '../components/HourlyBusyTimeLineChart';
import HourlyEntryGrid from '../components/HourlyEntryGrid';
import HourlyEntryLineChart from '../components/HourlyEntryLineChart';
import IntentCheckFailTopBarChart from '../components/IntentCheckFailTopBarChart';
import IntentCheckFailTopGrid from '../components/IntentCheckFailTopGrid';
import IntentConfidenceTopBarChart from '../components/IntentConfidenceTopBarChart';
import IntentConfidenceTopGrid from '../components/IntentConfidenceTopGrid';
import IntentTopBarChart from '../components/IntentTopBarChart';
import IntentTopGrid from '../components/IntentTopGrid';
import KeywordTopGrid from '../components/KeywordTopGrid';
import KeywordWordCloud from '../components/KeywordWordCloud';
import OccupancyBarChart from '../components/OccupancyBarChart';
import OccupancyGrid from '../components/OccupancyGrid';
import ScenarioSummaryGrid from '../components/ScenarioSummaryGrid';
import ScenarioSummaryPieChart from '../components/ScenarioSummaryPieChart';
import SlotIncompleteTopBarChart from '../components/SlotIncompleteTopBarChart';
import SlotIncompleteTopGrid from '../components/SlotIncompleteTopGrid';
import SlotRetryAvgTopBarChart from '../components/SlotRetryAvgTopBarChart';
import SlotRetryAvgTopGrid from '../components/SlotRetryAvgTopGrid';
import SlotRetryDistTopBarChart from '../components/SlotRetryDistTopBarChart';
import SlotRetryDistTopGrid from '../components/SlotRetryDistTopGrid';
import SlotSummaryGrid from '../components/SlotSummaryGrid';
import SlotSummaryPieChart from '../components/SlotSummaryPieChart';
import { type BotDashboardResponse, DASHBOARD_VIEW, type DashboardViewMode } from '../types/dashboard.types';

/** 레이아웃 렌더 매퍼 항목 */
export interface LayoutRenderEntry {
  title: string;
  supportedModes?: DashboardViewMode[];
  renderChart?: (data?: BotDashboardResponse) => React.ReactNode;
  renderTable?: (data?: BotDashboardResponse) => React.ReactNode;
}

export const layoutRenderMapper: Record<string, LayoutRenderEntry> = {
  serviceOccupancy: {
    title: '봇 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <OccupancyBarChart data={d?.serviceOccupancy} />,
    renderTable: (d) => <OccupancyGrid data={d?.serviceOccupancy} />,
  },
  dialogOccupancy: {
    title: '대화 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <OccupancyBarChart data={d?.dialogOccupancy} />,
    renderTable: (d) => <OccupancyGrid data={d?.dialogOccupancy} />,
  },
  slotOccupancy: {
    title: '슬롯 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <OccupancyBarChart data={d?.slotOccupancy} />,
    renderTable: (d) => <OccupancyGrid data={d?.slotOccupancy} />,
  },
  scenarioSummary: {
    title: '봇 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <ScenarioSummaryPieChart data={d?.scenarioSummary} />,
    renderTable: (d) => <ScenarioSummaryGrid data={d?.scenarioSummary} />,
  },
  dialogSummary: {
    title: '대화 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <DialogSummaryPieChart data={d?.dialogSummary} />,
    renderTable: (d) => <DialogSummaryGrid data={d?.dialogSummary} />,
  },
  slotSummary: {
    title: '슬롯 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <SlotSummaryPieChart data={d?.slotSummary} />,
    renderTable: (d) => <SlotSummaryGrid data={d?.slotSummary} />,
  },
  dialogIncompleteTop: {
    title: '대화 미완결율 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <DialogIncompleteTopBarChart data={d?.dialogIncompleteTop} />,
    renderTable: (d) => <DialogIncompleteTopGrid data={d?.dialogIncompleteTop} />,
  },
  slotIncompleteTop: {
    title: '슬롯 미완결율 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <SlotIncompleteTopBarChart data={d?.slotIncompleteTop} />,
    renderTable: (d) => <SlotIncompleteTopGrid data={d?.slotIncompleteTop} />,
  },
  slotRetryAvgTop: {
    title: '슬롯 평균 재시도 횟수 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <SlotRetryAvgTopBarChart data={d?.slotRetryAvgTop} />,
    renderTable: (d) => <SlotRetryAvgTopGrid data={d?.slotRetryAvgTop} />,
  },
  slotRetryDistTop: {
    title: '슬롯 완결 건 재시도 분포 TOP 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <SlotRetryDistTopBarChart data={d?.slotRetryDistTop} />,
    renderTable: (d) => <SlotRetryDistTopGrid data={d?.slotRetryDistTop} />,
  },
  keywordTop: {
    title: '키워드 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <KeywordWordCloud data={d?.keywordTop} />,
    renderTable: (d) => <KeywordTopGrid data={d?.keywordTop} />,
  },
  entityTop: {
    title: '개체 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <EntityTopBarChart data={d?.entityTop} />,
    renderTable: (d) => <EntityTopGrid data={d?.entityTop} />,
  },
  intentTop: {
    title: '의도 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <IntentTopBarChart data={d?.intentTop} />,
    renderTable: (d) => <IntentTopGrid data={d?.intentTop} />,
  },
  intentCheckFailTop: {
    title: '의도 Check/Fail Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <IntentCheckFailTopBarChart data={d?.intentCheckFailTop} />,
    renderTable: (d) => <IntentCheckFailTopGrid data={d?.intentCheckFailTop} />,
  },
  intentConfidenceTop: {
    title: '의도 평균 신뢰도 Top 10',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <IntentConfidenceTopBarChart data={d?.intentConfidenceTop} />,
    renderTable: (d) => <IntentConfidenceTopGrid data={d?.intentConfidenceTop} />,
  },
  hourlyEntry: {
    title: '시간대별 봇 진입 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <HourlyEntryLineChart data={d?.hourlyEntry} />,
    renderTable: (d) => <HourlyEntryGrid data={d?.hourlyEntry} />,
  },
  hourlyBusyTime: {
    title: '시간대별 봇 점유 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <HourlyBusyTimeLineChart data={d?.hourlyBusyTime} />,
    renderTable: (d) => <HourlyBusyTimeGrid data={d?.hourlyBusyTime} />,
  },
};
