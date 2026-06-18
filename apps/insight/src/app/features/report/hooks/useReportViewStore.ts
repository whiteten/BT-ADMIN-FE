import { format, subDays } from 'date-fns';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { COMPARISON_AVAILABILITY, type ComparisonType, DEFAULT_GLOBAL_CONDITIONS, type GlobalConditions, type GlobalFilter, type TimeUnit } from '../../global-filter/types';

const defaultFilter: GlobalFilter = {
  period: {
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  },
  timeUnit: 'DAILY',
  searchValues: {},
  comparison: null,
  conditions: DEFAULT_GLOBAL_CONDITIONS,
};

// ── localStorage 영속화 ───────────────────────────────────────────────────────
// 글로벌 공통조건(기간/단위/비교/시각·요일 등)은 전역 1개 키로,
// 조회조건 select 값(searchValues)은 보고서마다 다르므로 reportId 별 키로 저장한다.
const GLOBAL_KEY = 'insight.report.globalConditions';
const SV_KEY = (reportId: number) => `insight.report.searchValues.${reportId}`;
type GlobalPart = Omit<GlobalFilter, 'searchValues'>;

function readJSON<T>(key: string): T | null {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 용량 초과/프라이빗 모드 등 — 무시 */
  }
}

interface ReportViewState {
  globalFilter: GlobalFilter;
  committedFilter: GlobalFilter;
  queryTrigger: number;
  isQuerying: boolean;
  /** 현재 보고서 ID — searchValues 를 reportId 별로 저장/복원하기 위해 보관. */
  reportId: number | null;

  setGlobalFilter(filter: Partial<GlobalFilter>): void;
  setTimeUnit(unit: TimeUnit): void;
  setComparison(comparison: ComparisonType | null): void;
  setSearchValue(key: string, value: unknown): void;
  setConditions(conditions: GlobalConditions): void;
  setPeriod(from: string, to: string): void;
  setIsQuerying(querying: boolean): void;
  commitFilter(): void;
  resetFilter(): void;
  /** 보고서 진입 시 호출 — 글로벌 공통조건 + 해당 보고서 searchValues 를 localStorage 에서 복원. */
  hydrateForReport(reportId: number): void;
}

export const useReportViewStore = create<ReportViewState>()(
  devtools(
    (set) => ({
      globalFilter: defaultFilter,
      committedFilter: defaultFilter,
      queryTrigger: 0,
      isQuerying: false,
      reportId: null,

      setGlobalFilter: (filter) => set((s) => ({ globalFilter: { ...s.globalFilter, ...filter } }), false, 'setGlobalFilter'),

      setTimeUnit: (timeUnit) =>
        set(
          (s) => {
            const currentComparison = s.globalFilter.comparison;
            const isComparisonAvailable = currentComparison !== null && COMPARISON_AVAILABILITY[timeUnit][currentComparison];
            return {
              globalFilter: {
                ...s.globalFilter,
                timeUnit,
                comparison: isComparisonAvailable ? currentComparison : null,
              },
            };
          },
          false,
          'setTimeUnit',
        ),

      setComparison: (comparison) => set((s) => ({ globalFilter: { ...s.globalFilter, comparison } }), false, 'setComparison'),

      setSearchValue: (key, value) =>
        set(
          (s) => ({
            globalFilter: {
              ...s.globalFilter,
              searchValues: { ...s.globalFilter.searchValues, [key]: value },
            },
          }),
          false,
          'setSearchValue',
        ),

      setConditions: (conditions) => set((s) => ({ globalFilter: { ...s.globalFilter, conditions } }), false, 'setConditions'),

      setPeriod: (from, to) => set((s) => ({ globalFilter: { ...s.globalFilter, period: { from, to } } }), false, 'setPeriod'),

      setIsQuerying: (isQuerying) => set({ isQuerying }, false, 'setIsQuerying'),

      commitFilter: () =>
        set(
          (s) => {
            const committed = { ...s.globalFilter };
            // 조회(커밋) 시점에 영속화: 글로벌 공통조건은 전역, searchValues 는 보고서별
            const { searchValues, ...globalPart } = committed;
            writeJSON(GLOBAL_KEY, globalPart);
            if (s.reportId != null) writeJSON(SV_KEY(s.reportId), searchValues);
            return { committedFilter: committed, queryTrigger: s.queryTrigger + 1 };
          },
          false,
          'commitFilter',
        ),

      resetFilter: () => set({ globalFilter: defaultFilter, committedFilter: defaultFilter, queryTrigger: 0 }, false, 'resetFilter'),

      hydrateForReport: (reportId) =>
        set(
          () => {
            const globalPart = readJSON<GlobalPart>(GLOBAL_KEY);
            const searchValues = readJSON<Record<string, unknown>>(SV_KEY(reportId));
            const restored: GlobalFilter = {
              period: globalPart?.period ?? defaultFilter.period,
              timeUnit: globalPart?.timeUnit ?? defaultFilter.timeUnit,
              comparison: globalPart?.comparison ?? defaultFilter.comparison,
              conditions: globalPart?.conditions ?? defaultFilter.conditions,
              searchValues: searchValues ?? {},
            };
            // 저장된 조건이 있으면 즉시 조회(queryTrigger>0)해 마지막 화면 복원
            const hasSaved = !!globalPart || !!searchValues;
            return {
              reportId,
              globalFilter: restored,
              committedFilter: restored,
              queryTrigger: hasSaved ? 1 : 0,
            };
          },
          false,
          'hydrateForReport',
        ),
    }),
    { name: 'ReportViewStore' },
  ),
);
