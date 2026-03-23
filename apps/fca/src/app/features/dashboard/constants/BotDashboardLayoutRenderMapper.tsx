import { DEFAULT_ROW_CNT } from './dashboardConstants';
import DialogIncompleteTopBarChart from '../components/DialogIncompleteTopBarChart';
import DialogIncompleteTopConfigDrawer from '../components/DialogIncompleteTopConfigDrawer';
import DialogIncompleteTopGrid from '../components/DialogIncompleteTopGrid';
import DialogSummaryGrid from '../components/DialogSummaryGrid';
import DialogSummaryPieChart from '../components/DialogSummaryPieChart';
import EntityTopBarChart from '../components/EntityTopBarChart';
import EntityTopConfigDrawer from '../components/EntityTopConfigDrawer';
import EntityTopGrid from '../components/EntityTopGrid';
import HourlyEntryGrid from '../components/HourlyEntryGrid';
import HourlyEntryLineChart from '../components/HourlyEntryLineChart';
import IntentCheckFailTopBarChart from '../components/IntentCheckFailTopBarChart';
import IntentCheckFailTopConfigDrawer from '../components/IntentCheckFailTopConfigDrawer';
import IntentCheckFailTopGrid from '../components/IntentCheckFailTopGrid';
import IntentTopBarChart from '../components/IntentTopBarChart';
import IntentTopConfigDrawer from '../components/IntentTopConfigDrawer';
import IntentTopGrid from '../components/IntentTopGrid';
import KeywordTopConfigDrawer from '../components/KeywordTopConfigDrawer';
import KeywordTopGrid from '../components/KeywordTopGrid';
import KeywordWordCloud from '../components/KeywordWordCloud';
import OccupancyBarChart from '../components/OccupancyBarChart';
import OccupancyGrid from '../components/OccupancyGrid';
import ScenarioSummaryGrid from '../components/ScenarioSummaryGrid';
import ScenarioSummaryPieChart from '../components/ScenarioSummaryPieChart';
import SlotIncompleteTopBarChart from '../components/SlotIncompleteTopBarChart';
import SlotIncompleteTopConfigDrawer from '../components/SlotIncompleteTopConfigDrawer';
import SlotIncompleteTopGrid from '../components/SlotIncompleteTopGrid';
import SlotRetryAvgTopBarChart from '../components/SlotRetryAvgTopBarChart';
import SlotRetryAvgTopConfigDrawer from '../components/SlotRetryAvgTopConfigDrawer';
import SlotRetryAvgTopGrid from '../components/SlotRetryAvgTopGrid';
import SlotRetryDistTopBarChart from '../components/SlotRetryDistTopBarChart';
import SlotRetryDistTopConfigDrawer from '../components/SlotRetryDistTopConfigDrawer';
import SlotRetryDistTopGrid from '../components/SlotRetryDistTopGrid';
import SlotSummaryGrid from '../components/SlotSummaryGrid';
import SlotSummaryPieChart from '../components/SlotSummaryPieChart';
import { type BotDashboardResponse, DASHBOARD_VIEW, type DashboardViewMode } from '../types/dashboard.types';

/** 위젯 메뉴 액션에 전달되는 컨텍스트 */
export interface WidgetActionContext {
  widgetOptions: Record<string, unknown>;
  setOption: (key: string, value: unknown) => void;
  globalOptions: Record<string, unknown>;
}

/** 위젯 드롭다운 메뉴의 개별 액션 항목 */
export interface WidgetMenuAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  renderContent: (ctx: WidgetActionContext & { open: boolean; onClose: () => void }) => React.ReactNode;
}

/** 레이아웃 렌더 매퍼 항목 */
export interface LayoutRenderEntry {
  title: string;
  supportedModes?: DashboardViewMode[];
  menuActions?: WidgetMenuAction[];
  defaultOptions?: Record<string, unknown>;
  renderChart?: (data?: BotDashboardResponse) => React.ReactNode;
  renderTable?: (data?: BotDashboardResponse) => React.ReactNode;
}

export const botDashboardLayoutRenderMapper: Record<string, LayoutRenderEntry> = {
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
    title: '대화 미완결율 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <DialogIncompleteTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <DialogIncompleteTopBarChart data={d?.dialogIncompleteTop} />,
    renderTable: (d) => <DialogIncompleteTopGrid data={d?.dialogIncompleteTop} />,
  },
  slotIncompleteTop: {
    title: '슬롯 미완결율 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <SlotIncompleteTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <SlotIncompleteTopBarChart data={d?.slotIncompleteTop} />,
    renderTable: (d) => <SlotIncompleteTopGrid data={d?.slotIncompleteTop} />,
  },
  slotRetryAvgTop: {
    title: '슬롯 평균 재시도 횟수 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <SlotRetryAvgTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <SlotRetryAvgTopBarChart data={d?.slotRetryAvgTop} />,
    renderTable: (d) => <SlotRetryAvgTopGrid data={d?.slotRetryAvgTop} />,
  },
  slotRetryDistTop: {
    title: '슬롯 완결 건 재시도 분포 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <SlotRetryDistTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <SlotRetryDistTopBarChart data={d?.slotRetryDistTop} />,
    renderTable: (d) => <SlotRetryDistTopGrid data={d?.slotRetryDistTop} />,
  },
  keywordTop: {
    title: '키워드 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { excludeWords: [] as string[] },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <KeywordTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <KeywordWordCloud data={d?.keywordTop} />,
    renderTable: (d) => <KeywordTopGrid data={d?.keywordTop} />,
  },
  entityTop: {
    title: '개체 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <EntityTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <EntityTopBarChart data={d?.entityTop} />,
    renderTable: (d) => <EntityTopGrid data={d?.entityTop} />,
  },
  intentTop: {
    title: '의도 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <IntentTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <IntentTopBarChart data={d?.intentTop} />,
    renderTable: (d) => <IntentTopGrid data={d?.intentTop} />,
  },
  intentCheckFailTop: {
    title: '의도 Check/Fail 순위',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    defaultOptions: { rowCnt: DEFAULT_ROW_CNT },
    menuActions: [
      {
        key: 'settings',
        label: '상세 설정',
        renderContent: ({ widgetOptions, setOption, globalOptions, open, onClose }) => (
          <IntentCheckFailTopConfigDrawer widgetOptions={widgetOptions} setOption={setOption} globalOptions={globalOptions} open={open} onClose={onClose} />
        ),
      },
    ],
    renderChart: (d) => <IntentCheckFailTopBarChart data={d?.intentCheckFailTop} />,
    renderTable: (d) => <IntentCheckFailTopGrid data={d?.intentCheckFailTop} />,
  },
  hourlyEntry: {
    title: '시간대별 봇 진입 현황',
    supportedModes: [DASHBOARD_VIEW.CHART, DASHBOARD_VIEW.TABLE],
    renderChart: (d) => <HourlyEntryLineChart data={d?.hourlyEntry} />,
    renderTable: (d) => <HourlyEntryGrid data={d?.hourlyEntry} />,
  },
};
