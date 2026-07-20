import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactGridLayout, { type LayoutItem as RglItem, type Layout as RglLayout, getCompactor } from 'react-grid-layout';
import { UNSAFE_NavigationContext, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Lock, Pipette, Search, Unlock } from 'lucide-react';
import { useAuthStore, useBreadcrumbStore } from '@/shared-store';
import { createUUID, toast } from '@/shared-util';
import type { RedisKeyDefinitionsResponse } from '../../features/board/api/ctiRedisApi';
import { taskboardApi } from '../../features/board/api/taskboardApi';
import { CardEditorModal } from '../../features/board/cards/CardEditorModal';
import { AnimatedTableCell } from '../../features/board/components/AnimatedTableCell';
import { AnnouncementWidget, isAnnouncementWidget } from '../../features/board/components/AnnouncementWidget';
import { CHART_COLORS_LIST, CHART_TYPE_OPTIONS, ChartWidget, buildChartDataFromRows } from '../../features/board/components/ChartWidget';
import {
  ROW_ID_COLUMN_KEY,
  ROW_NUMBER_COLUMN_KEY,
  RedisTableWidget,
  SYSTEM_ID_COLUMN_KEY,
  collectRedisTableWsSubscriptions,
  isRedisTableWidget,
} from '../../features/board/components/RedisTableWidget';
import { TableColumnResizeContext, handleColumnResizePointerDown } from '../../features/board/components/TableColumnGapContext';
import { WebEmbedWidget, isWebEmbedWidget } from '../../features/board/components/WebEmbedWidget';
import { type CtiWsDataByHashKey, useCtiqWebSocket } from '../../features/board/hooks/useCtiqWebSocket';
import {
  taskboardQueryKeys,
  useCreateTaskboardLayout,
  useGetDbQueryDefList,
  useGetDbQueryDefOptionsMulti,
  useGetNoticeList,
  useGetRedisHashColumns,
  useGetRedisHashEntries,
  useGetRedisHashKeys,
  useGetRedisKeyDefinitions,
  useRefreshRedisHashKeys,
  useUpdateLayout,
} from '../../features/board/hooks/useTaskboardQueries';
import { useTaskboardWriteGuard } from '../../features/board/hooks/useTaskboardWriteGuard';
import { useValueChangeKey } from '../../features/board/hooks/useValueChangeAnimation';
import type {
  CalcConfig,
  CalcOperand,
  CallDataItem,
  ChartConfig,
  DroppedWidget,
  TableColumn,
  TableColumnCalc,
  TableColumnCalcOperand,
  TaskboardBg,
  TaskboardLayout,
  WidgetStyle,
  WidgetThresholdRule,
} from '../../features/board/types/taskboard.types';
import { AMPM_CLOCK_FORMAT, DEFAULT_CUSTOM_CLOCK_FORMAT, formatCustomClock } from '../../features/board/utils/clockFormat';
import { collapseIcVariableSegment, maskEntitySegment, matchKeyDefinition } from '../../features/board/utils/redisKeyDefinitions';
import { type RedisKeyNode, detectRedisKeyPattern, extractIcGroupIdSegment, filterRedisTree, findSiblingKeys, groupRedisKeys } from '../../features/board/utils/redisKeyPattern';
import {
  CALC_WIDGET_ITEM,
  GROUP_REASON_HASH_PREFIX,
  SKILL_REASON_HASH_PREFIX,
  deriveEntityIdPlaceholderName,
  extractNameValueItems,
  findEntitySelectionDbQueryIdsByPrefix,
  getCalcDisplayValue,
  validateFormula,
} from '../../features/board/utils/redisValue';
import {
  DESIGN_WIDTH,
  SHADOW_PRESETS,
  VALUE_CHANGE_ANIMATIONS,
  VALUE_CHANGE_ANIMATION_CSS,
  formatWidgetValue,
  getThresholdColor,
  getValueAnimationClass,
  getValueAnimationStyle,
  getValueOffsetStyle,
  getWidgetVisualStyle,
  isTransparentBg,
} from '../../features/board/utils/widgetVisualStyle';
import { Spinner } from '@/components/ui/spinner';

// ─── 전역 상수 ───────────────────────────────────────────────────────────────
const GRID_COLS = 24;
const GRID_ROWS = 20;

const DEFAULT_W = 13;
const DEFAULT_H = 16;
const DEFAULT_GRID_W = 3;
const DEFAULT_GRID_H = 3;

const DEFAULT_TABLE_GRID_W = 8;
const DEFAULT_TABLE_GRID_H = 6;

// localStorage 기반 위젯 클립보드 — 시스템 클립보드(Clipboard API) 대신 사용하는 이유:
// readText()가 secure context(HTTPS/localhost)를 요구해서 HTTP+IP로 접속하는 개발계에서 동작 안 함.
// localStorage는 같은 출처(origin)면 별도 브라우저 창/탭 사이에도 공유되므로, 창 2개를 띄워놓고
// 한쪽에서 Ctrl+C, 다른 쪽에서 Ctrl+V 하는 용도로는 이쪽이 더 안정적이다.
const WIDGET_CLIPBOARD_KEY = 'taskboard-widget-clipboard-v1';
const WIDGET_CLIPBOARD_SOURCE = 'taskboard-widget-clipboard';

const DEFAULT_STYLE: WidgetStyle = {
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#000000',
  bgColor: '#ffffff',
  valueAlign: 'left',
  useThousandSep: false,
  fontWeight: 'normal',
  borderWidth: 0,
  borderColor: '#ffffff',
  borderStyle: 'solid',
  borderRadius: 8,
  opacity: 100,
  shadow: 'soft',
  paddingX: 8,
  paddingY: 8,
};

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: '기본 (시스템)', value: 'inherit' },
  { label: '맑은 고딕', value: "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif" },
  { label: '바탕체', value: "'Batang', '바탕', 'AppleMyungjo', serif" },
  { label: '돋움', value: "'Dotum', '돋움', 'Apple SD Gothic Neo', sans-serif" },
  { label: '굴림', value: "'Gulim', '굴림', sans-serif" },
  { label: '코드 (고정폭)', value: "'Courier New', 'Consolas', monospace" },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 80, 88, 96];

const FONT_WEIGHTS: { label: string; value: NonNullable<WidgetStyle['fontWeight']> }[] = [
  { label: '얇게', value: '300' },
  { label: '보통', value: 'normal' },
  { label: '중간', value: '600' },
  { label: '굵게', value: 'bold' },
];

type GuideItem = { id: string; axis: 'h' | 'v'; pct: number };
type UndoEntry = { widgets: DroppedWidget[]; guides: GuideItem[] };

type ResizeHandle = 'se' | 'sw' | 'ne' | 'nw';

function snapResizeToGuides(
  x: number,
  y: number,
  w: number,
  h: number,
  handle: ResizeHandle,
  guides: GuideItem[],
  showGuides: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!showGuides || guides.length === 0) return { x, y, w, h };
  const vBounds = [0, ...guides.filter((g) => g.axis === 'v').map((g) => g.pct), 100].sort((a, b) => a - b);
  const hBounds = [0, ...guides.filter((g) => g.axis === 'h').map((g) => g.pct), 100].sort((a, b) => a - b);
  const nearest = (edge: number, bounds: number[]) => bounds.reduce((best, b) => (Math.abs(b - edge) < Math.abs(best - edge) ? b : best), bounds[0]);

  const isWest = handle === 'sw' || handle === 'nw';
  const isNorth = handle === 'ne' || handle === 'nw';

  let newX = x,
    newW = w;
  if (isWest) {
    const rightEdge = x + w;
    const snappedLeft = nearest(x, vBounds);
    newX = Math.max(0, snappedLeft);
    newW = Math.max(5, rightEdge - newX);
  } else {
    const snappedRight = nearest(x + w, vBounds);
    newW = Math.max(5, snappedRight - x);
  }

  let newY = y,
    newH = h;
  if (isNorth) {
    const bottomEdge = y + h;
    const snappedTop = nearest(y, hBounds);
    newY = Math.max(0, snappedTop);
    newH = Math.max(4, bottomEdge - newY);
  } else {
    newH = Math.max(4, nearest(y + h, hBounds) - y);
  }
  return { x: newX, y: newY, w: newW, h: newH };
}

function snapToGuideCell(cx: number, cy: number, guides: { axis: 'h' | 'v'; pct: number }[], showGuides: boolean): { x: number; y: number; w: number; h: number } | null {
  if (!showGuides || guides.length === 0) return null;
  const vBounds = [0, ...guides.filter((g) => g.axis === 'v').map((g) => g.pct), 100].sort((a, b) => a - b);
  const hBounds = [0, ...guides.filter((g) => g.axis === 'h').map((g) => g.pct), 100].sort((a, b) => a - b);
  let left = 0,
    right = 100,
    top = 0,
    bottom = 100;
  for (let i = 0; i < vBounds.length - 1; i++) {
    if (cx >= vBounds[i] && cx <= vBounds[i + 1]) {
      left = vBounds[i];
      right = vBounds[i + 1];
      break;
    }
  }
  for (let i = 0; i < hBounds.length - 1; i++) {
    if (cy >= hBounds[i] && cy <= hBounds[i + 1]) {
      top = hBounds[i];
      bottom = hBounds[i + 1];
      break;
    }
  }
  if (right - left < 0.1 || bottom - top < 0.1) return null;
  return { x: left, y: top, w: right - left, h: bottom - top };
}

// flex 컨테이너에서는 textAlign이 자식 정렬에 영향을 주지 않으므로 justifyContent로도 매핑
const ALIGN_TO_JUSTIFY: Record<'left' | 'center' | 'right', React.CSSProperties['justifyContent']> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

// ─── 그리드 변환 유틸 ────────────────────────────────────────────────────────
function toGridItem(widget: DroppedWidget, canvasLocked = false): RglItem {
  const w = widget.w ?? DEFAULT_W;
  const h = widget.h ?? DEFAULT_H;
  const gw = Math.max(1, Math.min(GRID_COLS, Math.round((w / 100) * GRID_COLS)));
  const gh = Math.max(1, Math.min(GRID_ROWS, Math.round((h / 100) * GRID_ROWS)));
  return {
    i: widget.id,
    x: Math.min(GRID_COLS - gw, Math.max(0, Math.round((widget.x / 100) * GRID_COLS))),
    y: Math.min(GRID_ROWS - gh, Math.max(0, Math.round((widget.y / 100) * GRID_ROWS))),
    w: gw,
    h: gh,
    // 전체 잠금 — react-grid-layout이 static 항목은 드래그/리사이즈 자체를 막아줌
    static: canvasLocked,
  };
}

function fromGridItem(item: RglItem): Pick<DroppedWidget, 'x' | 'y' | 'w' | 'h'> {
  return {
    x: Math.round((item.x / GRID_COLS) * 1000) / 10,
    y: Math.round((item.y / GRID_ROWS) * 1000) / 10,
    w: Math.round((item.w / GRID_COLS) * 1000) / 10,
    h: Math.round((item.h / GRID_ROWS) * 1000) / 10,
  };
}

type DragInfo = { type: 'source'; item: CallDataItem } | { type: 'widget-ref'; widgetId: string; label: string };
type LayoutMode = 'free' | 'grid';

// ─── FieldSuggestInput ───────────────────────────────────────────────────────
// table-redis 컬럼 필드명 자동완성 — 순수 React 커스텀 드롭다운(antd 미사용: host의 antd App cssVar 경고를
// 유발하지 않도록). 왼쪽 위젯 트리와 동일하게 "한글명 위 + 영문 필드명 아래 작은 글씨" 2줄로 보여주고,
// 목록을 body로 portal 렌더해 오른쪽 패널(overflow)에 잘리지 않고 넓게(320px)·길게(360px) 펼친다.
function FieldSuggestInput({
  value,
  onChange,
  onSelect,
  fields,
  nameMap,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (field: string, koLabel?: string) => void;
  fields: string[];
  nameMap?: Record<string, string>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 2 });
    };
    updatePos();
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (inputRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  const kw = value.trim().toLowerCase();
  const filtered = fields.filter((f) => {
    if (!kw) return true;
    const ko = (nameMap?.[f] ?? '').toLowerCase();
    return f.toLowerCase().includes(kw) || ko.includes(kw);
  });

  return (
    <div className="w-1/2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
      />
      {open &&
        pos &&
        filtered.length > 0 &&
        createPortal(
          <div
            ref={listRef}
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: 320, maxHeight: 360, zIndex: 200 }}
            className="overflow-y-auto bg-white border border-slate-200 rounded shadow-lg"
          >
            {filtered.map((field) => {
              const ko = nameMap?.[field];
              return (
                <button
                  key={field}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(field, ko);
                    setOpen(false);
                  }}
                  className="flex flex-col w-full text-left px-2 py-1 leading-tight border-b border-slate-50 last:border-b-0 hover:bg-slate-100"
                >
                  <span className="text-xs text-slate-700">{ko ?? field}</span>
                  {ko && <span className="text-[9px] text-slate-400 font-mono">{field}</span>}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── DraggableSourceItem ─────────────────────────────────────────────────────
function DraggableSourceItem({ item, subLabel }: { item: CallDataItem; subLabel?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `source-${item.id}`,
    data: { type: 'source', item } satisfies DragInfo,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab select-none transition-all ${
        isDragging ? 'opacity-30 border-dashed' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
      {/* 한글 라벨 + (있으면) 아래 작은 영문 키 */}
      <span className="flex flex-col flex-1 min-w-0 leading-tight">
        <span className="text-xs font-medium text-slate-700 truncate">{item.label}</span>
        {subLabel && <span className="text-[9px] text-slate-400 font-mono truncate">{subLabel}</span>}
      </span>
      {item.category === 'notice' && <span className="text-[9px] bg-amber-100 text-amber-600 px-1 py-0.5 rounded font-bold flex-shrink-0">공지</span>}
      {item.isRealtime && item.category !== 'Redis' && <span className="text-[9px] bg-cyan-100 text-cyan-600 px-1 py-0.5 rounded font-bold">실시간</span>}
      {item.displayType === 'table' && !item.isRealtime && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-bold">표</span>}
      {item.unit && !item.displayType && item.category !== 'notice' && <span className="text-[10px] text-slate-400 flex-shrink-0">{item.unit}</span>}
    </div>
  );
}

// ─── TableWidget ─────────────────────────────────────────────────────────────
function TableWidget({ widget }: { widget: DroppedWidget }) {
  const setColumnWidth = useContext(TableColumnResizeContext);
  const cfg = widget.item.tableConfig;
  if (!cfg) return null;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const columns = cfg.columns.filter((c) => !c.hidden);
  let sampleRows = cfg.sampleRows;
  if (cfg.sortKey) {
    const order = cfg.sortOrder ?? 'desc';
    const key = cfg.sortKey;
    sampleRows = [...sampleRows].sort((a, b) => {
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;
      return order === 'asc' ? av - bv : bv - av;
    });
  }
  if (cfg.limit && cfg.limit > 0) sampleRows = sampleRows.slice(0, cfg.limit);
  const cellBorderBottom = cfg.showBorder === false ? 'none' : `${cfg.borderWidth ?? 1}px solid ${widget.style.color}40`;
  const cellBorderRight = cellBorderBottom;
  const rowHeight = cfg.rowGap ?? 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {showTitle && (
        <div
          className="truncate font-semibold px-1 flex-shrink-0"
          style={{
            fontSize: '0.65em',
            textAlign: widget.style.titleAlign ?? 'left',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
          }}
        >
          {displayTitle}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <table
          className="w-full"
          style={{
            fontSize: '0.6em',
            color: widget.style.color,
            fontFamily: widget.style.fontFamily,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              {columns.map((col, colIdx) => (
                <th
                  key={col.key}
                  data-col-key={col.key}
                  style={{
                    position: 'relative',
                    width: col.width,
                    padding: cfg.hideColumnLabels ? 0 : '1px 3px',
                    height: cfg.hideColumnLabels ? 0 : rowHeight || undefined,
                    textAlign: col.align ?? 'center',
                    verticalAlign: col.verticalAlign ?? 'middle',
                    fontWeight: 600,
                    fontFamily: widget.style.fontFamily,
                    borderRight: colIdx < columns.length - 1 ? cellBorderRight : 'none',
                  }}
                >
                  <span
                    style={{
                      opacity: 0.7,
                      display: 'block',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      ...(cfg.hideColumnLabels ? { fontSize: 0, lineHeight: 0 } : {}),
                    }}
                  >
                    {!cfg.hideColumnLabels && col.label}
                  </span>
                  {colIdx < columns.length - 1 && (
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
            {sampleRows.map((row, ri) => (
              <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                {columns.map((col, colIdx) => (
                  <AnimatedTableCell
                    key={col.key}
                    value={col.key === ROW_NUMBER_COLUMN_KEY ? ri + 1 : row[col.key]}
                    col={col}
                    style={widget.style}
                    align={col.align ?? 'center'}
                    borderBottom={cellBorderBottom}
                    borderRight={colIdx < columns.length - 1 ? cellBorderRight : 'none'}
                    rowHeight={rowHeight}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Redis Hash 탐색기 — HashKey별 아이템 (필드를 DraggableSourceItem으로 렌더) ──
// 트리 데이터 구조(RedisKeyNode)와 groupRedisKeys/filterRedisTree는
// features/board/utils/redisKeyPattern.ts로 이동(DataSourceQueryTab의 키 피커와 공용).

/** 축약된 IC 트리 키 → 같은 미디어타입의 실제 Redis 키 목록 (그룹ID별). RedisHashFieldItems 에서 실제 키를 참조할 때 사용 */
const IcActualKeyContext = createContext<Map<string, string[]>>(new Map());

/** application-redis-key-map.yml 로드 결과 — RedisHashFieldItems가 드래그 위젯의 redisHashKey를
 * `{groupId}` 같은 마스킹 토큰으로 저장할지 판단할 때 사용(maskEntitySegment). */
const RedisKeyDefsContext = createContext<RedisKeyDefinitionsResponse>({ mediaType: {}, prefixMap: {}, keyDefinitions: {} });

/** 해시그룹(엔티티ID→JSON) 위젯을 드래그로 만들 때, redisHashKey의 엔티티 세그먼트가 마스킹된 경우
 * redisField(그 해시의 첫 엔트리 = 실제 큐ID/그룹ID 등)도 이 토큰으로 마스킹한다. 실제 표시값은 항상
 * 뷰그룹에 등록된 데이터소스의 선택값으로만 결정되므로(getRedisDisplayValue의 override 경로), 디자인
 * 시점 값은 미리보기용 sampleValue 하나로 충분하고 실제 ID를 저장/노출할 필요가 없다 — 노출 시 이 값이
 * 그대로 저장된 레이아웃 JSON에 박혀 다른 테넌트가 복사해 쓰면 엉뚱한(또는 존재하지 않는) 테넌트ID가
 * 그대로 남는 문제가 있었다(2026-07-13). 이 토큰은 실제 Redis 필드와 절대 일치하지 않으므로, 뷰그룹에
 * 데이터소스가 등록되지 않은 경우 집계 결과는 자연스럽게 0이 된다(getRedisDisplayValue 수정 불필요). */
const MASKED_ENTITY_FIELD = '{id}';

// ─── Redis Hash 탐색기 — JSON 필드 드래그 아이템 ────────────────────────────
// "해시그룹"(예: IC:GROUP:0처럼 한 hashKey 안에 compositeKey가 여러 개, 값이 각각 JSON인 구조)이어도
// 디자인 시점에는 "어떤 메트릭(JSON 컬럼)"을 쓸지만 고르면 되고, "어떤 그룹"을 보여줄지는 디스플레이
// 설정에서 결정한다 — 그래서 compositeKey 선택 UI는 두지 않고 첫 번째 entry를 컬럼 목록 샘플로만 사용한다.
function RedisHashFieldItems({ hashKey }: { hashKey: string }) {
  const icActualKeyMap = useContext(IcActualKeyContext);
  const redisKeyDefs = useContext(RedisKeyDefsContext);
  // 축약 키(예: IC:AGENT:0)인 경우 실제 Redis 키(예: IC:AGENT:2024001062:0)를 조회에 사용
  const actualHashKey = icActualKeyMap.get(hashKey)?.[0] ?? hashKey;
  // hashSiblingKeys: 축약 키면 같은 미디어타입의 모든 그룹 실제 키
  const resolvedSiblingKeys = icActualKeyMap.get(hashKey);
  // 위젯에 저장할 redisHashKey — 진짜 groupId 등이 그대로 화면/DB에 노출되지 않도록, YAML에 등록된 IC
  // 정의와 매치되면 엔티티 세그먼트만 `{groupId}` 같은 토큰으로 마스킹한다. 매치 안 되면(YAML 미등록
  // 카테고리) 기존처럼 실제 키 그대로 — 이 경우도 hashSiblingKeys가 있으면 런타임 조회는 그쪽을 우선 쓴다.
  const maskedHashKey = maskEntitySegment(actualHashKey, redisKeyDefs) ?? actualHashKey;

  // 이 해시키가 매칭되는 key-definition의 key-pattern으로 필드(영문 컬럼명) → 한글 표시명 맵을 찾는다.
  // 매핑이 있으면 한글 라벨을 보여주고 영문 키는 hover(title)로 노출. 없으면 영문 그대로.
  const matchedDef = matchKeyDefinition(actualHashKey, redisKeyDefs);
  const fieldNameMap = matchedDef?.definition.keyPattern ? redisKeyDefs.fieldDisplayNames?.[matchedDef.definition.keyPattern] : undefined;

  const { data: hashEntries = {}, isLoading } = useGetRedisHashEntries(actualHashKey, {
    queryOptions: { enabled: true },
  });

  if (isLoading) {
    return (
      <div className="ml-4 pl-3 border-l-2 border-rose-100 py-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-200 animate-pulse flex-shrink-0" />
        <span className="text-[10px] text-slate-400">로딩 중...</span>
      </div>
    );
  }

  const entries = Object.entries(hashEntries).filter(([field]) => field.trim().toLowerCase() !== 'sample');
  if (entries.length === 0) {
    return <div className="ml-4 pl-3 border-l-2 border-rose-100 py-2 text-[10px] text-slate-400">필드 없음</div>;
  }

  const [firstField, firstRaw] = entries[0];
  let parsed: Record<string, unknown> | null = null;
  try {
    const candidate = JSON.parse(firstRaw) as unknown;
    parsed = typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate) ? (candidate as Record<string, unknown>) : null;
  } catch {
    /* JSON 아님 */
  }

  // 해시그룹(엔티티ID→JSON)이고 해시키 자체가 마스킹된 경우(YAML 매치) — firstField(첫 엔트리의 실제
  // 엔티티ID)를 그대로 쓰지 않고 마스킹 토큰으로 대체(위 MASKED_ENTITY_FIELD 주석 참조).
  const isMaskedEntityHashGroup = parsed !== null && maskedHashKey !== actualHashKey;
  const displayField = isMaskedEntityHashGroup ? MASKED_ENTITY_FIELD : firstField;

  const displayItems: Array<{ field: string; col: string; sampleValue: string | number }> = parsed
    ? Object.entries(parsed)
        .filter(([col]) => col.trim().toLowerCase() !== 'sample')
        .map(([col, val]) => ({ field: displayField, col, sampleValue: typeof val === 'number' ? val : String(val ?? '') }))
    : entries.map(([field, value]) => ({ field, col: field, sampleValue: value }));

  return (
    <div className="ml-4 border-l-2 border-rose-100 pl-0 py-1.5 flex flex-col gap-1">
      {displayItems.map(({ field, col, sampleValue }) => {
        const koreanLabel = fieldNameMap?.[col]; // 한글 표시명(있으면)
        const callItem: CallDataItem = {
          id: `redis-${maskedHashKey}-${field}-${col}`,
          category: 'Redis',
          label: koreanLabel ?? col, // 한글 있으면 한글, 없으면 영문 키
          unit: '',
          sampleValue,
          color: '#e11d48',
          isRealtime: true,
          redisHashKey: maskedHashKey,
          redisField: field,
          redisJsonField: col !== field ? col : undefined, // 데이터 바인딩은 영문 키 그대로
          hashSiblingKeys: resolvedSiblingKeys?.length ? resolvedSiblingKeys : undefined,
        };
        // 한글 라벨일 때 영문 키를 아래 작은 글씨로 표기(+hover title). 한글 없으면 영문 단독.
        return (
          <div key={`${field}-${col}`} className="pl-2 pr-2" title={koreanLabel ? col : undefined}>
            <DraggableSourceItem item={callItem} subLabel={koreanLabel ? col : undefined} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Redis Hash 탐색기 — 트리 노드 ───────────────────────────────────────────
function RedisTreeNode({ node, depth, forceExpand }: { node: RedisKeyNode; depth: number; forceExpand?: boolean }) {
  const [isExpandedState, setIsExpandedState] = useState(false);
  // 검색 중(forceExpand)에는 사용자가 직접 접었어도 결과 경로를 보여주기 위해 강제로 펼친 채로 둔다.
  const isExpanded = isExpandedState || !!forceExpand;
  const hasChildren = node.children.length > 0;
  const isLeaf = !!node.fullKey && !hasChildren;

  // 자식이 모두 리프 = "해시 그룹" — 가변 키를 숨기고 JSON 컬럼을 바로 표시
  const isHashGroup = hasChildren && node.children.every((c) => !!c.fullKey && c.children.length === 0);
  const representativeKey = isHashGroup ? (node.children[0]?.fullKey ?? '') : (node.fullKey ?? '');
  const canExpand = isLeaf || hasChildren;

  // depth별 들여쓰기 (px)
  const indentPx = 8 + depth * 16;

  return (
    <div>
      <button
        onClick={() => {
          if (canExpand) setIsExpandedState((v) => !v);
        }}
        title={isHashGroup ? `${node.leafCount}개 해시 키 (대표: ${representativeKey})` : (node.fullKey ?? node.label)}
        className={`w-full flex items-center gap-2 py-1.5 text-left transition-all duration-100
          ${isHashGroup ? `hover:bg-rose-50 ${isExpanded ? 'bg-rose-50/60' : ''}` : 'hover:bg-slate-50'}`}
        style={{ paddingLeft: `${indentPx}px`, paddingRight: 8 }}
      >
        {/* 펼침 화살표 or 리프 점 */}
        {canExpand ? (
          <svg
            className={`w-3 h-3 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${isHashGroup ? 'text-rose-400' : 'text-slate-400'}`}
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 2l4 4-4 4" />
          </svg>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0 ml-0.5" />
        )}

        {/* 레이블 */}
        <span
          className={`font-mono truncate flex-1 min-w-0 leading-none ${
            isHashGroup ? 'text-[11px] text-rose-700 font-semibold' : depth === 0 ? 'text-[11px] text-slate-700 font-semibold' : 'text-[10px] text-slate-600'
          }`}
        >
          {node.label}
        </span>

        {/* 뱃지 */}
        {isHashGroup && (
          <span className="flex-shrink-0 text-[9px] font-bold text-rose-500 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
            HASH ×{node.leafCount}
          </span>
        )}
        {hasChildren && !isHashGroup && <span className="flex-shrink-0 text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full leading-none">{node.leafCount}</span>}
      </button>

      {/* 단독 리프: 펼치면 곧바로 그 키의 JSON 필드 드래그 아이템 표시.
          검색 강제펼침(forceExpand)만으로는 값을 조회하지 않는다 — 사용자가 실제로 클릭해 펼친(isExpandedState)
          노드만 hash-entries를 조회한다. (검색 시 매칭된 키가 많으면 노드마다 개별 조회가 폭주하던 문제 차단) */}
      {isLeaf && !isHashGroup && isExpandedState && representativeKey && <RedisHashFieldItems hashKey={representativeKey} />}

      {hasChildren && isExpanded && (
        <div className="border-l border-slate-100 ml-4">
          {/* 자식 재귀 — 해시그룹이어도 마지막 구분자(0, 10, IN_TOT 등) 개별 키까지 그대로 펼쳐 보여준다 */}
          {node.children.map((child) => (
            <RedisTreeNode key={child.label} node={child} depth={depth + 1} forceExpand={forceExpand} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 고정 위젯 항목 (시계 · 테이블) ─────────────────────────────────────────

const CLOCK_WIDGET_ITEMS: CallDataItem[] = [
  {
    id: 'etc-date',
    category: 'etc',
    label: '날짜',
    sampleValue: '20250605',
    color: '#8b5cf6',
    isRealtime: true,
  },
  {
    id: 'etc-time',
    category: 'etc',
    label: '시간',
    sampleValue: '14:30:22',
    color: '#8b5cf6',
    isRealtime: true,
  },
  {
    id: 'etc-datetime',
    category: 'etc',
    label: '날짜+시간',
    sampleValue: '20250605 14:30:22',
    color: '#8b5cf6',
    isRealtime: true,
  },
  {
    id: 'etc-custom',
    category: 'etc',
    label: '사용자 지정',
    sampleValue: '2025년 06월 05일 14시 30분 22초',
    color: '#8b5cf6',
    isRealtime: true,
  },
];

const TABLE_WIDGET_ITEMS: CallDataItem[] = [
  {
    // 큐/그룹/상담사처럼 DB 마스터 목록과 조인하는 고정 테이블이 아니라, 임의 Redis 해시키 1개를
    // 통째로 테이블로 보여주는 범용 위젯. 미디어타입은 별도 선택 UI 없이 해시키 문자열에 그대로
    // 포함해서 입력(예: "IC:CTIQ:0") — RedisTableWidget.tsx 참고.
    id: 'table-redis',
    category: 'Redis',
    label: 'Redis 테이블',
    sampleValue: '',
    color: '#0ea5e9',
    displayType: 'table',
    isRealtime: true,
    tableConfig: { columns: [], sampleRows: [] },
  },
  {
    // 두 Redis 해시키에서 데이터를 읽어 공통 키 컬럼 값으로 행을 연결(INNER JOIN)하는 테이블 위젯.
    // hashKeyA(item.redisHashKey)와 hashKeyB(item.joinHashKeyB)의 행을 joinKey(tableConfig.joinKey)
    // 기준으로 연결해 1행으로 병합 — 어느 쪽에도 매칭 없는 행은 제외한다.
    id: 'table-join',
    category: 'Redis',
    label: 'JOIN 테이블',
    sampleValue: '',
    color: '#8b5cf6',
    displayType: 'table',
    isRealtime: true,
    tableConfig: { columns: [], sampleRows: [] },
  },
];

// ─── 그룹별 이석사유 현황(IC:GROUP:REASON) 프리셋 ───────────────────────────
// redisHashKey의 {groupId} 자리는 디자인 시점 placeholder(0)일 뿐 — 실제 화면에서는 항상 디스플레이가
// 선택한 그룹들로 치환되어 조회된다(RedisTableWidget.tsx/redisValue.ts의 GROUP_REASON_HASH_PREFIX 처리 참고).
// 미디어타입(끝 세그먼트)만 드롭 후 우측 속성 패널에서 바꿔주면 된다.
const GROUP_REASON_TEMPLATE_HASH_KEY = `${GROUP_REASON_HASH_PREFIX}0:0`;

const GROUP_REASON_WIDGET_ITEMS: CallDataItem[] = [
  {
    // 그룹별 × 사유코드별 인원수를 그룹 단위로 모두 펼쳐 보여주는 테이블.
    // IC:GROUP:REASON:{groupId}:{mediaType} 해시는 field key 자체가 NODE_ID(6자리)+REASON_CODE 복합값이고,
    // REASON_CODE/GROUP_ID/AGENT_CNT 등은 JSON 값 안에 그대로 들어있다(field key를 파싱할 필요 없음).
    // groupBy(REASON_CODE→AGENT_CNT 합계)로 그룹당 노드 여러 개를 사유코드 1행으로 합산해서 보여준다.
    // 사유코드 이름(REASON_NAME) 표시가 필요하면 컬럼의 "이름 매핑 데이터소스"에서 등록된 쿼리를 고르면 됨.
    id: 'table-group-reason',
    category: 'Redis',
    label: '그룹별 이석사유 현황',
    sampleValue: '',
    color: '#e11d48',
    displayType: 'table',
    isRealtime: true,
    redisHashKey: GROUP_REASON_TEMPLATE_HASH_KEY,
    tableConfig: {
      columns: [
        { key: SYSTEM_ID_COLUMN_KEY, label: '그룹ID', width: '34%' },
        { key: 'REASON_CODE', label: '사유코드', width: '33%' },
        { key: 'AGENT_CNT', label: '인원수', width: '33%' },
      ],
      groupBy: { byKey: 'REASON_CODE', aggKey: 'AGENT_CNT' },
      sampleRows: [],
    },
  },
  {
    // 디스플레이가 선택한 모든 그룹을 합쳐, 특정 사유코드 1개의 인원수만 숫자 하나로 보여주는 낱개 위젯.
    // 드롭 후 우측 속성 패널의 "그룹별 합계"에서 matchValue(사유코드)만 채우면 된다.
    id: 'value-group-reason',
    category: 'Redis',
    label: '이석사유 인원수(낱개)',
    sampleValue: 0,
    color: '#e11d48',
    displayType: 'value',
    isRealtime: true,
    redisHashKey: GROUP_REASON_TEMPLATE_HASH_KEY,
    groupBy: { byKey: 'REASON_CODE', aggKey: 'AGENT_CNT', matchValue: '' },
  },
];

// ─── 스킬별 이석사유 현황(IC:SKILL:REASON) 프리셋 ───────────────────────────
// 그룹별 이석사유 현황과 같은 규칙(redisHashKey의 엔티티ID 자리는 디자인 시점 placeholder(0)일 뿐이고,
// 실제 화면에서는 디스플레이가 선택한 그룹들로 치환)이지만, 실제 키 형식은 다르다 — IC:GROUP:REASON은
// 끝에 미디어타입이 붙지만(:{mediaType}) IC:SKILL:REASON은 미디어타입 세그먼트가 없다(엔티티ID 1세그먼트뿐,
// redisValue.ts의 REASON_FAMILIES가 이 차이를 구분해서 처리한다). 그룹ID 컬럼도 의미가 없어 테이블에서 뺐다.
const SKILL_REASON_TEMPLATE_HASH_KEY = `${SKILL_REASON_HASH_PREFIX}0`;

const SKILL_REASON_WIDGET_ITEMS: CallDataItem[] = [
  {
    id: 'table-skill-reason',
    category: 'Redis',
    label: '스킬별 이석사유 현황',
    sampleValue: '',
    color: '#e11d48',
    displayType: 'table',
    isRealtime: true,
    redisHashKey: SKILL_REASON_TEMPLATE_HASH_KEY,
    tableConfig: {
      columns: [
        { key: 'REASON_CODE', label: '사유코드', width: '50%' },
        { key: 'AGENT_CNT', label: '인원수', width: '50%' },
      ],
      groupBy: { byKey: 'REASON_CODE', aggKey: 'AGENT_CNT' },
      sampleRows: [],
    },
  },
  {
    id: 'value-skill-reason',
    category: 'Redis',
    label: '이석사유 인원수(낱개)',
    sampleValue: 0,
    color: '#e11d48',
    displayType: 'value',
    isRealtime: true,
    redisHashKey: SKILL_REASON_TEMPLATE_HASH_KEY,
    groupBy: { byKey: 'REASON_CODE', aggKey: 'AGENT_CNT', matchValue: '' },
  },
];

// ─── 외부 API 위젯 섹션 ──────────────────────────────────────────────────────
type ExternalApiTestState = 'idle' | 'loading' | 'success' | 'error';

const DB_QUERY_KEYS = ['custom1', 'custom2', 'custom3', 'custom4', 'custom5', 'custom6', 'custom7', 'custom8', 'custom9', 'custom10'] as const;

/** DB query 결과(배열 또는 단일 행)에서 column 값을 추출. 배열이면 첫 번째 행을 사용 */
function extractDbQueryResult(json: unknown, column: string): string {
  let row: unknown = json;
  if (Array.isArray(row)) row = (row as unknown[])[0] ?? null;
  if (row == null) return '';
  if (typeof row !== 'object') return String(row);
  const rec = row as Record<string, unknown>;
  if (!column) {
    const vals = Object.values(rec);
    return vals.length === 1 ? String(vals[0]) : JSON.stringify(rec);
  }
  const val = rec[column] !== undefined ? rec[column] : rec[column.toUpperCase()];
  return val != null ? String(val) : '';
}

/** 점 표기법 경로(예: "data.score")로 JSON 값 추출. 경로 미지정 시 전체 JSON 문자열 반환 */
function extractJsonByPath(obj: unknown, path: string): string {
  if (!path) return typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  const keys = path.split('.');
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur === null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur === undefined ? '' : typeof cur === 'string' ? cur : String(cur);
}

/** JSON 객체를 점 표기법 경로 목록으로 flatten (최대 depth 3) */
function flattenJsonPaths(obj: unknown, prefix = '', depth = 0): string[] {
  if (depth > 3 || obj === null || typeof obj !== 'object' || Array.isArray(obj)) return prefix ? [prefix] : [];
  const rec = obj as Record<string, unknown>;
  return Object.keys(rec).flatMap((k) => {
    const full = prefix ? `${prefix}.${k}` : k;
    const child = rec[k];
    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      return [full, ...flattenJsonPaths(child, full, depth + 1)];
    }
    return [full];
  });
}

function ExternalApiSection() {
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState('');
  const [testState, setTestState] = useState<ExternalApiTestState>('idle');
  const [testJson, setTestJson] = useState<unknown>(null);
  const [manualJson, setManualJson] = useState('');
  const [jsonPath, setJsonPath] = useState('');
  const [label, setLabel] = useState('외부 API');
  const [intervalSec, setIntervalSec] = useState(30);
  const [addedItems, setAddedItems] = useState<CallDataItem[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const effectiveJson: unknown =
    testJson ??
    (() => {
      try {
        return manualJson ? (JSON.parse(manualJson) as unknown) : null;
      } catch {
        return null;
      }
    })();
  const hasEffectiveJson = effectiveJson != null;
  const pathOptions = hasEffectiveJson ? flattenJsonPaths(effectiveJson) : [];
  const previewValue = hasEffectiveJson && jsonPath ? extractJsonByPath(effectiveJson, jsonPath) : '';

  const { mutateAsync: doTestUrl } = useMutation({ mutationFn: taskboardApi.testExternalApiUrl });

  const handleTest = async () => {
    if (!url.trim()) return;
    setTestState('loading');
    setTestJson(null);
    setErrorMsg('');
    try {
      const trimmedUrl = url.trim();
      const json = trimmedUrl.startsWith('db:')
        ? await taskboardApi.executeDbQuery(trimmedUrl.slice(3))
        : await doTestUrl({ url: trimmedUrl, headers: headers.trim() || undefined });
      setTestJson(json);
      setTestState('success');
      setJsonPath('');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '알 수 없는 오류');
      setTestState('error');
    }
  };

  const handleAdd = () => {
    const sourceJson = effectiveJson;
    if (!hasEffectiveJson && !manualJson) {
      toast.warning('테스트 성공 또는 수동 JSON을 입력하세요.');
      return;
    }
    const sampleVal = jsonPath ? extractJsonByPath(sourceJson, jsonPath) : typeof sourceJson === 'string' ? sourceJson : JSON.stringify(sourceJson);
    const newItem: CallDataItem = {
      id: `ext-api-${createUUID()}`,
      category: 'ExternalApi',
      label: label || '외부 API',
      sampleValue: sampleVal,
      color: '#16a34a',
      externalApiUrl: url.trim(),
      externalApiJsonPath: jsonPath,
      externalApiSampleJson: testJson ? undefined : manualJson,
      externalApiIntervalSec: intervalSec > 0 ? intervalSec : 30,
      externalApiHeaders: headers.trim() || undefined,
    };
    setAddedItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => setAddedItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">외부 API</p>
      <div className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded">
        {/* URL 입력 */}
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">Full URL</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleTest();
              }}
              placeholder="https://api.example.com/data"
              className="flex-1 min-w-0 px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
            />
            <button
              onClick={() => void handleTest()}
              disabled={testState === 'loading' || !url.trim()}
              className="px-2 py-1 text-[9px] font-semibold rounded border transition-colors disabled:opacity-40
                bg-[#0f5b9e] text-white border-[#0f5b9e] hover:bg-[#0a4a8a]"
            >
              {testState === 'loading' ? '...' : '테스트'}
            </button>
          </div>
        </div>

        {/* 요청 헤더 (선택) */}
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">요청 헤더 (선택 — 한 줄에 하나, Key: Value)</label>
          <textarea
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            placeholder={'Authorization: Bearer token\nX-Api-Key: your-key'}
            rows={2}
            className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white resize-none"
          />
        </div>

        {/* 테스트 성공 — JSON 경로 선택 */}
        {testState === 'success' && hasEffectiveJson && (
          <div className="flex flex-col gap-1 p-1.5 bg-green-50 border border-green-200 rounded">
            <p className="text-[9px] text-green-700 font-semibold">✓ JSON 수신 성공</p>
            <label className="text-[9px] text-slate-400 block">값 경로 선택</label>
            <select
              value={jsonPath}
              onChange={(e) => setJsonPath(e.target.value)}
              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
            >
              <option value="">(전체 JSON)</option>
              {pathOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {jsonPath && <p className="text-[10px] font-mono text-[#0f5b9e] bg-white border border-slate-200 rounded px-1.5 py-1 truncate">미리보기: {previewValue}</p>}
            <label className="text-[9px] text-slate-400 block mt-0.5">경로 직접 입력 (선택 대신 사용 가능)</label>
            <input
              type="text"
              value={jsonPath}
              onChange={(e) => setJsonPath(e.target.value)}
              placeholder="예: data.score"
              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
            />
          </div>
        )}

        {/* 테스트 실패 — 수동 JSON 입력 */}
        {testState === 'error' && (
          <div className="flex flex-col gap-1 p-1.5 bg-red-50 border border-red-200 rounded">
            <p className="text-[9px] text-red-600 font-semibold">✗ {errorMsg}</p>
            <p className="text-[9px] text-slate-500">CORS 또는 네트워크 오류 시 샘플 JSON을 직접 입력하세요.</p>
            <label className="text-[9px] text-slate-400 block">샘플 JSON</label>
            <textarea
              value={manualJson}
              onChange={(e) => setManualJson(e.target.value)}
              placeholder={'{\n  "value": 42\n}'}
              rows={4}
              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white resize-none"
            />
            {hasEffectiveJson && (
              <>
                <label className="text-[9px] text-slate-400 block mt-0.5">값 경로</label>
                <select
                  value={jsonPath}
                  onChange={(e) => setJsonPath(e.target.value)}
                  className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
                >
                  <option value="">(전체 JSON)</option>
                  {pathOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={jsonPath}
                  onChange={(e) => setJsonPath(e.target.value)}
                  placeholder="예: data.score"
                  className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
                />
              </>
            )}
          </div>
        )}

        {/* 위젯 레이블 + 갱신 주기 + 추가 버튼 */}
        {(testState === 'success' || (testState === 'error' && manualJson)) && (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="위젯 이름"
              className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
            />
            <div className="flex gap-1 items-center">
              <label className="text-[9px] text-slate-400 whitespace-nowrap">갱신 주기(초)</label>
              <input
                type="number"
                min={5}
                max={3600}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="w-14 px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white text-center"
              />
              <button
                onClick={handleAdd}
                className="flex-1 px-2 py-1 text-[9px] font-semibold rounded border bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                + 추가
              </button>
            </div>
          </div>
        )}

        {/* 추가된 외부 API 위젯 목록 — 드래그 가능 */}
        {addedItems.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-slate-200 pt-1.5 mt-0.5">
            <p className="text-[9px] text-slate-400">추가된 위젯 (캔버스로 드래그)</p>
            {addedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <DraggableSourceItem item={item} />
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-300 hover:text-red-400 rounded transition-colors text-[10px]"
                  title="제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-slate-400 leading-snug">JSON 응답 API만 지원합니다. CORS가 허용된 URL이어야 테스트가 동작합니다.</p>
      </div>
    </div>
  );
}

// ─── 웹 임베드(iframe) 위젯 섹션 ──────────────────────────────────────────────
function WebEmbedSection() {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('웹 방송');
  const [addedItems, setAddedItems] = useState<CallDataItem[]>([]);

  const handleAdd = () => {
    if (!url.trim()) {
      toast.warning('URL을 입력하세요.');
      return;
    }
    const newItem: CallDataItem = {
      id: `web-embed-${createUUID()}`,
      category: 'WebEmbed',
      label: label || '웹 방송',
      sampleValue: '',
      color: '#0ea5e9',
      webEmbedUrl: url.trim(),
    };
    setAddedItems((prev) => [...prev, newItem]);
    setUrl('');
  };

  const handleRemoveItem = (id: string) => setAddedItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">웹 임베드 (방송/페이지)</p>
      <div className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded">
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">URL (http/https/localhost)</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
          />
        </div>
        <div className="flex gap-1 items-center">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="위젯 이름"
            className="flex-1 min-w-0 px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
          />
          <button
            onClick={handleAdd}
            disabled={!url.trim()}
            className="px-2 py-1 text-[9px] font-semibold rounded border bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors whitespace-nowrap disabled:opacity-40"
          >
            + 추가
          </button>
        </div>

        {/* 추가된 웹 임베드 위젯 목록 — 드래그 가능 */}
        {addedItems.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-slate-200 pt-1.5 mt-0.5">
            <p className="text-[9px] text-slate-400">추가된 위젯 (캔버스로 드래그)</p>
            {addedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <DraggableSourceItem item={item} />
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-300 hover:text-red-400 rounded transition-colors text-[10px]"
                  title="제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-slate-400 leading-snug">
          YouTube 시청 URL은 자동으로 음소거 임베드 플레이어로 변환됩니다. 일반 사이트는 해당 사이트가 iframe 표시를 허용해야 보입니다 (거부 시 빈 화면).
        </p>
      </div>
    </div>
  );
}

// ─── DB Query 전용 위젯 섹션 ──────────────────────────────────────────────────
function DbQuerySection() {
  const [queryKey, setQueryKey] = useState<string>('custom1');
  const [column, setColumn] = useState('');
  const [label, setLabel] = useState('DB Query');
  const [intervalSec, setIntervalSec] = useState(30);
  const [testState, setTestState] = useState<ExternalApiTestState>('idle');
  const [testResult, setTestResult] = useState<unknown>(null);
  const [addedItems, setAddedItems] = useState<CallDataItem[]>([]);

  const columns = Array.isArray(testResult) && testResult.length > 0 ? Object.keys(testResult[0] as Record<string, unknown>) : [];
  const previewValue = testResult != null ? extractDbQueryResult(testResult, column) : '';

  const handleTest = async () => {
    setTestState('loading');
    setTestResult(null);
    try {
      const result = await taskboardApi.executeDbQuery(queryKey);
      setTestResult(result);
      setTestState('success');
      setColumn('');
    } catch {
      setTestState('error');
    }
  };

  const handleAdd = () => {
    const newItem: CallDataItem = {
      id: `db-query-${createUUID()}`,
      category: 'DbQuery',
      label: label || 'DB Query',
      sampleValue: previewValue,
      color: '#7c3aed',
      dbQueryKey: queryKey,
      dbQueryColumn: column || undefined,
      dbQueryIntervalSec: intervalSec > 0 ? intervalSec : 30,
    };
    setAddedItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (id: string) => setAddedItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div>
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">DB Query</p>
      <div className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded">
        {/* 쿼리 키 선택 + 테스트 */}
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">쿼리 키</label>
          <div className="flex gap-1">
            <select
              value={queryKey}
              onChange={(e) => setQueryKey(e.target.value)}
              className="flex-1 min-w-0 px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed] bg-white"
            >
              {DB_QUERY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleTest()}
              disabled={testState === 'loading'}
              className="px-2 py-1 text-[9px] font-semibold rounded border transition-colors disabled:opacity-40 bg-[#7c3aed] text-white border-[#7c3aed] hover:bg-[#6d28d9]"
            >
              {testState === 'loading' ? '...' : '테스트'}
            </button>
          </div>
        </div>

        {/* 테스트 성공 — 컬럼 선택 */}
        {testState === 'success' && testResult != null && (
          <div className="flex flex-col gap-1 p-1.5 bg-green-50 border border-green-200 rounded">
            <p className="text-[9px] text-green-700 font-semibold">✓ 쿼리 성공</p>
            {columns.length > 0 && (
              <>
                <label className="text-[9px] text-slate-400 block">표시할 컬럼</label>
                <select
                  value={column}
                  onChange={(e) => setColumn(e.target.value)}
                  className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed] bg-white"
                >
                  <option value="">(첫 번째 컬럼 값)</option>
                  {columns.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-[#7c3aed] bg-white border border-slate-200 rounded px-1.5 py-1 truncate">미리보기: {previewValue}</p>
              </>
            )}
          </div>
        )}
        {testState === 'error' && <p className="text-[9px] text-red-500">쿼리 실행 실패. 키 또는 SQL을 확인하세요.</p>}

        {/* 레이블 + 갱신 주기 + 추가 */}
        {testState === 'success' && (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="위젯 이름"
              className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed] bg-white"
            />
            <div className="flex gap-1 items-center">
              <label className="text-[9px] text-slate-400 whitespace-nowrap">갱신 주기(초)</label>
              <input
                type="number"
                min={5}
                max={3600}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="w-14 px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed] bg-white text-center"
              />
              <button
                onClick={handleAdd}
                className="flex-1 px-2 py-1 text-[9px] font-semibold rounded border bg-purple-600 text-white border-purple-600 hover:bg-purple-700 transition-colors whitespace-nowrap"
              >
                + 추가
              </button>
            </div>
          </div>
        )}

        {/* 추가된 위젯 목록 */}
        {addedItems.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-slate-200 pt-1.5 mt-0.5">
            <p className="text-[9px] text-slate-400">추가된 위젯 (캔버스로 드래그)</p>
            {addedItems.map((item) => (
              <div key={item.id} className="flex items-center gap-1">
                <div className="flex-1 min-w-0">
                  <DraggableSourceItem item={item} />
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-300 hover:text-red-400 rounded transition-colors text-[10px]"
                  title="제거"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-slate-400 leading-snug">SQL은 application-taskboard-queries.yml 수정 후 서비스 재시작 시 반영됩니다.</p>
      </div>
    </div>
  );
}

// ─── 데이터소스(태그) 전용 위젯 섹션 ──────────────────────────────────────────
// task-display에 등록된 임의의 DbQueryDef(데이터 소스 관리 탭)를 "태그"로 간접 참조하는 위젯.
// 디자인 시점엔 어느 데이터소스인지 모른다(뷰그룹마다 태그→데이터소스 매핑이 다를 수 있음) — 태그만
// 정하고 캔버스에 놓은 뒤, 실제 필드명/컬럼은 우측 속성 패널에서 채운다.
// ─── 오른쪽 패널: 외부 API 위젯 속성 편집 ────────────────────────────────────
function ExternalApiWidgetProps({
  widget,
  onUpdate,
}: {
  widget: DroppedWidget;
  onUpdate: (
    patch: Partial<Pick<CallDataItem, 'externalApiUrl' | 'externalApiJsonPath' | 'externalApiSampleJson' | 'sampleValue' | 'externalApiIntervalSec' | 'externalApiHeaders'>>,
  ) => void;
}) {
  const [retestState, setRetestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [retestError, setRetestError] = useState('');
  const { mutateAsync: doRetest } = useMutation({ mutationFn: taskboardApi.testExternalApiUrl });

  const handleRetest = async () => {
    const url = widget.item.externalApiUrl;
    if (!url) {
      toast.warning('URL이 없습니다.');
      return;
    }
    setRetestState('loading');
    setRetestError('');
    try {
      const json = url.startsWith('db:') ? await taskboardApi.executeDbQuery(url.slice(3)) : await doRetest({ url, headers: widget.item.externalApiHeaders || undefined });
      const path = widget.item.externalApiJsonPath ?? '';
      const val = path ? extractJsonByPath(json, path) : JSON.stringify(json);
      onUpdate({ sampleValue: val, externalApiSampleJson: undefined });
      setRetestState('success');
      toast.success('재테스트 성공 — 미리보기 값 갱신');
    } catch (e) {
      setRetestError(e instanceof Error ? e.message : '오류');
      setRetestState('error');
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">외부 API 설정</p>

      {/* URL */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">URL</label>
        <input
          type="text"
          value={widget.item.externalApiUrl ?? ''}
          onChange={(e) => onUpdate({ externalApiUrl: e.target.value })}
          placeholder="https://api.example.com/data  또는  db:custom1"
          className="w-full px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
        />
      </div>

      {/* 요청 헤더 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">요청 헤더</label>
        <textarea
          value={widget.item.externalApiHeaders ?? ''}
          onChange={(e) => onUpdate({ externalApiHeaders: e.target.value || undefined })}
          placeholder={'Authorization: Bearer token\nX-Api-Key: your-key'}
          rows={2}
          className="w-full px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] resize-none"
        />
        <p className="text-[9px] text-slate-400 mt-0.5">한 줄에 헤더 하나, Key: Value 형식</p>
      </div>

      {/* JSON 경로 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">값 경로 (점 표기법)</label>
        <input
          type="text"
          value={widget.item.externalApiJsonPath ?? ''}
          onChange={(e) => onUpdate({ externalApiJsonPath: e.target.value })}
          placeholder="예: data.score"
          className="w-full px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
        />
      </div>

      {/* 샘플 JSON (폴백) */}
      {widget.item.externalApiSampleJson && (
        <div>
          <label className="text-[10px] text-slate-500 font-semibold block mb-1">샘플 JSON (폴백)</label>
          <textarea
            value={widget.item.externalApiSampleJson}
            onChange={(e) => onUpdate({ externalApiSampleJson: e.target.value })}
            rows={3}
            className="w-full px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] resize-none"
          />
        </div>
      )}

      {/* 갱신 주기 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">갱신 주기 (초)</label>
        <input
          type="number"
          min={5}
          max={3600}
          value={widget.item.externalApiIntervalSec ?? 30}
          onChange={(e) => onUpdate({ externalApiIntervalSec: Number(e.target.value) })}
          className="w-full px-2 py-1.5 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
        />
        <p className="text-[9px] text-slate-400 mt-0.5">실행화면에서 이 간격으로 API를 자동 갱신합니다.</p>
      </div>

      {/* 재테스트 버튼 */}
      <button
        onClick={() => void handleRetest()}
        disabled={retestState === 'loading' || !widget.item.externalApiUrl}
        className="w-full py-1.5 text-[10px] font-semibold rounded border transition-colors disabled:opacity-40
          bg-[#0f5b9e] text-white border-[#0f5b9e] hover:bg-[#0a4a8a]"
      >
        {retestState === 'loading' ? '테스트 중...' : '재테스트 (미리보기 갱신)'}
      </button>
      {retestState === 'error' && <p className="text-[9px] text-red-500">{retestError}</p>}

      {/* 미리보기 값 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">현재 미리보기 값</label>
        <p className="px-2 py-1.5 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded truncate text-slate-700">{widget.item.sampleValue ?? '—'}</p>
      </div>
    </div>
  );
}

// ─── 오른쪽 패널: DB Query 위젯 속성 편집 ────────────────────────────────────
function DbQueryWidgetProps({
  widget,
  onUpdate,
}: {
  widget: DroppedWidget;
  onUpdate: (patch: Partial<Pick<CallDataItem, 'dbQueryKey' | 'dbQueryColumn' | 'dbQueryIntervalSec' | 'sampleValue'>>) => void;
}) {
  const [retestState, setRetestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [retestError, setRetestError] = useState<string | null>(null);
  const [fetchedColumns, setFetchedColumns] = useState<string[]>([]);
  const [isFetchingCols, setIsFetchingCols] = useState(false);
  const [fetchColsError, setFetchColsError] = useState<string | null>(null);

  const handleFetchColumns = async () => {
    const key = widget.item.dbQueryKey ?? 'custom1';
    setIsFetchingCols(true);
    setFetchColsError(null);
    try {
      const result = await taskboardApi.executeDbQuery(key);
      if (Array.isArray(result) && result.length > 0) {
        const cols = Object.keys(result[0] as Record<string, unknown>);
        setFetchedColumns(cols);
        toast.success(`${cols.length}개 컬럼 조회됨`);
      } else {
        setFetchedColumns([]);
        toast.warning('쿼리 결과가 없습니다 (0건)');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFetchColsError(msg);
      toast.error('컬럼 조회 실패');
    } finally {
      setIsFetchingCols(false);
    }
  };

  const handleRetest = async () => {
    const key = widget.item.dbQueryKey;
    if (!key) return;
    setRetestState('loading');
    setRetestError(null);
    try {
      const result = await taskboardApi.executeDbQuery(key);
      const val = extractDbQueryResult(result, widget.item.dbQueryColumn ?? '');
      onUpdate({ sampleValue: val });
      setRetestState('success');
      toast.success(`재테스트 성공 — 값: ${val || '(결과 없음)'}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRetestState('error');
      setRetestError(msg);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">DB Query 설정</p>

      {/* 쿼리 키 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">쿼리 키</label>
        <select
          value={widget.item.dbQueryKey ?? 'custom1'}
          onChange={(e) => {
            onUpdate({ dbQueryKey: e.target.value });
            setFetchedColumns([]);
          }}
          className="w-full px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
        >
          {DB_QUERY_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* 컬럼 조회 + 선택 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">표시할 컬럼</label>
        <div className="flex gap-1">
          {fetchedColumns.length > 0 ? (
            <select
              value={widget.item.dbQueryColumn ?? ''}
              onChange={(e) => onUpdate({ dbQueryColumn: e.target.value || undefined })}
              className="flex-1 min-w-0 px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
            >
              <option value="">(첫 번째 컬럼)</option>
              {fetchedColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={widget.item.dbQueryColumn ?? ''}
              onChange={(e) => onUpdate({ dbQueryColumn: e.target.value || undefined })}
              placeholder="조회 버튼으로 선택 또는 직접 입력"
              className="flex-1 min-w-0 px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
            />
          )}
          <button
            onClick={() => void handleFetchColumns()}
            disabled={isFetchingCols}
            title="쿼리를 실행해 컬럼 목록을 가져옵니다"
            className="px-2 py-1.5 text-[10px] font-semibold rounded border transition-colors disabled:opacity-40 bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 whitespace-nowrap"
          >
            {isFetchingCols ? '...' : '컬럼 조회'}
          </button>
        </div>
        {fetchColsError && <p className="text-[9px] text-red-500 mt-0.5">{fetchColsError}</p>}
        <p className="text-[9px] text-slate-400 mt-0.5">미입력 시 첫 번째 컬럼 값을 표시합니다.</p>
      </div>

      {/* 갱신 주기 안내 (실행화면에서는 WS로 수신) */}
      <div>
        <p className="text-[9px] text-slate-400">실행화면에서 WebSocket으로 실시간 수신합니다 (갱신 주기: 약 5초).</p>
      </div>

      {/* 재테스트 */}
      <button
        onClick={() => void handleRetest()}
        disabled={retestState === 'loading' || !widget.item.dbQueryKey}
        className="w-full py-1.5 text-[10px] font-semibold rounded border transition-colors disabled:opacity-40 bg-[#7c3aed] text-white border-[#7c3aed] hover:bg-[#6d28d9]"
      >
        {retestState === 'loading' ? '테스트 중...' : '재테스트 (미리보기 갱신)'}
      </button>
      {retestState === 'error' && <p className="text-[9px] text-red-500">쿼리 실행 실패{retestError ? `: ${retestError}` : ''}</p>}

      {/* 미리보기 값 */}
      <div>
        <label className="text-[10px] text-slate-500 font-semibold block mb-1">현재 미리보기 값</label>
        <p className="px-2 py-1.5 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded truncate text-slate-700">{widget.item.sampleValue ?? '—'}</p>
      </div>
    </div>
  );
}

// ─── 오른쪽 패널: 데이터소스(태그) 위젯 속성 편집 ─────────────────────────────
function FixedItemsSection() {
  const [isOpen, setIsOpen] = useState(true);
  const { data: notices = [], isLoading: noticesLoading } = useGetNoticeList();
  // activeYn(노출 여부) — useYn은 소프트삭제 플래그라 항상 'Y'(AnnouncementWidget.tsx와 동일 규칙).
  const activeNotices = notices.filter((n) => n.activeYn === 'Y').sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/60 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-400 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700">위젯 항목</span>
        </div>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="px-2 py-2 space-y-2">
          {/* 시계 */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">시계</p>
            <div className="space-y-1">
              {CLOCK_WIDGET_ITEMS.map((item) => (
                <DraggableSourceItem key={item.id} item={item} />
              ))}
            </div>
          </div>
          {/* 테이블 */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">테이블</p>
            <div className="space-y-1">
              {TABLE_WIDGET_ITEMS.map((item) => (
                <DraggableSourceItem key={item.id} item={item} />
              ))}
            </div>
          </div>
          {/* 그룹별 이석사유 — IC:GROUP:REASON 프리셋(테이블/낱개 모두 디스플레이 선택 그룹 자동 반영) */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">그룹별 이석사유</p>
            <div className="space-y-1">
              {GROUP_REASON_WIDGET_ITEMS.map((item) => (
                <DraggableSourceItem key={item.id} item={item} />
              ))}
            </div>
            <p className="text-[9px] text-slate-400 px-1 mt-1">
              드롭 후 미디어타입(해시키 끝자리)·낱개는 사유코드(matchValue)를 우측 속성 패널에서 채우세요. 그룹은 디스플레이 선택값이 자동 적용됩니다.
            </p>
          </div>
          {/* 스킬별 이석사유 — IC:SKILL:REASON 프리셋(그룹별 이석사유와 동일 규칙, 디스플레이 선택 그룹 자동 반영) */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">스킬별 이석사유</p>
            <div className="space-y-1">
              {SKILL_REASON_WIDGET_ITEMS.map((item) => (
                <DraggableSourceItem key={item.id} item={item} />
              ))}
            </div>
            <p className="text-[9px] text-slate-400 px-1 mt-1">
              드롭 후 낱개는 사유코드(matchValue)를 우측 속성 패널에서 채우세요. 그룹은 디스플레이 선택값이 자동 적용됩니다(미디어타입 세그먼트 없음).
            </p>
          </div>
          {/* 공지사항 키 그룹 — 같은 noticeKey의 공지 여러 건을 한 위젯에서 회전(슬라이드)해서 보여줌 */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">공지사항 (키 그룹)</p>
            <DraggableSourceItem
              item={{
                id: 'etc-announcement',
                category: 'notice',
                label: '공지 그룹 (여러 건 슬라이드)',
                sampleValue: '',
                color: '#f59e0b',
              }}
            />
            <p className="text-[9px] text-slate-400 px-1 mt-1">캔버스에 놓은 뒤 우측 속성 패널에서 공지 키를 선택하세요. 같은 키의 공지가 여러 건이면 회전하며 표시됩니다.</p>
          </div>
          {/* 공지사항 — DB에서 가져온 항목별 개별 드래그(특정 1건만 고정 표시하고 싶을 때) */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">공지사항 (1건 고정){activeNotices.length > 0 && ` (${activeNotices.length})`}</p>
            {noticesLoading ? (
              <div className="text-[10px] text-slate-400 text-center py-1">로딩 중...</div>
            ) : activeNotices.length === 0 ? (
              <div className="text-[10px] text-slate-400 text-center py-1">등록된 공지사항 없음</div>
            ) : (
              <div className="space-y-1">
                {activeNotices.map((notice) => {
                  const item: CallDataItem = {
                    id: `notice-${notice.noticeId}`,
                    category: 'notice',
                    label: notice.title ?? notice.content.slice(0, 20),
                    sampleValue: '',
                    color: '#f59e0b',
                    noticeId: notice.noticeId,
                  };
                  return <DraggableSourceItem key={notice.noticeId} item={item} />;
                })}
              </div>
            )}
          </div>
          {/* 계산식 — 캔버스에 배치된 위젯을 드래그해 변수로 연결하는 수식 위젯 */}
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">계산식</p>
            <div className="space-y-1">
              <DraggableSourceItem item={CALC_WIDGET_ITEM} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 외부 항목 섹션 (외부 API · DB Query) ────────────────────────────────────
function ExternalItemsSection() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex-shrink-0 border-t border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/60 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          <span className="text-[11px] font-semibold text-slate-700">외부 항목</span>
        </div>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
            fill="none"
            viewBox="0 0 12 12"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M2 4l4 4 4-4" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="p-2 flex flex-col gap-3">
          <ExternalApiSection />
          <DbQuerySection />
          <WebEmbedSection />
        </div>
      )}
    </div>
  );
}

// ─── Redis Hash 탐색기 — 메인 섹션 (진입 시 자동 로드) ─────────────────────
function RedisHashSection() {
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState('');
  // 필드명(SUM_CONN_CNT 등) 검색 색인 — 서버가 해시키 목록과 같은 시점(기동/새로고침)에 미리 계산해
  // 둔 컬럼명 캐시를 그대로 받아온다. 이전엔 클라이언트가 검색 시작 시 해시키 개수만큼 엔트리를 직접
  // 병렬 조회해 색인을 만들었는데, 키가 많을 때 한꺼번에 수십~수백 개 요청이 나가 페이지 전체가
  // 느려지는 문제가 있어 서버 캐시 방식으로 교체.
  const { data: fieldIndex = {} } = useGetRedisHashColumns();

  const { data: hashKeys = [], isLoading: keysLoading } = useGetRedisHashKeys({
    queryOptions: { enabled: true },
  });
  const { mutate: refreshHashKeys, isPending: isRefreshing } = useRefreshRedisHashKeys();

  // application-redis-key-map.yml(BE RedisKeyMapper) 로드 결과 — IC 계열 키의 실제 형태/필드 구조
  // 메타데이터. 로딩 중/에러면 빈 defs로 안전 폴백(트리는 collapse 없이 평평하게 보임).
  const { data: redisKeyDefs } = useGetRedisKeyDefinitions();
  const defs: RedisKeyDefinitionsResponse = redisKeyDefs ?? { mediaType: {}, prefixMap: {}, keyDefinitions: {} };

  // "데이터소스 관리"에 IC:{엔티티}:{mediaType} 기본 해시(IC:GROUP:0 등)를 등록해둔 엔티티ID 리스트(있으면)
  // — 트리에서 접힌 노드(예: IC:AGENT/IC:GROUP:REASON/IC:SKILL:REASON)의 대표 미리보기·siblings 순서를
  // Redis 스캔 캐시의 임의 순서 대신 이 등록된 목록 기준으로 정확하게 맞춘다. groupId 하나만이 아니라
  // 등록된 모든 엔티티(스킬 등)에 대해 일반적으로 동작 — 등록이 없는 엔티티는 스캔 순서 그대로 폴백한다.
  const { data: dbQueryDefsForOrder = [] } = useGetDbQueryDefList();
  const entityDbQueryIdByPrefix = useMemo(() => findEntitySelectionDbQueryIdsByPrefix(dbQueryDefsForOrder), [dbQueryDefsForOrder]);
  const dbQueryIdByVarName = useMemo(() => {
    const map = new Map<string, number>();
    for (const [prefix, id] of entityDbQueryIdByPrefix) map.set(deriveEntityIdPlaceholderName(prefix), id);
    return map;
  }, [entityDbQueryIdByPrefix]);
  const orderDbQueryIds = useMemo(() => [...new Set(dbQueryIdByVarName.values())], [dbQueryIdByVarName]);
  const orderOptionsResults = useGetDbQueryDefOptionsMulti(orderDbQueryIds);
  const registeredIdOrderByVarName = useMemo(() => {
    const result: Record<string, string[] | null> = {};
    for (const [varName, dbQueryId] of dbQueryIdByVarName) {
      const idx = orderDbQueryIds.indexOf(dbQueryId);
      const r = orderOptionsResults[idx];
      result[varName.toLowerCase()] = !r || r.isLoading ? null : extractNameValueItems(r.data ?? []).map((i) => i.id);
    }
    return result;
  }, [dbQueryIdByVarName, orderDbQueryIds, orderOptionsResults]);

  // IC 계열: YAML에 등록된 모든 템플릿 변수(groupId/skillId/mediatype 등) 세그먼트를 숨기지 않고
  // `{groupid}`/`{mediatype}` 같은 토큰으로 마스킹해 트리에 표시 — 실제 값 대신 토큰을 보여주되
  // (maskEntitySegment), 여러 라이브 groupId·mediatype이 하나의 트리 노드로 묶이는 그룹핑은 유지된다
  // (토큰 문자열은 실제 값과 무관하게 동일하므로). 2026-07-10부터 mediatype도 마스킹 대상 — IC:CTIQ:0/10
  // 같은 단일변수 패턴도 하나의 노드로 합쳐지고, 드래그 시 실제 존재하는 미디어타입 전체를 합산한다.
  const { icActualKeyMap, treeHashKeys } = useMemo(() => {
    const map = new Map<string, string[]>();
    const varNameByMasked = new Map<string, string>();
    const seen = new Set<string>();
    const treeKeys: string[] = [];
    for (const key of hashKeys) {
      const masked = maskEntitySegment(key, defs);
      if (masked !== null) {
        const list = map.get(masked) ?? [];
        list.push(key);
        map.set(masked, list);
        if (!varNameByMasked.has(masked)) {
          const varName = collapseIcVariableSegment(key, defs)?.varName;
          if (varName) varNameByMasked.set(masked, varName);
        }
        if (!seen.has(masked)) {
          seen.add(masked);
          treeKeys.push(masked);
        }
      } else {
        if (!seen.has(key)) {
          seen.add(key);
          treeKeys.push(key);
        }
      }
    }
    // 등록된 엔티티ID 리스트가 있으면, 대표 미리보기(map[..][0])와 siblings 순서를 그 리스트 기준(등록된
    // 엔티티만, 등록 순서)으로 재정렬한다 — 필터링 결과가 0건이면(예: 스캔 캐시가 아직 새로고침 전이라
    // 등록된 엔티티의 실제 키를 못 찾은 경우) "많이 보이는 쪽" 폴백으로 원래 스캔 순서를 그대로 둔다.
    for (const [masked, list] of map) {
      const varName = varNameByMasked.get(masked);
      const order = varName ? registeredIdOrderByVarName[varName.toLowerCase()] : null;
      if (!order) continue;
      const orderIndex = new Map(order.map((id, i) => [id, i]));
      const reordered = list
        .filter((k) => orderIndex.has(extractIcGroupIdSegment(k, defs) ?? ''))
        .sort((a, b) => (orderIndex.get(extractIcGroupIdSegment(a, defs) ?? '') ?? 0) - (orderIndex.get(extractIcGroupIdSegment(b, defs) ?? '') ?? 0));
      if (reordered.length > 0) map.set(masked, reordered);
    }
    return { icActualKeyMap: map, treeHashKeys: treeKeys };
  }, [hashKeys, defs, registeredIdOrderByVarName]);

  // fieldIndex도 마스킹된 키 기준으로 재매핑 — 검색 시 IC:AGENT:{groupid}:0 같은 마스킹 노드에서도 컬럼명이 매칭되도록
  const collapsedFieldIndex = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const [key, columns] of Object.entries(fieldIndex)) {
      const masked = maskEntitySegment(key, defs);
      const indexKey = masked ?? key;
      result[indexKey] = [...new Set([...(result[indexKey] ?? []), ...columns])];
    }
    return result;
  }, [fieldIndex, defs]);

  const tree = treeHashKeys.length > 0 ? groupRedisKeys(treeHashKeys, '', 0) : [];
  const isLoading = keysLoading || isRefreshing;
  const filteredTree = filterRedisTree(tree, search, collapsedFieldIndex);

  return (
    <RedisKeyDefsContext.Provider value={defs}>
      <IcActualKeyContext.Provider value={icActualKeyMap}>
        <div className="flex flex-col">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isLoading ? 'bg-rose-300 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-semibold text-slate-700">Redis</span>
              {!isLoading && hashKeys.length > 0 && <span className="text-[9px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full font-mono">{hashKeys.length}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => refreshHashKeys()}
                disabled={isRefreshing}
                title="새로고침 (Redis에서 해시 키 목록 다시 조회)"
                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors text-xs font-bold disabled:opacity-50"
              >
                <span className={isRefreshing ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
              </button>
              <button
                onClick={() => setIsOpen((v) => !v)}
                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
                  fill="none"
                  viewBox="0 0 12 12"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>
            </div>
          </div>

          {/* 로딩 바 */}
          {isLoading && (
            <>
              <style>{`@keyframes redis-loading-slide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
              <div className="h-0.5 flex-shrink-0 bg-rose-100 overflow-hidden">
                <div className="h-full w-1/4 bg-rose-400 rounded-full" style={{ animation: 'redis-loading-slide 1.1s ease-in-out infinite' }} />
              </div>
            </>
          )}

          {/* 검색 — 키 경로뿐 아니라 SUM_CONN_CNT 같은 필드명으로도 찾을 수 있다 */}
          {isOpen && !isLoading && hashKeys.length > 0 && (
            <div className="px-2 pt-1.5 pb-1 flex-shrink-0">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="키/필드명 검색 (예: SUM_CONN_CNT)"
                  className="w-full pl-6 pr-2 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:border-rose-300 bg-slate-50"
                />
              </div>
            </div>
          )}

          {/* 트리 */}
          {isOpen && (
            <div className="py-1">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8">
                  <Spinner variant="circle" size={20} className="text-rose-400" />
                  <span className="text-[10px] text-slate-400">불러오는 중...</span>
                </div>
              ) : filteredTree.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-300 text-lg">∅</span>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">{search.trim() ? '검색 결과가 없습니다' : 'Hash 타입 키가 없습니다'}</p>
                </div>
              ) : (
                filteredTree.map((node) => <RedisTreeNode key={node.label} node={node} depth={0} forceExpand={!!search.trim()} />)
              )}
            </div>
          )}
        </div>
      </IcActualKeyContext.Provider>
    </RedisKeyDefsContext.Provider>
  );
}

// ─── 공지 키 선택 패널 (속성 패널용) ─────────────────────────────────────────
function NoticeKeyPanel({ noticeKey, onChange }: { noticeKey?: string; onChange: (key: string | undefined) => void }) {
  const { data: notices } = useGetNoticeList();
  const uniqueKeys = Array.from(new Set((notices ?? []).map((n) => n.noticeKey)));

  return (
    <select
      value={noticeKey ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#0f5b9e]"
    >
      <option value="">전체 공지</option>
      {uniqueKeys.map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </select>
  );
}

// ─── 위젯이 어떤 데이터를 바라보는지 — 우측 패널 X/Y/W/H 아래 표시용 경로 문자열 ──────
// 예: Redis 해시키 > IC > CTIQ > SUM_DENY_CNT
function getWidgetDataSourcePath(item: CallDataItem): string | null {
  if (item.category === 'Redis' && item.redisHashKey) {
    const parts = [...item.redisHashKey.split(':'), item.redisField, item.redisJsonField].filter((v): v is string => !!v);
    return ['Redis 해시키', ...parts].join(' > ');
  }
  if (item.category === 'Calc') return '계산식 위젯';
  if (item.category === 'notice') return item.noticeId ? `공지사항 > #${item.noticeId}` : '공지사항 > 키 선택형';
  if (item.category === 'etc') return `기타 > 시계 > ${item.label}`;
  if (item.category === 'ExternalApi') return item.externalApiUrl ? `외부 API > ${item.externalApiUrl}` : '외부 API';
  if (item.category === 'DbQuery') return `DB Query > ${item.dbQueryKey ?? '?'}${item.dbQueryColumn ? ` > ${item.dbQueryColumn}` : ''}`;
  if (item.category === 'WebEmbed') return item.webEmbedUrl ? `웹 임베드 > ${item.webEmbedUrl}` : '웹 임베드';
  // 테이블/차트 위젯은 단일 redisHashKey가 아니라 위젯의 미디어타입(item.mediaType) 설정에 따라
  // 실행 시점에 IC:XXX:{미디어타입} 해시를 구독한다 — 어느 미디어타입을 보는지 같이 표기한다.
  if (item.id === 'table-queue' || item.id === 'chart-bar-queue' || item.id === 'chart-line-trend') {
    return `리스트 위젯 > ${item.label} (Redis 해시키 > IC > CTIQ > ${item.mediaType ?? '0'})`;
  }
  if (item.id === 'table-group') {
    return `리스트 위젯 > ${item.label} (Redis 해시키 > IC > GROUP > ${item.mediaType ?? '0'})`;
  }
  if (item.id === 'table-agent') {
    return `리스트 위젯 > ${item.label} (Redis 해시키 > IC > AGENT > {그룹ID} > ${item.mediaType ?? '0'})`;
  }
  if (item.displayType === 'table') return `리스트 위젯 > ${item.label}`;
  if (item.displayType === 'chart') return `차트 위젯 > ${item.label}`;
  return null;
}

// ─── 위젯 콘텐츠 (공유) ──────────────────────────────────────────────────────
const ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime', 'etc-custom']);

/** 웹임베드/공지사항/시계 위젯 — 계산식이 참조할 수 있는 단일 값이 아니므로 "🔗 계산식" 변수 연결에서 제외 */
function isCalcRefExcludedWidget(widget: DroppedWidget): boolean {
  return isWebEmbedWidget(widget) || isAnnouncementWidget(widget) || (widget.item.category === 'etc' && ETC_CLOCK_IDS.has(widget.item.id));
}

function WidgetContent({ widget, widgets, redisWsData }: { widget: DroppedWidget; widgets: DroppedWidget[]; redisWsData: CtiWsDataByHashKey }) {
  const isEtcClock = widget.item.category === 'etc' && ETC_CLOCK_IDS.has(widget.item.id);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!isEtcClock) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [isEtcClock]);

  const getLiveValue = (): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = now.getFullYear();
    const mo = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const h = pad(now.getHours());
    const mi = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    if (widget.item.id === 'etc-date') return `${y}${mo}${d}`;
    if (widget.item.id === 'etc-time') return `${h}${mi}${s}`;
    if (widget.item.id === 'etc-datetime') return `${y}${mo}${d} ${h}:${mi}:${s}`;
    if (widget.item.id === 'etc-custom') return formatCustomClock(now, widget.clockFormat ?? DEFAULT_CUSTOM_CLOCK_FORMAT);
    return String(widget.item.sampleValue);
  };

  const isTable = widget.item.displayType === 'table';
  const isCalc = widget.item.category === 'Calc';
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const displayValue = isEtcClock ? getLiveValue() : isCalc ? getCalcDisplayValue(widget, widgets) : widget.item.sampleValue;
  const animKey = useValueChangeKey(displayValue);

  const isChart = widget.item.displayType === 'chart';
  // 차트 전환은 redis 여부보다 먼저 확인 — table-redis 위젯도 "표시 방식"을 차트로 바꿀 수 있어야 함
  // table-redis는 표/차트 전환 모두 RedisTableWidget 내부에서 처리(실데이터 fetch가 거기 있어서)
  if (isRedisTableWidget(widget)) return <RedisTableWidget widget={widget} editable dataByHashKey={redisWsData} />;
  if (isChart) return <ChartWidget widget={widget} />;
  if (isTable) return <TableWidget widget={widget} />;
  if (isAnnouncementWidget(widget)) return <AnnouncementWidget widget={widget} />;
  if (isWebEmbedWidget(widget)) return <WebEmbedWidget widget={widget} editable />;

  const thresholdColor = getThresholdColor(displayValue, widget.style);

  return (
    <>
      {showTitle && (
        <div
          className="truncate mb-0.5 opacity-80 leading-tight"
          style={{ fontSize: '0.65em', textAlign: widget.style.titleAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
        >
          {displayTitle}
        </div>
      )}
      {/* 하이라이트 모션은 텍스트 div가 아니라 위젯 박스 전체(가장 가까운 position 조상 = 캔버스 위젯
          루트 div)를 덮는 오버레이로 그려서, 값 위치 세밀조정(valueOffsetX/Y)으로 텍스트가 어디로 이동해
          있어도 사용자가 정한 위젯 영역 전체에 배경색이 채워지게 한다. */}
      {widget.style.valueChangeAnimation === 'highlight' && (
        <div key={`hl-${animKey}`} className="absolute inset-0 pointer-events-none tb-anim-highlight" style={getValueAnimationStyle(widget.style)} />
      )}
      <div
        key={animKey}
        className={`leading-tight truncate flex items-baseline gap-1 ${widget.style.valueChangeAnimation !== 'highlight' ? getValueAnimationClass(widget.style.valueChangeAnimation) : ''}`}
        style={{
          textAlign: widget.style.valueAlign ?? 'left',
          justifyContent: ALIGN_TO_JUSTIFY[widget.style.valueAlign ?? 'left'],
          fontFamily: widget.style.fontFamily,
          fontWeight: widget.style.fontWeight ?? 'normal',
          color: thresholdColor,
          ...getValueOffsetStyle(widget.style),
          ...(widget.style.valueChangeAnimation !== 'highlight' ? getValueAnimationStyle(widget.style) : {}),
        }}
      >
        {formatWidgetValue(displayValue, widget.style.useThousandSep)}
        {isCalc && widget.calc?.showPercent && (
          <span className="font-normal opacity-70" style={{ fontSize: `${widget.calc?.percentFontScale ?? 0.65}em` }}>
            %
          </span>
        )}
        {widget.item.unit && (
          <span className="font-normal opacity-70" style={{ fontSize: '0.65em' }}>
            {widget.item.unit}
          </span>
        )}
      </div>
    </>
  );
}

// ─── 위젯 참조 드래그 핸들 — 계산식 위젯의 변수에 캔버스 위젯을 연결할 때 사용 ──────────
// WidgetActionsMenu 드롭다운 내부의 메뉴 행 형태로 렌더(드롭다운 자체가 조건부 마운트라 항상 보임).
function WidgetRefHandle({ widgetId, label }: { widgetId: string; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `widget-ref-${widgetId}`,
    data: { type: 'widget-ref', widgetId, label } satisfies DragInfo,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      className={`flex items-center gap-2 h-8 px-3 text-[11px] text-violet-600 hover:bg-violet-50 text-left w-full cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
      title="계산식 위젯의 변수로 드래그하여 연결"
    >
      <span>🔗</span> 계산식
    </button>
  );
}

// 구역(섹션) 알파벳 순서 — A부터 Z까지 자동증가
const ALL_SECTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// 구역 배정을 지원하는 위젯 item.id 목록 — Redis/테이블/그룹별이석사유 계열만
const SECTION_CAPABLE_IDS = new Set(['table-redis', 'table-queue', 'table-agent', 'table-group', 'table-join', 'table-group-reason', 'value-group-reason']);

// 구역 배정 가능 여부 — 프리셋 item.id(큐/그룹/상담사 테이블 등)뿐 아니라, category==='Redis'인
// 위젯은 전부 포함한다(Redis 트리에서 낱개로 드래그한 단일값 위젯도 예외 없이).
function isSectionCapableWidget(widget: DroppedWidget): boolean {
  return SECTION_CAPABLE_IDS.has(widget.item.id) || widget.item.category === 'Redis';
}

// ─── 위젯 옵션 메뉴 — 마우스온 시 팝오버로 복사/삭제/계산식 변수 드래그를 모아 보여줌 ──────────
// 위젯 자체가 backdrop-blur(필터)+overflow:hidden이라 absolute로 띄우면 위젯 박스 밖으로 못 나가
// 작은 위젯에서 팝오버가 잘리는 문제가 있었음 — document.body에 포탈로 띄워 완전히 빠져나가게 한다.
// 팝업 하단이 뷰포트 밖으로 나갈 것 같으면 위 방향으로 뒤집어서 열린다.
// 트리거↔팝업 사이 이동 시 닫히지 않도록 150ms 딜레이 close 사용.
function WidgetActionsMenu({
  widgetId,
  label,
  showCalcRef,
  showSection,
  onDuplicate,
  onRemove,
  sections,
  currentSectionKey,
  onSectionChange,
}: {
  widgetId: string;
  label: string;
  showCalcRef: boolean;
  showSection: boolean;
  onDuplicate: () => void;
  onRemove: () => void;
  sections: string[];
  currentSectionKey?: string;
  onSectionChange: (key: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [sectionExpanded, setSectionExpanded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const POPUP_HEIGHT_ESTIMATE = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < POPUP_HEIGHT_ESTIMATE) {
        setMenuPos({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
      } else {
        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      }
    }
    setOpen(true);
  };

  // 클릭으로 열림 → 바깥(메뉴/트리거 외부) 클릭 시 닫기.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // 팝업에 표시할 구역 목록 — A,B,C는 항상 기본 표시 + 이미 추가된 구역(D,E,F...)
  const menuSections = ALL_SECTION_LETTERS.filter((l) => ['A', 'B', 'C'].includes(l) || sections.includes(l));
  // 다음에 추가 가능한 알파벳 (현재 목록에 없는 첫 글자)
  const nextLetter = ALL_SECTION_LETTERS.find((l) => !menuSections.includes(l)) ?? null;

  return (
    <div className={`absolute top-1.5 right-6 z-20 ${open ? 'block' : 'hidden group-hover:block'}`}>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
        className="w-5 h-5 bg-slate-700/90 text-white rounded text-[10px] flex items-center justify-center leading-none font-bold shadow-md backdrop-blur-sm"
        title="위젯 옵션"
      >
        ⚙
      </button>
      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-[1000] bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-52 flex flex-col tb-menu-pop-in"
            style={{ top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}
          >
            <button
              onClick={() => {
                onDuplicate();
                setOpen(false);
              }}
              className="flex items-center gap-2 h-8 px-3 text-[11px] text-slate-600 hover:bg-slate-50 text-left"
            >
              <span>⧉</span> 복사
            </button>
            <button
              onClick={() => {
                onRemove();
                setOpen(false);
              }}
              className="flex items-center gap-2 h-8 px-3 text-[11px] text-red-500 hover:bg-red-50 text-left"
            >
              <span>×</span> 삭제
            </button>
            {showCalcRef && (
              <>
                <div className="border-t border-slate-100" />
                <WidgetRefHandle widgetId={widgetId} label={label} />
              </>
            )}
            {showSection && (
              <>
                <div className="border-t border-slate-100" />
                {/* 구역 — 트리 메뉴처럼 ▶ 화살표 클릭으로 인라인 펼침 */}
                <button
                  onClick={() => setSectionExpanded((v) => !v)}
                  className="flex items-center justify-between h-8 px-3 text-[11px] text-slate-600 hover:bg-slate-50 text-left w-full"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px]">▦</span>
                    구역
                    {currentSectionKey && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[9px] font-bold">{currentSectionKey}</span>}
                  </span>
                  <span className={`text-slate-300 text-[8px] leading-none transition-transform duration-150 ${sectionExpanded ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {sectionExpanded && (
                  <div className="px-3 pb-2 pt-0.5">
                    <div className="flex flex-wrap gap-1">
                      {menuSections.map((s, idx) => {
                        const isActive = sections.includes(s); // 이 구역을 쓰는 위젯이 하나라도 있으면 활성
                        const isAssigned = currentSectionKey === s;
                        return (
                          <button
                            key={s}
                            onClick={() => onSectionChange(isAssigned ? undefined : s)}
                            title={isAssigned ? '클릭하여 배정 해제' : '클릭하여 이 위젯을 구역에 배정'}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                              isAssigned
                                ? 'bg-indigo-500 text-white'
                                : isActive
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-slate-50 text-slate-400 border border-dashed border-slate-300 hover:bg-indigo-50 hover:text-indigo-500 hover:border-indigo-300'
                            }`}
                          >
                            {idx + 1}. {s}
                          </button>
                        );
                      })}
                      {nextLetter && (
                        <button
                          onClick={() => onSectionChange(nextLetter)}
                          title={`${nextLetter} 구역에 이 위젯 배정`}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-500 hover:bg-indigo-100 border border-dashed border-indigo-300"
                        >
                          + {nextLetter}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ─── 계산식 위젯 변수(operand) 집계 방식 선택 — source(Redis 직접 참조)에 hashSiblingKeys가 있을 때만 표시 ──
const OPERAND_AGGREGATION_OPTIONS = [
  { label: '없음', value: 'none' as const },
  { label: '∑', value: 'sum' as const },
  { label: '↑', value: 'max' as const },
  { label: '↓', value: 'min' as const },
  { label: '⌀', value: 'avg' as const },
];

// ─── 계산식 위젯 변수(operand) 바인딩 영역 — 🔗 드래그 핸들 / 좌측 Redis 항목의 드롭 타겟 ────────────
function CalcOperandDropZone({
  calcWidgetId,
  operand,
  label,
  onRemove,
  onAggregationChange,
}: {
  calcWidgetId: string;
  operand: CalcOperand;
  label?: string;
  onRemove: () => void;
  onAggregationChange: (aggregation: 'none' | 'sum' | 'max' | 'min' | 'avg') => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `calc-operand-${calcWidgetId}-${operand.var}` });
  const siblingCount = operand.source?.hashSiblingKeys?.length ?? 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 flex items-center justify-center rounded bg-violet-100 text-violet-600 text-[10px] font-bold flex-shrink-0">{operand.var}</span>
        <div
          ref={setNodeRef}
          className={`flex-1 min-w-0 h-7 flex items-center px-2 rounded border text-[10px] truncate transition-colors ${
            isOver ? 'border-[#0f5b9e] bg-[#0f5b9e]/10' : label ? 'border-slate-200 bg-white text-slate-700' : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
          }`}
        >
          {label ?? '🔗 위젯 또는 Redis 항목을 여기로 드래그'}
        </div>
        <button
          onClick={onRemove}
          className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-bold"
          title="변수 삭제"
        >
          ×
        </button>
      </div>
      {siblingCount > 0 && (
        <div className="flex items-center gap-1 pl-[26px]">
          <span className="text-[9px] text-slate-400 flex-shrink-0">집계({siblingCount}개 키)</span>
          <div className="flex gap-1">
            {OPERAND_AGGREGATION_OPTIONS.map(({ label: aggLabel, value }) => (
              <button
                key={value}
                onClick={() => onAggregationChange(value)}
                className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold transition-colors ${
                  (operand.aggregation ?? 'none') === value ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                }`}
              >
                {aggLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 테이블 컬럼 계산식 변수 바인딩 영역 — 좌측 Redis 항목을 드래그하면 "같은 행"의 필드명으로 설정 ──
function TableColCalcOperandDropZone({ widgetId, colKey, operand, onRemove }: { widgetId: string; colKey: string; operand: TableColumnCalcOperand; onRemove: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `table-col-operand-${widgetId}__${colKey}__${operand.var}` });

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-5 h-5 flex items-center justify-center rounded bg-violet-100 text-violet-600 text-[10px] font-bold flex-shrink-0">{operand.var}</span>
      <div
        ref={setNodeRef}
        className={`flex-1 min-w-0 h-7 flex items-center px-2 rounded border text-[10px] truncate font-mono transition-colors ${
          isOver ? 'border-[#0f5b9e] bg-[#0f5b9e]/10' : operand.field ? 'border-slate-200 bg-white text-slate-700' : 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
        }`}
      >
        {operand.field ?? '🔗 같은 행의 필드를 여기로 드래그'}
      </div>
      <button
        onClick={onRemove}
        className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 text-xs font-bold"
        title="변수 삭제"
      >
        ×
      </button>
    </div>
  );
}

// ─── 자유 모드 캔버스 위젯 ───────────────────────────────────────────────────
interface CanvasWidgetFreeProps {
  widget: DroppedWidget;
  widgets: DroppedWidget[];
  isSelected: boolean;
  locked: boolean;
  onSelect: (shiftKey: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onDragStart: (widgetId: string, e: React.PointerEvent) => void;
  onResizeStart: (widgetId: string, clientX: number, clientY: number, handle: ResizeHandle) => void;
  fontScale?: number;
  redisWsData: CtiWsDataByHashKey;
  sections: string[];
  onSectionChange: (key: string | undefined) => void;
}

function CanvasWidgetFree({
  widget,
  widgets,
  isSelected,
  locked,
  onSelect,
  onRemove,
  onDuplicate,
  onDragStart,
  onResizeStart,
  fontScale = 1,
  redisWsData,
  sections,
  onSectionChange,
}: CanvasWidgetFreeProps) {
  const w = widget.w ?? DEFAULT_W;
  const h = widget.h ?? DEFAULT_H;
  const widgetIsTransparentBg = isTransparentBg(widget.style);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${widget.x}%`,
        top: `${widget.y}%`,
        width: `${w}%`,
        height: `${h}%`,
        zIndex: isSelected ? 20 : 10,
        ...getWidgetVisualStyle(widget.style, fontScale),
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      className={`group ${widgetIsTransparentBg ? '' : 'backdrop-blur-sm'} transition-colors select-none ${
        isSelected ? (locked ? 'outline outline-2 outline-amber-400' : 'outline outline-2 outline-[#0f5b9e]') : '[outline-style:dashed] outline outline-1 outline-white/30'
      }`}
    >
      {/* 위젯 옵션(톱니바퀴 → 팝오버: 복사/삭제/계산식 변수 드래그/구역 배정) — 전체 잠금 중에는 숨김 */}
      {!locked && (
        <WidgetActionsMenu
          widgetId={widget.id}
          label={widget.customTitle ?? widget.item.label}
          showCalcRef={widget.item.category !== 'Calc' && !isCalcRefExcludedWidget(widget)}
          showSection={isSectionCapableWidget(widget)}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          sections={sections}
          currentSectionKey={widget.sectionKey}
          onSectionChange={onSectionChange}
        />
      )}

      {isSelected && (
        <div className="absolute -top-5 left-0 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono z-30 pointer-events-none whitespace-nowrap leading-tight flex items-center gap-1">
          {locked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          X:{widget.x.toFixed(1)}% Y:{widget.y.toFixed(1)}% W:{w.toFixed(1)}% H:{h.toFixed(1)}%
        </div>
      )}

      <div
        className={`w-full h-full flex flex-col justify-center ${locked ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ padding: `${widget.style.paddingY ?? 8}px ${widget.style.paddingX ?? 8}px` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (locked) return;
          onDragStart(widget.id, e);
        }}
      >
        <WidgetContent widget={widget} widgets={widgets} redisWsData={redisWsData} />
      </div>

      {!locked && (
        <>
          {/* SE 핸들 */}
          <div
            className="absolute bottom-0 right-0 w-5 h-5 flex items-center justify-center cursor-se-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(widget.id, e.clientX, e.clientY, 'se');
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M7 1L1 7M7 4L4 7M7 7H4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          {/* SW 핸들 */}
          <div
            className="absolute bottom-0 left-0 w-5 h-5 flex items-center justify-center cursor-sw-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(widget.id, e.clientX, e.clientY, 'sw');
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1L7 7M1 4L4 7M1 7H4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          {/* NE 핸들 */}
          <div
            className="absolute top-0 right-0 w-5 h-5 flex items-center justify-center cursor-ne-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(widget.id, e.clientX, e.clientY, 'ne');
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M7 7L1 1M7 4L4 1M7 1H4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          {/* NW 핸들 */}
          <div
            className="absolute top-0 left-0 w-5 h-5 flex items-center justify-center cursor-nw-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ touchAction: 'none' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(widget.id, e.clientX, e.clientY, 'nw');
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 7L7 1M1 4L4 1M1 1H4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

// ─── 그리드 모드 캔버스 위젯 ─────────────────────────────────────────────────
interface CanvasWidgetGridProps {
  widget: DroppedWidget;
  widgets: DroppedWidget[];
  isSelected: boolean;
  locked: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  fontScale?: number;
  redisWsData: CtiWsDataByHashKey;
  sections: string[];
  onSectionChange: (key: string | undefined) => void;
}

function CanvasWidgetGrid({ widget, widgets, isSelected, locked, onSelect, onRemove, onDuplicate, fontScale = 1, redisWsData, sections, onSectionChange }: CanvasWidgetGridProps) {
  const w = widget.w ?? DEFAULT_W;
  const h = widget.h ?? DEFAULT_H;
  const widgetIsTransparentBg = isTransparentBg(widget.style);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        ...getWidgetVisualStyle(widget.style, fontScale),
      }}
      className={`group ${widgetIsTransparentBg ? '' : 'backdrop-blur-sm'} transition-colors select-none ${
        isSelected ? (locked ? 'outline outline-2 outline-amber-400' : 'outline outline-2 outline-[#0f5b9e]') : '[outline-style:dashed] outline outline-1 outline-white/30'
      }`}
    >
      {/* 위젯 옵션(톱니바퀴 → 팝오버: 복사/삭제/계산식 변수 드래그/구역 배정) — 전체 잠금 중에는 숨김 */}
      {!locked && (
        <WidgetActionsMenu
          widgetId={widget.id}
          label={widget.customTitle ?? widget.item.label}
          showCalcRef={widget.item.category !== 'Calc' && !isCalcRefExcludedWidget(widget)}
          showSection={isSectionCapableWidget(widget)}
          onDuplicate={onDuplicate}
          onRemove={onRemove}
          sections={sections}
          currentSectionKey={widget.sectionKey}
          onSectionChange={onSectionChange}
        />
      )}

      {isSelected && (
        <div className="absolute -top-5 left-0 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono z-[3] pointer-events-none whitespace-nowrap leading-tight flex items-center gap-1">
          {locked && <Lock className="w-2.5 h-2.5 text-amber-400" />}
          X:{widget.x.toFixed(1)}% Y:{widget.y.toFixed(1)}% W:{w.toFixed(1)}% H:{h.toFixed(1)}%
        </div>
      )}

      <div
        className={`${locked ? '' : 'drag-handle cursor-grab active:cursor-grabbing'} w-full h-full flex flex-col justify-center`}
        style={{ padding: `${widget.style.paddingY ?? 8}px ${widget.style.paddingX ?? 8}px` }}
      >
        <WidgetContent widget={widget} widgets={widgets} redisWsData={redisWsData} />
      </div>
    </div>
  );
}

// ─── 드롭 가능한 캔버스 보드 ─────────────────────────────────────────────────
interface DroppableBoardProps {
  children: React.ReactNode;
  fileName: string;
  pageName: string;
  layoutMode: LayoutMode;
  onClickCanvas: () => void;
  gridLayout?: RglItem[];
  containerWidth?: number;
  rowHeight?: number;
  gridMargin?: [number, number];
  containerPadding?: [number, number];
  onLayoutChange?: (layout: RglLayout) => void;
  onImageLoad?: (naturalWidth: number, naturalHeight: number) => void;
}

function DroppableBoard({
  children,
  fileName,
  pageName,
  layoutMode,
  onClickCanvas,
  gridLayout,
  containerWidth,
  rowHeight,
  gridMargin,
  containerPadding,
  onLayoutChange,
  onImageLoad,
}: DroppableBoardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'board-canvas' });
  const margin = gridMargin ?? [0, 0];
  const padding = containerPadding ?? [0, 0];

  return (
    <div
      ref={setNodeRef}
      onClick={onClickCanvas}
      className={`relative w-full h-full rounded-xl overflow-hidden border-2 transition-all ${isOver ? 'border-[#0f5b9e] ring-2 ring-[#0f5b9e]/30' : 'border-slate-300'}`}
    >
      {fileName ? (
        <img
          src={fileName}
          alt={pageName}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          onLoad={(e) => onImageLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
          <span className="text-slate-500 text-sm">배경 이미지 없음</span>
        </div>
      )}

      {isOver && (
        <div className="absolute inset-0 bg-[#0f5b9e]/10 flex items-center justify-center pointer-events-none z-50">
          <span className="bg-[#0f5b9e] text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">여기에 드랍</span>
        </div>
      )}

      {layoutMode === 'free' && (
        <div className="absolute inset-0" style={{ padding: `${padding[1]}px ${padding[0]}px` }}>
          {children}
        </div>
      )}

      {layoutMode === 'grid' && gridLayout && onLayoutChange && (
        <div className="absolute inset-0">
          <ReactGridLayout
            layout={gridLayout}
            width={containerWidth && containerWidth > 0 ? containerWidth : 1024}
            gridConfig={{
              cols: GRID_COLS,
              rowHeight: rowHeight ?? 30,
              margin: margin as readonly [number, number],
              containerPadding: padding as readonly [number, number],
              maxRows: GRID_ROWS,
            }}
            dragConfig={{ enabled: true, handle: '.drag-handle' }}
            resizeConfig={{ enabled: true, handles: ['se', 'sw', 'ne', 'nw'] as const }}
            compactor={getCompactor(null, false, true)}
            onDragStop={(layout) => {
              onLayoutChange(layout);
            }}
            onResizeStop={(layout) => {
              onLayoutChange(layout);
            }}
          >
            {children}
          </ReactGridLayout>
        </div>
      )}
    </div>
  );
}

// ─── 좌/우 패널 폭 조절 ───────────────────────────────────────────────────────
// 편집 세션 보조값이라 레이아웃(layoutJson) 저장 대상이 아니라 localStorage로 브라우저에 유지한다.
const LS_LEFT_PANEL_WIDTH = 'tb-taskcreate-left-panel-w';
const LS_RIGHT_PANEL_WIDTH = 'tb-taskcreate-right-panel-w';
const LEFT_PANEL_MIN = 200;
const LEFT_PANEL_MAX = 480;
const RIGHT_PANEL_MIN = 240;
const RIGHT_PANEL_MAX = 560;

function readPanelWidth(key: string, fallback: number): number {
  const raw = Number(localStorage.getItem(key));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/**
 * 좌/우 패널과 캔버스 사이의 세로 리사이저 핸들. side='left'는 오른쪽으로 끌수록, side='right'는
 * 왼쪽으로 끌수록 패널이 넓어진다. min/max로 폭을 제한한다. onResize는 안정 참조(state setter)를 넘길 것.
 */
function PanelResizer({ side, width, min, max, onResize }: { side: 'left' | 'right'; width: number; min: number; max: number; onResize: (w: number) => void }) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      const delta = e.clientX - drag.startX;
      const next = Math.max(min, Math.min(max, drag.startWidth + (side === 'left' ? delta : -delta)));
      onResize(next);
    };
    const handleUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [side, min, max, onResize]);

  const handleDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      onPointerDown={handleDown}
      title="드래그하여 패널 너비 조절"
      className="flex-shrink-0 w-1 self-stretch cursor-col-resize bg-slate-200 hover:bg-[#0f5b9e] active:bg-[#0f5b9e] transition-colors relative z-20"
    >
      {/* 실제 클릭 히트영역을 핸들 양옆으로 넓혀 얇은 선도 쉽게 잡히게 한다 */}
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}

// ─── TaskCreate (메인) ────────────────────────────────────────────────────────
export default function TaskCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const state = location.state as { bg?: TaskboardBg; layout?: TaskboardLayout } | null;
  const bg = state?.bg;
  const layout = state?.layout;
  const userInfo = useAuthStore((s) => s.userInfo);
  const { guardWrite } = useTaskboardWriteGuard();
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  // 데이터 소스 관리 탭에 등록된 전체 데이터소스 목록 — 테이블 컬럼의 "이름 매핑" 드롭다운에서 고를 수 있게 제공.
  // 플레이스홀더(예: 그룹 목록 {groupId})도 VALUE/NAME 쿼리라서 이름 매핑 소스로 그대로 쓸 수 있다 —
  // 그룹ID 컬럼을 그룹명으로 바꿔 보여주는 게 정확히 이 케이스라 제외하지 않는다.
  const { data: nameLookupCandidateDefs = [] } = useGetDbQueryDefList();

  const isEditMode = !!layout?.layoutId;
  const fileName = layout?.fileName ?? bg?.fileName ?? '';

  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb([{ title: '전광판 관리' }, { title: isEditMode ? '전광판 편집' : '전광판 만들기', path: '/taskboard/board/task-create' }]);
    return () => clearBreadcrumb();
  }, [isEditMode, setBreadcrumb, clearBreadcrumb]);

  // ── 저장된 JSON에서 메타 복원 ──────────────────────────────────────────
  const savedMeta = (() => {
    try {
      if (!layout?.layoutJson) return null;
      const raw = JSON.parse(layout.layoutJson) as {
        version?: number;
        layoutMode?: LayoutMode;
        gridMargin?: [number, number];
        containerPadding?: [number, number];
        guides?: { id: string; axis: 'h' | 'v'; pct: number }[];
        showGuides?: boolean;
      };
      if (raw?.version === 2) return raw;
      return null;
    } catch {
      return null;
    }
  })();

  // ── 기본 상태 ────────────────────────────────────────────────────────────
  const [boardTitle, setBoardTitle] = useState(layout?.layoutName ?? bg?.pageName ?? '새 전광판');
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  const [colorPickingMode, setColorPickingMode] = useState<{ field: 'color' | 'bgColor'; widgetId: string } | null>(null);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [newColKey, setNewColKey] = useState('');
  const [newColLabel, setNewColLabel] = useState('');
  const [expandedColKey, setExpandedColKey] = useState<string | null>(null);
  // 배경 이미지 실제 비율 — 로드 전 기본값 16/9, onImageLoad에서 naturalWidth/naturalHeight로 갱신.
  // 하드코딩된 16/9로 고정해두면 FHD(16:9)가 아닌 이미지(예: HD 4:3 등)는 object-contain 레터박싱으로
  // 보이는 이미지 영역과 가이드라인 좌표계(컨테이너 기준 %)가 어긋나 가이드선이 위로 쏠려 보이는 원인이 됨.
  const [imageRatio, setImageRatio] = useState<string>('16/9');
  // 캔버스 확대/축소 — 순수 보기 편의 기능이라 저장하지 않음(layoutJson과 무관). CSS transform만 적용하므로
  // 위젯 드래그/리사이즈 좌표 계산(getBoundingClientRect 기반 비율 계산)과 폰트 스케일(ResizeObserver 기반)에는 영향 없음.
  const [zoom, setZoom] = useState(1);
  // 전체 잠금 — 위젯별이 아니라 캔버스 전체 단위 스위치. zoom과 동일하게 편집 세션 중 보조 토글이라 저장 대상 아님.
  const [canvasLocked, setCanvasLocked] = useState(false);
  // 좌/우 패널 폭 — 드래그로 조절, localStorage로 세션 간 유지(레이아웃 저장값 아님)
  const [leftPanelWidth, setLeftPanelWidth] = useState(() => readPanelWidth(LS_LEFT_PANEL_WIDTH, 256));
  const [rightPanelWidth, setRightPanelWidth] = useState(() => readPanelWidth(LS_RIGHT_PANEL_WIDTH, 288));
  useEffect(() => {
    localStorage.setItem(LS_LEFT_PANEL_WIDTH, String(leftPanelWidth));
  }, [leftPanelWidth]);
  useEffect(() => {
    localStorage.setItem(LS_RIGHT_PANEL_WIDTH, String(rightPanelWidth));
  }, [rightPanelWidth]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(savedMeta?.layoutMode ?? 'free');
  const [gridMargin, setGridMargin] = useState<[number, number]>(savedMeta?.gridMargin ?? [4, 4]);
  const [containerPadding, setContainerPadding] = useState<[number, number]>(savedMeta?.containerPadding ?? [0, 0]);

  // table-redis 위젯의 "시스템ID 위치(필드/키) 자동탐지" 패널에서 사용 — 이미 BE가 캐싱한 전체 해시키 목록을
  // 재사용하므로 새 SCAN 호출 없음(RedisHashSection도 같은 쿼리키를 쓰므로 react-query 캐시 공유)
  const { data: allRedisHashKeys = [] } = useGetRedisHashKeys();
  // table-redis "테이블 컬럼" 필드명 입력에 실제 존재하는 필드명을 자동완성으로 제안 — WS columns 필터가
  // 등록된 키를 그대로 서버에 보내 필터링하므로(실데이터 통신 전환 이후) 실제 필드명과 다르게 입력하면
  // 데이터가 안 보일 수 있어, 임의로 타이핑하는 대신 실제 값을 고를 수 있게 함(RedisHashSection과 같은 캐시 공유)
  const { data: redisColumnIndex = {} } = useGetRedisHashColumns();
  // 테이블 컬럼 필드명 자동완성에서 영문 필드명 → 한글 표시명(왼쪽 위젯 트리와 동일한 맵)을 보여주기 위해 로드.
  // 자동완성 option을 "한글명 위 + 영문명 아래 작은 글씨"로 렌더한다(왼쪽 위젯 항목과 동일).
  const { data: redisKeyDefsData } = useGetRedisKeyDefinitions();
  const redisKeyDefsForColumns: RedisKeyDefinitionsResponse = redisKeyDefsData ?? { mediaType: {}, prefixMap: {}, keyDefinitions: {} };

  // ── 그리드 모드 컨테이너 크기 ────────────────────────────────────────
  const [containerWidth, setContainerWidth] = useState(1024);
  const [containerHeight, setContainerHeight] = useState(576);
  const rowHeight = Math.max(1, containerHeight / GRID_ROWS);

  const { mutateAsync: createLayout, isPending: isCreating } = useCreateTaskboardLayout();
  const { mutateAsync: updateLayout, isPending: isUpdating } = useUpdateLayout();
  const isSaving = isCreating || isUpdating;

  // 이미지 비율 감지
  useEffect(() => {
    if (!fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) setImageRatio(`${img.naturalWidth}/${img.naturalHeight}`);
    };
    img.src = fileName;
  }, [fileName]);

  const initialWidgets: DroppedWidget[] = (() => {
    try {
      if (!layout?.layoutJson) return [];
      const raw = JSON.parse(layout.layoutJson) as { version?: number; widgets?: DroppedWidget[] } | DroppedWidget[];
      const widgets: DroppedWidget[] = Array.isArray(raw) ? raw : raw?.version === 2 ? (raw.widgets ?? []) : [];
      return widgets.map((w) => ({ ...w, w: w.w ?? DEFAULT_W, h: w.h ?? DEFAULT_H, showTitle: w.showTitle !== false }));
    } catch {
      return [];
    }
  })();

  const [droppedWidgets, setDroppedWidgets] = useState<DroppedWidget[]>(initialWidgets);
  // 구역(섹션)은 별도 상태로 관리하지 않고 위젯의 sectionKey에서 자동 파생한다.
  // 위젯에 A/B 구역을 배정하면 그 구역이 자동으로 활성화되고, 마지막 위젯을 빼면 자동으로 해제된다.
  const sections = ALL_SECTION_LETTERS.filter((l) => droppedWidgets.some((w) => w.sectionKey === l));

  // 캔버스의 모든 table-redis 위젯이 쓸 WS 연결 — 화면(이 컴포넌트)당 단일 소켓을 유지하기 위해 여기서
  // 한 번만 연결하고 dataByHashKey를 CanvasWidgetFree/Grid → WidgetContent → RedisTableWidget으로 prop 전달한다.
  // (각 RedisTableWidget이 자기 소켓을 따로 열면 위젯 개수만큼 ctiq 소켓이 늘어나 Network 탭에 중복으로 보임)
  const redisTableSubscriptions = collectRedisTableWsSubscriptions(droppedWidgets, allRedisHashKeys);
  const { dataByHashKey: redisWsData } = useCtiqWebSocket(redisTableSubscriptions);

  // ── Undo / Redo ──────────────────────────────────────────────────────
  const undoStack = useRef<UndoEntry[]>([]);
  const redoStack = useRef<UndoEntry[]>([]);

  const pushUndo = (widgetSnap: DroppedWidget[], guideSnap: GuideItem[]) => {
    undoStack.current = [...undoStack.current, { widgets: widgetSnap, guides: guideSnap }].slice(-50);
    redoStack.current = [];
  };

  const handleUndo = () => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    redoStack.current = [{ widgets: droppedWidgets, guides }, ...redoStack.current].slice(0, 50);
    undoStack.current = undoStack.current.slice(0, -1);
    setDroppedWidgets(prev.widgets);
    setGuides(prev.guides);
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[0];
    undoStack.current = [...undoStack.current, { widgets: droppedWidgets, guides }].slice(-50);
    redoStack.current = redoStack.current.slice(1);
    setDroppedWidgets(next.widgets);
    setGuides(next.guides);
  };

  // ── 변경사항 감지 (Dirty) ────────────────────────────────────────────
  const initialStateRef = useRef({
    widgets: JSON.stringify(initialWidgets),
    title: layout?.layoutName ?? bg?.pageName ?? '새 전광판',
  });
  const isDirty = JSON.stringify(droppedWidgets) !== initialStateRef.current.widgets || boardTitle !== initialStateRef.current.title;

  // 브라우저 새로고침/닫기 감지
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // 인앱 네비게이션 차단 (BrowserRouter는 useBlocker 미지원 → history.block 직접 사용)
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const unblockNavRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const nav = navigator as typeof navigator & {
      block?: (blocker: (tx: { retry(): void }) => void) => () => void;
    };
    if (!nav.block) return;
    if (!isDirty) {
      unblockNavRef.current?.();
      unblockNavRef.current = null;
      return;
    }
    const unblock = nav.block((tx) => {
      if (window.confirm('저장하지 않은 변경사항이 있습니다.\n페이지를 나가시겠습니까?')) {
        unblock();
        tx.retry();
      }
    });
    unblockNavRef.current = unblock;
    return () => {
      unblock();
      unblockNavRef.current = null;
    };
  }, [isDirty, navigator]);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  // Ctrl+V 붙여넣기 위치 기준 — 캔버스 위에서 마우스가 마지막으로 있던 좌표(%). 렌더를 유발할 필요가
  // 없으므로 state가 아니라 ref로 보관.
  const lastCanvasMousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = boardContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
      setContainerHeight(entry.contentRect.height);
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setContainerWidth(rect.width);
    if (rect.height > 0) setContainerHeight(rect.height);
    return () => ro.disconnect();
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── 가이드선 ─────────────────────────────────────────────────────────
  const [guides, setGuides] = useState<{ id: string; axis: 'h' | 'v'; pct: number }[]>(savedMeta?.guides ?? []);
  const [showGuides, setShowGuides] = useState(savedMeta?.showGuides ?? false);
  const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
  const [divideCount, setDivideCount] = useState(3);
  const [divideGapPx, setDivideGapPx] = useState(4);
  const [guideDragPos, setGuideDragPos] = useState<{ axis: 'h' | 'v'; pct: number; willDelete: boolean } | null>(null);
  const guideDragRef = useRef<{
    type: 'existing' | 'new';
    axis: 'h' | 'v';
    draggedGuides?: Array<{ guideId: string; startPct: number }>;
    startClientX?: number;
    startClientY?: number;
  } | null>(null);
  const guideDragPosRef = useRef<{ pct: number; willDelete: boolean } | null>(null);

  const handleRulerPointerDown = (axis: 'h' | 'v', e: React.PointerEvent) => {
    guideDragStartStateRef.current = { widgets: droppedWidgets, guides };
    guideDragRef.current = { type: 'new', axis };
    guideDragPosRef.current = null;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  };

  // ── 자유 모드: 위젯 드래그 ───────────────────────────────────────────
  const [dragCoord, setDragCoord] = useState<{ x: number; y: number } | null>(null);

  const freeDragRef = useRef<{
    widgetId: string;
    startMouseX: number;
    startMouseY: number;
    multiDragPositions: Array<{ id: string; startX: number; startY: number; w: number; h: number }>;
  } | null>(null);
  const freeDragFinalRef = useRef<{ x: number; y: number; mouseX: number; mouseY: number } | null>(null);
  const guidesStateRef = useRef({ guides, showGuides });
  guidesStateRef.current = { guides, showGuides };
  const guideDragStartStateRef = useRef<UndoEntry | null>(null);
  const lastDragOccurredRef = useRef(false);

  const handleFreeDragStart = (widgetId: string, e: React.PointerEvent) => {
    if (canvasLocked) return;
    const isInSelection = selectedWidgetIds.includes(widgetId);
    const idsToMove = isInSelection ? selectedWidgetIds : [widgetId];
    if (!isInSelection) setSelectedWidgetIds([widgetId]);
    pushUndo(droppedWidgets, guides);
    lastDragOccurredRef.current = false;
    const positions = droppedWidgets.filter((w) => idsToMove.includes(w.id)).map((w) => ({ id: w.id, startX: w.x, startY: w.y, w: w.w ?? DEFAULT_W, h: w.h ?? DEFAULT_H }));
    freeDragRef.current = {
      widgetId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      multiDragPositions: positions,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDivideArea = () => {
    if (selectedGuideIds.length !== 2) return;
    const [sg1, sg2] = selectedGuideIds.map((id) => guides.find((g) => g.id === id));
    if (!sg1 || !sg2 || sg1.axis !== sg2.axis) return;
    const axis = sg1.axis;
    const startPct = Math.min(sg1.pct, sg2.pct);
    const endPct = Math.max(sg1.pct, sg2.pct);
    const containerSizePx = axis === 'h' ? containerHeight : containerWidth;
    const gapPct = containerSizePx > 0 ? (divideGapPx / containerSizePx) * 100 : 0;
    const n = Math.max(2, divideCount);
    const totalRange = endPct - startPct;
    const cellPct = (totalRange - (n - 1) * gapPct) / n;
    if (cellPct <= 0) return;
    pushUndo(droppedWidgets, guides);
    const newGuides: { id: string; axis: 'h' | 'v'; pct: number }[] = [];
    for (let i = 1; i < n; i++) {
      const boundaryStart = startPct + i * (cellPct + gapPct) - gapPct;
      const ts = `${Date.now()}-${i}`;
      if (divideGapPx > 0) {
        newGuides.push({ id: `guide-${ts}-a`, axis, pct: boundaryStart });
        newGuides.push({ id: `guide-${ts}-b`, axis, pct: boundaryStart + gapPct });
      } else {
        newGuides.push({ id: `guide-${ts}`, axis, pct: boundaryStart });
      }
    }
    setGuides((prev) => [...prev, ...newGuides]);
  };

  // ── 자유 모드: 리사이즈 ─────────────────────────────────────────────
  const resizeStateRef = useRef<{
    widgetId: string;
    startMouseX: number;
    startMouseY: number;
    startW: number;
    startH: number;
    handle: ResizeHandle;
    startWidgetX: number;
    startWidgetY: number;
  } | null>(null);
  const resizeFinalRef = useRef<{ widgetId: string; x: number; y: number; w: number; h: number } | null>(null);

  const handleResizeStart = (widgetId: string, clientX: number, clientY: number, handle: ResizeHandle) => {
    if (canvasLocked) return;
    const widget = droppedWidgets.find((w) => w.id === widgetId);
    if (!widget) return;
    pushUndo(droppedWidgets, guides);
    resizeStateRef.current = {
      widgetId,
      startMouseX: clientX,
      startMouseY: clientY,
      startW: widget.w ?? DEFAULT_W,
      startH: widget.h ?? DEFAULT_H,
      handle,
      startWidgetX: widget.x,
      startWidgetY: widget.y,
    };
    resizeFinalRef.current = null;
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const board = boardContainerRef.current;
      if (!board) return;
      const rect = board.getBoundingClientRect();

      const guideDrag = guideDragRef.current;
      if (guideDrag) {
        if (guideDrag.type === 'new') {
          const rawPct = guideDrag.axis === 'h' ? ((e.clientY - rect.top) / rect.height) * 100 : ((e.clientX - rect.left) / rect.width) * 100;
          const willDelete = rawPct < 0 || rawPct > 100;
          const clampedPct = Math.max(0, Math.min(100, rawPct));
          guideDragPosRef.current = { pct: clampedPct, willDelete };
          setGuideDragPos({ axis: guideDrag.axis, pct: clampedPct, willDelete });
        } else if (guideDrag.type === 'existing' && guideDrag.draggedGuides) {
          const rawMousePct = guideDrag.axis === 'h' ? ((e.clientY - rect.top) / rect.height) * 100 : ((e.clientX - rect.left) / rect.width) * 100;
          const willDelete = rawMousePct < 0 || rawMousePct > 100;
          const delta =
            guideDrag.axis === 'h' ? ((e.clientY - (guideDrag.startClientY ?? 0)) / rect.height) * 100 : ((e.clientX - (guideDrag.startClientX ?? 0)) / rect.width) * 100;
          const updatedGuides = guideDrag.draggedGuides.map((d) => ({
            guideId: d.guideId,
            pct: Math.max(0, Math.min(100, d.startPct + delta)),
          }));
          guideDragPosRef.current = { pct: updatedGuides[0]?.pct ?? 0, willDelete };
          setGuideDragPos({ axis: guideDrag.axis, pct: updatedGuides[0]?.pct ?? 0, willDelete });
          setGuides((prev) =>
            prev.map((g) => {
              const found = updatedGuides.find((d) => d.guideId === g.id);
              return found ? { ...g, pct: found.pct } : g;
            }),
          );
        }
        return;
      }

      const drag = freeDragRef.current;
      if (drag) {
        const dx = ((e.clientX - drag.startMouseX) / rect.width) * 100;
        const dy = ((e.clientY - drag.startMouseY) / rect.height) * 100;
        lastDragOccurredRef.current = true;
        setDroppedWidgets((prev) =>
          prev.map((w) => {
            const pos = drag.multiDragPositions.find((p) => p.id === w.id);
            if (!pos) return w;
            return { ...w, x: Math.max(0, Math.min(99, pos.startX + dx)), y: Math.max(0, Math.min(99, pos.startY + dy)) };
          }),
        );
        const primaryPos = drag.multiDragPositions.find((p) => p.id === drag.widgetId);
        if (primaryPos) {
          const nx = Math.max(0, Math.min(99, primaryPos.startX + dx));
          const ny = Math.max(0, Math.min(99, primaryPos.startY + dy));
          setDragCoord({ x: nx, y: ny });
          freeDragFinalRef.current = {
            x: nx,
            y: ny,
            mouseX: ((e.clientX - rect.left) / rect.width) * 100,
            mouseY: ((e.clientY - rect.top) / rect.height) * 100,
          };
        }
        return;
      }

      const resize = resizeStateRef.current;
      if (resize) {
        const dx = ((e.clientX - resize.startMouseX) / rect.width) * 100;
        const dy = ((e.clientY - resize.startMouseY) / rect.height) * 100;
        const isWest = resize.handle === 'sw' || resize.handle === 'nw';
        const isNorth = resize.handle === 'ne' || resize.handle === 'nw';

        let newX = resize.startWidgetX;
        let newW = resize.startW;
        if (isWest) {
          newX = Math.max(0, resize.startWidgetX + dx);
          newW = Math.max(5, resize.startW - (newX - resize.startWidgetX));
        } else {
          newW = Math.max(5, resize.startW + dx);
        }

        let newY = resize.startWidgetY;
        let newH = resize.startH;
        if (isNorth) {
          newY = Math.max(0, resize.startWidgetY + dy);
          newH = Math.max(4, resize.startH - (newY - resize.startWidgetY));
        } else {
          newH = Math.max(4, resize.startH + dy);
        }

        setDroppedWidgets((prev) => prev.map((w) => (w.id === resize.widgetId ? { ...w, x: newX, y: newY, w: newW, h: newH } : w)));
        resizeFinalRef.current = { widgetId: resize.widgetId, x: newX, y: newY, w: newW, h: newH };
      }
    };

    const handlePointerUp = () => {
      const guideDrag = guideDragRef.current;
      if (guideDrag) {
        const pos = guideDragPosRef.current;
        if (pos) {
          if (guideDrag.type === 'new' && !pos.willDelete) {
            if (guideDragStartStateRef.current) {
              undoStack.current = [...undoStack.current, guideDragStartStateRef.current].slice(-50);
              redoStack.current = [];
            }
            setGuides((prev) => [...prev, { id: `guide-${createUUID()}`, axis: guideDrag.axis, pct: pos.pct }]);
          } else if (guideDrag.type === 'existing' && pos.willDelete && guideDrag.draggedGuides) {
            if (guideDragStartStateRef.current) {
              undoStack.current = [...undoStack.current, guideDragStartStateRef.current].slice(-50);
              redoStack.current = [];
            }
            const deleteIds = new Set(guideDrag.draggedGuides.map((d) => d.guideId));
            setGuides((prev) => prev.filter((g) => !deleteIds.has(g.id)));
            setSelectedGuideIds((prev) => prev.filter((id) => !deleteIds.has(id)));
          } else if (guideDrag.type === 'existing' && !pos.willDelete && guideDrag.draggedGuides) {
            // 가이드 이동 — 드래그 시작 시점 상태로 undo 등록
            if (guideDragStartStateRef.current) {
              undoStack.current = [...undoStack.current, guideDragStartStateRef.current].slice(-50);
              redoStack.current = [];
            }
          }
        }
        guideDragStartStateRef.current = null;
        guideDragRef.current = null;
        guideDragPosRef.current = null;
        setGuideDragPos(null);
      }
      const drag = freeDragRef.current;
      const finalPos = freeDragFinalRef.current;
      if (drag && finalPos && drag.multiDragPositions.length === 1) {
        const { guides: gs, showGuides: sg } = guidesStateRef.current;
        const cx = finalPos.mouseX;
        const cy = finalPos.mouseY;
        const snapped = snapToGuideCell(cx, cy, gs, sg);
        if (snapped) {
          setDroppedWidgets((prev) => prev.map((w) => (w.id === drag.widgetId ? { ...w, ...snapped } : w)));
        }
      }
      const resizeHandle = resizeStateRef.current?.handle;
      const finalResize = resizeFinalRef.current;
      if (finalResize && resizeHandle) {
        const { guides: gs, showGuides: sg } = guidesStateRef.current;
        const snapped = snapResizeToGuides(finalResize.x, finalResize.y, finalResize.w, finalResize.h, resizeHandle, gs, sg);
        if (snapped.x !== finalResize.x || snapped.w !== finalResize.w || snapped.h !== finalResize.h) {
          setDroppedWidgets((prev) => prev.map((w) => (w.id === finalResize.widgetId ? { ...w, ...snapped } : w)));
        }
      }
      resizeFinalRef.current = null;
      freeDragFinalRef.current = null;
      freeDragRef.current = null;
      resizeStateRef.current = null;
      setDragCoord(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // ── 그리드 모드: 레이아웃 변경 ──────────────────────────────────────
  const handleGridLayoutChange = (newLayout: RglLayout) => {
    pushUndo(droppedWidgets, guides);
    setDroppedWidgets((prev) =>
      prev.map((widget) => {
        const item = newLayout.find((l) => l.i === widget.id);
        if (!item) return widget;
        const clampedH = Math.max(1, Math.min(GRID_ROWS, item.h));
        const clampedW = Math.max(1, Math.min(GRID_COLS, item.w));
        const clampedY = Math.max(0, Math.min(GRID_ROWS - clampedH, item.y));
        const clampedX = Math.max(0, Math.min(GRID_COLS - clampedW, item.x));
        return { ...widget, ...fromGridItem({ ...item, x: clampedX, y: clampedY, w: clampedW, h: clampedH }) };
      }),
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragInfo);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    const info = active.data.current as DragInfo;

    // 계산식 위젯의 변수(operand) 바인딩 영역에 드롭 — 🔗 위젯 참조 또는 좌측 팔레트의 Redis 항목 모두 지원
    if (typeof over?.id === 'string' && over.id.startsWith('calc-operand-')) {
      const rest = over.id.slice('calc-operand-'.length);
      const sepIdx = rest.lastIndexOf('-');
      const calcWidgetId = rest.slice(0, sepIdx);
      const varName = rest.slice(sepIdx + 1);

      // 🔗 드래그 핸들 → 캔버스에 배치된 위젯을 변수로 연결
      if (info.type === 'widget-ref') {
        if (calcWidgetId === info.widgetId) return;
        pushUndo(droppedWidgets, guides);
        setDroppedWidgets((prev) =>
          prev.map((w) =>
            w.id === calcWidgetId && w.calc
              ? { ...w, calc: { ...w.calc, operands: w.calc.operands.map((op) => (op.var === varName ? { var: op.var, widgetId: info.widgetId } : op)) } }
              : w,
          ),
        );
        return;
      }

      // 좌측 팔레트의 Redis 항목 → 캔버스 배치 없이 직접 변수로 연결
      if (info.type === 'source' && info.item.category === 'Redis' && info.item.redisHashKey) {
        pushUndo(droppedWidgets, guides);
        setDroppedWidgets((prev) =>
          prev.map((w) =>
            w.id === calcWidgetId && w.calc
              ? { ...w, calc: { ...w.calc, operands: w.calc.operands.map((op) => (op.var === varName ? { var: op.var, source: info.item, aggregation: 'none' } : op)) } }
              : w,
          ),
        );
      }
      return;
    }

    // 테이블 컬럼 계산식의 변수(operand) 바인딩 영역에 드롭 — 좌측 Redis 항목을 "같은 행"의 필드명으로 연결
    if (typeof over?.id === 'string' && over.id.startsWith('table-col-operand-')) {
      const [tcWidgetId, colKey, varName] = over.id.slice('table-col-operand-'.length).split('__');
      if (info.type === 'source' && info.item.category === 'Redis') {
        const field = info.item.redisJsonField ?? info.item.redisField;
        if (!field) return;
        pushUndo(droppedWidgets, guides);
        setDroppedWidgets((prev) =>
          prev.map((w) => {
            if (w.id !== tcWidgetId || !w.item.tableConfig) return w;
            const columns = w.item.tableConfig.columns.map((c) =>
              c.key === colKey && c.calc ? { ...c, calc: { ...c.calc, operands: c.calc.operands.map((op) => (op.var === varName ? { ...op, field } : op)) } } : c,
            );
            return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
          }),
        );
      }
      return;
    }

    // 위젯 참조(🔗) 드래그가 계산식 변수 영역이 아닌 곳에 드롭되면 무시
    if (info.type === 'widget-ref') return;

    if (over?.id !== 'board-canvas') return;
    const boardRect = over.rect;
    const activeRect = active.rect.current.translated;
    if (!activeRect) return;

    const xPct = ((activeRect.left - boardRect.left) / boardRect.width) * 100;
    const yPct = ((activeRect.top - boardRect.top) / boardRect.height) * 100;

    // 드래그 아이템 중심이 기존 위젯 영역 안에 있으면 아이템만 교체
    const xCenterPct = ((activeRect.left + activeRect.width / 2 - boardRect.left) / boardRect.width) * 100;
    const yCenterPct = ((activeRect.top + activeRect.height / 2 - boardRect.top) / boardRect.height) * 100;
    const targetWidget = droppedWidgets.find((w) => {
      const ww = w.w ?? DEFAULT_W,
        wh = w.h ?? DEFAULT_H;
      return xCenterPct >= w.x && xCenterPct <= w.x + ww && yCenterPct >= w.y && yCenterPct <= w.y + wh;
    });
    // 테이블형 위젯(table-queue/group/agent) 위에 좌측 Redis 항목을 드롭하면 위젯을 통째로 바꾸는 게
    // 아니라 그 필드를 테이블 컬럼으로 추가한다 — 리스트 칸(예: CTIQ_NAME)이든 값 칸(예: SUM_CONN_CNT)
    // 이든 똑같이 컬럼 1개로 추가되고, WS 구독 columns에도 그대로 반영된다(addWidgetTableColumn과 동일 경로).
    if (targetWidget?.item.tableConfig && info.type === 'source' && info.item.category === 'Redis') {
      const fieldKey = info.item.redisJsonField ?? info.item.redisField;
      if (fieldKey) {
        pushUndo(droppedWidgets, guides);
        addWidgetTableColumn(targetWidget.id, fieldKey, fieldKey);
        setSelectedWidgetIds([targetWidget.id]);
      }
      return;
    }

    if (targetWidget) {
      pushUndo(droppedWidgets, guides);
      setDroppedWidgets((prev) => prev.map((w) => (w.id === targetWidget.id ? { ...w, item: info.item } : w)));
      setSelectedWidgetIds([targetWidget.id]);
      return;
    }

    pushUndo(droppedWidgets, guides);
    const isLargeWidget = info.item.displayType === 'table' || info.item.displayType === 'chart' || info.item.category === 'WebEmbed';

    let finalX = Math.max(0, Math.min(99, xPct));
    let finalY = Math.max(0, Math.min(99, yPct));
    let finalW = isLargeWidget ? (DEFAULT_TABLE_GRID_W / GRID_COLS) * 100 : DEFAULT_W;
    let finalH = isLargeWidget ? (DEFAULT_TABLE_GRID_H / GRID_ROWS) * 100 : DEFAULT_H;

    if (layoutMode === 'grid') {
      const gw = isLargeWidget ? DEFAULT_TABLE_GRID_W : DEFAULT_GRID_W;
      const gh = isLargeWidget ? DEFAULT_TABLE_GRID_H : DEFAULT_GRID_H;
      const gridX = Math.min(GRID_COLS - gw, Math.max(0, Math.round((xPct / 100) * GRID_COLS)));
      const gridY = Math.min(GRID_ROWS - gh, Math.max(0, Math.round((yPct / 100) * GRID_ROWS)));
      finalX = (gridX / GRID_COLS) * 100;
      finalY = (gridY / GRID_ROWS) * 100;
      finalW = (gw / GRID_COLS) * 100;
      finalH = (gh / GRID_ROWS) * 100;
    }

    if (layoutMode === 'free') {
      const cx = finalX + finalW / 2;
      const cy = finalY + finalH / 2;
      const snapped = snapToGuideCell(cx, cy, guides, showGuides);
      if (snapped) {
        finalX = snapped.x;
        finalY = snapped.y;
        finalW = snapped.w;
        finalH = snapped.h;
      }
    }

    const newWidget: DroppedWidget = {
      id: `widget-${createUUID()}`,
      item: info.item,
      x: finalX,
      y: finalY,
      w: finalW,
      h: finalH,
      showTitle: true,
      style: { ...DEFAULT_STYLE },
      // Redis 값 위젯은 집계 방식 기본값을 합계(sum)로 잡는다(테이블 위젯 제외).
      ...(info.item.category === 'Redis' && info.item.redisHashKey && info.item.displayType !== 'table' ? { aggregation: 'sum' as const } : {}),
      ...(info.item.category === 'Calc' ? { calc: { formula: '', operands: [] } } : {}),
      ...(info.item.id === 'etc-custom' ? { clockFormat: DEFAULT_CUSTOM_CLOCK_FORMAT } : {}),
    };
    setDroppedWidgets((prev) => [...prev, newWidget]);
    setSelectedWidgetIds([newWidget.id]);
  };

  const removeWidget = (id: string) => {
    pushUndo(droppedWidgets, guides);
    setDroppedWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedWidgetIds((prev) => prev.filter((sid) => sid !== id));
  };

  const duplicateWidget = (id: string) => {
    const src = droppedWidgets.find((w) => w.id === id);
    if (!src) return;
    pushUndo(droppedWidgets, guides);
    const offsetX = Math.min(99 - (src.w ?? DEFAULT_W), src.x + 3);
    const offsetY = Math.min(99 - (src.h ?? DEFAULT_H), src.y + 3);
    const copy: DroppedWidget = {
      ...src,
      id: `widget-${createUUID()}`,
      x: offsetX,
      y: offsetY,
    };
    setDroppedWidgets((prev) => [...prev, copy]);
    setSelectedWidgetIds([copy.id]);
  };

  // ── Ctrl+C/Ctrl+V — 선택한 위젯을 복사해 같은 출처의 다른 창/탭에도 붙여넣을 수 있게 한다 ──
  const copySelectedWidgets = () => {
    const widgets = droppedWidgets.filter((w) => selectedWidgetIds.includes(w.id));
    if (widgets.length === 0) return;
    try {
      localStorage.setItem(WIDGET_CLIPBOARD_KEY, JSON.stringify({ source: WIDGET_CLIPBOARD_SOURCE, widgets }));
      toast.success(`위젯 ${widgets.length}개 복사됨`);
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  };

  const pasteWidgetsFromClipboard = () => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(WIDGET_CLIPBOARD_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;
    let parsed: { source?: string; widgets?: DroppedWidget[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (parsed.source !== WIDGET_CLIPBOARD_SOURCE || !Array.isArray(parsed.widgets) || parsed.widgets.length === 0) return;

    pushUndo(droppedWidgets, guides);
    // 붙여넣기 위치 — 마우스가 캔버스 위에 있었다면 그 좌표를 기준점으로 삼아, 복사한 위젯들의 상대적
    // 배치(서로 간 위치 차이)는 유지한 채 그룹 전체를 마우스 위치로 옮긴다. 마우스 위치 정보가 없으면
    // (캔버스 밖에서 붙여넣기 등) 기존처럼 원본에서 3%만큼 비껴 놓는다.
    const minX = Math.min(...parsed.widgets.map((w) => w.x));
    const minY = Math.min(...parsed.widgets.map((w) => w.y));
    const mousePos = lastCanvasMousePosRef.current;
    const targetX = mousePos ? mousePos.x : minX + 3;
    const targetY = mousePos ? mousePos.y : minY + 3;
    const pasted = parsed.widgets.map((src) => {
      const w = src.w ?? DEFAULT_W;
      const h = src.h ?? DEFAULT_H;
      const newX = Math.max(0, Math.min(100 - w, targetX + (src.x - minX)));
      const newY = Math.max(0, Math.min(100 - h, targetY + (src.y - minY)));
      return { ...src, id: `widget-${createUUID()}`, x: newX, y: newY };
    });
    setDroppedWidgets((prev) => [...prev, ...pasted]);
    setSelectedWidgetIds(pasted.map((w) => w.id));
    toast.success(`위젯 ${pasted.length}개 붙여넣기 완료`);
  };

  const updateWidgetStyle = (id: string, patch: Partial<WidgetStyle>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, style: { ...w.style, ...patch } } : w)));
  };

  // 스포이드 색상 추출 — HTTPS/localhost면 EyeDropper API, HTTP면 보드 배경 이미지 클릭 모드로 폴백.
  const handlePickColorFromScreen = async (field: 'color' | 'bgColor', widgetId: string) => {
    if (window.isSecureContext) {
      if (!('EyeDropper' in window)) {
        toast.error('스포이드 기능은 Chrome/Edge 브라우저에서만 지원됩니다.');
        return;
      }
      try {
        const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
        const result = await eyeDropper.open();
        updateWidgetStyle(widgetId, { [field]: result.sRGBHex });
      } catch {
        /* 사용자가 Esc로 취소한 경우 — 무시 */
      }
    } else {
      // HTTP 접속 — EyeDropper API 없음. 보드 배경 이미지를 canvas로 샘플링하는 클릭 모드로 전환.
      if (!fileName) {
        toast.error('배경 이미지가 없어 스포이드를 사용할 수 없습니다.');
        return;
      }
      setColorPickingMode({ field, widgetId });
      toast.info('보드 위를 클릭하여 색상을 추출하세요. ESC로 취소');
    }
  };

  // 보드 배경 이미지에서 클릭 좌표 픽셀 색상 추출 (HTTP 폴백용)
  const sampleColorFromBoardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!colorPickingMode || !fileName) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      // object-contain 렌더 기준으로 클릭 좌표를 이미지 픽셀 좌표로 변환
      const boardW = rect.width;
      const boardH = rect.height;
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const boardAspect = boardW / boardH;
      let imgX: number, imgY: number;
      if (imgAspect > boardAspect) {
        const scale = boardW / img.naturalWidth;
        const scaledH = img.naturalHeight * scale;
        const offsetY = (boardH - scaledH) / 2;
        imgX = (clickX / boardW) * img.naturalWidth;
        imgY = ((clickY - offsetY) / scaledH) * img.naturalHeight;
      } else {
        const scale = boardH / img.naturalHeight;
        const scaledW = img.naturalWidth * scale;
        const offsetX = (boardW - scaledW) / 2;
        imgX = ((clickX - offsetX) / scaledW) * img.naturalWidth;
        imgY = (clickY / boardH) * img.naturalHeight;
      }
      if (imgX < 0 || imgY < 0 || imgX >= img.naturalWidth || imgY >= img.naturalHeight) {
        toast.warning('배경 이미지 영역 밖입니다. 이미지 위를 클릭해주세요.');
        return;
      }
      const pixel = ctx.getImageData(Math.floor(imgX), Math.floor(imgY), 1, 1).data;
      const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
      updateWidgetStyle(colorPickingMode.widgetId, { [colorPickingMode.field]: hex });
      setColorPickingMode(null);
    };
    img.onerror = () => {
      toast.error('이미지를 불러올 수 없습니다. 서버 CORS 설정을 확인하세요.');
      setColorPickingMode(null);
    };
    img.src = fileName;
  };

  // 임계치 색상 규칙 CRUD — 위젯 style.thresholds 배열을 다룬다
  const addThresholdRule = (id: string) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, style: { ...w.style, thresholds: [...(w.style.thresholds ?? []), { min: 0, color: '#000000' }] } } : w)));
  };

  const updateThresholdRule = (id: string, index: number, patch: Partial<WidgetThresholdRule>) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, style: { ...w.style, thresholds: (w.style.thresholds ?? []).map((rule, i) => (i === index ? { ...rule, ...patch } : rule)) } } : w)),
    );
  };

  const removeThresholdRule = (id: string, index: number) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, style: { ...w.style, thresholds: (w.style.thresholds ?? []).filter((_, i) => i !== index) } } : w)));
  };

  const updateWidgetMeta = (
    id: string,
    patch: Partial<Pick<DroppedWidget, 'showTitle' | 'customTitle' | 'noticeKey' | 'aggregation' | 'clockFormat' | 'slideIntervalSec' | 'sectionKey'>>,
  ) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  // 계산식 위젯 설정 변경 (수식, 소수점 자릿수 등)
  const updateWidgetCalc = (id: string, patch: Partial<CalcConfig>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, calc: { formula: '', operands: [], ...w.calc, ...patch } } : w)));
  };

  // 외부 API 위젯 item 필드 변경 (URL, JSON 경로, 샘플 JSON)
  const updateWidgetExternalApi = (
    id: string,
    patch: Partial<Pick<CallDataItem, 'externalApiUrl' | 'externalApiJsonPath' | 'externalApiSampleJson' | 'sampleValue' | 'externalApiIntervalSec' | 'externalApiHeaders'>>,
  ) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, ...patch } } : w)));
  };

  // DB Query 위젯 item 필드 변경
  const updateWidgetDbQuery = (id: string, patch: Partial<Pick<CallDataItem, 'dbQueryKey' | 'dbQueryColumn' | 'dbQueryIntervalSec' | 'sampleValue'>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, ...patch } } : w)));
  };

  // 웹 임베드 위젯 item 필드 변경 (URL)
  const updateWidgetWebEmbed = (id: string, patch: Partial<Pick<CallDataItem, 'webEmbedUrl'>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, ...patch } } : w)));
  };

  // 계산식 위젯에 새 변수(A, B, C ...) 추가 — 이미 쓰인 알파벳 다음 글자를 자동 할당
  const addCalcOperand = (id: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        // calc가 아직 없으면(초기화 누락 방어) 여기서 만들어 준다 — 버튼 무반응 방지.
        const calc = w.calc ?? { formula: '', operands: [] };
        const usedVars = new Set(calc.operands.map((op) => op.var));
        const nextVar = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).find((v) => !usedVars.has(v)) ?? 'A';
        return { ...w, calc: { ...calc, operands: [...calc.operands, { var: nextVar }] } };
      }),
    );
  };

  // 계산식 위젯의 변수 제거
  const removeCalcOperand = (id: string, varName: string) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id && w.calc ? { ...w, calc: { ...w.calc, operands: w.calc.operands.filter((op) => op.var !== varName) } } : w)));
  };

  // Redis 항목을 직접 참조하는 변수의 집계 방식 변경 (해시 그룹일 때만 의미 있음)
  const updateCalcOperandAggregation = (id: string, varName: string, aggregation: CalcOperand['aggregation']) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => (w.id === id && w.calc ? { ...w, calc: { ...w.calc, operands: w.calc.operands.map((op) => (op.var === varName ? { ...op, aggregation } : op)) } } : w)),
    );
  };

  // 표시 방식 전환 — 테이블형 위젯을 표/차트로 전환 (item.tableConfig가 있는 위젯 전용)
  const updateWidgetDisplayType = (id: string, displayType: 'table' | 'chart') => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        if (displayType === 'chart') {
          const chartConfig: ChartConfig = w.item.chartConfig ?? {
            chartType: 'bar',
            sampleData: w.item.tableConfig ? buildChartDataFromRows(w.item.tableConfig.sampleRows, w.item.tableConfig.columns) : [],
          };
          return { ...w, item: { ...w.item, displayType, chartConfig } };
        }
        return { ...w, item: { ...w.item, displayType } };
      }),
    );
  };

  // 테이블형 위젯(table-queue/group/agent) 컬럼 추가/삭제 — 여기서 추가한 필드가 그대로 WS 구독 columns로 사용됨
  const addWidgetTableColumn = (id: string, key: string, label: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const exists = w.item.tableConfig.columns.some((c) => c.key.toLowerCase() === key.toLowerCase());
        if (exists) return w;
        const columns = [...w.item.tableConfig.columns, { key, label }];
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  const removeWidgetTableColumn = (id: string, key: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.filter((c) => c.key !== key);
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  // 테이블 컬럼별 스타일(정렬/천단위/임계치) — 단일값 위젯의 style 옵션을 컬럼 단위로 재사용
  const updateWidgetTableColumn = (id: string, key: string, patch: Partial<TableColumn>) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) => (c.key === key ? { ...c, ...patch } : c));
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  // 테이블 컬럼 순서 변경 — 배열 순서가 그대로 표시 순서(캔버스/실행화면 공통)
  const moveWidgetTableColumn = (id: string, key: string, direction: 'up' | 'down') => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = [...w.item.tableConfig.columns];
        const idx = columns.findIndex((c) => c.key === key);
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (idx < 0 || swapIdx < 0 || swapIdx >= columns.length) return w;
        [columns[idx], columns[swapIdx]] = [columns[swapIdx], columns[idx]];
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  // 테이블 위젯 단위 설정(행/열 간격, 정렬·TOP N) — 컬럼이 아니라 tableConfig 자체에 patch
  const updateWidgetTableConfig = (id: string, patch: Partial<NonNullable<CallDataItem['tableConfig']>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id && w.item.tableConfig ? { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, ...patch } } } : w)));
  };

  const addColumnThresholdRule = (id: string, key: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) => (c.key === key ? { ...c, thresholds: [...(c.thresholds ?? []), { min: 0, color: '#000000' }] } : c));
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  const updateColumnThresholdRule = (id: string, key: string, index: number, patch: Partial<WidgetThresholdRule>) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) =>
          c.key === key ? { ...c, thresholds: (c.thresholds ?? []).map((rule, i) => (i === index ? { ...rule, ...patch } : rule)) } : c,
        );
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  const removeColumnThresholdRule = (id: string, key: string, index: number) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) => (c.key === key ? { ...c, thresholds: (c.thresholds ?? []).filter((_, i) => i !== index) } : c));
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  // 테이블 컬럼 계산식 — 캔버스 위젯이 아니라 같은 행의 다른 JSON 필드를 변수로 참조(Redis 테이블 전용)
  const updateColumnCalc = (id: string, key: string, patch: Partial<TableColumnCalc>) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) => (c.key === key ? { ...c, calc: { formula: '', operands: [], ...c.calc, ...patch } } : c));
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  const toggleColumnCalcEnabled = (id: string, key: string, enabled: boolean) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) => (c.key === key ? { ...c, calc: enabled ? (c.calc ?? { formula: '', operands: [] }) : undefined } : c));
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  const addColumnCalcOperand = (id: string, key: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) => {
          if (c.key !== key || !c.calc) return c;
          const usedVars = new Set(c.calc.operands.map((op) => op.var));
          const nextVar = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).find((v) => !usedVars.has(v)) ?? 'A';
          return { ...c, calc: { ...c.calc, operands: [...c.calc.operands, { var: nextVar }] } };
        });
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  const removeColumnCalcOperand = (id: string, key: string, varName: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.tableConfig) return w;
        const columns = w.item.tableConfig.columns.map((c) =>
          c.key === key && c.calc ? { ...c, calc: { ...c.calc, operands: c.calc.operands.filter((op) => op.var !== varName) } } : c,
        );
        return { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, columns } } };
      }),
    );
  };

  // Redis 테이블 위젯(table-redis)이 통째로 바인딩할 해시키 — 예: "IC:CTIQ:0"
  const updateWidgetRedisHashKey = (id: string, redisHashKey: string) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, redisHashKey } } : w)));
  };

  // 시스템ID가 해시 필드인지(fields)/키 세그먼트인지(keyed) — 자동탐지 결과를 1회 저장(실행 화면은 재탐지 안 함)
  const updateWidgetRedisKeyPattern = (id: string, redisKeyPattern: 'fields' | 'keyed' | undefined) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, redisKeyPattern } } : w)));
  };

  // Redis 테이블의 그룹별 합계 설정 — byKey 값으로 묶어서 aggKey를 합산한 1행씩으로 축약
  const updateWidgetTableGroupBy = (id: string, groupBy: { byKey: string; aggKey: string } | undefined) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id && w.item.tableConfig ? { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, groupBy } } } : w)));
  };

  // JOIN 테이블 위젯 — B 해시키 설정 (INNER JOIN의 오른쪽 테이블 Redis 키)
  const updateWidgetJoinHashKeyB = (id: string, joinHashKeyB: string) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, joinHashKeyB } } : w)));
  };

  // JOIN 테이블 위젯 — 연결 기준 컬럼 설정 (INNER JOIN ON A.joinKey = B.joinKey)
  const updateWidgetJoinKey = (id: string, joinKey: string) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id && w.item.tableConfig ? { ...w, item: { ...w.item, tableConfig: { ...w.item.tableConfig, joinKey } } } : w)));
  };

  // 단일값 Redis 위젯의 그룹별 합계 설정 — byKey/matchValue로 한 그룹만 골라 aggKey를 합산한 숫자 1개를 보여줌
  const updateWidgetItemGroupBy = (id: string, groupBy: { byKey: string; aggKey: string; matchValue: string } | undefined) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, item: { ...w.item, groupBy } } : w)));
  };

  // 차트 종류 변경 (막대/선/파이/도넛)
  const updateWidgetChartType = (id: string, chartType: ChartConfig['chartType']) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id && w.item.chartConfig ? { ...w, item: { ...w.item, chartConfig: { ...w.item.chartConfig, chartType } } } : w)));
  };

  // 차트 색상 모드/색상 변경 (무지개 ↔ 직접 선택)
  const updateWidgetChartConfig = (id: string, patch: Partial<ChartConfig>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id && w.item.chartConfig ? { ...w, item: { ...w.item, chartConfig: { ...w.item.chartConfig, ...patch } } } : w)));
  };

  // 차트 색상 배열 중 특정 인덱스만 변경 (배열 길이가 부족하면 기본 팔레트로 채움)
  const updateWidgetChartColorAt = (id: string, idx: number, color: string) => {
    setDroppedWidgets((prev) =>
      prev.map((w) => {
        if (w.id !== id || !w.item.chartConfig) return w;
        const next = [...(w.item.chartConfig.colors ?? [])];
        while (next.length <= idx) next.push(CHART_COLORS_LIST[next.length % CHART_COLORS_LIST.length]);
        next[idx] = color;
        return { ...w, item: { ...w.item, chartConfig: { ...w.item.chartConfig, colors: next } } };
      }),
    );
  };

  const updateWidgetPosition = (id: string, patch: Partial<Pick<DroppedWidget, 'x' | 'y' | 'w' | 'h'>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  // ── Ctrl+Z / Ctrl+Shift+Z 단축키 ────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'z') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ── 키보드 방향키 이동 ───────────────────────────────────────────────
  useEffect(() => {
    if (selectedWidgetIds.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (!arrowKeys.includes(e.key)) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (canvasLocked) return;
      e.preventDefault();

      if (layoutMode === 'free') {
        const step = e.shiftKey ? 2 : 0.5;
        setDroppedWidgets((prev) =>
          prev.map((widget) => {
            if (!selectedWidgetIds.includes(widget.id)) return widget;
            const w = widget.w ?? DEFAULT_W;
            const h = widget.h ?? DEFAULT_H;
            let nx = widget.x;
            let ny = widget.y;
            if (e.key === 'ArrowLeft') nx = Math.max(0, nx - step);
            if (e.key === 'ArrowRight') nx = Math.min(100 - w, nx + step);
            if (e.key === 'ArrowUp') ny = Math.max(0, ny - step);
            if (e.key === 'ArrowDown') ny = Math.min(100 - h, ny + step);
            return { ...widget, x: nx, y: ny };
          }),
        );
      } else if (selectedWidgetIds.length === 1) {
        const widget = droppedWidgets.find((w) => w.id === selectedWidgetIds[0]);
        if (!widget) return;
        const step = e.shiftKey ? 3 : 1;
        const gi = toGridItem(widget);
        let nx = gi.x;
        let ny = gi.y;
        if (e.key === 'ArrowLeft') nx = Math.max(0, nx - step);
        if (e.key === 'ArrowRight') nx = Math.min(GRID_COLS - gi.w, nx + step);
        if (e.key === 'ArrowUp') ny = Math.max(0, ny - step);
        if (e.key === 'ArrowDown') ny = Math.min(GRID_ROWS - gi.h, ny + step);
        if (nx !== gi.x || ny !== gi.y) updateWidgetPosition(selectedWidgetIds[0], fromGridItem({ ...gi, x: nx, y: ny }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, droppedWidgets, layoutMode, canvasLocked]);

  // ── Delete 키: 선택한 위젯 일괄 삭제 ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setColorPickingMode(null);
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (selectedWidgetIds.length === 0) return;
      e.preventDefault();
      pushUndo(droppedWidgets, guides);
      setDroppedWidgets((prev) => prev.filter((w) => !selectedWidgetIds.includes(w.id)));
      setSelectedWidgetIds([]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, droppedWidgets, guides]);

  // ── Ctrl+C/Ctrl+V: 위젯 복사·붙여넣기(localStorage 클립보드 — 같은 출처의 다른 창/탭에도 동작) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'c' || e.key === 'C') {
        if (selectedWidgetIds.length === 0) return;
        e.preventDefault();
        copySelectedWidgets();
      } else if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        pasteWidgetsFromClipboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWidgetIds, droppedWidgets, guides]);

  // ── 저장 ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!guardWrite()) return; // 다중 테넌트 View 중엔 레이아웃 저장(생성·수정) 차단
    const pageId = layout?.pageId ?? bg?.pageId;
    if (!pageId) {
      toast.error('배경 정보가 없습니다.');
      return;
    }
    // 큐/그룹/상담사/미디어타입 선택값은 더 이상 레이아웃에 저장하지 않는다.
    // 위젯 디자인(레이아웃)과 분리되어 디스플레이(TaskboardDisplay)별로 따로 저장된다 —
    // 위 상단 셀렉터는 이 에디터 내 캔버스 미리보기 용도로만 쓰인다.
    const layoutJson = JSON.stringify({
      version: 2,
      layoutMode,
      gridMargin,
      containerPadding,
      guides,
      showGuides,
      sections: sections.length > 0 ? sections : undefined,
      widgets: droppedWidgets,
    });
    try {
      if (isEditMode && layout?.layoutId) {
        await updateLayout({ layoutId: layout.layoutId, layoutName: boardTitle, layoutJson });
      } else {
        await createLayout({
          pageId,
          tenantId: userInfo?.tenant ?? bg?.tenantId ?? '',
          layoutName: boardTitle,
          layoutJson,
          // 등록자(createUserId=로그인 계정)는 서버가 세션에서 자동 기록하므로 클라이언트가 보내지 않는다.
        });
      }
      initialStateRef.current = { widgets: JSON.stringify(droppedWidgets), title: boardTitle };
      unblockNavRef.current?.();
      toast.success('레이아웃이 저장되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getLayoutList._def });
      navigate('/taskboard/board/task-list');
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // ── Export / Import ────────────────────────────────────────────────────
  const handleExport = () => {
    const exportData = {
      version: 2,
      boardTitle,
      layoutMode,
      gridMargin,
      containerPadding,
      guides,
      showGuides,
      widgets: droppedWidgets,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${boardTitle || 'layout'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const raw = JSON.parse(ev.target?.result as string) as {
            version?: number;
            boardTitle?: string;
            layoutMode?: LayoutMode;
            gridMargin?: [number, number];
            containerPadding?: [number, number];
            guides?: GuideItem[];
            showGuides?: boolean;
            widgets?: DroppedWidget[];
          };
          if (!raw?.widgets || !Array.isArray(raw.widgets)) {
            toast.error('유효하지 않은 레이아웃 파일입니다.');
            return;
          }
          pushUndo(droppedWidgets, guides);
          if (raw.boardTitle) setBoardTitle(raw.boardTitle);
          if (raw.layoutMode) setLayoutMode(raw.layoutMode);
          if (raw.gridMargin) setGridMargin(raw.gridMargin);
          if (raw.containerPadding) setContainerPadding(raw.containerPadding);
          if (raw.guides) setGuides(raw.guides);
          if (raw.showGuides !== undefined) setShowGuides(raw.showGuides);
          setDroppedWidgets(raw.widgets);
          setSelectedWidgetIds([]);
          toast.success('레이아웃을 가져왔습니다.');
        } catch {
          toast.error('파일을 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const selectedWidgetId = selectedWidgetIds.length === 1 ? selectedWidgetIds[0] : null;
  const selectedWidget = selectedWidgetId ? (droppedWidgets.find((w) => w.id === selectedWidgetId) ?? null) : null;
  // table-redis 컬럼 필드명 자동완성 — 이 해시키에 실제 존재하는 필드 목록 + 영문→한글 표시명 맵(왼쪽 위젯 트리와 동일)
  const selectedRedisHashKey = selectedWidget?.item.redisHashKey ?? '';
  const columnFieldSuggestions = redisColumnIndex[selectedRedisHashKey] ?? [];
  const matchedColumnDef = matchKeyDefinition(selectedRedisHashKey, redisKeyDefsForColumns);
  const columnFieldNameMap = matchedColumnDef?.definition.keyPattern ? redisKeyDefsForColumns.fieldDisplayNames?.[matchedColumnDef.definition.keyPattern] : undefined;
  // 선택 위젯의 현재 표시 방식(표/카드/차트) — 우측 패널에서 표시 방식별로 쓰지 않는 옵션을 숨기는 데 쓴다.
  const selectedIsChartMode = selectedWidget?.item.displayType === 'chart';
  const selectedIsCardMode = !!selectedWidget && !selectedIsChartMode && selectedWidget.item.tableConfig?.viewMode === 'cards';
  const selectedIsTableMode = !!selectedWidget?.item.tableConfig && !selectedIsChartMode && !selectedIsCardMode;
  const gridLayout = droppedWidgets.map((w) => toGridItem(w, canvasLocked));

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <TableColumnResizeContext.Provider value={(widgetId, colKey, width) => updateWidgetTableColumn(widgetId, colKey, { width })}>
        <style dangerouslySetInnerHTML={{ __html: VALUE_CHANGE_ANIMATION_CSS }} />
        <div className="flex h-full bg-slate-100 font-sans overflow-hidden">
          {/* ── 왼쪽 패널: 데이터 소스 ── */}
          <div style={{ width: leftPanelWidth }} className="flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm overflow-hidden relative z-10">
            <div className="flex-1 overflow-y-auto min-h-0">
              <RedisHashSection />
              <FixedItemsSection />
              <ExternalItemsSection />
            </div>
          </div>
          <PanelResizer side="left" width={leftPanelWidth} min={LEFT_PANEL_MIN} max={LEFT_PANEL_MAX} onResize={setLeftPanelWidth} />

          {/* ── 가운데 패널: 캔버스 ── */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 relative z-[1]">
            {/* 메인 헤더 */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 overflow-hidden">
              <div className="flex-1 min-w-0 mr-4">
                <input
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0f5b9e] outline-none px-1 w-full max-w-xs truncate"
                  placeholder="전광판 이름 입력"
                />
                <p className="text-xs text-slate-400 mt-0.5 truncate whitespace-nowrap">
                  {isEditMode ? '편집 모드' : '신규 생성'} · {layoutMode === 'free' ? '자유 이동' : '그리드 스냅'}
                  {isDirty && <span className="ml-2 text-amber-500 font-semibold">● 미저장</span>}
                </p>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                {/* 모드 토글 */}
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden text-xs">
                  <button
                    onClick={() => setLayoutMode('free')}
                    title="자유 모드 — 포토샵처럼 픽셀 단위로 자유롭게 이동"
                    className={`px-2.5 py-1.5 font-semibold transition-colors ${layoutMode === 'free' ? 'bg-[#0f5b9e] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    ✦ 자유
                  </button>
                  <button
                    onClick={() => setLayoutMode('grid')}
                    title="그리드 모드 — 격자에 맞춰 정렬"
                    className={`px-2.5 py-1.5 font-semibold border-l border-slate-200 transition-colors ${layoutMode === 'grid' ? 'bg-[#0f5b9e] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    ⊞ 그리드
                  </button>
                </div>
                {/* 그리드 간격 / 가장자리 여백 설정 */}
                {layoutMode === 'grid' && (
                  <>
                    <div className="flex items-center gap-1 border border-slate-200 rounded-md px-2 py-1">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">간격</span>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={gridMargin[0]}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(20, parseInt(e.target.value) || 0));
                          setGridMargin([v, v]);
                        }}
                        className="w-10 text-xs border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-[#0f5b9e]"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                    <div className="flex items-center gap-1 border border-slate-200 rounded-md px-2 py-1">
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">여백</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={containerPadding[0]}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(60, parseInt(e.target.value) || 0));
                          setContainerPadding([v, v]);
                        }}
                        className="w-10 text-xs border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-[#0f5b9e]"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </>
                )}
                {/* 되돌리기 / 다시실행 */}
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.current.length === 0}
                    title="되돌리기 (Ctrl+Z)"
                    className="px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ↩
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.current.length === 0}
                    title="다시실행 (Ctrl+Shift+Z)"
                    className="px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50 border-l border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    ↪
                  </button>
                </div>
                {/* 위젯 잠금 — 켜면 모든 위젯의 드래그/리사이즈/방향키 이동을 한꺼번에 차단(복사·붙여넣기
                  반복 중 의도치 않게 미세하게 밀리는 사고 방지). 위젯별이 아니라 캔버스 전체 단위 스위치. */}
                <button
                  onClick={() => setCanvasLocked((v) => !v)}
                  title={canvasLocked ? '위젯 잠금 해제' : '위젯 잠금 — 모든 위젯 이동/리사이즈 차단'}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                    canvasLocked ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {canvasLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  위젯 잠금
                </button>
                {/* 캔버스 확대/축소 */}
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.25, Math.round((z - 0.1) * 100) / 100))}
                    disabled={zoom <= 0.25}
                    title="축소"
                    className="px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <button
                    onClick={() => setZoom(1)}
                    title="100%로 초기화"
                    className="px-2 py-1.5 text-[11px] font-mono font-semibold text-slate-600 hover:bg-slate-50 border-x border-slate-200 min-w-[44px] transition-colors"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 100) / 100))}
                    disabled={zoom >= 2}
                    title="확대"
                    className="px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
                {/* 가이드선 토글 */}
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden text-xs">
                  <button
                    onClick={() => setShowGuides((v) => !v)}
                    title="가이드선 표시/숨기기 — 눈금자에서 드래그해 가이드선 추가&#10;선 좌클릭으로 선택, 드래그로 이동, X버튼으로 삭제"
                    className={`px-2.5 py-1.5 font-semibold transition-colors ${showGuides ? 'bg-[#0f5b9e] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    가이드
                  </button>
                  {showGuides && guides.length > 0 && (
                    <button
                      onClick={() => {
                        pushUndo(droppedWidgets, guides);
                        setGuides([]);
                        setSelectedGuideIds([]);
                      }}
                      title="가이드선 모두 삭제"
                      className="px-2 py-1.5 text-slate-400 hover:text-red-500 border-l border-slate-200 transition-colors"
                    >
                      전체삭제
                    </button>
                  )}
                </div>
                {/* 영역 분할 — 같은 축 가이드 2개 선택 시 표시 */}
                {(() => {
                  if (selectedGuideIds.length !== 2) return null;
                  const [dg1, dg2] = selectedGuideIds.map((id) => guides.find((g) => g.id === id));
                  if (!dg1 || !dg2 || dg1.axis !== dg2.axis) return null;
                  return (
                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden text-xs bg-indigo-50">
                      <span className="px-2 py-1.5 text-[10px] text-indigo-600 font-semibold whitespace-nowrap border-r border-slate-200">분할</span>
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={divideCount}
                        onChange={(e) => setDivideCount(Math.max(2, Math.min(20, parseInt(e.target.value) || 2)))}
                        className="w-8 text-xs text-center focus:outline-none py-1 bg-transparent"
                        title="셀 수"
                      />
                      <span className="text-[9px] text-slate-400 px-0.5">칸</span>
                      <span className="border-l border-slate-200 px-1 text-[9px] text-slate-400">간격</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={divideGapPx}
                        onChange={(e) => setDivideGapPx(Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                        className="w-8 text-xs text-center focus:outline-none py-1 bg-transparent"
                        title="간격(px)"
                      />
                      <span className="text-[9px] text-slate-400 px-0.5">px</span>
                      <button
                        onClick={handleDivideArea}
                        className="px-2 py-1.5 text-xs font-bold text-white bg-indigo-600 border-l border-slate-200 hover:bg-indigo-700 transition-colors"
                        title="선택한 가이드선 사이 영역 분할"
                      >
                        적용
                      </button>
                    </div>
                  );
                })()}
                <button
                  onClick={() => {
                    pushUndo(droppedWidgets, guides);
                    setDroppedWidgets([]);
                    setSelectedWidgetIds([]);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  초기화
                </button>
                <div className="flex items-center border border-slate-200 rounded-md overflow-hidden text-xs">
                  <button
                    onClick={handleExport}
                    title="현재 레이아웃을 JSON 파일로 내보내기"
                    className="px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-200"
                  >
                    내보내기
                  </button>
                  <button onClick={handleImport} title="JSON 파일에서 레이아웃 가져오기" className="px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    가져오기
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold bg-[#0f5b9e] text-white rounded-md hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
                >
                  {isSaving ? '저장 중...' : isDirty ? '저장 ●' : '저장'}
                </button>
              </div>
            </div>

            {/* 캔버스 영역 — 확대 시 overflow-auto로 스크롤해서 모든 모서리로 이동 가능하게.
              zoom<=1일 때만 flex로 중앙 정렬하고, 확대(zoom>1)되면 중앙정렬을 끔 — flex 중앙정렬 + transform:scale을
              같이 쓰면 브라우저가 "시작(top/left)" 방향 overflow는 스크롤로 못 닿는 문제가 있어서(중앙에서 사방으로
              커지는데, 끝(bottom/right) 방향 overflow만 스크롤 가능) 확대했을 때 좌상단 쪽으로 못 옮겨가던 원인이었음. */}
            <div className={`flex-1 p-6 overflow-auto min-h-0 relative ${zoom <= 1 ? 'flex items-center justify-center' : ''}`}>
              {/* 드래그 중 좌표 표시 — fixed로 overflow 제약 없이 표시 */}
              {dragCoord && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2 bg-black/80 text-white text-sm font-mono rounded-full shadow-xl pointer-events-none select-none tracking-wide">
                  X: {dragCoord.x.toFixed(1)}% &nbsp;&nbsp; Y: {dragCoord.y.toFixed(1)}%
                </div>
              )}
              {/* 눈금자 포함 외부 래퍼 — showGuides 시 paddingLeft(16px)로 좌측에만 눈금자 배치 공간을 둠.
                paddingTop은 일부러 안 둠 — top 패딩이 있으면(이전 시도) 위쪽 눈금자(16px 고정 높이 띠)가
                브라우저 자체 줌(Ctrl+스크롤) 100%에서 서브픽셀 라운딩으로 거의 안 보이게 얇아지는 문제가
                있었고, 사용자가 직접 padding-top을 0으로 바꿔보고 정상적으로 보임을 확인함 — 위쪽 눈금자는
                이미지 상단과 겹쳐서(오버레이로) 그려지는 트레이드오프를 감수.
                zoom은 transform만 적용되어 레이아웃 박스 크기(getBoundingClientRect 기반 드래그 좌표 계산,
                ResizeObserver 기반 containerWidth/fontScale)에는 영향 없음.
                origin-top-left: 좌상단을 기준으로 우/하 방향으로만 커지게 해서 항상 스크롤로 닿을 수 있게 한다.
                zoom===1(기본값)일 때는 transform 자체를 안 줌 — scale(1)도 브라우저가 별도 컴포지팅
                레이어를 만들어버려 서브픽셀 라운딩 문제를 유발할 수 있어서, 앱 자체 확대/축소를 실제로
                쓸 때만 transform 적용. */}
              <div
                className={`w-full max-w-5xl relative origin-top-left ${zoom > 1 ? 'mx-auto' : ''}`}
                style={{
                  paddingLeft: showGuides ? '16px' : '0',
                  ...(zoom !== 1 ? { transform: `scale(${zoom})`, transition: 'transform 0.15s ease' } : {}),
                }}
              >
                {/* ── 눈금자 오버레이 (이미지 바깥 패딩 영역) ── */}
                {showGuides && (
                  <>
                    {/* 모서리 채우기 */}
                    <div className="absolute top-0 left-0 w-4 h-4 bg-slate-900 z-[11] pointer-events-none" />
                    {/* 상단 눈금자 (드래그 → 수평 가이드) */}
                    <div
                      className="absolute top-0 left-4 right-0 h-4 bg-slate-800 z-[10] overflow-hidden select-none cursor-ns-resize"
                      style={{ borderBottom: '1px solid #334155' }}
                      onPointerDown={(e) => handleRulerPointerDown('h', e)}
                    >
                      {Array.from({ length: 11 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: `${i * 10}%`,
                            top: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            transform: 'translateX(-50%)',
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            style={{
                              width: '1px',
                              height: i % 5 === 0 ? '8px' : '4px',
                              backgroundColor: i % 5 === 0 ? '#94a3b8' : '#475569',
                              marginTop: i % 5 === 0 ? '0' : '4px',
                            }}
                          />
                          {i % 5 === 0 && <span style={{ fontSize: '7px', color: '#64748b', lineHeight: 1, marginTop: '1px' }}>{i * 10}</span>}
                        </div>
                      ))}
                    </div>
                    {/* 좌측 눈금자 (드래그 → 수직 가이드) */}
                    <div
                      className="absolute top-4 left-0 w-4 bottom-0 bg-slate-800 z-[10] overflow-hidden select-none cursor-ew-resize"
                      style={{ borderRight: '1px solid #334155' }}
                      onPointerDown={(e) => handleRulerPointerDown('v', e)}
                    >
                      {Array.from({ length: 11 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            top: `${i * 10}%`,
                            left: 0,
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                          }}
                        >
                          <div
                            style={{
                              height: '1px',
                              width: i % 5 === 0 ? '8px' : '4px',
                              backgroundColor: i % 5 === 0 ? '#94a3b8' : '#475569',
                              marginLeft: i % 5 === 0 ? '0' : '4px',
                            }}
                          />
                          {i % 5 === 0 && (
                            <span style={{ fontSize: '7px', color: '#64748b', lineHeight: 1, marginLeft: '1px', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                              {i * 10}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* boardContainerRef — 실제 이미지/캔버스 영역만 감쌈 */}
                <div
                  ref={boardContainerRef}
                  className="w-full relative"
                  style={{ aspectRatio: imageRatio }}
                  onPointerMove={(e) => {
                    const rect = boardContainerRef.current?.getBoundingClientRect();
                    if (!rect || rect.width === 0 || rect.height === 0) return;
                    lastCanvasMousePosRef.current = {
                      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
                      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
                    };
                  }}
                >
                  {(() => {
                    const guidesOverlay = showGuides ? (
                      <div className="absolute inset-0 pointer-events-none z-[150]">
                        {(() => {
                          const hSorted = guides.filter((g) => g.axis === 'h').sort((a, b) => a.pct - b.pct);
                          const vSorted = guides.filter((g) => g.axis === 'v').sort((a, b) => a.pct - b.pct);
                          return guides.map((g) => {
                            const isDragging = guideDragRef.current?.type === 'existing' && guideDragRef.current?.draggedGuides?.some((d) => d.guideId === g.id);
                            const isSelected = selectedGuideIds.includes(g.id);
                            const willDel = isDragging && (guideDragPos?.willDelete ?? false);
                            const lineColor = willDel ? '#ef4444' : isSelected ? '#f59e0b' : '#22d3ee';
                            const lineGlow = willDel ? '0 0 5px #ef4444' : isSelected ? '0 0 8px #f59e0b' : '0 0 3px #22d3ee60';
                            const lineThickness = isSelected ? '2px' : '1px';
                            const sortedList = g.axis === 'h' ? hSorted : vSorted;
                            const idx = sortedList.findIndex((gg) => gg.id === g.id);
                            const label = `${g.axis === 'h' ? 'H' : 'V'}${idx + 1}`;
                            return (
                              <div
                                key={g.id}
                                className="absolute pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                                style={
                                  g.axis === 'h'
                                    ? {
                                        top: `${g.pct}%`,
                                        left: 0,
                                        right: 0,
                                        height: '11px',
                                        transform: 'translateY(-5.5px)',
                                        cursor: 'ns-resize',
                                        display: 'flex',
                                        alignItems: 'center',
                                      }
                                    : {
                                        left: `${g.pct}%`,
                                        top: 0,
                                        bottom: 0,
                                        width: '11px',
                                        transform: 'translateX(-5.5px)',
                                        cursor: 'ew-resize',
                                        display: 'flex',
                                        justifyContent: 'center',
                                      }
                                }
                                onPointerDown={(e) => {
                                  if (e.button !== 0) return;
                                  e.stopPropagation();
                                  guideDragStartStateRef.current = { widgets: droppedWidgets, guides };
                                  const isCurrentlySelected = selectedGuideIds.includes(g.id);
                                  let newSelection: string[];
                                  if (e.shiftKey) {
                                    newSelection = isCurrentlySelected ? selectedGuideIds.filter((id) => id !== g.id) : [...selectedGuideIds, g.id];
                                  } else if (isCurrentlySelected && selectedGuideIds.length > 1) {
                                    newSelection = selectedGuideIds;
                                  } else {
                                    newSelection = [g.id];
                                  }
                                  setSelectedGuideIds(newSelection);
                                  const guidesToDrag = guides
                                    .filter((gg) => newSelection.includes(gg.id) && gg.axis === g.axis)
                                    .map((gg) => ({ guideId: gg.id, startPct: gg.pct }));
                                  guideDragRef.current = { type: 'existing', axis: g.axis, draggedGuides: guidesToDrag, startClientX: e.clientX, startClientY: e.clientY };
                                  guideDragPosRef.current = null;
                                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                                }}
                              >
                                {g.axis === 'h' ? (
                                  <div className="w-full" style={{ height: lineThickness, backgroundColor: lineColor, boxShadow: lineGlow }} />
                                ) : (
                                  <div className="h-full" style={{ width: lineThickness, backgroundColor: lineColor, boxShadow: lineGlow }} />
                                )}
                                <span
                                  className="absolute font-mono rounded pointer-events-none select-none"
                                  style={{
                                    fontSize: '8px',
                                    padding: '1px 3px',
                                    backgroundColor: isSelected ? lineColor : `${lineColor}30`,
                                    color: isSelected ? '#000' : lineColor,
                                    border: isSelected ? 'none' : `1px solid ${lineColor}60`,
                                    lineHeight: 1.2,
                                    ...(g.axis === 'h'
                                      ? { left: `${Math.max(2, (idx % 3) * 28)}px`, top: idx % 2 === 0 ? '-11px' : '3px' }
                                      : { top: `${Math.max(2, (idx % 3) * 20)}px`, left: idx % 2 === 0 ? '3px' : '-20px', writingMode: 'vertical-rl' }),
                                  }}
                                >
                                  {label} {isSelected ? `${g.pct.toFixed(1)}%` : ''}
                                </span>
                                {/* 선 선택 시 X 삭제 버튼 */}
                                {isSelected && (
                                  <button
                                    className="absolute flex items-center justify-center pointer-events-auto z-10 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
                                    style={
                                      g.axis === 'h'
                                        ? { right: '6px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', fontSize: '9px', lineHeight: 1 }
                                        : { top: '6px', left: '50%', transform: 'translateX(50%)', width: '16px', height: '16px', fontSize: '9px', lineHeight: 1 }
                                    }
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      pushUndo(droppedWidgets, guides);
                                      setGuides((prev) => prev.filter((gg) => gg.id !== g.id));
                                      setSelectedGuideIds((prev) => prev.filter((id) => id !== g.id));
                                    }}
                                    title={`${label} 삭제`}
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          });
                        })()}
                        {/* 새 가이드 드래그 미리보기 */}
                        {guideDragPos && guideDragRef.current?.type === 'new' && (
                          <div
                            style={
                              guideDragPos.axis === 'h'
                                ? {
                                    position: 'absolute',
                                    top: `${guideDragPos.pct}%`,
                                    left: 0,
                                    right: 0,
                                    height: '1px',
                                    transform: 'translateY(-0.5px)',
                                    backgroundColor: guideDragPos.willDelete ? '#ef444480' : '#22d3ee80',
                                  }
                                : {
                                    position: 'absolute',
                                    left: `${guideDragPos.pct}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    transform: 'translateX(-0.5px)',
                                    backgroundColor: guideDragPos.willDelete ? '#ef444480' : '#22d3ee80',
                                  }
                            }
                          />
                        )}
                      </div>
                    ) : null;

                    const fontScale = containerWidth > 0 ? containerWidth / DESIGN_WIDTH : 1;
                    // guidesOverlay는 DroppableBoard 안(guides prop)이 아니라 boardContainerRef 바로 아래
                    // 형제로 렌더 — DroppableBoard 자체가 rounded-xl overflow-hidden이라, 그 안에 있으면
                    // 가이드 라벨의 음수 top/left 오프셋(선 반대쪽에 그려질 때)이 캔버스 가장자리에서 잘려
                    // 잘 안 보이는 문제가 있었음(특히 위쪽 가까이 만든 가이드).
                    return (
                      <>
                        <DroppableBoard
                          fileName={fileName}
                          pageName={boardTitle}
                          layoutMode={layoutMode}
                          onClickCanvas={() => {
                            setSelectedWidgetIds([]);
                            setSelectedGuideIds([]);
                          }}
                          gridLayout={gridLayout}
                          containerWidth={containerWidth}
                          rowHeight={rowHeight}
                          gridMargin={gridMargin}
                          containerPadding={containerPadding}
                          onLayoutChange={handleGridLayoutChange}
                          onImageLoad={(naturalWidth, naturalHeight) => {
                            if (naturalWidth > 0 && naturalHeight > 0) setImageRatio(`${naturalWidth}/${naturalHeight}`);
                          }}
                        >
                          {layoutMode === 'free'
                            ? droppedWidgets.map((widget) => (
                                <CanvasWidgetFree
                                  key={widget.id}
                                  widget={widget}
                                  widgets={droppedWidgets}
                                  isSelected={selectedWidgetIds.includes(widget.id)}
                                  onSelect={(shiftKey) => {
                                    if (lastDragOccurredRef.current) return;
                                    if (shiftKey) {
                                      setSelectedWidgetIds((prev) => (prev.includes(widget.id) ? prev.filter((id) => id !== widget.id) : [...prev, widget.id]));
                                    } else {
                                      setSelectedWidgetIds([widget.id]);
                                    }
                                  }}
                                  locked={canvasLocked}
                                  onRemove={() => removeWidget(widget.id)}
                                  onDuplicate={() => duplicateWidget(widget.id)}
                                  onDragStart={handleFreeDragStart}
                                  onResizeStart={handleResizeStart}
                                  fontScale={fontScale}
                                  redisWsData={redisWsData}
                                  sections={sections}
                                  onSectionChange={(key) => updateWidgetMeta(widget.id, { sectionKey: key })}
                                />
                              ))
                            : droppedWidgets.map((widget) => (
                                <div key={widget.id}>
                                  <CanvasWidgetGrid
                                    widget={widget}
                                    widgets={droppedWidgets}
                                    isSelected={selectedWidgetIds.includes(widget.id)}
                                    locked={canvasLocked}
                                    onSelect={() => setSelectedWidgetIds([widget.id])}
                                    onRemove={() => removeWidget(widget.id)}
                                    onDuplicate={() => duplicateWidget(widget.id)}
                                    fontScale={fontScale}
                                    redisWsData={redisWsData}
                                    sections={sections}
                                    onSectionChange={(key) => updateWidgetMeta(widget.id, { sectionKey: key })}
                                  />
                                </div>
                              ))}
                        </DroppableBoard>
                        {colorPickingMode && (
                          <div className="absolute inset-0 z-[500]" style={{ cursor: 'crosshair' }} title="클릭하여 색상 추출 / ESC로 취소" onClick={sampleColorFromBoardClick} />
                        )}
                        {guidesOverlay}
                      </>
                    );
                  })()}
                </div>
                {/* boardContainerRef end */}
              </div>
              {/* outer ruler wrapper end */}
            </div>
          </div>

          <PanelResizer side="right" width={rightPanelWidth} min={RIGHT_PANEL_MIN} max={RIGHT_PANEL_MAX} onResize={setRightPanelWidth} />
          {/* ── 오른쪽 패널: 스타일 옵션 ── */}
          <div style={{ width: rightPanelWidth }} className="flex-shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-sm overflow-hidden">
            {selectedWidget ? (
              <>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <span className="text-sm font-bold text-slate-700 truncate flex-1 min-w-0">{selectedWidget.customTitle ?? selectedWidget.item.label}</span>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <button
                      onClick={() => duplicateWidget(selectedWidget.id)}
                      className="text-[10px] px-2 py-1 bg-blue-50 border border-blue-200 text-blue-600 rounded hover:bg-blue-100 transition-colors font-semibold"
                      title="위젯 복사"
                    >
                      ⧉ 복사
                    </button>
                    <button onClick={() => setSelectedWidgetIds([])} className="text-slate-400 hover:text-slate-600 text-xs">
                      닫기
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 p-3 flex flex-col gap-2">
                  {/* 위치/크기 직접 입력 */}
                  <div className="grid grid-cols-4 gap-1">
                    {(
                      [
                        { label: 'X', field: 'x' as const, value: selectedWidget.x, min: 0, max: 99 },
                        { label: 'Y', field: 'y' as const, value: selectedWidget.y, min: 0, max: 99 },
                        { label: 'W', field: 'w' as const, value: selectedWidget.w ?? DEFAULT_W, min: 4, max: 100 },
                        { label: 'H', field: 'h' as const, value: selectedWidget.h ?? DEFAULT_H, min: 3, max: 100 },
                      ] as const
                    ).map(({ label, field, value, min, max }) => (
                      <div key={`${selectedWidget.id}-${label}`} className="px-1 pt-1 pb-0.5 bg-slate-800 rounded text-center">
                        <div className="text-[8px] text-slate-400 font-semibold">{label}</div>
                        <input
                          type="number"
                          step="0.5"
                          min={min}
                          max={max}
                          defaultValue={parseFloat(value.toFixed(1))}
                          onBlur={(e) => {
                            const num = parseFloat(e.target.value);
                            if (!isNaN(num)) updateWidgetPosition(selectedWidget.id, { [field]: Math.max(min, Math.min(max, num)) });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                          }}
                          className="w-full text-[10px] font-mono text-white font-bold bg-transparent text-center border-b border-slate-600 focus:border-blue-400 outline-none"
                        />
                        <div className="text-[8px] text-slate-500 leading-none mt-0.5">%</div>
                      </div>
                    ))}
                  </div>

                  <div className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-[9px] text-slate-400 text-center">
                    {layoutMode === 'free' ? '방향키: 0.5% · Shift: 2% · 드래그: 자유이동' : '방향키: 1칸 · Shift: 3칸 · 드래그: 그리드 스냅'}
                  </div>

                  {/* 데이터 출처 — 이 위젯이 실제로 바라보는 항목의 경로 */}
                  {(() => {
                    const sourcePath = getWidgetDataSourcePath(selectedWidget.item);
                    return sourcePath ? (
                      <div className="px-2 py-1.5 bg-slate-50 rounded border border-slate-200">
                        <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">데이터 출처</div>
                        <div className="text-[10px] text-slate-600 font-mono break-all leading-snug">{sourcePath}</div>
                      </div>
                    ) : null;
                  })()}

                  {/* 타이틀 토글 */}
                  <div className="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-semibold">타이틀 표시</span>
                    <button
                      onClick={() => updateWidgetMeta(selectedWidget.id, { showTitle: !selectedWidget.showTitle })}
                      className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.showTitle !== false ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.showTitle !== false ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  {/* 타이틀 변경 */}
                  {selectedWidget.showTitle !== false && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">타이틀 변경</label>
                      {editingTitleId === selectedWidget.id ? (
                        <div className="flex gap-1">
                          <input
                            autoFocus
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.currentTarget.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateWidgetMeta(selectedWidget.id, { customTitle: editingTitleText || undefined });
                                setEditingTitleId(null);
                              } else if (e.key === 'Escape') setEditingTitleId(null);
                            }}
                            className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#0f5b9e]"
                            placeholder={selectedWidget.item.label}
                          />
                          <button
                            onClick={() => {
                              updateWidgetMeta(selectedWidget.id, { customTitle: editingTitleText || undefined });
                              setEditingTitleId(null);
                            }}
                            className="text-[10px] px-2 py-1 bg-[#0f5b9e] text-white rounded hover:bg-[#0d4f8a]"
                          >
                            완료
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTitleId(selectedWidget.id);
                            setEditingTitleText(selectedWidget.customTitle ?? selectedWidget.item.label);
                          }}
                          className="w-full text-left text-xs px-2 py-1.5 bg-white border border-slate-200 rounded hover:border-[#0f5b9e] text-slate-600 truncate"
                        >
                          {selectedWidget.customTitle ?? selectedWidget.item.label}
                          <span className="ml-1 text-slate-400 text-[9px]">✎</span>
                        </button>
                      )}
                      {selectedWidget.customTitle && (
                        <button onClick={() => updateWidgetMeta(selectedWidget.id, { customTitle: undefined })} className="text-[9px] text-red-400 hover:text-red-600 mt-0.5">
                          원래 이름으로 초기화
                        </button>
                      )}
                    </div>
                  )}

                  {/* 타이틀 정렬 */}
                  {selectedWidget.showTitle !== false && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">타이틀 정렬</label>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateWidgetStyle(selectedWidget.id, { titleAlign: align })}
                            className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${(selectedWidget.style.titleAlign ?? 'left') === align ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'}`}
                          >
                            {align === 'left' ? '← 좌' : align === 'center' ? '≡ 중' : '→ 우'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 표시 방식 — 테이블형 위젯 전용 (표 / 카드 / 차트 전환) */}
                  {selectedWidget.item.tableConfig && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">표시 방식</label>
                      {(() => {
                        const isChartMode = selectedWidget.item.displayType === 'chart';
                        const isCardMode = !isChartMode && selectedWidget.item.tableConfig?.viewMode === 'cards';
                        const current = isChartMode ? 'chart' : isCardMode ? 'cards' : 'table';
                        const setMode = (mode: 'table' | 'cards' | 'chart') => {
                          if (mode === 'chart') {
                            updateWidgetTableConfig(selectedWidget.id, { viewMode: 'table' });
                            updateWidgetDisplayType(selectedWidget.id, 'chart');
                          } else if (mode === 'cards') {
                            updateWidgetDisplayType(selectedWidget.id, 'table');
                            updateWidgetTableConfig(selectedWidget.id, {
                              viewMode: 'cards',
                              cardConfig: selectedWidget.item.tableConfig?.cardConfig ?? { presetId: 'stat', slotMap: {} },
                            });
                          } else {
                            updateWidgetDisplayType(selectedWidget.id, 'table');
                            updateWidgetTableConfig(selectedWidget.id, { viewMode: 'table' });
                          }
                        };
                        return (
                          <>
                            <div className="flex gap-1">
                              {(
                                [
                                  { label: '표', value: 'table' as const },
                                  { label: '카드', value: 'cards' as const },
                                  { label: '차트', value: 'chart' as const },
                                ] as const
                              ).map(({ label, value }) => (
                                <button
                                  key={value}
                                  onClick={() => setMode(value)}
                                  className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                                    current === value ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {isCardMode && (
                              <button
                                onClick={() => setCardEditorOpen(true)}
                                className="mt-1.5 w-full py-1 rounded border border-[#0f5b9e] text-[10px] font-semibold text-[#0f5b9e] bg-blue-50 hover:bg-blue-100 transition-colors"
                              >
                                🎴 카드 편집 (모양·색·컬럼 매핑)
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {cardEditorOpen && selectedWidget.item.tableConfig && (
                    <CardEditorModal
                      columns={selectedWidget.item.tableConfig.columns}
                      cardConfig={selectedWidget.item.tableConfig.cardConfig}
                      onChange={(next) => updateWidgetTableConfig(selectedWidget.id, { cardConfig: next })}
                      onClose={() => setCardEditorOpen(false)}
                    />
                  )}

                  {/* Redis 해시키 — table-redis 전용. 행은 이 해시에 실제로 존재하는 field를 그대로 쓴다(DB 마스터 조인 없음). */}
                  {selectedWidget.item.id === 'table-redis' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                        Redis 해시키 <span className="text-slate-300 font-normal normal-case">(미디어타입까지 포함 — 예: IC:CTIQ:0)</span>
                      </label>
                      <input
                        type="text"
                        value={selectedWidget.item.redisHashKey ?? ''}
                        onChange={(e) => updateWidgetRedisHashKey(selectedWidget.id, e.target.value)}
                        placeholder="IC:CTIQ:0"
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                      />
                      <p className="text-[9px] text-slate-400 px-1 mt-1">
                        행은 이 해시에 실제로 있는 키를 그대로 씁니다. 컬럼은 아래에 직접 추가하거나 좌측 탐색기에서 필드를 드래그하세요.
                      </p>
                    </div>
                  )}

                  {/* 시스템ID 위치 자동탐지 — table-redis 전용. 새 SCAN 없이 이미 캐싱된 전체 해시키 목록만으로 판단.
                      탐지 결과를 위젯에 1회 저장해두면 실행 화면(전광판)은 재탐지 없이 그 값만 읽어서 분기한다. */}
                  {selectedWidget.item.id === 'table-redis' && !!selectedWidget.item.redisHashKey && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">시스템ID 위치</label>
                      {(() => {
                        const redisHashKey = selectedWidget.item.redisHashKey ?? '';
                        const detected = detectRedisKeyPattern(redisHashKey, allRedisHashKeys);
                        const siblingCount = findSiblingKeys(redisHashKey, allRedisHashKeys).length;
                        const saved = selectedWidget.item.redisKeyPattern;
                        return (
                          <div className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-200">
                            <p className="text-[9px] text-slate-400 leading-snug">
                              {detected === 'keyed' && `자동탐지: 키형(B) — 같은 패턴의 형제 키 ${siblingCount}개 발견(시스템ID별로 키가 따로 있음)`}
                              {detected === 'fields' && '자동탐지: 필드형(A) — 이 키 하나의 필드들이 시스템ID'}
                              {detected === 'unknown' && '자동탐지 불가 — 아직 이 키에 데이터가 없거나 새 키입니다'}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateWidgetRedisKeyPattern(selectedWidget.id, detected === 'unknown' ? undefined : detected)}
                                disabled={detected === 'unknown'}
                                className="flex-1 py-1 rounded border text-[10px] font-semibold bg-[#0f5b9e] text-white border-[#0f5b9e] hover:bg-[#0c4a82] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              >
                                탐지 결과로 저장
                              </button>
                              {saved && (
                                <span className="text-[9px] text-slate-400 flex-shrink-0">
                                  현재 저장값: <span className="font-semibold text-slate-600">{saved === 'keyed' ? '키형(B)' : '필드형(A)'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 그룹화(합계) — table-redis 전용. byKey 값으로 묶어서 aggKey를 합산한 1행씩으로 축약(예: REASON_CODE별 AGENT_CNT 합계) */}
                  {selectedWidget.item.id === 'table-redis' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">그룹별 합계</label>
                        <button
                          onClick={() => updateWidgetTableGroupBy(selectedWidget.id, selectedWidget.item.tableConfig?.groupBy ? undefined : { byKey: '', aggKey: '' })}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.item.tableConfig?.groupBy ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.item.tableConfig?.groupBy ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                      {selectedWidget.item.tableConfig?.groupBy && (
                        <div className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-200">
                          <p className="text-[9px] text-slate-400 leading-snug">행 전체를 펼치는 대신, 기준 필드 값으로 묶어서 합계 필드를 더한 1행씩만 보여줍니다.</p>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">기준 필드 (예: REASON_CODE)</label>
                            <input
                              type="text"
                              value={selectedWidget.item.tableConfig.groupBy.byKey}
                              onChange={(e) =>
                                updateWidgetTableGroupBy(selectedWidget.id, { ...(selectedWidget.item.tableConfig?.groupBy ?? { byKey: '', aggKey: '' }), byKey: e.target.value })
                              }
                              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">합계 필드 (예: AGENT_CNT)</label>
                            <input
                              type="text"
                              value={selectedWidget.item.tableConfig.groupBy.aggKey}
                              onChange={(e) =>
                                updateWidgetTableGroupBy(selectedWidget.id, { ...(selectedWidget.item.tableConfig?.groupBy ?? { byKey: '', aggKey: '' }), aggKey: e.target.value })
                              }
                              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* JOIN 테이블 설정 — table-join 전용. A 해시키(redisHashKey)·B 해시키(joinHashKeyB)·연결 기준 컬럼(joinKey) 설정. */}
                  {selectedWidget.item.id === 'table-join' && (
                    <div className="flex flex-col gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                          해시키 A <span className="text-slate-300 font-normal normal-case">(왼쪽 테이블 — 예: IC:CTIQ:0)</span>
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.item.redisHashKey ?? ''}
                          onChange={(e) => updateWidgetRedisHashKey(selectedWidget.id, e.target.value)}
                          placeholder="IC:CTIQ:0"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                          해시키 B <span className="text-slate-300 font-normal normal-case">(오른쪽 테이블 — 예: IC:GROUP:0)</span>
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.item.joinHashKeyB ?? ''}
                          onChange={(e) => updateWidgetJoinHashKeyB(selectedWidget.id, e.target.value)}
                          placeholder="IC:GROUP:0"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                          연결 기준 컬럼 <span className="text-slate-300 font-normal normal-case">(JOIN ON — 예: CTIQ_ID)</span>
                        </label>
                        <input
                          type="text"
                          value={selectedWidget.item.tableConfig?.joinKey ?? ''}
                          onChange={(e) => updateWidgetJoinKey(selectedWidget.id, e.target.value)}
                          placeholder="CTIQ_ID"
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#8b5cf6]"
                        />
                        <p className="text-[9px] text-slate-400 px-1 mt-1">두 테이블에 모두 있는 컬럼명. 이 값이 같은 행끼리 병합됩니다(INNER JOIN — 한쪽에만 있는 행은 제외).</p>
                      </div>
                    </div>
                  )}

                  {/* 테이블 컬럼 — table-queue/table-group/table-agent/table-redis/table-join/table-group-reason/table-skill-reason. 여기서 추가한 필드명이 그대로 WS 구독(또는 Redis 테이블) 컬럼으로 쓰인다. */}
                  {['table-queue', 'table-group', 'table-agent', 'table-redis', 'table-join', 'table-group-reason', 'table-skill-reason'].includes(selectedWidget.item.id) &&
                    selectedWidget.item.tableConfig && (
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                          테이블 컬럼 <span className="text-slate-300 font-normal normal-case">(Redis 필드명 — 예: RTS_LOGIN)</span>
                        </label>
                        <div className="space-y-1 mb-1.5">
                          {selectedWidget.item.tableConfig.columns.map((col, colIdx) => (
                            <div key={col.key} className={`bg-white border border-slate-200 rounded ${col.hidden ? 'opacity-50' : ''}`}>
                              <div className="flex items-center gap-1.5 px-2 py-1">
                                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">{col.key}</span>
                                <span className="text-[10px] text-slate-700 flex-1 min-w-0 truncate">{col.label}</span>
                                <button
                                  onClick={() => moveWidgetTableColumn(selectedWidget.id, col.key, 'up')}
                                  disabled={colIdx === 0}
                                  className="text-slate-300 hover:text-slate-600 text-[10px] flex-shrink-0 disabled:opacity-30 disabled:hover:text-slate-300"
                                  title="위로"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() => moveWidgetTableColumn(selectedWidget.id, col.key, 'down')}
                                  disabled={colIdx === (selectedWidget.item.tableConfig?.columns.length ?? 0) - 1}
                                  className="text-slate-300 hover:text-slate-600 text-[10px] flex-shrink-0 disabled:opacity-30 disabled:hover:text-slate-300"
                                  title="아래로"
                                >
                                  ▼
                                </button>
                                <button
                                  onClick={() => updateWidgetTableColumn(selectedWidget.id, col.key, { hidden: !col.hidden })}
                                  className={`text-[10px] flex-shrink-0 ${col.hidden ? 'text-slate-300 hover:text-slate-500' : 'text-[#0f5b9e]'}`}
                                  title={col.hidden ? '컬럼 사용 안 함 (클릭하면 사용)' : '컬럼 사용 중 (클릭하면 미사용)'}
                                >
                                  {col.hidden ? '☐' : '☑'}
                                </button>
                                <button
                                  onClick={() => setExpandedColKey((k) => (k === col.key ? null : col.key))}
                                  className={`text-[10px] flex-shrink-0 ${expandedColKey === col.key ? 'text-[#0f5b9e]' : 'text-slate-300 hover:text-slate-500'}`}
                                  title="컬럼 스타일"
                                >
                                  ⚙
                                </button>
                                {!['name', 'agents', 'talk', 'wait', 'status', 'count'].includes(col.key) && (
                                  <button
                                    onClick={() => removeWidgetTableColumn(selectedWidget.id, col.key)}
                                    className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0"
                                    title="컬럼 삭제"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                              {expandedColKey === col.key && (
                                <div className="px-2 pb-2 pt-1.5 border-t border-slate-100 space-y-1.5">
                                  {/* 가로 정렬 */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-400 flex-shrink-0 w-10">가로</span>
                                    {[
                                      { value: 'left' as const, label: '좌' },
                                      { value: 'center' as const, label: '중' },
                                      { value: 'right' as const, label: '우' },
                                    ].map((al) => (
                                      <button
                                        key={al.value}
                                        onClick={() => updateWidgetTableColumn(selectedWidget.id, col.key, { align: al.value })}
                                        className={`flex-1 py-0.5 rounded border text-[9px] transition-colors ${
                                          (col.align ?? 'center') === al.value
                                            ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                                        }`}
                                      >
                                        {al.label}
                                      </button>
                                    ))}
                                  </div>
                                  {/* 세로 정렬 — 행 간격이 커져서 행이 높아질 때 위/중간/아래 중 어디 둘지 */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-400 flex-shrink-0 w-10">세로</span>
                                    {[
                                      { value: 'top' as const, label: '위' },
                                      { value: 'middle' as const, label: '중간' },
                                      { value: 'bottom' as const, label: '아래' },
                                    ].map((va) => (
                                      <button
                                        key={va.value}
                                        onClick={() => updateWidgetTableColumn(selectedWidget.id, col.key, { verticalAlign: va.value })}
                                        className={`flex-1 py-0.5 rounded border text-[9px] transition-colors ${
                                          (col.verticalAlign ?? 'middle') === va.value
                                            ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                                        }`}
                                      >
                                        {va.label}
                                      </button>
                                    ))}
                                  </div>
                                  {/* 천단위 콤마 */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-slate-400">천단위 콤마</span>
                                    <button
                                      onClick={() => updateWidgetTableColumn(selectedWidget.id, col.key, { useThousandSep: !col.useThousandSep })}
                                      className={`relative h-4 w-7 rounded-full transition-colors flex-shrink-0 ${col.useThousandSep ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                                    >
                                      <span
                                        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${col.useThousandSep ? 'translate-x-3' : 'translate-x-0'}`}
                                      />
                                    </button>
                                  </div>
                                  {/* 시간 표시 형식 — 컬럼명에 'time'(대소문자 무관)이 포함된 컬럼만 노출. 값을 숫자 그대로 vs 초→HH:MM:SS */}
                                  {/time/i.test(col.key) && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-slate-400 flex-shrink-0 w-10">시간</span>
                                      {[
                                        { value: 'raw' as const, label: '숫자' },
                                        { value: 'hms' as const, label: 'HH:MM:SS' },
                                      ].map((tf) => (
                                        <button
                                          key={tf.value}
                                          onClick={() => updateWidgetTableColumn(selectedWidget.id, col.key, { timeFormat: tf.value })}
                                          className={`flex-1 py-0.5 rounded border text-[9px] transition-colors ${
                                            (col.timeFormat ?? 'raw') === tf.value
                                              ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                              : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                                          }`}
                                        >
                                          {tf.label}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {/* 임계치 색상 */}
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400">임계치 색상</span>
                                      <button
                                        onClick={() => updateWidgetTableColumn(selectedWidget.id, col.key, { thresholdEnabled: !col.thresholdEnabled })}
                                        className={`relative h-4 w-7 rounded-full transition-colors flex-shrink-0 ${col.thresholdEnabled ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                                      >
                                        <span
                                          className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${col.thresholdEnabled ? 'translate-x-3' : 'translate-x-0'}`}
                                        />
                                      </button>
                                    </div>
                                    {col.thresholdEnabled && (
                                      <div className="flex flex-col gap-1 mt-1">
                                        {(col.thresholds ?? []).map((rule, idx) => (
                                          <div key={idx} className="flex items-center gap-1">
                                            <span className="text-[9px] text-slate-400 flex-shrink-0">≥</span>
                                            <input
                                              type="number"
                                              value={rule.min}
                                              onChange={(e) => updateColumnThresholdRule(selectedWidget.id, col.key, idx, { min: Number(e.target.value) })}
                                              className="w-12 text-[10px] border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:border-[#0f5b9e]"
                                            />
                                            <input
                                              type="color"
                                              value={rule.color}
                                              onChange={(e) => updateColumnThresholdRule(selectedWidget.id, col.key, idx, { color: e.target.value })}
                                              className="w-6 h-6 rounded border border-slate-200 cursor-pointer flex-shrink-0"
                                            />
                                            <button
                                              onClick={() => removeColumnThresholdRule(selectedWidget.id, col.key, idx)}
                                              className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0 ml-auto"
                                              title="삭제"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          onClick={() => addColumnThresholdRule(selectedWidget.id, col.key)}
                                          className="text-[9px] font-semibold text-[#0f5b9e] border border-dashed border-[#0f5b9e]/40 rounded py-0.5 hover:bg-[#0f5b9e]/5 transition-colors"
                                        >
                                          + 기준 추가
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {/* 이름 매핑 — 코드값(예: 이석사유 코드)을 그대로 보여주지 않고 등록된 데이터소스의 VALUE→NAME으로 치환 */}
                                  <div>
                                    <span className="text-[9px] text-slate-400 block mb-0.5">이름 매핑 데이터소스 (선택)</span>
                                    <select
                                      value={col.nameLookupDbQueryId ?? ''}
                                      onChange={(e) =>
                                        updateWidgetTableColumn(selectedWidget.id, col.key, { nameLookupDbQueryId: e.target.value ? Number(e.target.value) : undefined })
                                      }
                                      className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                                    >
                                      <option value="">사용 안 함(원본 값 그대로)</option>
                                      {nameLookupCandidateDefs.map((def) => (
                                        <option key={def.dbQueryId} value={def.dbQueryId}>
                                          {def.queryName}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-[9px] text-slate-400 leading-snug mt-0.5">
                                      이 컬럼 값(코드)을 고른 데이터소스의 VALUE와 맞춰 NAME으로 바꿔 보여줍니다(예: 이석사유 코드 → 사유명). 매핑에 없는 값은 원본 그대로.
                                    </p>
                                  </div>
                                  {/* 계산식 — Redis 테이블 전용. 원본 필드 대신 같은 행의 다른 필드들로 계산한 값을 표시 */}
                                  {(selectedWidget.item.id === 'table-redis' || selectedWidget.item.id === 'table-join') && (
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-slate-400">계산식</span>
                                        <button
                                          onClick={() => toggleColumnCalcEnabled(selectedWidget.id, col.key, !col.calc)}
                                          className={`relative h-4 w-7 rounded-full transition-colors flex-shrink-0 ${col.calc ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                                        >
                                          <span
                                            className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${col.calc ? 'translate-x-3' : 'translate-x-0'}`}
                                          />
                                        </button>
                                      </div>
                                      {col.calc && (
                                        <div className="flex flex-col gap-1.5 mt-1 p-2 bg-white rounded border border-slate-200">
                                          <p className="text-[9px] text-slate-400 leading-snug">원본 필드값 대신 같은 행의 다른 필드로 계산한 값을 보여줍니다(예: A / B * 100).</p>
                                          <input
                                            type="text"
                                            value={col.calc.formula}
                                            onChange={(e) => updateColumnCalc(selectedWidget.id, col.key, { formula: e.target.value })}
                                            placeholder="예: A + B"
                                            className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                                          />
                                          <div className="space-y-1">
                                            {col.calc.operands.map((op) => (
                                              <TableColCalcOperandDropZone
                                                key={op.var}
                                                widgetId={selectedWidget.id}
                                                colKey={col.key}
                                                operand={op}
                                                onRemove={() => removeColumnCalcOperand(selectedWidget.id, col.key, op.var)}
                                              />
                                            ))}
                                          </div>
                                          <button
                                            onClick={() => addColumnCalcOperand(selectedWidget.id, col.key)}
                                            disabled={col.calc.operands.length >= 26}
                                            className="py-0.5 rounded border border-dashed border-slate-300 text-[9px] text-slate-500 font-semibold hover:border-[#0f5b9e] hover:text-[#0f5b9e] transition-colors disabled:opacity-40"
                                          >
                                            + 변수 추가
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        {selectedWidget.item.id === 'table-redis' && !!redisColumnIndex[selectedWidget.item.redisHashKey ?? '']?.length && (
                          <p className="text-[9px] text-slate-400 px-1 mb-1 leading-snug">
                            이 해시키에 실제로 존재하는 필드명만 골라 써야 데이터가 보입니다(WS가 등록한 필드명만 서버에서 필터링해 보내므로). 아래 입력에 타이핑하면 자동완성으로
                            제안됩니다.
                          </p>
                        )}
                        <div className="flex gap-1">
                          {selectedWidget.item.id === 'table-redis' ? (
                            <FieldSuggestInput
                              value={newColKey}
                              onChange={setNewColKey}
                              onSelect={(field, ko) => {
                                setNewColKey(field);
                                // 한글 표시명이 있으면 표시명 입력을 자동으로 채워준다(비어있을 때만 — 사용자가 이미 입력했으면 존중)
                                if (ko && !newColLabel.trim()) setNewColLabel(ko);
                              }}
                              fields={columnFieldSuggestions}
                              nameMap={columnFieldNameMap}
                              placeholder={`필드명 (CTIQ_NAME, 행 키 자체는 ${ROW_ID_COLUMN_KEY}, 번호는 ${ROW_NUMBER_COLUMN_KEY})`}
                            />
                          ) : (
                            <input
                              type="text"
                              value={newColKey}
                              onChange={(e) => setNewColKey(e.target.value)}
                              placeholder="필드명 (RTS_LOGIN)"
                              className="w-1/2 px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          )}
                          <input
                            type="text"
                            value={newColLabel}
                            onChange={(e) => setNewColLabel(e.target.value)}
                            placeholder="표시명 (로그인)"
                            className="w-1/2 px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                          />
                          <button
                            onClick={() => {
                              if (!newColKey.trim()) return;
                              addWidgetTableColumn(selectedWidget.id, newColKey.trim(), newColLabel.trim() || newColKey.trim());
                              setNewColKey('');
                              setNewColLabel('');
                            }}
                            className="flex-shrink-0 px-2 py-1 text-[10px] font-bold bg-[#0f5b9e] text-white rounded hover:bg-[#0c4a82]"
                          >
                            + 추가
                          </button>
                        </div>
                      </div>
                    )}

                  {/* 표 설정 — 표 모드에서만(카드·차트에선 행간격/구분선/컬럼숨김 등이 무의미) */}
                  {selectedIsTableMode && ['table-queue', 'table-group', 'table-agent', 'table-redis'].includes(selectedWidget.item.id) && selectedWidget.item.tableConfig && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">표 설정</label>
                      <div>
                        <label className="text-[9px] text-slate-400 block mb-0.5">행 간격(px)</label>
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={selectedWidget.item.tableConfig.rowGap ?? 0}
                          onChange={(e) => updateWidgetTableConfig(selectedWidget.id, { rowGap: Math.max(0, Number(e.target.value)) })}
                          className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                        캔버스 표 헤더 칸 우측 경계를 마우스로 드래그하면 그 컬럼의 너비가 늘어나고, 너비를 지정하지 않은 다른 컬럼들은 남은 공간을 자기들끼리 나눠 가지면서
                        자동으로 좁아집니다(예: A를 넓게 늘리면 &ldquo;A-----B-C&rdquo; 형태가 돼요).
                      </p>
                      <div className="flex items-center justify-between mt-2 py-1 px-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-600 font-semibold">컬럼명 전체 숨기기 (데이터는 계속 표시)</span>
                        <button
                          onClick={() => updateWidgetTableConfig(selectedWidget.id, { hideColumnLabels: !selectedWidget.item.tableConfig?.hideColumnLabels })}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.item.tableConfig.hideColumnLabels ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.item.tableConfig.hideColumnLabels ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 py-1 px-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-600 font-semibold">행 구분선 표시</span>
                        <button
                          onClick={() => updateWidgetTableConfig(selectedWidget.id, { showBorder: selectedWidget.item.tableConfig?.showBorder === false })}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.item.tableConfig.showBorder === false ? 'bg-slate-200' : 'bg-[#0f5b9e]'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.item.tableConfig.showBorder === false ? 'translate-x-0' : 'translate-x-4'}`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2 py-1 px-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-600 font-semibold">행 번호 컬럼 표시 (#)</span>
                        <button
                          onClick={() => {
                            const cols = selectedWidget.item.tableConfig?.columns ?? [];
                            const hasRowNum = cols.some((c) => c.key === ROW_NUMBER_COLUMN_KEY);
                            updateWidgetTableConfig(selectedWidget.id, {
                              columns: hasRowNum
                                ? cols.filter((c) => c.key !== ROW_NUMBER_COLUMN_KEY)
                                : [{ key: ROW_NUMBER_COLUMN_KEY, label: '#', width: '6%', align: 'center' as const }, ...cols],
                            });
                          }}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.item.tableConfig?.columns.some((c) => c.key === ROW_NUMBER_COLUMN_KEY) ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.item.tableConfig?.columns.some((c) => c.key === ROW_NUMBER_COLUMN_KEY) ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                      {selectedWidget.item.tableConfig.showBorder !== false && (
                        <div className="mt-1.5">
                          <label className="text-[9px] text-slate-400 block mb-0.5">구분선 두께(px)</label>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={selectedWidget.item.tableConfig.borderWidth ?? 1}
                            onChange={(e) => updateWidgetTableConfig(selectedWidget.id, { borderWidth: Math.max(1, Number(e.target.value)) })}
                            className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2 py-1 px-2 bg-white rounded border border-slate-200">
                        <span className="text-[10px] text-slate-600 font-semibold">빈 행 숨기기</span>
                        <button
                          onClick={() => updateWidgetTableConfig(selectedWidget.id, { hideEmptyRows: !selectedWidget.item.tableConfig?.hideEmptyRows })}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.item.tableConfig?.hideEmptyRows ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.item.tableConfig?.hideEmptyRows ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PIVOT — table-redis 전용, rowKey+colKey를 지정하면 PIVOT 렌더 활성화 */}
                  {selectedIsTableMode && selectedWidget.item.id === 'table-redis' && selectedWidget.item.tableConfig && (
                    <div className="mt-2">
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">PIVOT</label>
                      <div className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-200">
                        <p className="text-[9px] text-slate-400 leading-tight">행 키·컬럼 키를 모두 입력하면 PIVOT 표시 활성화. 비우면 flat 테이블로 표시.</p>
                        <div>
                          <label className="text-[9px] text-slate-400 block mb-0.5">행 키 (rowKey — 예: NODE_ID)</label>
                          <input
                            type="text"
                            placeholder="예: NODE_ID"
                            value={selectedWidget.item.tableConfig.pivot?.rowKey ?? ''}
                            onChange={(e) =>
                              updateWidgetTableConfig(selectedWidget.id, { pivot: { ...selectedWidget.item.tableConfig?.pivot, rowKey: e.target.value || undefined } })
                            }
                            className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block mb-0.5">컬럼 키 (colKey — 예: REASON_CODE)</label>
                          <input
                            type="text"
                            placeholder="예: REASON_CODE"
                            value={selectedWidget.item.tableConfig.pivot?.colKey ?? ''}
                            onChange={(e) =>
                              updateWidgetTableConfig(selectedWidget.id, { pivot: { ...selectedWidget.item.tableConfig?.pivot, colKey: e.target.value || undefined } })
                            }
                            className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 block mb-0.5">값 키 (valueKey — 예: AGENT_CNT)</label>
                          <input
                            type="text"
                            placeholder="예: AGENT_CNT"
                            value={selectedWidget.item.tableConfig.pivot?.valueKey ?? ''}
                            onChange={(e) =>
                              updateWidgetTableConfig(selectedWidget.id, { pivot: { ...selectedWidget.item.tableConfig?.pivot, valueKey: e.target.value || undefined } })
                            }
                            className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                          />
                        </div>
                        {selectedWidget.item.tableConfig.pivot?.rowKey && selectedWidget.item.tableConfig.pivot?.colKey && (
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">컬럼 설정 (값 · 라벨 · 넓이 · 숨김)</label>
                            {(selectedWidget.item.tableConfig.pivot.colDefs ?? []).map((def, di) => {
                              const updateDef = (patch: Partial<typeof def>) => {
                                const next = [...(selectedWidget.item.tableConfig!.pivot!.colDefs ?? [])];
                                next[di] = { ...next[di], ...patch };
                                updateWidgetTableConfig(selectedWidget.id, { pivot: { ...selectedWidget.item.tableConfig!.pivot, colDefs: next } });
                              };
                              const widthNum = def.width ? parseInt(def.width) : '';
                              return (
                                <div key={di} className={`rounded border mb-1 p-1 ${def.hidden ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 bg-white'}`}>
                                  {/* 1행: 값 | 라벨 | 눈아이콘 | × */}
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="text"
                                      placeholder="값"
                                      title="colKey 원본 값 (예: 0, 1)"
                                      value={def.key}
                                      onChange={(e) => updateDef({ key: e.target.value })}
                                      className="w-9 px-1 py-0.5 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                                    />
                                    <input
                                      type="text"
                                      placeholder="라벨"
                                      value={def.label}
                                      onChange={(e) => updateDef({ label: e.target.value })}
                                      className="flex-1 min-w-0 px-1 py-0.5 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                                    />
                                    {/* 숨김/표시 토글 */}
                                    <button
                                      title={def.hidden ? '숨김 — 클릭하면 표시' : '표시 — 클릭하면 숨김'}
                                      onClick={() => updateDef({ hidden: !def.hidden })}
                                      className={`flex-shrink-0 p-0.5 rounded transition-colors ${def.hidden ? 'text-slate-300 hover:text-slate-500' : 'text-[#0f5b9e] hover:text-[#0c4a82]'}`}
                                    >
                                      {def.hidden ? (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                                          />
                                          <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                          <circle cx="12" cy="12" r="3" />
                                        </svg>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const next = (selectedWidget.item.tableConfig!.pivot!.colDefs ?? []).filter((_, i) => i !== di);
                                        updateWidgetTableConfig(selectedWidget.id, { pivot: { ...selectedWidget.item.tableConfig!.pivot, colDefs: next } });
                                      }}
                                      className="flex-shrink-0 text-red-400 hover:text-red-600 text-[11px] leading-none"
                                    >
                                      ×
                                    </button>
                                  </div>
                                  {/* 2행: 넓이(%) */}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] text-slate-400 flex-shrink-0">넓이</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={100}
                                      placeholder="–"
                                      title="컬럼 넓이 % (예: 15)"
                                      value={widthNum}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        updateDef({ width: v ? `${v}%` : undefined });
                                      }}
                                      className="w-12 px-1 py-0 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                                    />
                                    <span className="text-[9px] text-slate-400">%</span>
                                  </div>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => {
                                const next = [...(selectedWidget.item.tableConfig!.pivot!.colDefs ?? []), { key: '', label: '' }];
                                updateWidgetTableConfig(selectedWidget.id, { pivot: { ...selectedWidget.item.tableConfig!.pivot, colDefs: next } });
                              }}
                              className="mt-0.5 text-[10px] text-[#0f5b9e] hover:underline"
                            >
                              + 컬럼명 추가
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 정렬 / TOP N — 숫자로 표시되는 컬럼 기준 내림차순/오름차순 정렬 + 상위 N개만 표시 */}
                  {['table-queue', 'table-group', 'table-agent', 'table-redis'].includes(selectedWidget.item.id) && selectedWidget.item.tableConfig && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">정렬 / TOP N</label>
                      <div className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-200">
                        <div>
                          <label className="text-[9px] text-slate-400 block mb-0.5">정렬 기준 컬럼</label>
                          <select
                            value={selectedWidget.item.tableConfig.sortKey ?? ''}
                            onChange={(e) => updateWidgetTableConfig(selectedWidget.id, { sortKey: e.target.value || undefined })}
                            className="w-full px-1.5 py-1 text-[10px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
                          >
                            <option value="">정렬 안 함(원본 순서)</option>
                            {selectedWidget.item.tableConfig.columns.map((col) => (
                              <option key={col.key} value={col.key}>
                                {col.label} ({col.key})
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedWidget.item.tableConfig.sortKey && (
                          <div className="flex gap-1">
                            {(
                              [
                                { value: 'desc' as const, label: '내림차순(큰 값 먼저)' },
                                { value: 'asc' as const, label: '오름차순(작은 값 먼저)' },
                              ] as const
                            ).map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => updateWidgetTableConfig(selectedWidget.id, { sortOrder: opt.value })}
                                className={`flex-1 py-1 rounded border text-[9px] font-semibold transition-colors ${
                                  (selectedWidget.item.tableConfig?.sortOrder ?? 'desc') === opt.value
                                    ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                        <div>
                          <label className="text-[9px] text-slate-400 block mb-0.5">표시 개수(TOP N)</label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateWidgetTableConfig(selectedWidget.id, { limit: undefined })}
                              className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                                !selectedWidget.item.tableConfig?.limit
                                  ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                              }`}
                            >
                              전체
                            </button>
                            {[3, 5, 10, 20].map((n) => (
                              <button
                                key={n}
                                onClick={() => updateWidgetTableConfig(selectedWidget.id, { limit: n })}
                                className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                                  selectedWidget.item.tableConfig?.limit === n
                                    ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                                }`}
                              >
                                TOP {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* [삭제 2026-07-10] 미디어타입 패널 — 옛 table-queue/group/agent 전용. 미디어타입은 데이터소스(placeholderName='mediatype')로 이동. */}

                  {/* 차트 종류 — 표시 방식이 차트일 때만 */}
                  {selectedWidget.item.tableConfig && selectedWidget.item.displayType === 'chart' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">차트 종류</label>
                      <div className="grid grid-cols-3 gap-1">
                        {CHART_TYPE_OPTIONS.map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => updateWidgetChartType(selectedWidget.id, value)}
                            className={`py-1 px-0.5 rounded border text-[10px] font-semibold transition-colors truncate ${
                              (selectedWidget.item.chartConfig?.chartType ?? 'bar') === value
                                ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 차트 색상 — 표시 방식이 차트일 때만 */}
                  {selectedWidget.item.tableConfig && selectedWidget.item.displayType === 'chart' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">차트 색상</label>
                      <div className="flex gap-1 mb-1.5">
                        {(
                          [
                            { label: '무지개', value: 'rainbow' as const },
                            { label: '직접 선택', value: 'custom' as const },
                          ] as const
                        ).map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => updateWidgetChartConfig(selectedWidget.id, { colorMode: value })}
                            className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                              (selectedWidget.item.chartConfig?.colorMode ?? 'rainbow') === value
                                ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {selectedWidget.item.chartConfig?.colorMode === 'custom' && (
                        <div className="flex gap-1 flex-wrap">
                          {(selectedWidget.item.chartConfig.chartType === 'pie' || selectedWidget.item.chartConfig.chartType === 'donut'
                            ? (selectedWidget.item.chartConfig.sampleData ?? [])
                            : [{ name: '값' }]
                          ).map((d, idx) => (
                            <div key={idx} className="flex-1 min-w-[48px]">
                              <span className="text-[9px] text-slate-400 block truncate mb-0.5">{d.name}</span>
                              <input
                                type="color"
                                value={selectedWidget.item.chartConfig?.colors?.[idx] ?? CHART_COLORS_LIST[idx % CHART_COLORS_LIST.length]}
                                onChange={(e) => updateWidgetChartColorAt(selectedWidget.id, idx, e.target.value)}
                                className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 값 정렬 */}
                  {selectedWidget.item.displayType !== 'table' && selectedWidget.item.displayType !== 'chart' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">값 정렬</label>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueAlign: align })}
                            className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${(selectedWidget.style.valueAlign ?? 'left') === align ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'}`}
                          >
                            {align === 'left' ? '← 좌' : align === 'center' ? '≡ 중' : '→ 우'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 값 위치 세밀조정 — valueAlign으로 큰 정렬을 잡은 뒤 px 단위로 상하좌우 미세 이동 */}
                  {selectedWidget.item.displayType !== 'table' && selectedWidget.item.displayType !== 'chart' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">값 위치 세밀조정</label>
                        {((selectedWidget.style.valueOffsetX ?? 0) !== 0 || (selectedWidget.style.valueOffsetY ?? 0) !== 0) && (
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueOffsetX: 0, valueOffsetY: 0 })}
                            className="text-[9px] text-slate-400 hover:text-red-500 font-semibold"
                          >
                            초기화
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-200">
                        {/* 상하좌우 방향패드 */}
                        <div className="grid grid-cols-3 gap-0.5 w-[84px] flex-shrink-0">
                          <span />
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueOffsetY: (selectedWidget.style.valueOffsetY ?? 0) - 1 })}
                            title="위로 1px"
                            className="h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-[#0f5b9e] text-[10px]"
                          >
                            ▲
                          </button>
                          <span />
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueOffsetX: (selectedWidget.style.valueOffsetX ?? 0) - 1 })}
                            title="왼쪽으로 1px"
                            className="h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-[#0f5b9e] text-[10px]"
                          >
                            ◀
                          </button>
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueOffsetX: 0, valueOffsetY: 0 })}
                            title="가운데로(초기화)"
                            className="h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:bg-slate-100 text-[9px]"
                          >
                            ●
                          </button>
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueOffsetX: (selectedWidget.style.valueOffsetX ?? 0) + 1 })}
                            title="오른쪽으로 1px"
                            className="h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-[#0f5b9e] text-[10px]"
                          >
                            ▶
                          </button>
                          <span />
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueOffsetY: (selectedWidget.style.valueOffsetY ?? 0) + 1 })}
                            title="아래로 1px"
                            className="h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-[#0f5b9e] text-[10px]"
                          >
                            ▼
                          </button>
                          <span />
                        </div>
                        {/* 직접 입력 */}
                        <div className="flex flex-col gap-1">
                          <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-3">X</span>
                            <input
                              type="number"
                              step={1}
                              value={selectedWidget.style.valueOffsetX ?? 0}
                              onChange={(e) => updateWidgetStyle(selectedWidget.id, { valueOffsetX: Number(e.target.value) || 0 })}
                              className="w-14 text-[10px] font-mono border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#0f5b9e]"
                            />
                            <span className="text-slate-400">px</span>
                          </label>
                          <label className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="w-3">Y</span>
                            <input
                              type="number"
                              step={1}
                              value={selectedWidget.style.valueOffsetY ?? 0}
                              onChange={(e) => updateWidgetStyle(selectedWidget.id, { valueOffsetY: Number(e.target.value) || 0 })}
                              className="w-14 text-[10px] font-mono border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-[#0f5b9e]"
                            />
                            <span className="text-slate-400">px</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1000단위 콤마 */}
                  {selectedWidget.item.displayType !== 'table' && selectedWidget.item.displayType !== 'chart' && (
                    <div className="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-600 font-semibold">1000단위 콤마</span>
                        <span className="text-[9px] text-slate-400 ml-1">(숫자만)</span>
                      </div>
                      <button
                        onClick={() => updateWidgetStyle(selectedWidget.id, { useThousandSep: !selectedWidget.style.useThousandSep })}
                        className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.style.useThousandSep ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.style.useThousandSep ? 'translate-x-4' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                  )}

                  {/* 값 변경 애니메이션 — 테이블은 셀 단위로 동일 효과 적용(AnimatedTableCell) */}
                  {selectedWidget.item.displayType !== 'chart' && !isAnnouncementWidget(selectedWidget) && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">값 변경 애니메이션</label>
                      <div className="grid grid-cols-3 gap-1">
                        {VALUE_CHANGE_ANIMATIONS.map((a) => (
                          <button
                            key={a.value}
                            onClick={() => updateWidgetStyle(selectedWidget.id, { valueChangeAnimation: a.value })}
                            className={`py-1 rounded border text-[10px] font-semibold transition-colors ${
                              (selectedWidget.style.valueChangeAnimation ?? 'none') === a.value
                                ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                            }`}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                      {selectedWidget.style.valueChangeAnimation === 'highlight' && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-slate-500">하이라이트 색상</span>
                          <input
                            type="color"
                            value={selectedWidget.style.highlightColor ?? '#ffd633'}
                            onChange={(e) => updateWidgetStyle(selectedWidget.id, { highlightColor: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer flex-shrink-0"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 임계치 색상 — 값이 기준 이상이면 지정한 색으로 표시(여러 구간 등록 가능) */}
                  {selectedWidget.item.displayType !== 'table' && selectedWidget.item.displayType !== 'chart' && !isAnnouncementWidget(selectedWidget) && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">임계치 색상</label>
                        <button
                          onClick={() => updateWidgetStyle(selectedWidget.id, { thresholdEnabled: !selectedWidget.style.thresholdEnabled })}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.style.thresholdEnabled ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.style.thresholdEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                      {selectedWidget.style.thresholdEnabled && (
                        <div className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-200">
                          <p className="text-[9px] text-slate-400 leading-snug">값이 기준 이상이면 지정한 색으로 표시됩니다. (예: 5 이상 노랑, 10 이상 빨강)</p>
                          {(selectedWidget.style.thresholds ?? []).map((rule, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 flex-shrink-0">≥</span>
                              <input
                                type="number"
                                value={rule.min}
                                onChange={(e) => updateThresholdRule(selectedWidget.id, idx, { min: Number(e.target.value) })}
                                className="w-16 text-[11px] border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-[#0f5b9e]"
                              />
                              <input
                                type="color"
                                value={rule.color}
                                onChange={(e) => updateThresholdRule(selectedWidget.id, idx, { color: e.target.value })}
                                className="w-7 h-7 rounded border border-slate-200 cursor-pointer flex-shrink-0"
                              />
                              <span className="text-[10px] text-slate-400 flex-1 min-w-0 truncate">이상</span>
                              <button onClick={() => removeThresholdRule(selectedWidget.id, idx)} className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0" title="삭제">
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => addThresholdRule(selectedWidget.id)}
                            className="text-[10px] font-semibold text-[#0f5b9e] border border-dashed border-[#0f5b9e]/40 rounded py-1 hover:bg-[#0f5b9e]/5 transition-colors"
                          >
                            + 기준 추가
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 공지 키 선택 — noticeId 없는 공지 위젯(전체/키 필터) 전용 */}
                  {isAnnouncementWidget(selectedWidget) && !selectedWidget.item.noticeId && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">공지 키</label>
                      <NoticeKeyPanel noticeKey={selectedWidget.noticeKey} onChange={(key) => updateWidgetMeta(selectedWidget.id, { noticeKey: key })} />
                    </div>
                  )}

                  {/* 슬라이드 속도 — 공지사항 위젯(키 그룹/1건 고정 공통). 회전 전환 주기 + 마퀴 흐름 속도에 같이 적용 */}
                  {isAnnouncementWidget(selectedWidget) && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                        슬라이드 속도(초) <span className="text-slate-300 font-normal normal-case">(여러 건 회전 주기 + 글자 흐름 속도)</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        step={0.5}
                        value={selectedWidget.slideIntervalSec ?? 5}
                        onChange={(e) => updateWidgetMeta(selectedWidget.id, { slideIntervalSec: Math.max(1, Math.min(60, Number(e.target.value) || 5)) })}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white"
                      />
                    </div>
                  )}

                  {/* 사용자 지정 시계 포맷 — item.id='etc-custom' 전용 */}
                  {selectedWidget.item.id === 'etc-custom' && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">시계 포맷</label>
                      {/* 빠른 프리셋 — 24시간제 / 오전·오후(AM·PM) */}
                      <div className="flex gap-1 mb-1.5">
                        {[
                          { label: '24시간', value: DEFAULT_CUSTOM_CLOCK_FORMAT },
                          { label: '오전·오후', value: AMPM_CLOCK_FORMAT },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => updateWidgetMeta(selectedWidget.id, { clockFormat: preset.value })}
                            className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                              (selectedWidget.clockFormat ?? DEFAULT_CUSTOM_CLOCK_FORMAT) === preset.value
                                ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={selectedWidget.clockFormat ?? DEFAULT_CUSTOM_CLOCK_FORMAT}
                        onChange={(e) => updateWidgetMeta(selectedWidget.id, { clockFormat: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e] bg-white font-mono"
                        placeholder={DEFAULT_CUSTOM_CLOCK_FORMAT}
                      />
                      <p className="text-[9px] text-slate-400 mt-1 leading-snug">
                        토큰: <span className="font-mono text-slate-500">yyyy</span> 연도 · <span className="font-mono text-slate-500">mm</span> 월 ·{' '}
                        <span className="font-mono text-slate-500">dd</span> 일 · <span className="font-mono text-slate-500">hh24</span> 시(0~23) ·{' '}
                        <span className="font-mono text-slate-500">hh12</span> 시(1~12) · <span className="font-mono text-slate-500">mi</span> 분 ·{' '}
                        <span className="font-mono text-slate-500">ss</span> 초 · <span className="font-mono text-slate-500">ampm</span> AM/PM ·{' '}
                        <span className="font-mono text-slate-500">apk</span> 오전/오후. 그 외 글자는 그대로 표시됩니다.
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono bg-slate-50 border border-slate-200 rounded px-2 py-1">
                        {formatCustomClock(new Date(), selectedWidget.clockFormat ?? DEFAULT_CUSTOM_CLOCK_FORMAT)}
                      </p>
                    </div>
                  )}

                  {/* 그룹별 합계 — 단일값 Redis 위젯 전용. redisField로 행 1개를 직접 가리키는 대신,
                    해시 전체를 byKey로 묶어 matchValue와 일치하는 그룹의 aggKey 합계를 보여준다.
                    (Redis 테이블의 그룹별 합계와 동일 로직 — 결과를 1개 숫자로 표시) */}
                  {selectedWidget.item.category === 'Redis' && !!selectedWidget.item.redisHashKey && selectedWidget.item.displayType !== 'table' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">그룹별 합계</label>
                        <button
                          onClick={() => updateWidgetItemGroupBy(selectedWidget.id, selectedWidget.item.groupBy ? undefined : { byKey: '', aggKey: '', matchValue: '' })}
                          className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.item.groupBy ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.item.groupBy ? 'translate-x-4' : 'translate-x-0'}`}
                          />
                        </button>
                      </div>
                      {selectedWidget.item.groupBy && (
                        <div className="flex flex-col gap-1.5 p-2 bg-white rounded border border-slate-200">
                          <p className="text-[9px] text-slate-400 leading-snug">
                            이 해시(redisHashKey)의 모든 행을 기준 필드 값으로 묶어, 일치값과 같은 그룹의 합계 필드를 더한 숫자 1개를 보여줍니다.
                          </p>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">기준 필드 (예: REASON_CODE)</label>
                            <input
                              type="text"
                              value={selectedWidget.item.groupBy.byKey}
                              onChange={(e) =>
                                updateWidgetItemGroupBy(selectedWidget.id, { ...(selectedWidget.item.groupBy ?? { byKey: '', aggKey: '', matchValue: '' }), byKey: e.target.value })
                              }
                              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">일치값 (예: 5)</label>
                            <input
                              type="text"
                              value={selectedWidget.item.groupBy.matchValue}
                              onChange={(e) =>
                                updateWidgetItemGroupBy(selectedWidget.id, {
                                  ...(selectedWidget.item.groupBy ?? { byKey: '', aggKey: '', matchValue: '' }),
                                  matchValue: e.target.value,
                                })
                              }
                              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-0.5">합계 필드 (예: AGENT_CNT)</label>
                            <input
                              type="text"
                              value={selectedWidget.item.groupBy.aggKey}
                              onChange={(e) =>
                                updateWidgetItemGroupBy(selectedWidget.id, {
                                  ...(selectedWidget.item.groupBy ?? { byKey: '', aggKey: '', matchValue: '' }),
                                  aggKey: e.target.value,
                                })
                              }
                              className="w-full px-1.5 py-1 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 집계 방식 — Redis 위젯 전용 (해시 그룹이 없으면 자기 자신 값만으로 집계) */}
                  {selectedWidget.item.category === 'Redis' && !!selectedWidget.item.redisHashKey && (
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                        집계 방식{' '}
                        <span className="text-slate-300 font-normal normal-case">
                          ({selectedWidget.item.hashSiblingKeys?.length ? `${selectedWidget.item.hashSiblingKeys.length}개 키` : '1개 키'})
                        </span>
                      </label>
                      <div className="flex gap-1">
                        {(
                          [
                            { label: '없음', value: 'none' as const },
                            { label: '∑ 합계', value: 'sum' as const },
                            { label: '↑ 최대', value: 'max' as const },
                            { label: '↓ 최소', value: 'min' as const },
                            { label: '⌀ 평균', value: 'avg' as const },
                          ] as const
                        ).map(({ label, value }) => (
                          <button
                            key={value}
                            onClick={() => updateWidgetMeta(selectedWidget.id, { aggregation: value })}
                            className={`flex-1 py-1 rounded border text-[9px] font-semibold transition-colors ${
                              (selectedWidget.aggregation ?? 'none') === value
                                ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 계산식 위젯 설정 — 수식 입력 + 캔버스 위젯을 드래그해 변수(A,B,C...)에 연결 */}
                  {selectedWidget.item.category === 'Calc' && (
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">수식</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={selectedWidget.calc?.formula ?? ''}
                            onChange={(e) => updateWidgetCalc(selectedWidget.id, { formula: e.target.value })}
                            placeholder="예: A * 1.5 + B"
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                          />
                          <button
                            onClick={() => {
                              const declaredVars = (selectedWidget.calc?.operands ?? []).map((op) => op.var);
                              const result = validateFormula(selectedWidget.calc?.formula ?? '', declaredVars);
                              if (result.ok) {
                                toast.success(`수식 검증 성공 (변수 1일 때 결과: ${result.sampleResult})`);
                              } else {
                                toast.error(`수식 검증 실패: ${result.message}`);
                              }
                            }}
                            className="flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold rounded border border-slate-200 text-slate-600 hover:border-[#0f5b9e] hover:text-[#0f5b9e] transition-colors"
                          >
                            검증
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">
                          변수 <span className="text-slate-300 font-normal normal-case">(캔버스 위젯의 🔗 또는 좌측 Redis 항목을 드래그해서 연결)</span>
                        </label>
                        <div className="space-y-1">
                          {(selectedWidget.calc?.operands ?? []).map((op) => {
                            let label: string | undefined;
                            if (op.widgetId) {
                              const boundWidget = droppedWidgets.find((w) => w.id === op.widgetId);
                              label = boundWidget ? (boundWidget.customTitle ?? boundWidget.item.label) : '(삭제된 위젯)';
                            } else if (op.source) {
                              label = op.source.label;
                            }
                            return (
                              <CalcOperandDropZone
                                key={op.var}
                                calcWidgetId={selectedWidget.id}
                                operand={op}
                                label={label}
                                onRemove={() => removeCalcOperand(selectedWidget.id, op.var)}
                                onAggregationChange={(aggregation) => updateCalcOperandAggregation(selectedWidget.id, op.var, aggregation)}
                              />
                            );
                          })}
                        </div>
                        <button
                          onClick={() => addCalcOperand(selectedWidget.id)}
                          disabled={(selectedWidget.calc?.operands.length ?? 0) >= 26}
                          className="mt-1.5 w-full py-1 rounded border border-dashed border-slate-300 text-[10px] text-slate-500 font-semibold hover:border-[#0f5b9e] hover:text-[#0f5b9e] transition-colors disabled:opacity-40"
                        >
                          + 변수 추가
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">소수점 자릿수</label>
                        <input
                          type="number"
                          min={0}
                          max={6}
                          value={selectedWidget.calc?.decimals ?? 1}
                          onChange={(e) => updateWidgetCalc(selectedWidget.id, { decimals: Math.max(0, Math.min(6, Number(e.target.value) || 0)) })}
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">% 표시</label>
                          <button
                            onClick={() => updateWidgetCalc(selectedWidget.id, { showPercent: !selectedWidget.calc?.showPercent })}
                            className={`relative flex-shrink-0 h-5 w-9 rounded-full transition-colors ${selectedWidget.calc?.showPercent ? 'bg-[#0f5b9e]' : 'bg-slate-200'}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWidget.calc?.showPercent ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                          </button>
                        </div>
                        {selectedWidget.calc?.showPercent && (
                          <div>
                            <label className="text-[10px] text-slate-400 font-normal normal-case block mb-1">% 크기 (값 폰트 대비 배율 — 폰트는 값과 동일)</label>
                            <input
                              type="number"
                              min={0.3}
                              max={1.5}
                              step={0.05}
                              value={selectedWidget.calc?.percentFontScale ?? 0.65}
                              onChange={(e) => updateWidgetCalc(selectedWidget.id, { percentFontScale: Math.max(0.3, Math.min(1.5, Number(e.target.value) || 0.65)) })}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                            />
                          </div>
                        )}
                      </div>
                      {!!selectedWidget.calc?.formula.trim() && (
                        <div className="text-[10px] text-slate-400">
                          결과 미리보기: <span className="font-mono text-slate-600">{getCalcDisplayValue(selectedWidget, droppedWidgets)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 외부 API 위젯 속성 */}
                  {selectedWidget.item.category === 'ExternalApi' && (
                    <ExternalApiWidgetProps widget={selectedWidget} onUpdate={(patch) => updateWidgetExternalApi(selectedWidget.id, patch)} />
                  )}

                  {/* DB Query 위젯 속성 */}
                  {selectedWidget.item.category === 'DbQuery' && <DbQueryWidgetProps widget={selectedWidget} onUpdate={(patch) => updateWidgetDbQuery(selectedWidget.id, patch)} />}

                  {/* 웹 임베드 위젯 속성 */}
                  {selectedWidget.item.category === 'WebEmbed' && (
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">웹 임베드 설정</p>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">URL</label>
                        <input
                          type="text"
                          value={selectedWidget.item.webEmbedUrl ?? ''}
                          onChange={(e) => updateWidgetWebEmbed(selectedWidget.id, { webEmbedUrl: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full px-2 py-1.5 text-[10px] font-mono border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#0f5b9e]"
                        />
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-snug">
                          YouTube 시청 URL은 음소거 임베드 플레이어로 자동 변환. 일반 사이트는 iframe 허용 시에만 표시됩니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── 텍스트 스타일 ── */}
                  <div className="border-t border-slate-100 pt-2">
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">텍스트 스타일</p>

                    {/* 폰트 크기 + 굵기 */}
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">폰트 크기</label>
                        <select
                          value={selectedWidget.style.fontSize}
                          onChange={(e) => updateWidgetStyle(selectedWidget.id, { fontSize: Number(e.target.value) })}
                          className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#0f5b9e]"
                        >
                          {FONT_SIZES.map((s) => (
                            <option key={s} value={s}>
                              {s}px
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 폰트 굵기 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">폰트 굵기</label>
                      <div className="flex gap-1">
                        {FONT_WEIGHTS.map((fw) => (
                          <button
                            key={fw.value}
                            onClick={() => updateWidgetStyle(selectedWidget.id, { fontWeight: fw.value })}
                            className={`flex-1 py-1 rounded border text-[10px] transition-colors ${(selectedWidget.style.fontWeight ?? 'normal') === fw.value ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'}`}
                            style={{ fontWeight: fw.value }}
                          >
                            {fw.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 폰트 패밀리 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">폰트</label>
                      <select
                        value={selectedWidget.style.fontFamily}
                        onChange={(e) => updateWidgetStyle(selectedWidget.id, { fontFamily: e.target.value })}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#0f5b9e]"
                      >
                        {FONT_FAMILIES.map((f) => (
                          <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <div
                        className="mt-1 px-2 py-1 bg-slate-800 rounded text-center text-white"
                        style={{ fontFamily: selectedWidget.style.fontFamily, fontSize: 16, fontWeight: selectedWidget.style.fontWeight ?? 'normal' }}
                      >
                        Aa 가나다 123
                      </div>
                    </div>

                    {/* 색상 */}
                    <div className="flex gap-2 items-center mb-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">텍스트</label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={selectedWidget.style.color}
                            onChange={(e) => updateWidgetStyle(selectedWidget.id, { color: e.target.value })}
                            className="flex-1 min-w-0 h-7 rounded border border-slate-200 cursor-pointer"
                          />
                          <button
                            onClick={() => handlePickColorFromScreen('color', selectedWidget.id)}
                            title="스포이드로 화면에서 색상 추출 (Chrome/Edge 전용)"
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0f5b9e] hover:border-[#0f5b9e] transition-colors"
                          >
                            <Pipette className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">배경</label>
                        <div className="flex gap-1">
                          <input
                            type="color"
                            value={selectedWidget.style.bgColor.startsWith('rgba') ? '#000000' : selectedWidget.style.bgColor}
                            onChange={(e) => updateWidgetStyle(selectedWidget.id, { bgColor: e.target.value })}
                            className="flex-1 min-w-0 h-7 rounded border border-slate-200 cursor-pointer"
                          />
                          <button
                            onClick={() => handlePickColorFromScreen('bgColor', selectedWidget.id)}
                            title="스포이드로 화면에서 색상 추출 (Chrome/Edge 전용)"
                            className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0f5b9e] hover:border-[#0f5b9e] transition-colors"
                          >
                            <Pipette className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 배경 프리셋 */}
                    <div className="flex gap-1 flex-wrap mb-2">
                      {[{ label: '불투명 흰색', value: '#ffffff' }].map((p) => {
                        const isActive = selectedWidget.style.bgColor === p.value;
                        return (
                          <button
                            key={p.value}
                            onClick={() => updateWidgetStyle(selectedWidget.id, { bgColor: p.value })}
                            className={`text-[9px] px-2 py-1 rounded border transition-colors ${isActive ? 'border-[#0f5b9e] bg-[#0f5b9e]/10 text-[#0f5b9e] font-semibold' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f5b9e] hover:text-[#0f5b9e]'}`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                      {(() => {
                        const isTextOnly = selectedWidget.style.bgColor === 'rgba(0,0,0,0)' && selectedWidget.style.borderWidth === 0 && selectedWidget.style.shadow === 'none';
                        return (
                          <button
                            onClick={() => updateWidgetStyle(selectedWidget.id, { bgColor: 'rgba(0,0,0,0)', borderWidth: 0, shadow: 'none' })}
                            className={`text-[9px] px-2 py-1 rounded border transition-colors font-semibold ${isTextOnly ? 'border-[#0f5b9e] bg-[#0f5b9e]/10 text-[#0f5b9e]' : 'border-dashed border-slate-400 bg-white text-slate-700 hover:border-[#0f5b9e] hover:text-[#0f5b9e]'}`}
                          >
                            텍스트만
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ── 박스 스타일 ── */}
                  <div className="border-t border-slate-100 pt-2">
                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">박스 스타일</p>

                    {/* 모서리 둥글기 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                        모서리 둥글기
                        <span className="ml-1 text-slate-400 font-normal">{selectedWidget.style.borderRadius ?? 8}px</span>
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={32}
                        value={selectedWidget.style.borderRadius ?? 8}
                        onChange={(e) => updateWidgetStyle(selectedWidget.id, { borderRadius: Number(e.target.value) })}
                        className="w-full accent-[#0f5b9e]"
                      />
                    </div>

                    {/* 불투명도 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">
                        불투명도
                        <span className="ml-1 text-slate-400 font-normal">{selectedWidget.style.opacity ?? 100}%</span>
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={selectedWidget.style.opacity ?? 100}
                        onChange={(e) => updateWidgetStyle(selectedWidget.id, { opacity: Number(e.target.value) })}
                        className="w-full accent-[#0f5b9e]"
                      />
                    </div>

                    {/* 그림자 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">그림자</label>
                      <div className="flex gap-1">
                        {SHADOW_PRESETS.map((sp) => (
                          <button
                            key={sp.value}
                            onClick={() => updateWidgetStyle(selectedWidget.id, { shadow: sp.value })}
                            className={`flex-1 py-1 rounded border text-[9px] font-semibold transition-colors ${(selectedWidget.style.shadow ?? 'soft') === sp.value ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'}`}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 테두리 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">테두리</label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[9px] text-slate-400 whitespace-nowrap">두께</span>
                          <input
                            type="number"
                            min={0}
                            max={8}
                            value={selectedWidget.style.borderWidth ?? 0}
                            onChange={(e) => updateWidgetStyle(selectedWidget.id, { borderWidth: Math.max(0, Math.min(8, Number(e.target.value))) })}
                            className="w-12 text-xs border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-[#0f5b9e]"
                          />
                          <span className="text-[9px] text-slate-400">px</span>
                        </div>
                        <div className="flex-shrink-0">
                          <input
                            type="color"
                            value={selectedWidget.style.borderColor ?? '#ffffff'}
                            onChange={(e) => updateWidgetStyle(selectedWidget.id, { borderColor: e.target.value })}
                            className="h-7 w-10 rounded border border-slate-200 cursor-pointer"
                            title="테두리 색상"
                          />
                        </div>
                      </div>
                      {(selectedWidget.style.borderWidth ?? 0) > 0 && (
                        <div className="flex gap-1 mt-1">
                          {(['solid', 'dashed', 'dotted'] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => updateWidgetStyle(selectedWidget.id, { borderStyle: s })}
                              className={`flex-1 py-0.5 rounded border text-[9px] font-semibold transition-colors ${(selectedWidget.style.borderStyle ?? 'solid') === s ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                            >
                              {s === 'solid' ? '실선' : s === 'dashed' ? '점선' : '점점선'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 내부 여백 */}
                    <div className="mb-2">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">내부 여백</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: '좌우', field: 'paddingX' as const, value: selectedWidget.style.paddingX ?? 8 },
                          { label: '상하', field: 'paddingY' as const, value: selectedWidget.style.paddingY ?? 8 },
                        ].map(({ label, field, value }) => (
                          <div key={field} className="flex items-center gap-1 bg-slate-50 rounded border border-slate-200 px-2 py-1">
                            <span className="text-[9px] text-slate-400 flex-shrink-0 w-5">{label}</span>
                            <input
                              type="number"
                              min={0}
                              max={40}
                              value={value}
                              onChange={(e) => updateWidgetStyle(selectedWidget.id, { [field]: Math.max(0, Math.min(40, Number(e.target.value))) })}
                              className="flex-1 text-xs bg-transparent text-center border-b border-slate-300 focus:border-[#0f5b9e] outline-none min-w-0"
                            />
                            <span className="text-[9px] text-slate-400">px</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 스타일 프리셋 초기화 */}
                    <button
                      onClick={() =>
                        updateWidgetStyle(selectedWidget.id, {
                          borderWidth: 0,
                          borderRadius: 8,
                          opacity: 100,
                          shadow: 'soft',
                          paddingX: 8,
                          paddingY: 8,
                        })
                      }
                      className="w-full py-1 text-[9px] text-slate-400 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                    >
                      박스 스타일 초기화
                    </button>
                  </div>
                </div>
              </>
            ) : selectedWidgetIds.length > 1 ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700">{selectedWidgetIds.length}개 선택됨</h2>
                  <button onClick={() => setSelectedWidgetIds([])} className="text-slate-400 hover:text-slate-600 text-xs">
                    해제
                  </button>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-indigo-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{selectedWidgetIds.length}개 위젯 선택</p>
                    <p className="text-xs text-slate-400 mt-1">Shift+클릭으로 선택 추가/해제</p>
                    <p className="text-xs text-slate-400 mt-0.5">드래그로 같이 이동 · Delete로 일괄 삭제</p>
                  </div>
                  <button
                    onClick={() => {
                      pushUndo(droppedWidgets, guides);
                      setDroppedWidgets((prev) => prev.filter((w) => !selectedWidgetIds.includes(w.id)));
                      setSelectedWidgetIds([]);
                    }}
                    className="w-full py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                  >
                    선택 항목 삭제 ({selectedWidgetIds.length}개)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
                  <h2 className="text-sm font-bold text-slate-700">스타일 옵션</h2>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">위젯을 선택하세요</p>
                    <p className="text-xs text-slate-400 mt-1">캔버스의 위젯을 클릭하면 스타일을 편집할 수 있습니다.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Shift+클릭으로 여러 위젯 선택</p>
                  </div>
                  <div
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-semibold ${layoutMode === 'free' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}
                  >
                    {layoutMode === 'free' ? '✦ 자유 모드 — 포토샵처럼 자유롭게 배치' : '⊞ 그리드 모드 — 격자에 맞춰 정렬'}
                  </div>
                  {/* 섹션 관리 — 위젯의 구역 배정에서 자동 파생. 위젯에 구역을 배정하면 자동 활성화되고, 마지막 위젯을 빼면 자동 해제된다. */}
                  <div className="w-full pt-3 border-t border-slate-100">
                    <p className="text-[10px] text-slate-500 font-semibold mb-1.5">구역(섹션) — 자동</p>
                    <p className="text-[9px] text-slate-400 mb-2">
                      {sections.length === 0
                        ? '활성 구역 없음 = 단일 뷰 그룹 모드. 위젯 ⚙ → 구역에서 A/B… 배정 시 자동 생성됩니다.'
                        : `활성 구역 ${sections.length}개 — 실행 시 구역별로 뷰 그룹을 따로 선택합니다. (× = 해당 구역 위젯 일괄 해제)`}
                    </p>
                    {sections.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {sections.map((s) => {
                          const count = droppedWidgets.filter((w) => w.sectionKey === s).length;
                          return (
                            <div key={s} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] border bg-indigo-50 border-indigo-200 text-indigo-700">
                              <span>
                                {s} <span className="text-indigo-400">({count})</span>
                              </span>
                              <button
                                onClick={() => setDroppedWidgets((prev) => prev.map((w) => (w.sectionKey === s ? { ...w, sectionKey: undefined } : w)))}
                                title={`${s} 구역 위젯 배정 일괄 해제`}
                                className="ml-0.5 text-indigo-400 hover:text-red-500 leading-none font-bold"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="w-full pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">
                      배치된 위젯: <span className="font-bold text-slate-700">{droppedWidgets.length}개</span>
                    </p>
                    {droppedWidgets.length > 0 && (
                      <button
                        onClick={() => {
                          setDroppedWidgets([]);
                          setSelectedWidgetIds([]);
                        }}
                        className="w-full py-1.5 text-xs font-semibold text-red-400 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                      >
                        전체 위젯 삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeDrag?.type === 'widget-ref' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-violet-300 bg-white shadow-xl cursor-grabbing" style={{ opacity: 0.9 }}>
              <span className="text-xs">🔗</span>
              <span className="text-xs font-medium text-slate-700">{activeDrag.label}</span>
            </div>
          )}
          {activeDrag?.type === 'source' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-xl cursor-grabbing" style={{ opacity: 0.9 }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeDrag.item.color }} />
              <span className="text-xs font-medium text-slate-700">{activeDrag.item.label}</span>
            </div>
          )}
        </DragOverlay>
      </TableColumnResizeContext.Provider>
    </DndContext>
  );
}
