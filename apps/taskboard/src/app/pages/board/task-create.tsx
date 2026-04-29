import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { taskboardQueryKeys, useCreateTaskboardLayout, useUpdateLayout } from '../../features/board/hooks/useTaskboardQueries';
import type { CallDataItem, DroppedWidget, TableColumn, TaskboardBg, TaskboardLayout, WidgetStyle } from '../../features/board/types/taskboard.types';

// ─── 카테고리별 콜데이터 아이템 ─────────────────────────────────────────────────
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
    { id: 'etc-datetime', category: 'etc', label: '날짜+시각 (yyyymmdd hh24miss)', unit: '', sampleValue: '20260424 143205', color: '#64748b' },
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
          { agent: '최상담', calls: 14, wait: 1, status: '통화중' },
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
          { name: '최상담', calls: 14, talkTime: '75분', rate: '82%' },
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
          { queue: '영어대기', waiting: 5, avgWait: '25초' },
        ],
      },
    },
  ],
};

// Redis 실시간 리스트 카테고리
CALL_DATA_CATEGORIES['Redis'] = [
  {
    id: 'redis-cti-queue',
    category: 'Redis',
    label: 'CTI 큐 리스트 (CTIQMASTER)',
    sampleValue: '',
    color: '#0891b2',
    displayType: 'table',
    isRealtime: true,
    tableConfig: {
      columns: [
        { key: 'queueName', label: '큐명', width: '35%' },
        { key: 'waitCount', label: '대기', width: '20%' },
        { key: 'talkCount', label: '통화', width: '20%' },
        { key: 'avgWaitSec', label: '평균대기', width: '25%' },
      ] as TableColumn[],
      sampleRows: [
        { queueName: '일반대기', waitCount: 12, talkCount: 8, avgWaitSec: '38초' },
        { queueName: 'VIP대기', waitCount: 3, talkCount: 2, avgWaitSec: '12초' },
        { queueName: '영어대기', waitCount: 5, talkCount: 3, avgWaitSec: '25초' },
      ],
    },
  },
  {
    id: 'redis-cti-agent',
    category: 'Redis',
    label: '상담사 리스트 (AGENTMASTER)',
    sampleValue: '',
    color: '#059669',
    displayType: 'table',
    isRealtime: true,
    tableConfig: {
      columns: [
        { key: 'agentName', label: '상담사', width: '30%' },
        { key: 'statusName', label: '상태', width: '20%' },
        { key: 'talkCount', label: '처리수', width: '25%' },
        { key: 'talkTimeSec', label: '통화시간', width: '25%' },
      ] as TableColumn[],
      sampleRows: [
        { agentName: '김상담', statusName: '통화중', talkCount: 23, talkTimeSec: '142분' },
        { agentName: '이상담', statusName: '대기중', talkCount: 18, talkTimeSec: '98분' },
        { agentName: '박상담', statusName: '이석중', talkCount: 31, talkTimeSec: '187분' },
      ],
    },
  },
  {
    id: 'redis-cti-group',
    category: 'Redis',
    label: '상담그룹 리스트 (GROUPMASTER)',
    sampleValue: '',
    color: '#7c3aed',
    displayType: 'table',
    isRealtime: true,
    tableConfig: {
      columns: [
        { key: 'groupName', label: '그룹명', width: '35%' },
        { key: 'waitCount', label: '대기', width: '20%' },
        { key: 'talkCount', label: '통화', width: '20%' },
        { key: 'agentCount', label: '인원', width: '25%' },
      ] as TableColumn[],
      sampleRows: [
        { groupName: 'VIP그룹', waitCount: 3, talkCount: 12, agentCount: 8 },
        { groupName: '일반그룹', waitCount: 8, talkCount: 24, agentCount: 15 },
        { groupName: '영어상담', waitCount: 1, talkCount: 6, agentCount: 4 },
      ],
    },
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  IVR: 'IVR 연동',
  CTI: 'CTI 연동',
  Agent: 'Agent 연동',
  Group: 'Group 연동',
  Skill: 'Skill 연동',
  Tenant: 'Tenant 연동',
  etc: '기타',
  List: '리스트/테이블',
  Redis: 'Redis 실시간',
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

const DEFAULT_STYLE: WidgetStyle = { fontSize: 14, fontFamily: 'inherit', color: '#ffffff', bgColor: 'rgba(0,0,0,0.7)', valueAlign: 'left', useThousandSep: false };

const formatWidgetValue = (value: string | number, useThousandSep?: boolean): string => {
  if (useThousandSep && typeof value === 'number') return value.toLocaleString('ko-KR');
  return String(value);
};
const DEFAULT_W = 13;
const DEFAULT_H = 16;

type DragInfo = { type: 'source'; item: CallDataItem } | { type: 'widget'; widgetId: string; item: CallDataItem };

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
            fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65))}px`,
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
          className="w-full border-collapse"
          style={{ fontSize: `${Math.max(7, Math.round(widget.style.fontSize * 0.6))}px`, color: widget.style.color, fontFamily: widget.style.fontFamily }}
        >
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

// ─── CanvasWidget ────────────────────────────────────────────────────────────
interface CanvasWidgetProps {
  widget: DroppedWidget;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onResizeStart: (widgetId: string, clientX: number, clientY: number) => void;
}

function CanvasWidget({ widget, isSelected, onSelect, onRemove, onResizeStart }: CanvasWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    data: { type: 'widget', widgetId: widget.id, item: widget.item } satisfies DragInfo,
  });

  const w = widget.w ?? DEFAULT_W;
  const h = widget.h ?? DEFAULT_H;
  const showTitle = widget.showTitle !== false;
  const displayTitle = widget.customTitle ?? widget.item.label;
  const isTable = widget.item.displayType === 'table';

  const style: React.CSSProperties = {
    left: `${widget.x}%`,
    top: `${widget.y}%`,
    width: `${w}%`,
    height: `${h}%`,
    position: 'absolute',
    fontSize: widget.style.fontSize,
    fontFamily: widget.style.fontFamily,
    color: widget.style.color,
    backgroundColor: widget.style.bgColor,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    zIndex: isSelected ? 20 : isDragging ? 30 : 10,
    opacity: isDragging ? 0.4 : 1,
    overflow: 'hidden',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group backdrop-blur-sm rounded-lg shadow-xl border transition-all select-none ${
        isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent border-white/60' : 'border-white/10'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] items-center justify-center hidden group-hover:flex leading-none font-bold z-10"
      >
        ×
      </button>

      {isSelected && (
        <div className="absolute -top-5 left-0 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-mono z-30 pointer-events-none whitespace-nowrap leading-tight">
          X:{widget.x.toFixed(1)}% Y:{widget.y.toFixed(1)}% W:{w.toFixed(1)}% H:{h.toFixed(1)}%
        </div>
      )}

      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing w-full h-full p-2 flex flex-col justify-center">
        {isTable ? (
          <TableWidget widget={widget} />
        ) : (
          <>
            {showTitle && (
              <div
                className="truncate mb-0.5 opacity-80 leading-tight"
                style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65))}px`, textAlign: widget.style.titleAlign ?? 'left' }}
              >
                {displayTitle}
              </div>
            )}
            <div className="font-bold leading-tight truncate" style={{ textAlign: widget.style.valueAlign ?? 'left' }}>
              {formatWidgetValue(widget.item.sampleValue, widget.style.useThousandSep)}
              {widget.item.unit && (
                <span className="font-normal ml-0.5 opacity-70" style={{ fontSize: `${Math.max(8, Math.round(widget.style.fontSize * 0.65))}px` }}>
                  {widget.item.unit}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div
        className="absolute bottom-0 right-0 w-4 h-4 flex items-center justify-center cursor-se-resize z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(widget.id, e.clientX, e.clientY);
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M7 1L1 7M7 4L4 7M7 7H4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── DroppableBoard ──────────────────────────────────────────────────────────
function DroppableBoard({ children, fileName, pageName, onClickCanvas }: { children: React.ReactNode; fileName: string; pageName: string; onClickCanvas: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'board-canvas' });

  return (
    <div
      ref={setNodeRef}
      onClick={onClickCanvas}
      className={`relative w-full h-full rounded-xl overflow-hidden border-2 transition-all ${isOver ? 'border-[#0f5b9e] ring-2 ring-[#0f5b9e]/30' : 'border-slate-300'}`}
    >
      {fileName ? (
        <img src={fileName} alt={pageName} className="w-full h-full object-contain pointer-events-none" />
      ) : (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
          <span className="text-slate-500 text-sm">배경 이미지 없음</span>
        </div>
      )}
      {isOver && (
        <div className="absolute inset-0 bg-[#0f5b9e]/10 flex items-center justify-center pointer-events-none">
          <span className="bg-[#0f5b9e] text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">여기에 드랍</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── TaskCreate (메인 컴포넌트) ──────────────────────────────────────────────
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

  const [boardTitle, setBoardTitle] = useState(layout?.layoutName ?? bg?.pageName ?? '새 전광판');
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['IVR']));
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<string>('16/9');

  const { mutateAsync: createLayout, isPending: isCreating } = useCreateTaskboardLayout();
  const { mutateAsync: updateLayout, isPending: isUpdating } = useUpdateLayout();
  const isSaving = isCreating || isUpdating;

  // 실제 이미지 크기로 aspectRatio 계산
  useEffect(() => {
    if (!fileName) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setImageRatio(`${img.naturalWidth}/${img.naturalHeight}`);
      }
    };
    img.src = fileName;
  }, [fileName]);

  const initialWidgets: DroppedWidget[] = (() => {
    try {
      const json = layout?.layoutJson;
      const parsed = json ? (JSON.parse(json) as DroppedWidget[]) : [];
      return parsed.map((w) => ({ ...w, w: w.w ?? DEFAULT_W, h: w.h ?? DEFAULT_H, showTitle: w.showTitle !== false }));
    } catch {
      return [];
    }
  })();

  const [droppedWidgets, setDroppedWidgets] = useState<DroppedWidget[]>(initialWidgets);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── 리사이즈 로직 ─────────────────────────────────────────────────────────
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{
    widgetId: string;
    startMouseX: number;
    startMouseY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const handleResizeStart = (widgetId: string, clientX: number, clientY: number) => {
    const widget = droppedWidgets.find((w) => w.id === widgetId);
    if (!widget) return;
    resizeStateRef.current = { widgetId, startMouseX: clientX, startMouseY: clientY, startW: widget.w ?? DEFAULT_W, startH: widget.h ?? DEFAULT_H };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const resize = resizeStateRef.current;
      if (!resize) return;
      const boardEl = boardContainerRef.current;
      if (!boardEl) return;
      const boardRect = boardEl.getBoundingClientRect();
      const dx = ((e.clientX - resize.startMouseX) / boardRect.width) * 100;
      const dy = ((e.clientY - resize.startMouseY) / boardRect.height) * 100;
      setDroppedWidgets((prev) => prev.map((w) => (w.id === resize.widgetId ? { ...w, w: Math.max(6, resize.startW + dx), h: Math.max(4, resize.startH + dy) } : w)));
    };
    const handlePointerUp = () => {
      resizeStateRef.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // ── DnD 핸들러 ───────────────────────────────────────────────────────────
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
    const wPct = info.type === 'widget' ? (droppedWidgets.find((w) => w.id === info.widgetId)?.w ?? DEFAULT_W) : DEFAULT_W;
    const hPct = info.type === 'widget' ? (droppedWidgets.find((w) => w.id === info.widgetId)?.h ?? DEFAULT_H) : DEFAULT_H;
    const x = Math.max(0, Math.min(Math.max(0, 100 - wPct), ((activeRect.left - boardRect.left) / boardRect.width) * 100));
    const y = Math.max(0, Math.min(Math.max(0, 100 - hPct), ((activeRect.top - boardRect.top) / boardRect.height) * 100));

    if (info.type === 'widget') {
      setDroppedWidgets((prev) => prev.map((w) => (w.id === info.widgetId ? { ...w, x, y } : w)));
    } else {
      const newWidget: DroppedWidget = {
        id: `widget-${Date.now()}`,
        item: info.item,
        x,
        y,
        w: info.item.displayType === 'table' ? 35 : DEFAULT_W,
        h: info.item.displayType === 'table' ? 30 : DEFAULT_H,
        showTitle: true,
        style: { ...DEFAULT_STYLE },
      };
      setDroppedWidgets((prev) => [...prev, newWidget]);
      setSelectedWidgetId(newWidget.id);
    }
  };

  const removeWidget = (id: string) => {
    setDroppedWidgets((prev) => prev.filter((w) => w.id !== id));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const updateWidgetStyle = (id: string, patch: Partial<WidgetStyle>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, style: { ...w.style, ...patch } } : w)));
  };

  const updateWidgetMeta = (id: string, patch: Partial<Pick<DroppedWidget, 'showTitle' | 'customTitle'>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const updateWidgetPosition = (id: string, patch: Partial<Pick<DroppedWidget, 'x' | 'y' | 'w' | 'h'>>) => {
    setDroppedWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const handleSave = async () => {
    const pageId = layout?.pageId ?? bg?.pageId;
    if (!pageId) {
      toast.error('배경 정보가 없습니다.');
      return;
    }
    const layoutJson = JSON.stringify(droppedWidgets);
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
      toast.success('레이아웃이 저장되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getLayoutList().queryKey });
      navigate('/taskboard/board/task-list');
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const selectedWidget = droppedWidgets.find((w) => w.id === selectedWidgetId) ?? null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
        {/* ── 왼쪽 패널: 콜데이터 리스트 ── */}
        <div className="w-60 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <button onClick={() => navigate(-1)} className="text-xs text-slate-400 hover:text-slate-600 mb-2 block">
              ← 돌아가기
            </button>
            <h2 className="text-sm font-bold text-slate-800">콜데이터 리스트</h2>
            <p className="text-xs text-slate-400 mt-0.5">항목을 가운데 배경에 드래그하세요</p>
          </div>

          <div className="flex-1 overflow-y-auto">
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
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 헤더 바 */}
          <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex-1 min-w-0 mr-4">
              <input
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0f5b9e] outline-none px-1 w-full max-w-xs truncate"
                placeholder="전광판 이름 입력"
              />
              <p className="text-xs text-slate-400 mt-0.5">{isEditMode ? '편집 모드' : '신규 생성'} · 왼쪽 항목 드래그 · 위젯 클릭 선택 · 우하단 드래그 크기조절</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setDroppedWidgets([]);
                  setSelectedWidgetId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50 transition-colors"
              >
                초기화
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold bg-[#0f5b9e] text-white rounded-md hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 캔버스 영역 */}
          <div className="flex-1 p-4 flex items-center justify-center overflow-hidden">
            <div ref={boardContainerRef} className="w-full max-w-5xl" style={{ aspectRatio: imageRatio }}>
              <DroppableBoard fileName={fileName} pageName={boardTitle} onClickCanvas={() => setSelectedWidgetId(null)}>
                {droppedWidgets.map((widget) => (
                  <CanvasWidget
                    key={widget.id}
                    widget={widget}
                    isSelected={selectedWidgetId === widget.id}
                    onSelect={() => setSelectedWidgetId(widget.id)}
                    onRemove={() => removeWidget(widget.id)}
                    onResizeStart={handleResizeStart}
                  />
                ))}
              </DroppableBoard>
            </div>
          </div>
        </div>

        {/* ── 오른쪽 패널: 스타일 옵션 ── */}
        <div className="w-72 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col shadow-sm">
          {selectedWidget ? (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <span className="text-sm font-bold text-slate-700 truncate flex-1">{selectedWidget.customTitle ?? selectedWidget.item.label}</span>
                <button onClick={() => setSelectedWidgetId(null)} className="text-slate-400 hover:text-slate-600 text-xs ml-2 flex-shrink-0">
                  닫기
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {/* 위치/크기 직접 입력 */}
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { label: 'X', field: 'x' as const, value: selectedWidget.x, min: 0, max: 99 },
                      { label: 'Y', field: 'y' as const, value: selectedWidget.y, min: 0, max: 99 },
                      { label: 'W', field: 'w' as const, value: selectedWidget.w ?? DEFAULT_W, min: 6, max: 100 },
                      { label: 'H', field: 'h' as const, value: selectedWidget.h ?? DEFAULT_H, min: 4, max: 100 },
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

                {/* 타이틀 표시 토글 */}
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
                          className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                            (selectedWidget.style.titleAlign ?? 'left') === align
                              ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                          }`}
                        >
                          {align === 'left' ? '← 왼쪽' : align === 'center' ? '≡ 가운데' : '→ 오른쪽'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 값 정렬 (테이블 위젯 제외) */}
                {selectedWidget.item.displayType !== 'table' && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">값 정렬</label>
                    <div className="flex gap-1">
                      {(['left', 'center', 'right'] as const).map((align) => (
                        <button
                          key={align}
                          onClick={() => updateWidgetStyle(selectedWidget.id, { valueAlign: align })}
                          className={`flex-1 py-1 rounded border text-[10px] font-semibold transition-colors ${
                            (selectedWidget.style.valueAlign ?? 'left') === align
                              ? 'bg-[#0f5b9e] text-white border-[#0f5b9e]'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-[#0f5b9e]'
                          }`}
                        >
                          {align === 'left' ? '← 왼쪽' : align === 'center' ? '≡ 가운데' : '→ 오른쪽'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1000단위 콤마 (테이블 위젯 제외) */}
                {selectedWidget.item.displayType !== 'table' && (
                  <div className="flex items-center justify-between py-1 px-2 bg-white rounded border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-600 font-semibold">1000단위 콤마</span>
                      <span className="text-[9px] text-slate-400 ml-1">(숫자만 적용)</span>
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

                {/* 폰트 크기 */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">폰트 크기</label>
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

                {/* 폰트 패밀리 */}
                <div>
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">폰트</label>
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
                    style={{ fontFamily: selectedWidget.style.fontFamily, fontSize: selectedWidget.style.fontSize }}
                  >
                    Aa 가나다 123
                  </div>
                </div>

                {/* 텍스트 / 배경 색상 */}
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">텍스트</label>
                    <input
                      type="color"
                      value={selectedWidget.style.color}
                      onChange={(e) => updateWidgetStyle(selectedWidget.id, { color: e.target.value })}
                      className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">배경</label>
                    <input
                      type="color"
                      value={selectedWidget.style.bgColor.startsWith('rgba') ? '#000000' : selectedWidget.style.bgColor}
                      onChange={(e) => updateWidgetStyle(selectedWidget.id, { bgColor: e.target.value })}
                      className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 배경 프리셋 */}
                <div className="flex gap-1 flex-wrap">
                  {[
                    { label: '반투명 검정', value: 'rgba(0,0,0,0.7)' },
                    { label: '반투명 파랑', value: 'rgba(15,91,158,0.85)' },
                    { label: '불투명 흰색', value: '#ffffff' },
                    { label: '투명', value: 'rgba(0,0,0,0)' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      onClick={() => updateWidgetStyle(selectedWidget.id, { bgColor: p.value })}
                      className="text-[9px] px-2 py-1 rounded border border-slate-200 bg-white text-slate-600 hover:border-[#0f5b9e] hover:text-[#0f5b9e] transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full">
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
                </div>
                <div className="w-full mt-2 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">
                    배치된 위젯: <span className="font-bold text-slate-700">{droppedWidgets.length}개</span>
                  </p>
                  {droppedWidgets.length > 0 && (
                    <button
                      onClick={() => {
                        setDroppedWidgets([]);
                        setSelectedWidgetId(null);
                      }}
                      className="w-full py-1.5 text-xs font-semibold text-red-400 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                      전체 위젯 삭제
                    </button>
                  )}
                </div>
                {droppedWidgets.length > 0 && <p className="text-[10px] text-slate-400">우하단 모서리 드래그 → 크기 조절</p>}
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
