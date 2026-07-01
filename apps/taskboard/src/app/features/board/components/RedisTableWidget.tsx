import { useContext } from 'react';
import { AnimatedTableCell } from './AnimatedTableCell';
import { ChartWidget, buildChartDataFromRows } from './ChartWidget';
import { TableColumnResizeContext, handleColumnResizePointerDown } from './TableColumnGapContext';
import type { CtiWsDataByHashKey, CtiWsSubscription } from '../hooks/useCtiqWebSocket';
import { useGetRedisHashKeys } from '../hooks/useTaskboardQueries';
import type { DroppedWidget, TableColumn } from '../types/taskboard.types';
import { extractSystemIdSegment, findSiblingKeys } from '../utils/redisKeyPattern';
import {
  buildGroupReasonHashKeys,
  evaluateFormula,
  extractGroupIdFromGroupReasonKey,
  extractSystemIdFromCompositeFieldKey,
  findGroupReasonKeys,
  groupSumRedisHashEntries,
  isSystemNodeCompositeFieldKey,
  mergeCompositeNodeEntries,
  mergeWsSubscriptions,
  parseGroupReasonHashKey,
} from '../utils/redisValue';

/** 이 컴포넌트(RedisTableWidget)로 렌더해야 하는 위젯 id 목록 — 범용 'table-redis'와, 같은 엔진을 그대로
 * 재사용하는 사전 구성 프리셋(예: 그룹별 이석사유 현황 'table-group-reason'), JOIN 테이블('table-join')을
 * 함께 둔다. */
const REDIS_TABLE_WIDGET_IDS = new Set(['table-redis', 'table-group-reason', 'table-join']);

/** 위젯이 "Redis 테이블"(임의 해시키 1개를 통째로 테이블로 보여주는 위젯)인지 판별 */
export function isRedisTableWidget(widget: DroppedWidget): boolean {
  return REDIS_TABLE_WIDGET_IDS.has(widget.item.id);
}

/** 행의 식별자(해시 field명) 자체를 보여주고 싶을 때 컬럼 key로 쓰는 예약어 */
export const ROW_ID_COLUMN_KEY = '__id';
/** redisKeyPattern==='keyed'일 때, 그 행이 어느 형제 키(시스템ID)에서 왔는지 보여주고 싶을 때 컬럼 key로 쓰는 예약어 */
export const SYSTEM_ID_COLUMN_KEY = '__systemId';
/** 정렬/limit까지 반영된 최종 표시 순서대로 1부터 매기는 행 번호를 보여주고 싶을 때 컬럼 key로 쓰는 예약어 */
export const ROW_NUMBER_COLUMN_KEY = '__rowNum';

/**
 * 표에 실제로 필요한 JSON 필드만 모아 WS 구독의 `columns` 필터로 요청 — 전체 JSON을 다 받을 필요가
 * 없다. calc 컬럼은 자기 key가 아니라 operands[].field(수식이 참조하는 실제 JSON 필드)가 필요하고,
 * groupBy 모드(그룹별 합계)는 표시 컬럼과 무관하게 byKey/aggKey 두 개만 필요하다.
 * __id/__systemId/__rowNum 은 FE가 내부적으로 계산하는 가상 컬럼이므로 Redis 필터에서 제외한다.
 */
function collectNeededColumns(columns: TableColumn[], groupBy?: { byKey: string; aggKey: string }): string[] {
  if (groupBy?.byKey && groupBy.aggKey) return [groupBy.byKey, groupBy.aggKey];
  const VIRTUAL_KEYS = new Set([ROW_ID_COLUMN_KEY, SYSTEM_ID_COLUMN_KEY, ROW_NUMBER_COLUMN_KEY]);
  const keys = new Set<string>();
  columns.forEach((col) => {
    if (VIRTUAL_KEYS.has(col.key)) return;
    if (col.calc?.formula.trim()) {
      col.calc.operands.forEach((op) => {
        if (op.field && !VIRTUAL_KEYS.has(op.field)) keys.add(op.field);
      });
    } else {
      keys.add(col.key);
    }
  });
  return [...keys];
}

/**
 * redisKeyPattern==='keyed'면 형제 키(시스템ID별 키)까지, 아니면 자기 자신 1개만 — 조회해야 할 hashKey 목록.
 *
 * IC:GROUP:REASON:{groupId}:{mediaType}(GROUP_REASON_HASH_PREFIX) 패밀리는 자동 분기 — targetGroupIds가
 * 있으면(실제 디스플레이 화면) 디스플레이가 선택한 그룹들의 키만 정확히 만들어 쓴다(뷰그룹에 없는 그룹은
 * 절대 섞이지 않음). targetGroupIds가 없으면(에디터 미리보기 등 디스플레이 컨텍스트가 없는 화면) 기존
 * 'keyed' 형제탐색으로 대체해 실제 존재하는 그룹들을 보여준다.
 */
function resolveCategoryKeys(hashKey: string, pattern: 'fields' | 'keyed', allHashKeys: string[], targetGroupIds: string[] = []): string[] {
  if (!hashKey) return [];
  const groupReason = parseGroupReasonHashKey(hashKey);
  if (groupReason) {
    // 디스플레이가 선택한 그룹 목록이 있으면 그것을 우선 사용
    if (targetGroupIds.length > 0) return buildGroupReasonHashKeys(groupReason.mediaType, targetGroupIds);
    // 없으면 allHashKeys에서 같은 mediaType의 실제 그룹 키를 모두 찾아 사용
    const actualGroupKeys = findGroupReasonKeys(groupReason.mediaType, allHashKeys);
    if (actualGroupKeys.length > 0) return actualGroupKeys;
    // 실제 키가 아직 없으면(미리보기 초기 등) 입력값 그대로 → BE 와일드카드 확장에 의존
    return [hashKey];
  }
  return pattern === 'keyed' ? [hashKey, ...findSiblingKeys(hashKey, allHashKeys)] : [hashKey];
}

/** 위젯이 "단일값 Redis 위젯의 그룹별 합계"(item.groupBy)를 쓰는지 — table-redis의 tableConfig.groupBy와는
 * 다른 필드라 isRedisTableWidget과 겹치지 않는다. */
function isGroupByValueWidget(widget: DroppedWidget): boolean {
  return widget.item.category === 'Redis' && !!widget.item.redisHashKey && !!widget.item.groupBy;
}

/**
 * 캔버스/화면에 있는 모든 table-redis 위젯 + 단일값 Redis 위젯의 "그룹별 합계"(item.groupBy)가 필요로
 * 하는 WS 구독을 한 번에 모아 반환한다. 단일값 groupBy도 REST 폴링이 아니라 이 WS 구독으로만 데이터를
 * 받는다(REST 폴링 완전 제거 — table-redis와 동일한 데이터를 두 번 받아오는 중복을 없앤다).
 *
 * 이 위젯들은 화면마다 자기 WS 연결을 따로 열지 않는다 — TaskCreate/TaskView/RollingDisplay가
 * 이미 다른 위젯(큐/그룹/상담사/단일값 Redis)을 위해 화면당 단일 `useCtiqWebSocket` 연결을 쓰고 있으므로,
 * 이 함수가 반환하는 구독을 그 단일 연결의 subscriptions 배열에 합쳐서 같은 소켓으로 받아야 한다
 * (개발자 도구 Network 탭에 같은 이름의 소켓이 여러 개 뜨는 것을 방지 — 위젯이 N개여도 소켓은 화면당 1개).
 */
export function collectRedisTableWsSubscriptions(widgets: DroppedWidget[], allHashKeys: string[], targetGroupIds: string[] = []): CtiWsSubscription[] {
  const tableSubs = widgets.filter(isRedisTableWidget).flatMap((widget) => {
    const hashKey = widget.item.redisHashKey ?? '';
    if (!hashKey) return [];
    const pattern = widget.item.redisKeyPattern ?? 'fields';
    const categoryKeys = resolveCategoryKeys(hashKey, pattern, allHashKeys, targetGroupIds);
    // PIVOT 모드(rowKey+colKey 모두 설정)일 때는 컬럼 필터 없이 전체 수신.
    // IC:GROUP:REASON 계열은 PIVOT 미설정 시에도 전체 수신(entry JSON 구조가 복잡해 필터가 오인식될 수 있음).
    const isPivotMode = !!(widget.item.tableConfig?.pivot?.rowKey && widget.item.tableConfig?.pivot?.colKey);
    const isGroupReasonHash = !!parseGroupReasonHashKey(hashKey);
    const neededColumns = isPivotMode || isGroupReasonHash ? [] : collectNeededColumns(widget.item.tableConfig?.columns ?? [], widget.item.tableConfig?.groupBy);
    const primarySubs = categoryKeys.map((key) => ({ hashKey: key, ids: ['*'], columns: neededColumns.length > 0 ? neededColumns : undefined }));
    // table-join 전용: 두 번째 해시키도 와일드카드 전체 구독
    const joinHashKeyB = widget.item.id === 'table-join' ? (widget.item.joinHashKeyB ?? '') : '';
    if (!joinHashKeyB) return primarySubs;
    const bSubs: CtiWsSubscription[] = [{ hashKey: joinHashKeyB, ids: ['*'] }];
    return [...primarySubs, ...bSubs];
  });
  const groupByValueSubs = widgets.filter(isGroupByValueWidget).flatMap((widget) => {
    const hashKey = widget.item.redisHashKey!;
    const pattern = widget.item.redisKeyPattern ?? 'fields';
    const categoryKeys = resolveCategoryKeys(hashKey, pattern, allHashKeys, targetGroupIds);
    const { byKey, aggKey } = widget.item.groupBy!;
    return categoryKeys.map((key) => ({ hashKey: key, ids: ['*'], columns: [byKey, aggKey] }));
  });
  return mergeWsSubscriptions([...tableSubs, ...groupByValueSubs]);
}

/**
 * 임의 Redis 해시키 1개를 통째로 테이블로 보여주는 위젯.
 * table-queue/group/agent처럼 DB 마스터 목록과 조인하지 않고, 그 해시에 실제로 존재하는 field(행)를
 * 그대로 행으로 쓴다 — 큐/그룹/상담사 같은 고정 개념이 없는 임의의 Redis 해시(다른 솔루션이 적재한
 * 것 포함)도 동일하게 다룰 수 있다. 컬럼은 좌측 탐색기에서 JSON 필드를 드래그해 추가
 * (`TaskCreate.tsx`의 `handleDragEnd` — `item.tableConfig`가 있는 위젯이면 공통으로 동작).
 * 미디어타입은 별도 선택 UI 없음 — 사용자가 해시키 문자열 자체에 그대로 포함해서 입력
 * (예: "IC:CTIQ:0").
 *
 * `redisKeyPattern`이 'keyed'면 시스템ID가 키 세그먼트에 박혀있는 패턴(예: IC:GROUP:REASON:{groupId}:{mediaType})
 * 으로 보고, TaskCreate에서 미리 탐지·저장해둔 형제 키들까지 전부 조회해 합쳐서 보여준다(런타임 재탐지 없음).
 *
 * 데이터 통신은 전부 WebSocket으로만 하지만, **이 컴포넌트가 직접 소켓을 열지 않는다** — 화면(TaskCreate/
 * TaskView/RollingDisplay)이 다른 위젯(큐/그룹/상담사/단일값 Redis)을 위해 이미 화면당 단일
 * `useCtiqWebSocket` 연결을 갖고 있으므로, 그 화면이 {@link collectRedisTableWsSubscriptions}로 모은
 * 구독을 자기 구독 목록에 합쳐서 받은 `dataByHashKey`를 이 컴포넌트에 그대로 prop으로 내려준다(화면당
 * 소켓 1개 유지 — table-redis 위젯이 여러 개여도 소켓이 따로 늘어나지 않음). field(행) 목록을 미리 알 수
 * 없어 `ids:["*"]`(와일드카드)로 구독하면 BE(`CtiqWebSocketHandler`/`CtiRedisPoller.getAllFieldIds`)가
 * 매 주기 그 해시에 현재 존재하는 모든 field를 다시 조회해 변경분만 푸시한다. 형제 키(siblingKeys) 탐색을
 * 위한 전체 해시키 "목록" 조회(`useGetRedisHashKeys`)만 예외적으로 REST — 이건 데이터가 아니라 BE가
 * 이미 캐싱해둔 스키마 메타 정보 조회라(TaskCreate 좌측 탐색기와 동일 캐시 공유) 통신 빈도도 낮고 실시간성이
 * 필요 없다.
 */
export function RedisTableWidget({
  widget,
  fontScale = 1,
  editable = false,
  dataByHashKey,
  targetGroupIds = [],
}: {
  widget: DroppedWidget;
  fontScale?: number;
  editable?: boolean;
  /** 화면 단일 WS 연결에서 받은 전체 데이터 — {@link collectRedisTableWsSubscriptions}로 모은 구독의 응답. */
  dataByHashKey: CtiWsDataByHashKey;
  /** IC:GROUP:REASON 패밀리 전용 — 디스플레이가 선택한 그룹ID 목록(없으면 에디터 미리보기처럼 컨텍스트 없음). */
  targetGroupIds?: string[];
}) {
  const setColumnWidth = useContext(TableColumnResizeContext);
  const hashKey = widget.item.redisHashKey ?? '';
  const pattern = widget.item.redisKeyPattern ?? 'fields';
  const { data: allHashKeys = [] } = useGetRedisHashKeys();
  const groupReason = parseGroupReasonHashKey(hashKey);
  const categoryKeys = resolveCategoryKeys(hashKey, pattern, allHashKeys, targetGroupIds);
  let columns = widget.item.tableConfig?.columns ?? [];
  const groupBy = widget.item.tableConfig?.groupBy;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;

  // 컬럼이 하나도 설정되지 않은 경우 — 첫 번째 WS 데이터 항목에서 JSON 키를 읽어 자동 생성.
  // 사용자가 아직 컬럼을 드래그·추가하지 않았을 때 "행은 많은데 전부 빈값" 현상을 방지한다.
  if (columns.length === 0 && !groupBy) {
    const firstKey = categoryKeys.find((k) => Object.keys(dataByHashKey[k] ?? {}).length > 0);
    if (firstKey) {
      const entries = dataByHashKey[firstKey];
      const firstEntryVal = Object.values(entries)[0];
      if (firstEntryVal && typeof firstEntryVal === 'object' && !Array.isArray(firstEntryVal)) {
        columns = Object.keys(firstEntryVal as Record<string, unknown>).map((k) => ({ key: k, label: k }));
      }
    }
  }

  if (!hashKey) {
    return (
      <div className="opacity-50 italic leading-tight truncate" style={{ fontSize: '0.8em', fontFamily: widget.style.fontFamily }}>
        Redis 해시키를 입력하세요 (예: IC:CTIQ:0)
      </div>
    );
  }

  // PIVOT 렌더링 — tableConfig.pivot.rowKey + colKey 가 모두 설정됐을 때만 활성화.
  // 해시 종류와 무관하게 수동 설정으로만 동작한다(IC:GROUP:REASON:* 자동 감지 제거).
  const pivotCfg = widget.item.tableConfig?.pivot;
  if (pivotCfg?.rowKey && pivotCfg?.colKey) {
    const pivotRowKey = pivotCfg.rowKey;
    const pivotColKey = pivotCfg.colKey;
    const pivotValueKey = pivotCfg.valueKey ?? 'AGENT_CNT';

    // 컬럼 값 = 각 entry JSON 안의 pivotColKey 필드값 (예: REASON_CODE → '0','1',...,'12')
    const uniqueCols = [
      ...new Set(categoryKeys.flatMap((key) => Object.values(dataByHashKey[key] ?? {}).map((entry) => String((entry as Record<string, unknown>)[pivotColKey] ?? '')))),
    ]
      .filter(Boolean)
      .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));

    // 행 = entry[pivotRowKey](예: NODE_ID), 셀 = pivotValueKey 합산
    const pivotMap = new Map<string, Map<string, number>>();
    for (const key of categoryKeys) {
      const entries = dataByHashKey[key] ?? {};
      for (const [, entry] of Object.entries(entries)) {
        const rowVal = String((entry as Record<string, unknown>)[pivotRowKey] ?? '');
        const colVal = String((entry as Record<string, unknown>)[pivotColKey] ?? '');
        if (!rowVal || !colVal) continue;
        const cellVal = Number((entry as Record<string, unknown>)[pivotValueKey]) || 0;
        if (!pivotMap.has(rowVal)) pivotMap.set(rowVal, new Map());
        pivotMap.get(rowVal)!.set(colVal, (pivotMap.get(rowVal)!.get(colVal) ?? 0) + cellVal);
      }
    }

    const pivotRows = [...pivotMap.entries()].sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b));

    // tableConfig.columns에서 rowKey/colCode 키와 일치하는 컬럼 설정이 있으면 label/width/align 재사용
    const rowHeaderCol: TableColumn = columns.find((c) => c.key === pivotRowKey) ?? { key: pivotRowKey, label: pivotRowKey };
    const defaultDataCol: TableColumn = { key: '', label: '', align: 'center' };

    const pivotRowHeight = widget.item.tableConfig?.rowGap ?? 0;
    const pivotHideLabels = widget.item.tableConfig?.hideColumnLabels ?? false;
    const pivotBorder = widget.item.tableConfig?.showBorder === false ? 'none' : `${widget.item.tableConfig?.borderWidth ?? 1}px solid ${widget.style.color}40`;
    const pivotRowNumCol = columns.find((c) => c.key === ROW_NUMBER_COLUMN_KEY);
    // colDefs: 사용자 정의 컬럼 라벨/넓이/숨김 맵. 미정의 시 columns 배열 → 없으면 값 그대로 표시.
    const colDefMap = new Map((pivotCfg.colDefs ?? []).map((d) => [d.key, d.label]));
    const colWidthMap = new Map((pivotCfg.colDefs ?? []).filter((d) => d.width).map((d) => [d.key, d.width!]));
    const colHiddenSet = new Set((pivotCfg.colDefs ?? []).filter((d) => d.hidden).map((d) => d.key));
    // hidden 처리된 컬럼 제외
    const visibleCols = uniqueCols.filter((c) => !colHiddenSet.has(c));
    const colCount = visibleCols.length;

    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {showTitle && (
          <div
            className="truncate font-semibold px-1 flex-shrink-0"
            style={{
              fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`,
              textAlign: widget.style.titleAlign ?? 'left',
              color: widget.style.color,
              fontFamily: widget.style.fontFamily,
            }}
          >
            {displayTitle}
          </div>
        )}
        <div className="flex-1 overflow-auto">
          <table
            className="w-full"
            style={{
              fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6 * fontScale))}px`,
              color: widget.style.color,
              fontFamily: widget.style.fontFamily,
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr>
                {pivotRowNumCol && (
                  <th
                    style={{
                      width: pivotRowNumCol.width,
                      padding: pivotHideLabels ? 0 : '1px 3px',
                      height: pivotHideLabels ? 0 : pivotRowHeight || undefined,
                      textAlign: pivotRowNumCol.align ?? 'center',
                      fontWeight: 600,
                      fontFamily: widget.style.fontFamily,
                      borderRight: pivotBorder,
                    }}
                  >
                    <span style={{ opacity: 0.7, ...(pivotHideLabels ? { fontSize: 0, lineHeight: 0 } : {}) }}>{!pivotHideLabels && (pivotRowNumCol.label ?? '#')}</span>
                  </th>
                )}
                <th
                  style={{
                    width: rowHeaderCol.width,
                    padding: pivotHideLabels ? 0 : '1px 3px',
                    height: pivotHideLabels ? 0 : pivotRowHeight || undefined,
                    textAlign: rowHeaderCol.align ?? 'center',
                    verticalAlign: rowHeaderCol.verticalAlign ?? 'middle',
                    fontWeight: 600,
                    fontFamily: widget.style.fontFamily,
                    borderRight: colCount > 0 ? pivotBorder : 'none',
                  }}
                >
                  <span style={{ opacity: 0.7, ...(pivotHideLabels ? { fontSize: 0, lineHeight: 0 } : {}) }}>{!pivotHideLabels && rowHeaderCol.label}</span>
                </th>
                {visibleCols.map((colCode, colIdx) => {
                  const matched = columns.find((c) => c.key === colCode);
                  const colLabel = colDefMap.get(colCode) ?? matched?.label ?? colCode;
                  return (
                    <th
                      key={colCode}
                      style={{
                        width: colWidthMap.get(colCode) ?? matched?.width,
                        padding: pivotHideLabels ? 0 : '1px 3px',
                        height: pivotHideLabels ? 0 : pivotRowHeight || undefined,
                        textAlign: matched?.align ?? 'center',
                        verticalAlign: matched?.verticalAlign ?? 'middle',
                        fontWeight: 600,
                        fontFamily: widget.style.fontFamily,
                        borderRight: colIdx < colCount - 1 ? pivotBorder : 'none',
                      }}
                    >
                      <span style={{ opacity: 0.7, ...(pivotHideLabels ? { fontSize: 0, lineHeight: 0 } : {}) }}>{!pivotHideLabels && colLabel}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pivotRows.length === 0 ? (
                <tr>
                  <td colSpan={1 + colCount} className="text-center opacity-50 py-1">
                    데이터 없음
                  </td>
                </tr>
              ) : (
                pivotRows.map(([nodeId, colMap], ri) => (
                  <tr key={nodeId} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                    {pivotRowNumCol && (
                      <AnimatedTableCell
                        value={ri + 1}
                        col={pivotRowNumCol}
                        style={widget.style}
                        align={pivotRowNumCol.align ?? 'center'}
                        borderBottom={pivotBorder}
                        borderRight={pivotBorder}
                        rowHeight={pivotRowHeight}
                      />
                    )}
                    <AnimatedTableCell
                      value={nodeId}
                      col={rowHeaderCol}
                      style={widget.style}
                      align={rowHeaderCol.align ?? 'center'}
                      borderBottom={pivotBorder}
                      borderRight={colCount > 0 ? pivotBorder : 'none'}
                      rowHeight={pivotRowHeight}
                    />
                    {visibleCols.map((colCode, colIdx) => {
                      const matched = columns.find((c) => c.key === colCode) ?? { ...defaultDataCol, key: colCode };
                      return (
                        <AnimatedTableCell
                          key={colCode}
                          value={colMap.get(colCode) ?? 0}
                          col={matched}
                          style={widget.style}
                          align={matched.align ?? 'center'}
                          borderBottom={pivotBorder}
                          borderRight={colIdx < colCount - 1 ? pivotBorder : 'none'}
                          rowHeight={pivotRowHeight}
                        />
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /** 컬럼 값 계산 — calc가 있으면 같은 행의 다른 JSON 필드들로 수식 평가, 없으면 원본 필드 그대로 */
  const resolveCell = (col: TableColumn, id: string, parsed: Record<string, unknown>): string | number => {
    if (col.calc?.formula.trim()) {
      const vars: Record<string, number> = {};
      for (const op of col.calc.operands) {
        if (!op.field) return '';
        const raw = op.field === ROW_ID_COLUMN_KEY ? id : parsed[op.field];
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isNaN(num)) return '';
        vars[op.var] = num;
      }
      const result = evaluateFormula(col.calc.formula, vars);
      if (result === null) return '';
      const decimals = col.calc.decimals ?? 1;
      return Math.round(result * 10 ** decimals) / 10 ** decimals;
    }
    // parsed가 객체가 아닌 경우(plain string/number — JSON 미파싱 해시값) 원시값을 그대로 반환
    if (col.key !== ROW_ID_COLUMN_KEY && (parsed === null || typeof parsed !== 'object')) {
      return parsed != null ? String(parsed) : '';
    }
    const v = col.key === ROW_ID_COLUMN_KEY ? id : (parsed as Record<string, unknown>)[col.key];
    return typeof v === 'number' ? v : v != null ? String(v) : '';
  };

  /** 한 해시키(WS로 받은 id→record 맵)에서 행 배열을 뽑는 로직 — fields/keyed 양쪽 모두 키 하나당 이 로직을 그대로 재사용.
   * WS는 이미 파싱된 객체로 내려주므로(BE가 JSON.parse 후 전송) REST와 달리 JSON.parse가 필요 없다. */
  const buildRowsForEntries = (entries: Record<string, Record<string, unknown>>): Record<string, string | number>[] => {
    if (groupBy?.byKey && groupBy.aggKey) {
      // 행에 실제로 존재하는 byKey 값으로 묶어서 aggKey를 합산한 1행씩으로 축약
      // (예: IC:GROUP:REASON:{groupId}:{mediaType}에서 REASON_CODE별 AGENT_CNT 합계)
      const groupSums = groupSumRedisHashEntries(entries, groupBy.byKey, groupBy.aggKey);
      return [...groupSums.entries()].map(([groupKey, sum]) => ({ [groupBy.byKey]: groupKey, [groupBy.aggKey]: sum }));
    }

    const entryList = Object.entries(entries);
    // SYSTEM_ID(10)+NODE_ID(6) 합성 필드 키 해시(예: IC:GROUP:{mediaType})는 노드별로 행이 중복돼 보이므로
    // SYSTEM_ID로 묶어 1행으로 합친다(숫자 컬럼은 노드 합계) — 다른 해시(필드 키가 이 모양이 아님)는
    // 영향 없음. 필드가 하나도 없거나 전부 이 모양이 아니면 기존처럼 field 1개=행 1개로 그대로 둔다.
    if (entryList.length > 0 && entryList.every(([id]) => isSystemNodeCompositeFieldKey(id))) {
      const bySystemId = new Map<string, Record<string, unknown>[]>();
      entryList.forEach(([id, parsed]) => {
        const systemId = extractSystemIdFromCompositeFieldKey(id);
        const list = bySystemId.get(systemId) ?? [];
        list.push(parsed);
        bySystemId.set(systemId, list);
      });
      return [...bySystemId.entries()].map(([systemId, parsedList]) => {
        const merged = mergeCompositeNodeEntries(parsedList);
        const row: Record<string, string | number> = {};
        columns.forEach((col) => {
          row[col.key] = resolveCell(col, systemId, merged);
        });
        return row;
      });
    }

    return entryList.map(([id, parsed]) => {
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        row[col.key] = resolveCell(col, id, parsed);
      });
      return row;
    });
  };

  // table-join 위젯: 두 Redis 해시의 행을 joinKey 컬럼 값으로 INNER JOIN한다.
  // 일치하는 행끼리 컬럼을 병합해 1행으로 보여주며, 어느 쪽에도 매칭 없는 행은 제외한다.
  let rows: Record<string, string | number>[];
  if (widget.item.id === 'table-join') {
    const joinHashKeyB = widget.item.joinHashKeyB ?? '';
    const joinKey = widget.item.tableConfig?.joinKey ?? '';
    const entriesA = dataByHashKey[hashKey] ?? {};
    const entriesB = joinHashKeyB ? (dataByHashKey[joinHashKeyB] ?? {}) : {};
    // B를 joinKey 값으로 인덱싱 (O(n))
    const bByJoinKey = new Map<string, Record<string, unknown>>();
    if (joinKey) {
      for (const entry of Object.values(entriesB)) {
        const parsed = entry as Record<string, unknown>;
        const k = String(parsed[joinKey] ?? '');
        if (k) bByJoinKey.set(k, parsed);
      }
    }
    rows = Object.entries(entriesA).flatMap(([id, entryA]) => {
      const parsedA = entryA as Record<string, unknown>;
      const joinVal = joinKey ? String(parsedA[joinKey] ?? id) : id;
      const parsedB = bByJoinKey.get(joinVal);
      if (!parsedB) return []; // B에 매칭 없으면 제외 (INNER JOIN)
      const merged: Record<string, unknown> = { ...parsedA, ...parsedB, [ROW_ID_COLUMN_KEY]: id };
      const row: Record<string, string | number> = {};
      (columns.length > 0 ? columns : Object.keys(merged).map((k) => ({ key: k, label: k }))).forEach((col) => {
        const v = merged[col.key];
        row[col.key] = typeof v === 'number' ? v : v != null ? String(v) : '';
      });
      return [row];
    });
  } else {
    // keyed 패턴이면 형제 키(시스템ID별 키)마다 따로 행을 뽑아 합치고, 어느 시스템ID에서 왔는지 태그한다.
    // fields 패턴(기본)은 categoryKeys가 [hashKey] 하나뿐이라 기존과 동일하게 동작.
    rows = categoryKeys.flatMap((key) => {
      const entries = dataByHashKey[key] ?? {};
      const keyRows = buildRowsForEntries(entries);
      if (pattern === 'keyed' || groupReason) keyRows.forEach((row) => (row[SYSTEM_ID_COLUMN_KEY] = extractSystemIdSegment(key, hashKey)));
      return keyRows;
    });
  }

  const sortKey = widget.item.tableConfig?.sortKey;
  if (sortKey) {
    const order = widget.item.tableConfig?.sortOrder ?? 'desc';
    rows = [...rows].sort((a, b) => {
      const av = Number(a[sortKey]) || 0;
      const bv = Number(b[sortKey]) || 0;
      return order === 'asc' ? av - bv : bv - av;
    });
  }
  const limit = widget.item.tableConfig?.limit;
  if (limit && limit > 0) rows = rows.slice(0, limit);

  if (widget.item.tableConfig?.hideEmptyRows) {
    const dataKeys = columns.filter((c) => c.key !== ROW_NUMBER_COLUMN_KEY && c.key !== ROW_ID_COLUMN_KEY && c.key !== SYSTEM_ID_COLUMN_KEY && !c.hidden).map((c) => c.key);
    if (dataKeys.length > 0) rows = rows.filter((row) => dataKeys.some((k) => row[k] !== '' && row[k] !== 0 && row[k] != null));
  }

  // 정렬/limit까지 반영된 최종 순서 기준 1부터 번호 매김 — ROW_NUMBER_COLUMN_KEY 컬럼을 추가했을 때만 의미 있음
  rows = rows.map((row, i) => ({ ...row, [ROW_NUMBER_COLUMN_KEY]: i + 1 }));

  const visibleColumns = columns.filter((c) => !c.hidden);

  // 표시 방식이 차트면 같은 rows(정렬/limit/그룹합계까지 반영됨)를 {name,value}로 변환해 차트로 렌더
  if (widget.item.displayType === 'chart') {
    return <ChartWidget widget={widget} dataOverride={buildChartDataFromRows(rows, visibleColumns)} />;
  }

  const rowHeight = widget.item.tableConfig?.rowGap ?? 0;
  const hideColumnLabels = widget.item.tableConfig?.hideColumnLabels ?? false;
  const cellBorderBottom = widget.item.tableConfig?.showBorder === false ? 'none' : `${widget.item.tableConfig?.borderWidth ?? 1}px solid ${widget.style.color}40`;
  const cellBorderRight = cellBorderBottom;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65 * fontScale))}px`,
            textAlign: widget.style.titleAlign ?? 'left',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <table
          className="w-full"
          style={{
            fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6 * fontScale))}px`,
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              {visibleColumns.map((col, colIdx) => (
                <th
                  key={col.key}
                  data-col-key={col.key}
                  style={{
                    position: 'relative',
                    width: col.width,
                    padding: hideColumnLabels ? 0 : '1px 3px',
                    height: hideColumnLabels ? 0 : rowHeight || undefined,
                    textAlign: col.align ?? 'center',
                    verticalAlign: col.verticalAlign ?? 'middle',
                    fontWeight: 600,
                    fontFamily: widget.style.fontFamily,
                    borderRight: colIdx < visibleColumns.length - 1 ? cellBorderRight : 'none',
                  }}
                >
                  <span
                    style={{
                      opacity: 0.7,
                      display: 'block',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      ...(hideColumnLabels ? { fontSize: 0, lineHeight: 0 } : {}),
                    }}
                  >
                    {!hideColumnLabels && col.label}
                  </span>
                  {editable && colIdx < visibleColumns.length - 1 && (
                    <span
                      onPointerDown={(e) => handleColumnResizePointerDown(e, col.key, widget.id, setColumnWidth)}
                      className="group absolute top-0 right-0 z-20 h-full w-5 cursor-col-resize flex items-center justify-center"
                      style={{ touchAction: 'none' }}
                      title="드래그해서 이 컬럼 너비 조절"
                    >
                      <span className="h-full w-1.5 rounded-full bg-[#0f5b9e] opacity-70 shadow-sm group-hover:w-2 group-hover:opacity-100" />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, visibleColumns.length)} className="text-center opacity-50 py-1">
                  데이터 없음
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  {visibleColumns.map((col, colIdx) => (
                    <AnimatedTableCell
                      key={col.key}
                      value={row[col.key]}
                      col={col}
                      style={widget.style}
                      align={col.align ?? 'center'}
                      borderBottom={cellBorderBottom}
                      borderRight={colIdx < visibleColumns.length - 1 ? cellBorderRight : 'none'}
                      rowHeight={rowHeight}
                    />
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
