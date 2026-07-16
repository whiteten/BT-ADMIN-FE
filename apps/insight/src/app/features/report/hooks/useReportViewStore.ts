import { format, subDays } from 'date-fns';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useOperatorScopeStore } from '@/shared-store';
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
  tenantId: null,
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
  /** 운영자 모드 — 조회 대상 테넌트 변경. 테넌트가 바뀌면 기존 searchValues 는 무효라 함께 초기화. */
  setTenantId(tenantId: string | null): void;
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

      setTenantId: (tenantId) =>
        set(
          (s) => ({
            globalFilter: { ...s.globalFilter, tenantId, searchValues: {} },
          }),
          false,
          'setTenantId',
        ),

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
            // 운영자 모드의 "테넌트 선택 전 조회 차단"은 뷰 전용 호출부에서 처리한다
            // (ReportView 진입 자동조회 skip + GlobalFilter handleQuery 경고). 편집기 커밋은 차단하지 않음.
            const committed = { ...s.globalFilter };
            // 조회(커밋) 시점에 영속화: 글로벌 공통조건은 전역, searchValues 는 보고서별.
            // tenantId 는 세션성 선택값이라 영속화하지 않는다 (재진입 시 재선택 강제).
            const { searchValues, tenantId: _tenantId, ...globalPart } = committed;
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
              tenantId: null,
            };
            // 저장된 조건이 있으면 즉시 조회(queryTrigger>0)해 마지막 화면 복원.
            // 운영자 모드는 테넌트 선택이 선행돼야 하므로 복원 조회도 차단(트리거 0 유지).
            const operatorMode = useOperatorScopeStore.getState().operatorMode;
            const hasSaved = !operatorMode && (!!globalPart || !!searchValues);
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
