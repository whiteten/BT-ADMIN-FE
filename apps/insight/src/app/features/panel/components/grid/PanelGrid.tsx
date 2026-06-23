import { useCallback, useMemo, useRef } from 'react';
import type {
  ColDef,
  ColGroupDef,
  ColumnResizedEvent,
  ColumnState,
  FilterModel,
  FirstDataRenderedEvent,
  GridApi,
  ModelUpdatedEvent,
  RowClassParams,
  RowDataUpdatedEvent,
  SideBarDef,
  ValueFormatterParams,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { formatCell } from '../../../../utils/columnFormat';
import { evaluateRowExpression, extractFieldRefs } from '../../../../utils/rowExpression';
import { formatTimeKey } from '../../../../utils/timeKeyFormat';
import { useGetDataSourceFields } from '../../../dataset/hooks/useDatasetQueries';
import { useReportViewStore } from '../../../report/hooks/useReportViewStore';
import type { PanelDetail } from '../../../report/types';
import type { EffectiveFormat } from '../../api/panelApi';
import { usePanelData } from '../../hooks/usePanelQueries';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

// 자동 크기 시 한 열이 차지할 수 있는 최대 폭(px). 초과분은 잘리고 툴팁으로 전체값 노출.
const AUTO_SIZE_MAX_WIDTH = 360;

interface PanelGridProps {
  panel: PanelDetail;
  reportId: number;
}

export default function PanelGrid({ panel, reportId }: PanelGridProps) {
  const { gridOptions } = useAggridOptions();
  const { committedFilter, queryTrigger } = useReportViewStore();
  // 데이터셋은 패널별(N:M) — 보고서 단위가 아니라 panel.datasetId 로 표시명 로드
  const { data: fields = [] } = useGetDataSourceFields({
    params: { datasetId: panel.datasetId ?? 0 },
    queryOptions: { enabled: !!panel.datasetId },
  });
  const displayNameMap = useMemo(() => new Map(fields.map((f) => [f.fieldName, f.displayName])), [fields]);
  // 계산컬럼(CALC) 수식 맵 — 합계 행 재계산용 (formatterOptions JSON 의 rowExpression)
  const calcExprMap = useMemo(() => {
    const map = new Map<string, string>();
    fields
      .filter((f) => f.fieldRole === 'CALC' && f.formatterOptions)
      .forEach((f) => {
        try {
          const expr = (JSON.parse(f.formatterOptions as string) as { rowExpression?: string }).rowExpression;
          if (expr) map.set(f.fieldName, expr);
        } catch {
          /* 수식 JSON 파싱 실패 → 합계 빈칸 */
        }
      });
    return map;
  }, [fields]);

  // 숨김 차원(isHidden)은 GROUP BY 전용 — 그리드 컬럼에서 제외
  const rowFields = panel.fieldMap.filter((f) => f.slotType === 'ROW' && !f.isHidden);
  const valueFields = panel.fieldMap.filter((f) => f.slotType === 'VALUE');
  const isDraft = reportId === 0 || panel.panelId < 0;
  const hasMapping = rowFields.length > 0 || valueFields.length > 0;

  const { data: queryResult, isFetching } = usePanelData({
    params: {
      reportId,
      panelId: panel.panelId,
      period: { from: committedFilter.period.from, to: committedFilter.period.to, unit: committedFilter.timeUnit },
      searchValues: committedFilter.searchValues,
      comparison: committedFilter.comparison,
      conditions: committedFilter.conditions,
    },
    queryTrigger,
    queryOptions: { enabled: !isDraft && hasMapping && queryTrigger > 0 },
  });

  // 컬럼 최종 서식 메타(BE EffectiveFormat) — 행 도착 시 갱신. ref 로 보관해
  // columnDefs 재생성(=컬럼 상태 리셋) 없이 valueFormatter 가 최신 서식을 읽게 한다.
  const formatMetaRef = useRef<Map<string, EffectiveFormat>>(new Map());
  formatMetaRef.current = useMemo(() => new Map((queryResult?.columns ?? []).map((c) => [c.name, c.format])), [queryResult]);

  const columnDefs: (ColDef | ColGroupDef)[] = useMemo(() => {
    const dimCols: ColDef[] = rowFields.map((f) => {
      const isTimeKey = f.fieldName === 'PSR_TIME_KEY';
      // 시간축 키(yyyyMMdd...)는 단위별 구분자 포맷으로 표시 (합계 행 등 비숫자는 원본 유지)
      const fmt = (v: unknown) => (isTimeKey ? formatTimeKey(v) : v == null ? '' : String(v));
      return {
        field: f.fieldName,
        headerName: displayNameMap.get(f.fieldName) ?? f.fieldName,
        sortable: true,
        minWidth: 100,
        maxWidth: AUTO_SIZE_MAX_WIDTH, // 극단적으로 긴 값은 폭 상한, 잘리면 툴팁으로 전체 확인
        // 차원(ROW) 컬럼은 좌측 고정 → 값 컬럼만 가로 스크롤(레거시 SWAT 동일). 사용자가 컬럼 패널에서 해제 가능.
        pinned: 'left' as const,
        ...(isTimeKey ? { valueFormatter: (params: ValueFormatterParams) => formatTimeKey(params.value) } : {}),
        tooltipValueGetter: (params) => fmt(params.value),
      };
    });
    // 값컬럼은 headerGroup 으로 부모헤더 병합(AS-IS makeParentChildColumn).
    // ag-Grid 그룹은 인접 컬럼만 묶으므로 첫 등장 순서로 모은다. 빈값=평면 컬럼.
    const msrCols: (ColDef | ColGroupDef)[] = [];
    const groupChildren = new Map<string, ColDef[]>();
    valueFields.forEach((f) => {
      const col: ColDef = {
        field: f.fieldName,
        headerName: displayNameMap.get(f.fieldName) ?? f.fieldName,
        sortable: true,
        type: 'numericColumn',
        minWidth: 100,
        maxWidth: AUTO_SIZE_MAX_WIDTH,
        // BE 서식 메타에 실제 타입이 있으면 전역정책(소수자릿수·천단위·로케일) 반영,
        // 없거나 NONE(구버전 응답·draft·계산필드 미지정)이면 패널 columnFormat 폴백.
        valueFormatter: (params: ValueFormatterParams) => formatCell(params.value, formatMetaRef.current.get(f.fieldName), f.columnFormat),
        tooltipValueGetter: (params) => formatCell(params.value, formatMetaRef.current.get(f.fieldName), f.columnFormat),
      };
      const group = f.headerGroup?.trim();
      if (!group) {
        msrCols.push(col);
        return;
      }
      let children = groupChildren.get(group);
      if (!children) {
        children = [];
        groupChildren.set(group, children);
        msrCols.push({ headerName: group, children } as ColGroupDef);
      }
      children.push(col);
    });
    // 차원/측정값을 컬럼 그룹으로 래핑 → Columns 툴패널 목록이 '차원'/'측정값' 그룹으로 구분됨.
    // (ag-grid 특성상 그리드 상단에도 동일 그룹헤더 행이 생긴다.)
    const groups: (ColDef | ColGroupDef)[] = [];
    if (dimCols.length) groups.push({ headerName: '차원', groupId: 'dimGroup', children: dimCols });
    if (msrCols.length) groups.push({ headerName: '측정값', groupId: 'msrGroup', children: msrCols });
    return groups;
  }, [rowFields, valueFields, displayNameMap]);

  // 모든 열을 콘텐츠 폭에 맞춰 자동 크기 — 우클릭 "모든 열 크기 자동 설정"(autoSizeAllColumns)을 자동 호출.
  // autoSizeStrategy(첫 렌더 1회)는 비동기 데이터(rowData=[]) 시점에 측정돼 폭이 어긋나므로
  // 데이터가 실제로 렌더/갱신된 뒤(onRowDataUpdated)에 측정해야 우클릭 결과와 동일해진다.
  // flex 분배(공유 defaultColDef)는 autoSize 를 무시시키므로 이 그리드에서만 flex 를 해제한다.
  const gridDefaultColDef = useMemo(() => ({ ...gridOptions.defaultColDef, flex: undefined }), [gridOptions.defaultColDef]);

  // 우측 패널: 레거시(IPR50S8030) 동일하게 Columns(표시/순서) + Filters(컬럼 필터)를 노출한다.
  // 공유 useAggridOptions 의 '상세정보(rowData)' 패널은 보고서 그리드에서만 이 둘로 교체(공유 훅 미수정).
  const reportSideBar = useMemo<SideBarDef>(
    () => ({
      toolPanels: [
        {
          id: 'columns',
          labelDefault: 'Columns',
          // localeKr 의 'columns'/'filters' 키는 '열'/'필터'로 번역됨 → locale 미등록 키를 써서 labelDefault(영어) 노출
          labelKey: 'reportColumns',
          iconKey: 'columns',
          toolPanel: 'agColumnsToolPanel',
          // 순수 표시/순서 체크박스만 — 그룹/값/피벗 섹션 숨김(레거시 suppressPivotMode 대응)
          toolPanelParams: { suppressRowGroups: true, suppressValues: true, suppressPivots: true, suppressPivotMode: true },
        },
        { id: 'filters', labelDefault: 'Filters', labelKey: 'reportFilters', iconKey: 'filter', toolPanel: 'agFiltersToolPanel' },
      ],
      position: 'right',
      defaultToolPanel: '',
    }),
    [],
  );

  // 컬럼 표시/순서/폭/정렬 + 필터 상태를 패널 단위로 localStorage 에 즉시 저장·복원.
  // 그리드는 보고서당 1개라 reportId+panelId 키면 충분.
  const storageKey = `insight:reportGrid:${reportId}:${panel.panelId}`;
  const readSavedState = useCallback((): { columnState?: ColumnState[]; filterModel?: FilterModel } | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [storageKey]);
  const persistState = useCallback(
    (api: GridApi) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ columnState: api.getColumnState(), filterModel: api.getFilterModel() }));
      } catch {
        /* 저장 실패(용량 등) 무시 */
      }
    },
    [storageKey],
  );
  const onStatePersist = useCallback((e: { api: GridApi }) => persistState(e.api), [persistState]);
  // 리사이즈는 드래그 중 연속 발생 → 종료(finished) 시점에만 저장
  const onColumnResized = useCallback(
    (e: ColumnResizedEvent) => {
      if (e.finished) persistState(e.api);
    },
    [persistState],
  );
  // 저장된 컬럼 상태(표시/순서/폭/정렬/고정) 재적용
  const applySavedColumnState = useCallback(
    (api: GridApi) => {
      const saved = readSavedState();
      if (saved?.columnState) api.applyColumnState({ state: saved.columnState, applyOrder: true });
    },
    [readSavedState],
  );
  // 첫 데이터 렌더 후 저장된 컬럼/필터 상태 복원
  const onFirstDataRendered = useCallback(
    (e: FirstDataRenderedEvent) => {
      const saved = readSavedState();
      if (!saved) return;
      if (saved.columnState) e.api.applyColumnState({ state: saved.columnState, applyOrder: true });
      if (saved.filterModel) e.api.setFilterModel(saved.filterModel);
    },
    [readSavedState],
  );
  // columnDefs 가 비동기(표시명 로드 등)로 재생성되면 ag-grid 가 컬럼 표시상태를 defaults 로 리셋한다.
  // 이때마다 저장된 상태를 재적용해, 숨긴 컬럼(예: 일자)이 다시 나타나는 것을 막는다.
  const onGridColumnsChanged = useCallback((e: { api: GridApi }) => applySavedColumnState(e.api), [applySavedColumnState]);

  // 셀 DOM 페인트 후 측정해야 폭이 정확 — 동기 호출은 측정 실패로 폭이 안 줄어든다.
  // requestAnimationFrame 으로 한 프레임 미뤄 우클릭 타이밍과 동일하게 맞춘다.
  // 단, 사용자가 저장한 컬럼 상태가 있으면 그 폭/순서를 존중해 autoSize 를 건너뛴다.
  const onRowDataUpdated = useCallback(
    (e: RowDataUpdatedEvent) => {
      if (readSavedState()) return;
      requestAnimationFrame(() => e.api.autoSizeAllColumns());
    },
    [readSavedState],
  );

  const rowData = useMemo(() => queryResult?.current ?? [], [queryResult]);
  const showSumRow = (panel.chartOptions as { showSumRow?: boolean } | undefined)?.showSumRow ?? true;
  // 합계 행 계산 — 전달받은 rows(필터 통과 행)만으로 집계. 필터로 행을 빼면 그 행만큼 합계가 다시 줄어든다.
  const computeSummary = useCallback(
    (rows: Record<string, unknown>[]): Record<string, unknown> | null => {
      if (!showSumRow || rows.length === 0) return null;
      const row: Record<string, unknown> = {};
      rowFields.forEach((f, i) => {
        row[f.fieldName] = i === 0 ? '합계' : '';
      });
      valueFields.forEach((f) => {
        // 계산컬럼: 수식 값을 단순 합산하면 율/평균 의미가 깨진다.
        // AS-IS 동일하게 베이스 컬럼(숨은 측정값 — 결과 행에 포함됨)을 집계한 뒤 수식을 재계산.
        // 집계 방식은 계산컬럼의 aggFunc(MAX → 베이스도 MAX, 그 외 SUM)를 따른다.
        if (f.isCalcField) {
          const expr = calcExprMap.get(f.fieldName);
          if (!expr) {
            row[f.fieldName] = null;
            return;
          }
          const useMax = f.aggFunc === 'MAX';
          const baseValues: Record<string, number> = {};
          extractFieldRefs(expr).forEach((ref) => {
            const nums = rows.map((r) => Number(r[ref])).filter((v) => !isNaN(v));
            baseValues[ref] = nums.length === 0 ? 0 : useMax ? Math.max(...nums) : nums.reduce((a, b) => a + b, 0);
          });
          row[f.fieldName] = evaluateRowExpression(expr, baseValues);
          return;
        }
        // aggFunc 미지정(없음)인 컬럼은 합계 행에서 빈칸 처리
        if (!f.aggFunc) {
          row[f.fieldName] = null;
          return;
        }
        const vals = rows.map((r) => Number(r[f.fieldName])).filter((v) => !isNaN(v));
        if (vals.length === 0) {
          row[f.fieldName] = null;
          return;
        }
        // 행 데이터는 백엔드에서 이미 그룹별 집계됨 → 컬럼 aggFunc로 그룹 간 롤업
        switch (f.aggFunc) {
          // SUM/COUNT: 그룹별 값(합/카운트)을 다시 합산 → 전체 합계/전체 카운트
          case 'SUM':
          case 'COUNT':
            row[f.fieldName] = vals.reduce((a, b) => a + b, 0);
            break;
          // AVG: 그룹별 평균을 다시 평균
          case 'AVG':
            row[f.fieldName] = vals.reduce((a, b) => a + b, 0) / vals.length;
            break;
          case 'MAX':
            row[f.fieldName] = Math.max(...vals);
            break;
          case 'MIN':
            row[f.fieldName] = Math.min(...vals);
            break;
          default:
            row[f.fieldName] = null;
        }
      });
      return row;
    },
    [showSumRow, rowFields, valueFields, calcExprMap],
  );

  // 필터/정렬/데이터 변경(onModelUpdated)마다 "필터 통과 행"만으로 합계를 재계산해 pinnedBottom 에 반영.
  // 정적 pinnedBottomRowData prop 을 쓰면 필터 후에도 전체 합계로 되돌아가므로, 합계는 명령형으로만 설정한다.
  const recomputeSummary = useCallback(
    (api: GridApi) => {
      const visible: Record<string, unknown>[] = [];
      api.forEachNodeAfterFilter((node) => {
        if (!node.rowPinned && node.data) visible.push(node.data as Record<string, unknown>);
      });
      const summary = computeSummary(visible);
      api.setGridOption('pinnedBottomRowData', summary ? [summary] : []);
    },
    [computeSummary],
  );
  const onModelUpdated = useCallback((e: ModelUpdatedEvent) => recomputeSummary(e.api), [recomputeSummary]);
  const getRowStyle = useCallback((params: RowClassParams) => (params.node.rowPinned === 'bottom' ? { background: '#f6f7f9', fontWeight: '600' } : undefined), []);

  if (!hasMapping) {
    return (
      <div className="flex min-h-[120px] items-center justify-center">
        <p className="text-xs text-[var(--color-bt-fg-muted)]">패널 편집에서 필드를 매핑하세요</p>
      </div>
    );
  }

  // 편집 미리보기(draft) → 선택된 컬럼 구조만 깔끔히 표시 (데이터/합계/페이저/상태바 없음, autoHeight)
  if (isDraft) {
    return (
      <AgGridReact
        {...gridOptions}
        sideBar={false}
        defaultColDef={gridDefaultColDef}
        rowData={[]}
        columnDefs={columnDefs}
        domLayout="autoHeight"
        pagination={false}
        statusBar={undefined}
        pinnedBottomRowData={undefined}
      />
    );
  }

  // 실제 뷰 → 패널 영역을 꽉 채우는 고정 높이 + 영역 내부 세로 스크롤. 페이징 없음.
  // 통계는 그리드 값과 하단 푸터(합계)를 함께 검증하므로, 합계는 하단 고정(pinnedBottom)으로
  // 항상 보이게 하고 데이터 행만 스크롤한다. domLayout="normal" 이라 패널 높이만큼 보인다.
  return (
    <div className="h-full w-full" style={{ minHeight: 220 }}>
      <AgGridReact
        {...gridOptions}
        sideBar={reportSideBar}
        statusBar={undefined}
        defaultColDef={gridDefaultColDef}
        onRowDataUpdated={onRowDataUpdated}
        onModelUpdated={onModelUpdated}
        onFirstDataRendered={onFirstDataRendered}
        onGridColumnsChanged={onGridColumnsChanged}
        onColumnMoved={onStatePersist}
        onColumnVisible={onStatePersist}
        onColumnPinned={onStatePersist}
        onColumnResized={onColumnResized}
        onSortChanged={onStatePersist}
        onFilterChanged={onStatePersist}
        suppressColumnVirtualisation
        rowData={rowData}
        columnDefs={columnDefs}
        loading={isFetching}
        pagination={false}
        domLayout="normal"
        getRowStyle={getRowStyle}
      />
    </div>
  );
}
