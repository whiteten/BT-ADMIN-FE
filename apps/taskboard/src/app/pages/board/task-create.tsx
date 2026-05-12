import { useContext, useEffect, useRef, useState } from 'react';
import ReactGridLayout, { type LayoutItem as RglItem, type Layout as RglLayout, getCompactor } from 'react-grid-layout';
import { UNSAFE_NavigationContext, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import {
  taskboardQueryKeys,
  useCreateTaskboardLayout,
  useGetCtiAgentList,
  useGetCtiGroupList,
  useGetCtiQueueList,
  useGetNoticeList,
  useUpdateLayout,
} from '../../features/board/hooks/useTaskboardQueries';
import type { CallDataItem, DroppedWidget, TableColumn, TaskboardBg, TaskboardLayout, WidgetStyle } from '../../features/board/types/taskboard.types';

// ─── 전역 상수 ───────────────────────────────────────────────────────────────
const GRID_COLS = 24;
const GRID_ROWS = 20;

const DEFAULT_W = 13;
const DEFAULT_H = 16;
const DEFAULT_GRID_W = 3;
const DEFAULT_GRID_H = 3;
const DEFAULT_TABLE_GRID_W = 8;
const DEFAULT_TABLE_GRID_H = 6;

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

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48];

const FONT_WEIGHTS: { label: string; value: NonNullable<WidgetStyle['fontWeight']> }[] = [
  { label: '얇게', value: '300' },
  { label: '보통', value: 'normal' },
  { label: '중간', value: '600' },
  { label: '굵게', value: 'bold' },
];

const SHADOW_PRESETS: { label: string; value: NonNullable<WidgetStyle['shadow']>; css: string }[] = [
  { label: '없음', value: 'none', css: 'none' },
  { label: '부드럽게', value: 'soft', css: '0 4px 14px rgba(0,0,0,0.35)' },
  { label: '강하게', value: 'hard', css: '4px 4px 0 rgba(0,0,0,0.55)' },
  { label: '발광', value: 'glow', css: '0 0 16px rgba(255,255,255,0.55)' },
];

const DESIGN_WIDTH = 1024;

type GuideItem = { id: string; axis: 'h' | 'v'; pct: number };
type UndoEntry = { widgets: DroppedWidget[]; guides: GuideItem[] };

function snapResizeToGuides(
  x: number,
  y: number,
  w: number,
  h: number,
  handle: 'se' | 'sw',
  guides: GuideItem[],
  showGuides: boolean,
): { x: number; y: number; w: number; h: number } {
  if (!showGuides || guides.length === 0) return { x, y, w, h };
  const vBounds = [0, ...guides.filter((g) => g.axis === 'v').map((g) => g.pct), 100].sort((a, b) => a - b);
  const hBounds = [0, ...guides.filter((g) => g.axis === 'h').map((g) => g.pct), 100].sort((a, b) => a - b);
  const nearest = (edge: number, bounds: number[]) => bounds.reduce((best, b) => (Math.abs(b - edge) < Math.abs(best - edge) ? b : best), bounds[0]);

  let newX = x,
    newW = w;
  if (handle === 'se') {
    const snappedRight = nearest(x + w, vBounds);
    newW = Math.max(5, snappedRight - x);
  } else {
    const rightEdge = x + w;
    const snappedLeft = nearest(x, vBounds);
    newX = Math.max(0, snappedLeft);
    newW = Math.max(5, rightEdge - newX);
  }
  const newH = Math.max(4, nearest(y + h, hBounds) - y);
  return { x: newX, y, w: newW, h: newH };
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

const formatWidgetValue = (value: string | number, useThousandSep?: boolean): string => {
  if (useThousandSep && typeof value === 'number') return value.toLocaleString('ko-KR');
  return String(value);
};

function getWidgetVisualStyle(style: WidgetStyle, fontScale = 1): React.CSSProperties {
  const shadowCss = SHADOW_PRESETS.find((s) => s.value === (style.shadow ?? 'soft'))?.css ?? SHADOW_PRESETS[1].css;
  const border = (style.borderWidth ?? 0) > 0 ? `${style.borderWidth}px ${style.borderStyle ?? 'solid'} ${style.borderColor ?? '#ffffff'}` : undefined;
  return {
    fontSize: Math.round(style.fontSize * fontScale),
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight ?? 'normal',
    color: style.color,
    backgroundColor: style.bgColor,
    border,
    borderRadius: `${style.borderRadius ?? 8}px`,
    opacity: (style.opacity ?? 100) / 100,
    boxShadow: shadowCss,
    overflow: 'hidden',
  };
}

// ─── 그리드 변환 유틸 ────────────────────────────────────────────────────────
function toGridItem(widget: DroppedWidget): RglItem {
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

// ─── 카테고리별 콜데이터 ─────────────────────────────────────────────────────
const CALL_DATA_CATEGORIES: Record<string, CallDataItem[]> = {
  IVR: [
    { id: 'ivr-waiting', category: 'IVR', label: '대기 호수', unit: '건', sampleValue: 42, color: '#2563eb' },
    { id: 'ivr-processing', category: 'IVR', label: '처리 중 호수', unit: '건', sampleValue: 15, color: '#2563eb' },
    { id: 'ivr-abandon', category: 'IVR', label: '포기 호수', unit: '건', sampleValue: 7, color: '#2563eb' },
    { id: 'ivr-avg-wait', category: 'IVR', label: '평균 대기시간', unit: '초', sampleValue: 38, color: '#2563eb' },
  ],
  CTI: [
    { id: 'cti-agents', category: 'CTI', label: '총 상담원 수', unit: '명', sampleValue: 24, color: '#7c3aed' },
    { id: 'cti-talking', category: 'CTI', label: '통화 중', unit: '명', sampleValue: 18, color: '#7c3aed' },
    { id: 'cti-ready', category: 'CTI', label: '대기 중', unit: '명', sampleValue: 4, color: '#7c3aed' },
    { id: 'cti-away', category: 'CTI', label: '이석 중', unit: '명', sampleValue: 2, color: '#7c3aed' },
  ],
  Agent: [
    { id: 'agent-name', category: 'Agent', label: '상담원명', unit: '', sampleValue: '김상담', color: '#059669' },
    { id: 'agent-calls', category: 'Agent', label: '처리 호수', unit: '건', sampleValue: 23, color: '#059669' },
    { id: 'agent-talk-time', category: 'Agent', label: '총 통화시간', unit: '분', sampleValue: 142, color: '#059669' },
    { id: 'agent-status', category: 'Agent', label: '현재 상태', unit: '', sampleValue: '통화 중', color: '#059669' },
  ],
  Group: [
    { id: 'group-name', category: 'Group', label: '그룹명', unit: '', sampleValue: 'VIP그룹', color: '#d97706' },
    { id: 'group-calls', category: 'Group', label: '처리 호수', unit: '건', sampleValue: 85, color: '#d97706' },
    { id: 'group-waiting', category: 'Group', label: '대기 호수', unit: '건', sampleValue: 12, color: '#d97706' },
  ],
  Skill: [
    { id: 'skill-name', category: 'Skill', label: '스킬명', unit: '', sampleValue: '영어상담', color: '#dc2626' },
    { id: 'skill-connect', category: 'Skill', label: '연결 호수', unit: '건', sampleValue: 33, color: '#dc2626' },
    { id: 'skill-rate', category: 'Skill', label: '처리율', unit: '%', sampleValue: 94, color: '#dc2626' },
  ],
  Tenant: [
    { id: 'tenant-name', category: 'Tenant', label: '테넌트명', unit: '', sampleValue: 'BT Corp', color: '#0891b2' },
    { id: 'tenant-total', category: 'Tenant', label: '총 호수', unit: '건', sampleValue: 320, color: '#0891b2' },
    { id: 'tenant-success', category: 'Tenant', label: '성공율', unit: '%', sampleValue: 91, color: '#0891b2' },
  ],
  etc: [
    { id: 'etc-date', category: 'etc', label: '현재 날짜 (yyyymmdd)', unit: '', sampleValue: '20260424', color: '#64748b' },
    { id: 'etc-time', category: 'etc', label: '현재 시각 (hh24miss)', unit: '', sampleValue: '143205', color: '#64748b' },
    { id: 'etc-datetime', category: 'etc', label: '날짜+시각', unit: '', sampleValue: '20260424 143205', color: '#64748b' },
    { id: 'etc-announcement', category: 'etc', label: '공지 메시지', unit: '', sampleValue: '시스템 정상 운영 중', color: '#64748b' },
  ],
  List: [
    {
      id: 'list-cti-work',
      category: 'List',
      label: 'CTI 업무 리스트',
      sampleValue: '',
      color: '#7c3aed',
      displayType: 'table',
      tableConfig: {
        columns: [
          { key: 'agent', label: '상담원', width: '30%' },
          { key: 'calls', label: '처리', width: '20%' },
          { key: 'wait', label: '대기', width: '20%' },
          { key: 'status', label: '상태', width: '30%' },
        ] as TableColumn[],
        sampleRows: [
          { agent: '김상담', calls: 23, wait: 2, status: '통화중' },
          { agent: '이상담', calls: 18, wait: 0, status: '대기중' },
          { agent: '박상담', calls: 31, wait: 5, status: '이석중' },
        ],
      },
    },
    {
      id: 'list-agent',
      category: 'List',
      label: '상담사별 리스트',
      sampleValue: '',
      color: '#059669',
      displayType: 'table',
      tableConfig: {
        columns: [
          { key: 'name', label: '상담원명', width: '30%' },
          { key: 'calls', label: '처리호수', width: '20%' },
          { key: 'talkTime', label: '통화시간', width: '25%' },
          { key: 'rate', label: '처리율', width: '25%' },
        ] as TableColumn[],
        sampleRows: [
          { name: '김상담', calls: 23, talkTime: '142분', rate: '95%' },
          { name: '이상담', calls: 18, talkTime: '98분', rate: '89%' },
          { name: '박상담', calls: 31, talkTime: '187분', rate: '98%' },
        ],
      },
    },
    {
      id: 'list-group',
      category: 'List',
      label: '상담그룹별 리스트',
      sampleValue: '',
      color: '#d97706',
      displayType: 'table',
      tableConfig: {
        columns: [
          { key: 'group', label: '그룹명', width: '30%' },
          { key: 'calls', label: '처리호수', width: '23%' },
          { key: 'wait', label: '대기호수', width: '23%' },
          { key: 'rate', label: '처리율', width: '24%' },
        ] as TableColumn[],
        sampleRows: [
          { group: 'VIP그룹', calls: 85, wait: 3, rate: '97%' },
          { group: '일반그룹', calls: 142, wait: 8, rate: '91%' },
          { group: '영어상담', calls: 33, wait: 1, rate: '94%' },
        ],
      },
    },
    {
      id: 'list-ivr-queue',
      category: 'List',
      label: 'IVR 대기큐 리스트',
      sampleValue: '',
      color: '#2563eb',
      displayType: 'table',
      tableConfig: {
        columns: [
          { key: 'queue', label: '큐명', width: '35%' },
          { key: 'waiting', label: '대기호수', width: '30%' },
          { key: 'avgWait', label: '평균대기', width: '35%' },
        ] as TableColumn[],
        sampleRows: [
          { queue: '일반대기', waiting: 12, avgWait: '38초' },
          { queue: 'VIP대기', waiting: 3, avgWait: '12초' },
        ],
      },
    },
  ],
};

const CATEGORY_LABELS: Record<string, string> = {
  IVR: 'IVR 연동',
  CTI: 'CTI 연동',
  Agent: 'Agent 연동',
  Group: 'Group 연동',
  Skill: 'Skill 연동',
  Tenant: 'Tenant 연동',
  etc: '기타',
  List: '리스트/테이블',
};

type DragInfo = { type: 'source'; item: CallDataItem };
type LayoutMode = 'free' | 'grid';

// ─── DraggableSourceItem ─────────────────────────────────────────────────────
function DraggableSourceItem({ item }: { item: CallDataItem }) {
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
      <span className="text-xs font-medium text-slate-700 truncate flex-1">{item.label}</span>
      {item.isRealtime && <span className="text-[9px] bg-cyan-100 text-cyan-600 px-1 py-0.5 rounded font-bold">실시간</span>}
      {item.displayType === 'table' && !item.isRealtime && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-bold">표</span>}
      {item.unit && !item.displayType && <span className="text-[10px] text-slate-400 flex-shrink-0">{item.unit}</span>}
    </div>
  );
}

// ─── TableWidget ─────────────────────────────────────────────────────────────
function TableWidget({ widget }: { widget: DroppedWidget }) {
  const cfg = widget.item.tableConfig;
  if (!cfg) return null;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;

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
        <table className="w-full border-collapse" style={{ fontSize: '0.6em', color: widget.style.color, fontFamily: widget.style.fontFamily }}>
          <thead>
            <tr>
              {cfg.columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width, borderBottom: `1px solid ${widget.style.color}40`, padding: '1px 3px', textAlign: 'center', opacity: 0.7, fontWeight: 600 }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cfg.sampleRows.map((row, ri) => (
              <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent' }}>
                {cfg.columns.map((col) => (
                  <td key={col.key} style={{ padding: '1px 3px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 공지사항 위젯 ───────────────────────────────────────────────────────────
function AnnouncementWidget({ widget }: { widget: DroppedWidget }) {
  const { data: notices } = useGetNoticeList();
  const active = (notices ?? []).filter((n) => n.useYn === 'Y');
  const filtered = widget.noticeKey ? active.filter((n) => n.noticeKey === widget.noticeKey) : active;
  const notice = filtered.sort((a, b) => a.sortOrder - b.sortOrder)[0];
  const showTitle = widget.showTitle !== false;

  if (!notice) {
    return (
      <div className="opacity-50 italic leading-tight truncate" style={{ fontSize: '0.8em', textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily }}>
        {widget.noticeKey ? '공지사항 없음' : '공지 키를 선택하세요'}
      </div>
    );
  }

  return (
    <>
      {showTitle && notice.title && (
        <div
          className="truncate mb-0.5 opacity-80 leading-tight"
          style={{ fontSize: '0.65em', textAlign: widget.style.titleAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
        >
          {notice.title}
        </div>
      )}
      <div
        className="leading-tight truncate"
        style={{ textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
      >
        {notice.content}
      </div>
    </>
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

// ─── 위젯 콘텐츠 (공유) ──────────────────────────────────────────────────────
const ETC_CLOCK_IDS = new Set(['etc-date', 'etc-time', 'etc-datetime']);

function WidgetContent({ widget }: { widget: DroppedWidget }) {
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
    return String(widget.item.sampleValue);
  };

  const isTable = widget.item.displayType === 'table';
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const displayValue = isEtcClock ? getLiveValue() : widget.item.sampleValue;

  if (isTable) return <TableWidget widget={widget} />;
  if (widget.item.id === 'etc-announcement') return <AnnouncementWidget widget={widget} />;

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
      <div
        className="leading-tight truncate"
        style={{ textAlign: widget.style.valueAlign ?? 'left', fontFamily: widget.style.fontFamily, fontWeight: widget.style.fontWeight ?? 'normal' }}
      >
        {formatWidgetValue(displayValue, widget.style.useThousandSep)}
        {widget.item.unit && (
          <span className="font-normal ml-0.5 opacity-70" style={{ fontSize: '0.65em' }}>
            {widget.item.unit}
          </span>
        )}
      </div>
    </>
  );
}

// ─── 자유 모드 캔버스 위젯 ───────────────────────────────────────────────────
interface CanvasWidgetFreeProps {
  widget: DroppedWidget;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onDragStart: (widgetId: string, e: React.PointerEvent) => void;
  onResizeStart: (widgetId: string, clientX: number, clientY: number, handle: 'se' | 'sw') => void;
  fontScale?: number;
}

function CanvasWidgetFree({ widget, isSelected, onSelect, onRemove, onDuplicate, onDragStart, onResizeStart, fontScale = 1 }: CanvasWidgetFreeProps) {
  const w = widget.w ?? DEFAULT_W;
  const h = widget.h ?? DEFAULT_H;
  const isTransparentBg = widget.style.bgColor === 'rgba(0,0,0,0)' || widget.style.bgColor === 'transparent';

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
      className={`group ${isTransparentBg ? '' : 'backdrop-blur-sm'} transition-colors select-none ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}`}
    >
      {/* 위젯 내부 상단 액션 버튼 (hover 시 표시) */}
      <div className="absolute top-1 left-0 right-0 flex justify-between px-1 z-20 pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="w-5 h-5 bg-blue-500/90 text-white rounded text-[9px] items-center justify-center hidden group-hover:flex leading-none font-bold shadow-md backdrop-blur-sm"
          title="복사"
        >
          ⧉
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-5 h-5 bg-red-500/90 text-white rounded text-[10px] items-center justify-center hidden group-hover:flex leading-none font-bold shadow-md backdrop-blur-sm"
          title="삭제"
        >
          ×
        </button>
      </div>

      {isSelected && (
        <div className="absolute -top-5 left-0 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono z-30 pointer-events-none whitespace-nowrap leading-tight">
          X:{widget.x.toFixed(1)}% Y:{widget.y.toFixed(1)}% W:{w.toFixed(1)}% H:{h.toFixed(1)}%
        </div>
      )}

      <div
        className="cursor-grab active:cursor-grabbing w-full h-full flex flex-col justify-center"
        style={{ padding: `${widget.style.paddingY ?? 8}px ${widget.style.paddingX ?? 8}px` }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onDragStart(widget.id, e);
        }}
      >
        <WidgetContent widget={widget} />
      </div>

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
    </div>
  );
}

// ─── 그리드 모드 캔버스 위젯 ─────────────────────────────────────────────────
interface CanvasWidgetGridProps {
  widget: DroppedWidget;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  fontScale?: number;
}

function CanvasWidgetGrid({ widget, isSelected, onSelect, onRemove, onDuplicate, fontScale = 1 }: CanvasWidgetGridProps) {
  const w = widget.w ?? DEFAULT_W;
  const h = widget.h ?? DEFAULT_H;
  const isTransparentBg = widget.style.bgColor === 'rgba(0,0,0,0)' || widget.style.bgColor === 'transparent';

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
      className={`group ${isTransparentBg ? '' : 'backdrop-blur-sm'} transition-colors select-none ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent' : ''}`}
    >
      {/* 위젯 내부 상단 액션 버튼 (hover 시 표시) */}
      <div className="absolute top-1 left-0 right-0 flex justify-between px-1 z-[2] pointer-events-none group-hover:pointer-events-auto">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="w-5 h-5 bg-blue-500/90 text-white rounded text-[9px] items-center justify-center hidden group-hover:flex leading-none font-bold shadow-md backdrop-blur-sm"
          title="복사"
        >
          ⧉
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-5 h-5 bg-red-500/90 text-white rounded text-[10px] items-center justify-center hidden group-hover:flex leading-none font-bold shadow-md backdrop-blur-sm"
          title="삭제"
        >
          ×
        </button>
      </div>

      {isSelected && (
        <div className="absolute -top-5 left-0 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono z-[3] pointer-events-none whitespace-nowrap leading-tight">
          X:{widget.x.toFixed(1)}% Y:{widget.y.toFixed(1)}% W:{w.toFixed(1)}% H:{h.toFixed(1)}%
        </div>
      )}

      <div
        className="drag-handle cursor-grab active:cursor-grabbing w-full h-full flex flex-col justify-center"
        style={{ padding: `${widget.style.paddingY ?? 8}px ${widget.style.paddingX ?? 8}px` }}
      >
        <WidgetContent widget={widget} />
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
  guides?: React.ReactNode;
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
  guides,
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
        <img src={fileName} alt={pageName} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
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

      {guides}

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
            resizeConfig={{ enabled: true, handles: ['se'] as const }}
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

// ─── 멀티선택 드롭다운 (공용) ────────────────────────────────────────────────
interface MultiSelectDropdownProps {
  label: string;
  color: string;
  isFetching: boolean;
  items: { id: string; name: string }[];
  selectedIds: string[];
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onToggleItem: (id: string) => void;
  onToggleAll: () => void;
  emptyText?: string;
}

function MultiSelectDropdown({ label, color, isFetching, items, selectedIds, isOpen, dropdownRef, onToggleOpen, onToggleItem, onToggleAll, emptyText }: MultiSelectDropdownProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const filteredItems = search.trim()
    ? items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase()))
    : items;

  const btnLabel =
    isFetching && items.length === 0
      ? '로딩 중...'
      : selectedIds.length === 0
        ? `${label} 선택...`
        : selectedIds.length === items.length && items.length > 0
          ? '전체'
          : selectedIds.map((id) => items.find((i) => i.id === id)?.name ?? id).join(', ');

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={onToggleOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-md text-[11px] font-semibold hover:brightness-95 transition-colors w-[180px]"
        style={{ borderColor: `${color}50`, color }}
      >
        <span className="flex-1 text-left truncate">{btnLabel}</span>
        {selectedIds.length > 0 && (
          <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white leading-none" style={{ backgroundColor: color }}>
            {selectedIds.length}/{items.length}
          </span>
        )}
        <span className="text-slate-400 text-[9px] flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          className="fixed bg-white border border-cyan-200 rounded-lg shadow-2xl z-[9999] min-w-[220px] max-h-72 overflow-y-auto"
          style={{
            top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left : 0,
          }}
        >
          {/* 검색 입력 */}
          <div className="px-3 py-2 border-b border-slate-100 sticky top-0 bg-white z-10">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-cyan-400"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {/* 전체 선택 */}
          <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-50 cursor-pointer border-b border-slate-100 sticky top-[41px] bg-white z-10">
            <input
              type="checkbox"
              checked={filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id))}
              onChange={() => {
                const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((item) => selectedIds.includes(item.id));
                if (search.trim()) {
                  filteredItems.forEach((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    if (allFilteredSelected ? isSelected : !isSelected) onToggleItem(item.id);
                  });
                } else {
                  onToggleAll();
                }
              }}
              className="w-3.5 h-3.5 flex-shrink-0"
              style={{ accentColor: color }}
            />
            <span className="text-[11px] font-bold text-slate-700">전체 선택</span>
            <span className="text-[10px] text-slate-400 ml-auto font-mono">{filteredItems.length}개</span>
          </label>
          {filteredItems.length === 0 ? (
            <div className="px-3 py-3 text-[10px] text-slate-400 text-center">{isFetching ? '로딩 중...' : search ? '검색 결과 없음' : (emptyText ?? '데이터 없음')}</div>
          ) : (
            filteredItems.map((item) => (
              <label key={item.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-cyan-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onToggleItem(item.id)}
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ accentColor: color }}
                />
                <span className="text-[11px] text-slate-700 flex-1 truncate">{item.name}</span>
                <span className="text-[9px] text-slate-400 font-mono">#{item.id}</span>
              </label>
            ))
          )}
        </div>
      )}
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

  const isEditMode = !!layout?.layoutId;
  const fileName = layout?.fileName ?? bg?.fileName ?? '';

  // ── 저장된 JSON에서 메타 복원 ──────────────────────────────────────────
  const savedMeta = (() => {
    try {
      if (!layout?.layoutJson) return null;
      const raw = JSON.parse(layout.layoutJson) as {
        version?: number;
        layoutMode?: LayoutMode;
        gridMargin?: [number, number];
        containerPadding?: [number, number];
        selectedQueueIds?: string[];
        selectedGroupIds?: string[];
        selectedAgentIds?: string[];
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
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['IVR']));
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<string>('16/9');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(savedMeta?.layoutMode ?? 'free');
  const [gridMargin, setGridMargin] = useState<[number, number]>(savedMeta?.gridMargin ?? [4, 4]);
  const [containerPadding, setContainerPadding] = useState<[number, number]>(savedMeta?.containerPadding ?? [0, 0]);

  // ── 큐리스트 멀티 선택 상태 ──────────────────────────────────────────
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>(savedMeta?.selectedQueueIds ?? []);
  const [queueDropdownOpen, setQueueDropdownOpen] = useState(false);
  const queueDropdownRef = useRef<HTMLDivElement>(null);
  const { data: queueRows = [], isFetching: queueFetching, refetch: refetchQueue } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });

  // ── 상담사 멀티 선택 상태 ─────────────────────────────────────────────
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(savedMeta?.selectedAgentIds ?? []);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const { data: agentRows = [], isFetching: agentFetching } = useGetCtiAgentList({ queryOptions: { refetchInterval: false } });

  // ── 상담그룹 멀티 선택 상태 ───────────────────────────────────────────
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(savedMeta?.selectedGroupIds ?? []);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const { data: groupRows = [], isFetching: groupFetching } = useGetCtiGroupList({ queryOptions: { refetchInterval: false } });

  // 외부 클릭 닫기 (큐/상담사/그룹 드롭다운)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (queueDropdownRef.current && !queueDropdownRef.current.contains(e.target as Node)) setQueueDropdownOpen(false);
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) setAgentDropdownOpen(false);
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) setGroupDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleQueue = (id: string) => setSelectedQueueIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
  const toggleAllQueues = () => setSelectedQueueIds((prev) => (prev.length === queueRows.length && queueRows.length > 0 ? [] : queueRows.map((q) => q.ctiqId)));

  const toggleAgent = (id: string) => setSelectedAgentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleAllAgents = () => setSelectedAgentIds((prev) => (prev.length === agentRows.length && agentRows.length > 0 ? [] : agentRows.map((a) => a.agentId)));

  const toggleGroup = (id: string) => setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const toggleAllGroups = () => setSelectedGroupIds((prev) => (prev.length === groupRows.length && groupRows.length > 0 ? [] : groupRows.map((g) => g.groupId)));

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

  // ── 뒤로가기 (변경사항 확인) ─────────────────────────────────────────
  const handleBack = () => {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 있습니다.\n페이지를 나가시겠습니까?')) return;
    unblockNavRef.current?.();
    navigate(-1);
  };

  const boardContainerRef = useRef<HTMLDivElement>(null);

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
    handle: 'se' | 'sw';
    startWidgetX: number;
    startWidgetY: number;
  } | null>(null);
  const resizeFinalRef = useRef<{ widgetId: string; x: number; y: number; w: number; h: number } | null>(null);

  const handleResizeStart = (widgetId: string, clientX: number, clientY: number, handle: 'se' | 'sw') => {
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
        if (resize.handle === 'sw') {
          const newX = Math.max(0, resize.startWidgetX + dx);
          const actualDx = newX - resize.startWidgetX;
          const newW = Math.max(5, resize.startW - actualDx);
          const newH = Math.max(4, resize.startH + dy);
          setDroppedWidgets((prev) => prev.map((w) => (w.id === resize.widgetId ? { ...w, x: newX, w: newW, h: newH } : w)));
          resizeFinalRef.current = { widgetId: resize.widgetId, x: newX, y: resize.startWidgetY, w: newW, h: newH };
        } else {
          const newW = Math.max(5, resize.startW + dx);
          const newH = Math.max(4, resize.startH + dy);
          setDroppedWidgets((prev) => prev.map((w) => (w.id === resize.widgetId ? { ...w, w: newW, h: newH } : w)));
          resizeFinalRef.current = { widgetId: resize.widgetId, x: resize.startWidgetX, y: resize.startWidgetY, w: newW, h: newH };
        }
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
            setGuides((prev) => [...prev, { id: `guide-${Date.now()}`, axis: guideDrag.axis, pct: pos.pct }]);
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

  // ── DnD 소스 드래그/드랍 ────────────────────────────────────────────
  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDrag(event.active.data.current as DragInfo);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (over?.id !== 'board-canvas') return;
    const boardRect = over.rect;
    const activeRect = active.rect.current.translated;
    if (!activeRect) return;
    const info = active.data.current as DragInfo;
    if (info.type !== 'source') return;

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
    if (targetWidget) {
      pushUndo(droppedWidgets, guides);
      setDroppedWidgets((prev) => prev.map((w) => (w.id === targetWidget.id ? { ...w, item: info.item } : w)));
      setSelectedWidgetIds([targetWidget.id]);
      return;
    }

    pushUndo(droppedWidgets, guides);
    const isTable = info.item.displayType === 'table';

    let finalX = Math.max(0, Math.min(99, xPct));
    let finalY = Math.max(0, Math.min(99, yPct));
    let finalW = isTable ? (DEFAULT_TABLE_GRID_W / GRID_COLS) * 100 : DEFAULT_W;
    let finalH = isTable ? (DEFAULT_TABLE_GRID_H / GRID_ROWS) * 100 : DEFAULT_H;

    if (layoutMode === 'grid') {
      const gw = isTable ? DEFAULT_TABLE_GRID_W : DEFAULT_GRID_W;
      const gh = isTable ? DEFAULT_TABLE_GRID_H : DEFAULT_GRID_H;
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
      id: `widget-${Date.now()}`,
      item: info.item,
      x: finalX,
      y: finalY,
      w: finalW,
      h: finalH,
      showTitle: true,
      style: { ...DEFAULT_STYLE },
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
      id: `widget-${Date.now()}`,
      x: offsetX,
      y: offsetY,
    };
    setDroppedWidgets((prev) => [...prev, copy]);
    setSelectedWidgetIds([copy.id]);
  };

  const updateWidgetStyle = (id: string, patch: Partial<WidgetStyle>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, style: { ...w.style, ...patch } } : w)));
  };

  const updateWidgetMeta = (id: string, patch: Partial<Pick<DroppedWidget, 'showTitle' | 'customTitle' | 'noticeKey'>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
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
  }, [selectedWidgetIds, droppedWidgets, layoutMode]);

  // ── Delete 키: 선택한 위젯 일괄 삭제 ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // ── 저장 ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const pageId = layout?.pageId ?? bg?.pageId;
    if (!pageId) {
      toast.error('배경 정보가 없습니다.');
      return;
    }
    const layoutJson = JSON.stringify({
      version: 2,
      layoutMode,
      gridMargin,
      containerPadding,
      selectedQueueIds,
      selectedGroupIds,
      selectedAgentIds,
      guides,
      showGuides,
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
          authorName: userInfo?.username ?? userInfo?.userAccount,
          authRole: userInfo?.roles?.[0],
        });
      }
      initialStateRef.current = { widgets: JSON.stringify(droppedWidgets), title: boardTitle };
      unblockNavRef.current?.();
      toast.success('레이아웃이 저장되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getLayoutList().queryKey });
      navigate('/taskboard/board/task-list');
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  // ── Export / Import ────────────────────────────────────────────────────
  const handleExport = () => {
    const exportData = {
      version: 2,
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
  const gridLayout = droppedWidgets.map(toGridItem);

  // 드롭다운용 아이템 변환
  const queueItems = queueRows.map((q) => ({ id: q.ctiqId, name: q.ctiqName }));
  const agentItems = agentRows.map((a) => ({ id: a.agentId, name: a.agentName }));
  const groupItems = groupRows.map((g) => ({ id: g.groupId, name: g.groupName }));

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
        {/* ── 왼쪽 패널: 콜데이터 리스트 ── */}
        <div className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <button onClick={handleBack} className="text-xs text-slate-400 hover:text-slate-600 mb-2 block">
              {isDirty ? '← 돌아가기 ⚠' : '← 돌아가기'}
            </button>
            <h2 className="text-sm font-bold text-slate-800">콜데이터 리스트</h2>
            <p className="text-xs text-slate-400 mt-0.5">항목을 가운데 배경에 드래그하세요</p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {Object.keys(CALL_DATA_CATEGORIES).map((cat) => (
              <div key={cat} className="border-b border-slate-100">
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CALL_DATA_CATEGORIES[cat][0].color }} />
                    {CATEGORY_LABELS[cat]}
                    <span className="text-[10px] text-slate-400 font-normal">({CALL_DATA_CATEGORIES[cat].length})</span>
                  </div>
                  <span className={`text-slate-400 text-xs transition-transform duration-200 ${openCategories.has(cat) ? 'rotate-90' : ''}`}>▶</span>
                </button>
                {openCategories.has(cat) && (
                  <div className="px-3 pb-3 flex flex-col gap-1.5 bg-slate-50/60">
                    {CALL_DATA_CATEGORIES[cat].map((item) => (
                      <DraggableSourceItem key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 가운데 패널: 캔버스 ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
          {/* 메인 헤더 */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 overflow-hidden">
            <div className="flex-1 min-w-0 mr-4">
              <input
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0f5b9e] outline-none px-1 w-full max-w-xs truncate"
                placeholder="전광판 이름 입력"
              />
              <p className="text-xs text-slate-400 mt-0.5">
                {isEditMode ? '편집 모드' : '신규 생성'} · {layoutMode === 'free' ? '자유 이동(0.5%) · Shift+방향키(2%)' : '그리드 스냅 · 방향키(1칸) · Shift(3칸)'}
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

          {/* ── 큐리스트/상담그룹/상담사 멀티선택 바 ── */}
          <div className="px-3 py-2 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-cyan-200 flex items-center gap-2 flex-shrink-0">
            {/* 큐리스트 */}
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse flex-shrink-0" />
            <span className="text-[11px] font-semibold text-cyan-800 whitespace-nowrap flex-shrink-0">큐리스트</span>
            <MultiSelectDropdown
              label="큐"
              color="#0891b2"
              isFetching={queueFetching}
              items={queueItems}
              selectedIds={selectedQueueIds}
              isOpen={queueDropdownOpen}
              dropdownRef={queueDropdownRef}
              onToggleOpen={() => setQueueDropdownOpen((prev) => !prev)}
              onToggleItem={toggleQueue}
              onToggleAll={toggleAllQueues}
              emptyText="큐 데이터 없음"
            />

            <div className="w-px h-4 bg-cyan-200 flex-shrink-0 mx-1" />

            {/* 상담그룹 */}
            <span className="text-[11px] font-semibold text-violet-700 whitespace-nowrap flex-shrink-0">상담그룹</span>
            <MultiSelectDropdown
              label="상담그룹"
              color="#7c3aed"
              isFetching={groupFetching}
              items={groupItems}
              selectedIds={selectedGroupIds}
              isOpen={groupDropdownOpen}
              dropdownRef={groupDropdownRef}
              onToggleOpen={() => setGroupDropdownOpen((prev) => !prev)}
              onToggleItem={toggleGroup}
              onToggleAll={toggleAllGroups}
              emptyText="그룹 데이터 없음"
            />

            <div className="w-px h-4 bg-cyan-200 flex-shrink-0 mx-1" />

            {/* 상담사 */}
            <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap flex-shrink-0">상담사</span>
            <MultiSelectDropdown
              label="상담사"
              color="#059669"
              isFetching={agentFetching}
              items={agentItems}
              selectedIds={selectedAgentIds}
              isOpen={agentDropdownOpen}
              dropdownRef={agentDropdownRef}
              onToggleOpen={() => setAgentDropdownOpen((prev) => !prev)}
              onToggleItem={toggleAgent}
              onToggleAll={toggleAllAgents}
              emptyText="상담사 데이터 없음"
            />

            <button onClick={() => void refetchQueue()} className="flex-shrink-0 text-[11px] text-cyan-500 hover:text-cyan-700 px-1.5 font-bold ml-auto" title="새로고침">
              ↻
            </button>
          </div>

          {/* 캔버스 영역 */}
          <div className="flex-1 p-6 flex items-center justify-center overflow-hidden min-h-0 relative">
            {/* 드래그 중 좌표 표시 — fixed로 overflow-hidden 제약 없이 표시 */}
            {dragCoord && (
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2 bg-black/80 text-white text-sm font-mono rounded-full shadow-xl pointer-events-none select-none tracking-wide">
                X: {dragCoord.x.toFixed(1)}% &nbsp;&nbsp; Y: {dragCoord.y.toFixed(1)}%
              </div>
            )}
            {/* 눈금자 포함 외부 래퍼 — showGuides 시 16px 패딩으로 이미지 바깥에 눈금자 배치 */}
            <div className="w-full max-w-5xl relative" style={{ paddingTop: showGuides ? '16px' : '0', paddingLeft: showGuides ? '16px' : '0' }}>
              {/* ── 눈금자 오버레이 (이미지 바깥 패딩 영역) ── */}
              {showGuides && (
                <>
                  {/* 모서리 채우기 */}
                  <div className="absolute top-0 left-0 w-4 h-4 bg-slate-900 z-[201] pointer-events-none" />
                  {/* 상단 눈금자 (드래그 → 수평 가이드) */}
                  <div
                    className="absolute top-0 left-4 right-0 h-4 bg-slate-800 z-[200] overflow-hidden select-none cursor-ns-resize"
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
                          style={{ width: '1px', height: i % 5 === 0 ? '8px' : '4px', backgroundColor: i % 5 === 0 ? '#94a3b8' : '#475569', marginTop: i % 5 === 0 ? '0' : '4px' }}
                        />
                        {i % 5 === 0 && <span style={{ fontSize: '7px', color: '#64748b', lineHeight: 1, marginTop: '1px' }}>{i * 10}</span>}
                      </div>
                    ))}
                  </div>
                  {/* 좌측 눈금자 (드래그 → 수직 가이드) */}
                  <div
                    className="absolute top-4 left-0 w-4 bottom-0 bg-slate-800 z-[200] overflow-hidden select-none cursor-ew-resize"
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
                          style={{ height: '1px', width: i % 5 === 0 ? '8px' : '4px', backgroundColor: i % 5 === 0 ? '#94a3b8' : '#475569', marginLeft: i % 5 === 0 ? '0' : '4px' }}
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
              <div ref={boardContainerRef} className="w-full relative" style={{ aspectRatio: imageRatio }}>
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
                                const guidesToDrag = guides.filter((gg) => newSelection.includes(gg.id) && gg.axis === g.axis).map((gg) => ({ guideId: gg.id, startPct: gg.pct }));
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
                  return (
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
                      guides={guidesOverlay}
                    >
                      {layoutMode === 'free'
                        ? droppedWidgets.map((widget) => (
                            <CanvasWidgetFree
                              key={widget.id}
                              widget={widget}
                              isSelected={selectedWidgetIds.includes(widget.id)}
                              onSelect={(shiftKey) => {
                                if (lastDragOccurredRef.current) return;
                                if (shiftKey) {
                                  setSelectedWidgetIds((prev) => (prev.includes(widget.id) ? prev.filter((id) => id !== widget.id) : [...prev, widget.id]));
                                } else {
                                  setSelectedWidgetIds([widget.id]);
                                }
                              }}
                              onRemove={() => removeWidget(widget.id)}
                              onDuplicate={() => duplicateWidget(widget.id)}
                              onDragStart={handleFreeDragStart}
                              onResizeStart={handleResizeStart}
                              fontScale={fontScale}
                            />
                          ))
                        : droppedWidgets.map((widget) => (
                            <div key={widget.id}>
                              <CanvasWidgetGrid
                                widget={widget}
                                isSelected={selectedWidgetIds.includes(widget.id)}
                                onSelect={() => setSelectedWidgetIds([widget.id])}
                                onRemove={() => removeWidget(widget.id)}
                                onDuplicate={() => duplicateWidget(widget.id)}
                                fontScale={fontScale}
                              />
                            </div>
                          ))}
                    </DroppableBoard>
                  );
                })()}
              </div>
              {/* boardContainerRef end */}
            </div>
            {/* outer ruler wrapper end */}
          </div>
        </div>

        {/* ── 오른쪽 패널: 스타일 옵션 ── */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-sm overflow-hidden">
          {selectedWidget ? (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-bold text-slate-700 truncate flex-1">{selectedWidget.customTitle ?? selectedWidget.item.label}</span>
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
                          defaultValue={selectedWidget.customTitle ?? selectedWidget.item.label}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateWidgetMeta(selectedWidget.id, { customTitle: e.currentTarget.value || undefined });
                              setEditingTitleId(null);
                            } else if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:border-[#0f5b9e]"
                          placeholder={selectedWidget.item.label}
                        />
                        <button onClick={() => setEditingTitleId(null)} className="text-[10px] px-2 py-1 bg-slate-200 rounded hover:bg-slate-300">
                          완료
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTitleId(selectedWidget.id)}
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

                {/* 값 정렬 */}
                {selectedWidget.item.displayType !== 'table' && (
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

                {/* 1000단위 콤마 */}
                {selectedWidget.item.displayType !== 'table' && (
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

                {/* 공지 키 선택 (공지 위젯 전용) */}
                {selectedWidget.item.id === 'etc-announcement' && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">공지 키</label>
                    <NoticeKeyPanel noticeKey={selectedWidget.noticeKey} onChange={(key) => updateWidgetMeta(selectedWidget.id, { noticeKey: key })} />
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
                      style={{ fontFamily: selectedWidget.style.fontFamily, fontSize: selectedWidget.style.fontSize, fontWeight: selectedWidget.style.fontWeight ?? 'normal' }}
                    >
                      Aa 가나다 123
                    </div>
                  </div>

                  {/* 색상 */}
                  <div className="flex gap-2 items-center mb-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">텍스트</label>
                      <input
                        type="color"
                        value={selectedWidget.style.color}
                        onChange={(e) => updateWidgetStyle(selectedWidget.id, { color: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 font-semibold block mb-1">배경</label>
                      <input
                        type="color"
                        value={selectedWidget.style.bgColor.startsWith('rgba') ? '#000000' : selectedWidget.style.bgColor}
                        onChange={(e) => updateWidgetStyle(selectedWidget.id, { bgColor: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                      />
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
        {activeDrag && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-xl cursor-grabbing" style={{ opacity: 0.9 }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeDrag.item.color }} />
            <span className="text-xs font-medium text-slate-700">{activeDrag.item.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
