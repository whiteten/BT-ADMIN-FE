import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, type DragEndEvent, DragOverlay, type DragStartEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from '@/shared-util';
import { taskboardQueryKeys, useUpdateTaskboardLayout } from '../../features/board/hooks/useTaskboardQueries';
import type { CallDataItem, DroppedWidget, TaskboardBg, WidgetStyle } from '../../features/board/types/taskboard.types';

// ─── 카테고리별 콜데이터 아이템 ──────────────────────────────────────────────────
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
    { id: 'etc-date', category: 'etc', label: '현재 날짜', unit: '', sampleValue: '2026-04-24', color: '#64748b' },
    { id: 'etc-time', category: 'etc', label: '현재 시각', unit: '', sampleValue: '14:32:05', color: '#64748b' },
    { id: 'etc-announcement', category: 'etc', label: '공지 메시지', unit: '', sampleValue: '시스템 정상 운영 중', color: '#64748b' },
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
};

const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: '기본', value: 'inherit' },
  { label: '고딕', value: "'Noto Sans KR', sans-serif" },
  { label: '바탕', value: "'Nanum Myeongjo', serif" },
  { label: '코드', value: "'Courier New', monospace" },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36];

const DEFAULT_STYLE: WidgetStyle = { fontSize: 14, fontFamily: 'inherit', color: '#ffffff', bgColor: 'rgba(0,0,0,0.7)' };

type DragInfo = { type: 'source'; item: CallDataItem } | { type: 'widget'; widgetId: string; item: CallDataItem };

// ─── DraggableSourceItem ──────────────────────────────────────────────────────
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
      {item.unit && <span className="text-[10px] text-slate-400 flex-shrink-0">{item.unit}</span>}
    </div>
  );
}

// ─── CanvasWidget (placed widget — draggable within canvas) ───────────────────
function CanvasWidget({ widget, isSelected, onSelect, onRemove }: { widget: DroppedWidget; isSelected: boolean; onSelect: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: widget.id,
    data: { type: 'widget', widgetId: widget.id, item: widget.item } satisfies DragInfo,
  });

  const style: React.CSSProperties = {
    left: `${widget.x}%`,
    top: `${widget.y}%`,
    position: 'absolute',
    fontSize: widget.style.fontSize,
    fontFamily: widget.style.fontFamily,
    color: widget.style.color,
    backgroundColor: widget.style.bgColor,
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    zIndex: isSelected ? 20 : isDragging ? 30 : 10,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`group backdrop-blur-sm rounded-lg p-2.5 min-w-[90px] shadow-xl border transition-all select-none ${
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
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <div className="text-[10px] truncate mb-1 opacity-80">{widget.item.label}</div>
        <div className="font-bold">
          {widget.item.sampleValue}
          {widget.item.unit && <span className="text-[10px] font-normal ml-0.5 opacity-70">{widget.item.unit}</span>}
        </div>
        <div className="w-full h-0.5 rounded mt-1.5" style={{ backgroundColor: widget.item.color }} />
      </div>
    </div>
  );
}

// ─── DroppableBoard ───────────────────────────────────────────────────────────
function DroppableBoard({ children, fileName, pageName, onClickCanvas }: { children: React.ReactNode; fileName: string; pageName: string; onClickCanvas: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'board-canvas' });

  return (
    <div
      ref={setNodeRef}
      onClick={onClickCanvas}
      className={`relative w-full h-full rounded-xl overflow-hidden border-2 transition-all ${isOver ? 'border-[#0f5b9e] ring-2 ring-[#0f5b9e]/30' : 'border-slate-300'}`}
    >
      {fileName ? (
        <img src={fileName} alt={pageName} className="w-full h-full object-cover pointer-events-none" />
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

// ─── TaskCreate (메인 컴포넌트) ───────────────────────────────────────────────
export default function TaskCreate() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const state = location.state as { bg?: TaskboardBg } | null;
  const bg = state?.bg;

  const fileName = bg?.fileName ?? '';
  const pageName = bg?.pageName ?? '전광판';

  // 저장된 레이아웃이 있으면 파싱해서 초기 상태로 사용
  const initialWidgets: DroppedWidget[] = (() => {
    try {
      return bg?.layoutJson ? (JSON.parse(bg.layoutJson) as DroppedWidget[]) : [];
    } catch {
      return [];
    }
  })();

  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['IVR']));
  const [droppedWidgets, setDroppedWidgets] = useState<DroppedWidget[]>(initialWidgets);
  const [activeDrag, setActiveDrag] = useState<DragInfo | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const { mutateAsync: updateLayout, isPending: isSaving } = useUpdateTaskboardLayout();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

    const x = Math.max(0, Math.min(88, ((activeRect.left - boardRect.left) / boardRect.width) * 100));
    const y = Math.max(0, Math.min(88, ((activeRect.top - boardRect.top) / boardRect.height) * 100));

    const info = active.data.current as DragInfo;

    if (info.type === 'widget') {
      // 기존 위젯 위치 변경
      setDroppedWidgets((prev) => prev.map((w) => (w.id === info.widgetId ? { ...w, x, y } : w)));
    } else {
      // 새 위젯 추가
      const newWidget: DroppedWidget = {
        id: `widget-${Date.now()}`,
        item: info.item,
        x,
        y,
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

  const handleSave = async () => {
    if (!bg?.pageId) {
      toast.error('배경 정보가 없습니다. 배경 관리 페이지에서 다시 접근해주세요.');
      return;
    }
    try {
      await updateLayout({ bgId: bg.pageId, layoutJson: JSON.stringify(droppedWidgets) });
      toast.success('레이아웃이 저장되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList().queryKey });
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    }
  };

  const selectedWidget = droppedWidgets.find((w) => w.id === selectedWidgetId) ?? null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
        {/* ── 왼쪽 패널 ── */}
        <div className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col shadow-sm">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-slate-100">
            <button onClick={() => navigate('/taskboard/board/task-bg')} className="text-xs text-slate-400 hover:text-slate-600 mb-2 block">
              ← 배경 관리로 돌아가기
            </button>
            <h2 className="text-sm font-bold text-slate-800">콜데이터 리스트</h2>
            <p className="text-xs text-slate-400 mt-0.5">항목을 오른쪽 배경에 드래그하세요</p>
          </div>

          {/* 아코디언 카테고리 */}
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

          {/* 하단: 선택된 위젯 스타일 패널 or 배치된 위젯 수 */}
          {selectedWidget ? (
            <div className="border-t border-slate-200 p-3 bg-slate-50 flex flex-col gap-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-700 truncate flex-1">{selectedWidget.item.label} 스타일</span>
                <button onClick={() => setSelectedWidgetId(null)} className="text-slate-400 hover:text-slate-600 text-xs ml-2">
                  닫기
                </button>
              </div>
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
              </div>
              {/* 텍스트 색상 */}
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">텍스트 색상</label>
                  <input
                    type="color"
                    value={selectedWidget.style.color}
                    onChange={(e) => updateWidgetStyle(selectedWidget.id, { color: e.target.value })}
                    className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide block mb-1">배경 색상</label>
                  <input
                    type="color"
                    value={selectedWidget.style.bgColor.startsWith('rgba') ? '#000000' : selectedWidget.style.bgColor}
                    onChange={(e) => updateWidgetStyle(selectedWidget.id, { bgColor: e.target.value })}
                    className="w-full h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              </div>
              {/* 투명 배경 빠른 프리셋 */}
              <div className="flex gap-1.5 flex-wrap">
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
          ) : (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              배치된 위젯: <span className="font-bold text-slate-600">{droppedWidgets.length}개</span>
              {droppedWidgets.length > 0 && (
                <button
                  onClick={() => {
                    setDroppedWidgets([]);
                    setSelectedWidgetId(null);
                  }}
                  className="ml-2 text-red-400 hover:text-red-600 font-semibold"
                >
                  전체 삭제
                </button>
              )}
              {droppedWidgets.length > 0 && <p className="mt-1 text-[10px]">위젯을 클릭하면 스타일을 변경할 수 있어요</p>}
            </div>
          )}
        </div>

        {/* ── 오른쪽 패널: 전광판 캔버스 ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 캔버스 헤더 */}
          <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-slate-800">{pageName}</h1>
              <p className="text-xs text-slate-400">왼쪽 항목을 배경 위로 드래그 · 위젯 클릭으로 스타일 편집 · 드래그로 위치 변경</p>
            </div>
            <div className="flex gap-2">
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
          <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
            <div className="w-full max-w-5xl" style={{ aspectRatio: '16/9' }}>
              <DroppableBoard fileName={fileName} pageName={pageName} onClickCanvas={() => setSelectedWidgetId(null)}>
                {droppedWidgets.map((widget) => (
                  <CanvasWidget
                    key={widget.id}
                    widget={widget}
                    isSelected={selectedWidgetId === widget.id}
                    onSelect={() => setSelectedWidgetId(widget.id)}
                    onRemove={() => removeWidget(widget.id)}
                  />
                ))}
              </DroppableBoard>
            </div>
          </div>
        </div>
      </div>

      {/* DragOverlay */}
      <DragOverlay>
        {activeDrag && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 bg-white shadow-xl cursor-grabbing" style={{ opacity: 0.9 }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeDrag.item.color }} />
            <span className="text-xs font-medium text-slate-700">{activeDrag.item.label}</span>
            {activeDrag.item.unit && <span className="text-[10px] text-slate-400">{activeDrag.item.unit}</span>}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
