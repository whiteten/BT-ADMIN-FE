import { useGetRedisHashEntries } from '../hooks/useTaskboardQueries';
import type { DroppedWidget, TableColumn } from '../types/taskboard.types';
import { evaluateFormula, groupSumRedisHashEntries } from '../utils/redisValue';
import { formatWidgetValue, getThresholdColor } from '../utils/widgetVisualStyle';

/** 위젯이 "Redis 테이블"(임의 해시키 1개를 통째로 테이블로 보여주는 위젯)인지 판별 */
export function isRedisTableWidget(widget: DroppedWidget): boolean {
  return widget.item.id === 'table-redis';
}

const REDIS_TABLE_REFETCH_MS = 5000;

/** 행의 식별자(해시 field명) 자체를 보여주고 싶을 때 컬럼 key로 쓰는 예약어 */
export const ROW_ID_COLUMN_KEY = '__id';

/**
 * 임의 Redis 해시키 1개를 통째로 테이블로 보여주는 위젯.
 * table-queue/group/agent처럼 DB 마스터 목록과 조인하지 않고, 그 해시에 실제로 존재하는 field(행)를
 * 그대로 행으로 쓴다 — 큐/그룹/상담사 같은 고정 개념이 없는 임의의 Redis 해시(다른 솔루션이 적재한
 * 것 포함)도 동일하게 다룰 수 있다. 컬럼은 좌측 탐색기에서 JSON 필드를 드래그해 추가
 * (`TaskCreate.tsx`의 `handleDragEnd` — `item.tableConfig`가 있는 위젯이면 공통으로 동작).
 * 미디어타입은 별도 선택 UI 없음 — 사용자가 해시키 문자열 자체에 그대로 포함해서 입력
 * (예: "IC:CTIQ:0").
 */
export function RedisTableWidget({ widget, fontScale = 1 }: { widget: DroppedWidget; fontScale?: number }) {
  const hashKey = widget.item.redisHashKey ?? '';
  const { data: entries = {} } = useGetRedisHashEntries(hashKey, { queryOptions: { enabled: !!hashKey, refetchInterval: REDIS_TABLE_REFETCH_MS } });
  const columns = widget.item.tableConfig?.columns ?? [];
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;

  if (!hashKey) {
    return (
      <div className="opacity-50 italic leading-tight truncate" style={{ fontSize: '0.8em', fontFamily: widget.style.fontFamily }}>
        Redis 해시키를 입력하세요 (예: IC:CTIQ:0)
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
    const v = col.key === ROW_ID_COLUMN_KEY ? id : parsed[col.key];
    return typeof v === 'number' ? v : v != null ? String(v) : '';
  };

  const groupBy = widget.item.tableConfig?.groupBy;
  let rows: Record<string, string | number>[];
  if (groupBy?.byKey && groupBy.aggKey) {
    // 행에 실제로 존재하는 byKey 값으로 묶어서 aggKey를 합산한 1행씩으로 축약
    // (예: IC:GROUP:REASON:{groupId}:{mediaType}에서 REASON_CODE별 AGENT_CNT 합계)
    const groupSums = groupSumRedisHashEntries(entries, groupBy.byKey, groupBy.aggKey);
    rows = [...groupSums.entries()].map(([groupKey, sum]) => ({ [groupBy.byKey]: groupKey, [groupBy.aggKey]: sum }));
  } else {
    rows = Object.entries(entries).map(([id, raw]) => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // JSON이 아닌 단순 값이면 컬럼 매칭 없이 행 ID만 의미를 가짐
      }
      const row: Record<string, string | number> = {};
      columns.forEach((col) => {
        row[col.key] = resolveCell(col, id, parsed);
      });
      return row;
    });
  }

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
          className="w-full border-collapse"
          style={{ fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6 * fontScale))}px`, color: widget.style.color, fontFamily: widget.style.fontFamily }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    borderBottom: `1px solid ${widget.style.color}40`,
                    padding: '1px 3px',
                    textAlign: col.align ?? 'center',
                    opacity: 0.7,
                    fontWeight: 600,
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length)} className="text-center opacity-50 py-1">
                  데이터 없음
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '1px 3px',
                        textAlign: col.align ?? 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        color: getThresholdColor(row[col.key], col),
                      }}
                    >
                      {formatWidgetValue(row[col.key], col.useThousandSep)}
                    </td>
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
