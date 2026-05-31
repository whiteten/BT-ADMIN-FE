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

interface ReportViewState {
  globalFilter: GlobalFilter;
  committedFilter: GlobalFilter;
  queryTrigger: number;
  isQuerying: boolean;

  setGlobalFilter(filter: Partial<GlobalFilter>): void;
  setTimeUnit(unit: TimeUnit): void;
  setComparison(comparison: ComparisonType | null): void;
  setSearchValue(key: string, value: unknown): void;
  setConditions(conditions: GlobalConditions): void;
  setPeriod(from: string, to: string): void;
  setIsQuerying(querying: boolean): void;
  commitFilter(): void;
  resetFilter(): void;
}

export const useReportViewStore = create<ReportViewState>()(
  devtools(
    (set) => ({
      globalFilter: defaultFilter,
      committedFilter: defaultFilter,
      queryTrigger: 0,
      isQuerying: false,

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

      commitFilter: () => set((s) => ({ committedFilter: { ...s.globalFilter }, queryTrigger: s.queryTrigger + 1 }), false, 'commitFilter'),

      resetFilter: () => set({ globalFilter: defaultFilter, committedFilter: defaultFilter, queryTrigger: 0 }, false, 'resetFilter'),
    }),
    { name: 'ReportViewStore' },
  ),
);
