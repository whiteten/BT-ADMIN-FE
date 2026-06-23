import { useState } from 'react';
import { DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, X } from 'lucide-react';
import { createUUID, toast } from '@/shared-util';
import { type RollingLayout, RollingPlayer, TRANSITION_OPTIONS, TRANSITION_PREVIEW_ANIMATION, TRANSITION_PREVIEW_CSS } from '../../features/board/components/RollingDisplay';
import {
  useCreateRollingGroup,
  useDeleteRollingGroup,
  useGetRollingGroupList,
  useGetTaskboardDisplayList,
  useGetTaskboardLayoutList,
  useUpdateRollingGroup,
} from '../../features/board/hooks/useTaskboardQueries';
import type { RollingGroup, TaskboardDisplay, TaskboardLayout } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconTrash } from '@/components/custom/Icons';

const parseIdArray = (raw?: string): number[] => {
  try {
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
};

// ─── 실행 옵션(어떤 뷰 그룹으로 보여줄지) — localStorage 기억 (롤링그룹 단위) ──────
const RUN_OPTIONS_STORAGE_PREFIX = 'taskboard-rolling-run-options:';

interface RunOptions {
  applyAll: boolean;
  allDisplayId: number | null;
  perLayoutDisplayId: Record<number, number>;
}

function loadRunOptions(groupId: number): RunOptions {
  try {
    const raw = localStorage.getItem(`${RUN_OPTIONS_STORAGE_PREFIX}${groupId}`);
    if (!raw) return { applyAll: false, allDisplayId: null, perLayoutDisplayId: {} };
    const parsed = JSON.parse(raw) as Partial<RunOptions>;
    return { applyAll: !!parsed.applyAll, allDisplayId: parsed.allDisplayId ?? null, perLayoutDisplayId: parsed.perLayoutDisplayId ?? {} };
  } catch {
    return { applyAll: false, allDisplayId: null, perLayoutDisplayId: {} };
  }
}

function saveRunOptions(groupId: number, options: RunOptions) {
  try {
    localStorage.setItem(`${RUN_OPTIONS_STORAGE_PREFIX}${groupId}`, JSON.stringify(options));
  } catch {
    /* storage 사용 불가 환경 — 무시 */
  }
}

function resolveRollingLayout(layout: TaskboardLayout, display: TaskboardDisplay): RollingLayout {
  return {
    layoutId: layout.layoutId,
    layoutName: layout.layoutName,
    fileName: layout.fileName,
    layoutJson: layout.layoutJson,
    displayId: display.displayId,
    selectionJson: display.selectionJson,
  };
}

// ─── 그룹 편집 뷰 — 전광판(레이아웃)만 순서대로 선택. 뷰 그룹은 실행 시점에 고른다 ──
interface GroupEditViewProps {
  group: RollingGroup | null;
  layoutList: TaskboardLayout[];
  onSave: () => void;
  onCancel: () => void;
}

/** 롤링 순서 한 슬롯 — 같은 전광판이 여러 번 들어가도 각자 독립적으로 드래그·삭제할 수 있도록 고유 uid를 둔다. */
interface RollingSlot {
  uid: string;
  layoutId: number;
}

// ─── 롤링 순서 행 — 드래그로 순서 변경, X로 제거 ───────────────────────────────
function SortableRollingSlotRow({ uid, order, layoutName, onRemove }: { uid: string; order: number; layoutName: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: uid });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 text-xs text-blue-800 bg-white/60 rounded-md px-1.5 py-1">
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 text-blue-400 hover:text-blue-700 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        title="드래그로 순서 변경"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="w-4 h-4 rounded-full bg-[#0f5b9e] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{order}</span>
      <span className="flex-1 min-w-0 truncate">{layoutName}</span>
      <button onClick={onRemove} className="p-0.5 text-blue-400 hover:text-red-500 flex-shrink-0" title="제거">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function GroupEditView({ group, layoutList, onSave, onCancel }: GroupEditViewProps) {
  const [slots, setSlots] = useState<RollingSlot[]>(() => parseIdArray(group?.displayIds).map((layoutId) => ({ uid: createUUID(), layoutId })));
  const [groupName, setGroupName] = useState(group?.groupName ?? '새 그룹');
  const [intervalSec, setIntervalSec] = useState(group?.intervalSec ?? 5);
  const [transitionType, setTransitionType] = useState(group?.transitionType ?? 'fade');
  const [isSaving, setIsSaving] = useState(false);

  const createGroup = useCreateRollingGroup();
  const updateGroup = useUpdateRollingGroup();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // 클릭할 때마다 순서 끝에 추가 — 같은 전광판을 여러 번 추가할 수 있다(중복 허용). 제거는 X, 순서 변경은 드래그로.
  const addLayout = (layoutId: number) => setSlots((prev) => [...prev, { uid: createUUID(), layoutId }]);
  const removeSlot = (uid: string) => setSlots((prev) => prev.filter((s) => s.uid !== uid));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSlots((prev) => {
      const oldIndex = prev.findIndex((s) => s.uid === active.id);
      const newIndex = prev.findIndex((s) => s.uid === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const layoutCounts = new Map<number, number>();
  slots.forEach((s) => layoutCounts.set(s.layoutId, (layoutCounts.get(s.layoutId) ?? 0) + 1));

  const selectedLayouts = slots
    .map((s) => ({ uid: s.uid, layout: layoutList.find((l) => l.layoutId === s.layoutId) }))
    .filter((entry): entry is { uid: string; layout: TaskboardLayout } => entry.layout !== undefined);

  const handleSave = async () => {
    if (selectedLayouts.length === 0) {
      toast.error('전광판을 1개 이상 선택해 주세요.');
      return;
    }
    if (!groupName.trim()) {
      toast.error('그룹 이름을 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        groupName: groupName.trim(),
        displayIds: JSON.stringify(slots.map((s) => s.layoutId)),
        intervalSec,
        transitionType,
      };
      if (group?.groupId) {
        await updateGroup.mutateAsync({ ...payload, groupId: group.groupId });
        toast.success('그룹이 수정되었습니다.');
      } else {
        await createGroup.mutateAsync(payload);
        toast.success('그룹이 저장되었습니다.');
      }
      onSave();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 font-sans overflow-hidden">
      {/* 왼쪽: 전광판 선택 */}
      <div className="w-1/2 flex flex-col border-r border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">전광판 선택</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            롤링할 전광판을 클릭한 순서대로 추가하세요. 같은 전광판을 여러 번 추가할 수 있습니다. 어떤 뷰 그룹으로 보여줄지는 실행할 때 고릅니다. ({selectedLayouts.length}개
            선택됨)
          </p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {layoutList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p>등록된 전광판이 없습니다.</p>
              <p className="text-xs mt-1">전광판 목록에서 먼저 레이아웃을 만들어 주세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {layoutList.map((layout) => {
                const count = layoutCounts.get(layout.layoutId) ?? 0;
                return (
                  <div
                    key={layout.layoutId}
                    onClick={() => addLayout(layout.layoutId)}
                    className={`relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      count > 0 ? 'border-[#0f5b9e] ring-2 ring-[#0f5b9e]/20' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    {count > 0 && (
                      <div className="absolute top-1.5 right-1.5 z-20 min-w-5 h-5 px-1 rounded-full bg-[#0f5b9e] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                        {count > 1 ? `×${count}` : '✓'}
                      </div>
                    )}
                    <div className="aspect-video bg-slate-100 relative overflow-hidden">
                      {layout.fileName ? (
                        <img src={layout.fileName} alt={layout.layoutName} className={`w-full h-full object-cover transition-all ${count > 0 ? 'scale-105' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <span className="text-slate-500 text-xs">이미지 없음</span>
                        </div>
                      )}
                      {count > 0 && <div className="absolute inset-0 bg-[#0f5b9e]/10 pointer-events-none" />}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{layout.layoutName}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 그룹 설정 */}
      <div className="w-1/2 flex flex-col bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">{group ? '그룹 수정' : '새 그룹 만들기'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5 flex flex-col gap-5">
          {/* 그룹명 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">그룹 이름</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] focus:ring-1 focus:ring-[#0f5b9e]/20"
              placeholder="그룹 이름을 입력하세요"
            />
          </div>

          {/* 선택된 전광판 순서 — 목록이 길어지면 이 박스 안에서만 스크롤(전환효과/간격은 항상 보이게 유지) */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 min-h-[60px] flex-shrink-0">
            <p className="text-xs font-semibold text-blue-700 mb-1">롤링 순서 ({selectedLayouts.length}개)</p>
            {selectedLayouts.length === 0 ? (
              <p className="text-xs text-blue-400">왼쪽에서 전광판을 선택해 주세요.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
                <SortableContext items={selectedLayouts.map((s) => s.uid)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
                    {selectedLayouts.map(({ uid, layout }, i) => (
                      <SortableRollingSlotRow key={uid} uid={uid} order={i + 1} layoutName={layout.layoutName} onRemove={() => removeSlot(uid)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* 전환 효과 */}
          <div>
            <style dangerouslySetInnerHTML={{ __html: TRANSITION_PREVIEW_CSS }} />
            <label className="text-xs font-semibold text-slate-600 block mb-2">전환 효과</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TRANSITION_OPTIONS.map((opt) => {
                const isSelected = transitionType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTransitionType(opt.value)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border transition-colors overflow-hidden ${
                      isSelected ? 'border-[#0f5b9e] bg-[#0f5b9e] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f5b9e] hover:text-[#0f5b9e]'
                    }`}
                  >
                    <div className={`relative w-10 h-6 rounded overflow-hidden flex-shrink-0 ${isSelected ? 'bg-blue-800' : 'bg-slate-100'}`}>
                      <div
                        className={`absolute inset-x-1 inset-y-1 rounded-sm ${isSelected ? 'bg-blue-300' : 'bg-[#0f5b9e]/60'}`}
                        style={{ animation: TRANSITION_PREVIEW_ANIMATION[opt.value] }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold leading-none">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 롤링 간격 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              롤링 간격 &nbsp;<span className="text-[#0f5b9e] font-bold">{intervalSec}초</span>
            </label>
            <input type="range" min={3} max={180} step={1} value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))} className="w-full accent-[#0f5b9e] mb-1" />
            <div className="flex justify-between text-[10px] text-slate-400 mb-2">
              <span>3초</span>
              <span>180초</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">직접 입력:</span>
              <input
                type="number"
                min={3}
                max={180}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Math.max(3, Math.min(180, Number(e.target.value))))}
                className="w-16 text-sm font-bold text-center border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#0f5b9e]"
              />
              <span className="text-xs text-slate-500">초</span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 p-4 border-t border-slate-100 flex gap-2 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 py-2.5 bg-[#0f5b9e] text-white text-sm font-bold rounded-lg hover:bg-[#0c4a82] disabled:opacity-50 transition-colors"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 실행 옵션 뷰 — 어떤 뷰 그룹으로 보여줄지 선택(전체 적용 또는 전광판별 개별) ──────
interface RunOptionsViewProps {
  group: RollingGroup;
  layoutList: TaskboardLayout[];
  displayList: TaskboardDisplay[];
  onStart: (layouts: RollingLayout[]) => void;
  onCancel: () => void;
}

function RunOptionsView({ group, layoutList, displayList, onStart, onCancel }: RunOptionsViewProps) {
  // 자리(occurrence) 인덱스를 key로 둬서 같은 전광판이 여러 번 들어가도 자리마다 다른 뷰 그룹을 고를 수 있게 한다.
  const boardLayouts = parseIdArray(group.displayIds)
    .map((id, occurrenceIndex) => ({ occurrenceIndex, layout: layoutList.find((l) => l.layoutId === id) }))
    .filter((entry): entry is { occurrenceIndex: number; layout: TaskboardLayout } => entry.layout !== undefined);

  const stored = loadRunOptions(group.groupId);
  const [applyAll, setApplyAll] = useState(stored.applyAll);
  const [allDisplayId, setAllDisplayId] = useState<number | null>(stored.allDisplayId);
  const [perLayoutDisplayId, setPerLayoutDisplayId] = useState<Record<number, number>>(stored.perLayoutDisplayId);

  const handleStart = () => {
    const layouts: RollingLayout[] = [];
    for (const { occurrenceIndex, layout } of boardLayouts) {
      const displayId = applyAll ? allDisplayId : perLayoutDisplayId[occurrenceIndex];
      if (!displayId) {
        toast.error(applyAll ? '뷰 그룹을 선택해 주세요.' : `"${occurrenceIndex + 1}. ${layout.layoutName}"에서 보여줄 뷰 그룹을 선택해 주세요.`);
        return;
      }
      const display = displayList.find((d) => d.displayId === displayId);
      if (!display) continue;
      layouts.push(resolveRollingLayout(layout, display));
    }
    if (layouts.length === 0) {
      toast.error('실행할 전광판이 없습니다.');
      return;
    }
    saveRunOptions(group.groupId, { applyAll, allDisplayId, perLayoutDisplayId });
    onStart(layouts);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">실행 옵션</h2>
            <p className="text-xs text-slate-500 mt-0.5">"{group.groupName}" — 어떤 뷰 그룹으로 보여줄지 선택하세요.</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-4">
          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200">
            <input type="checkbox" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} className="w-4 h-4" style={{ accentColor: '#0f5b9e' }} />
            <span className="text-sm font-semibold text-slate-700">전체 전광판에 같은 뷰 그룹 적용</span>
          </label>

          {applyAll ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">뷰 그룹</label>
              <select
                value={allDisplayId ?? ''}
                onChange={(e) => setAllDisplayId(e.target.value ? Number(e.target.value) : null)}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0f5b9e]"
              >
                <option value="">뷰 그룹 선택...</option>
                {displayList.map((d) => (
                  <option key={d.displayId} value={d.displayId}>
                    {d.displayName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {boardLayouts.map(({ occurrenceIndex, layout }) => {
                return (
                  <div key={occurrenceIndex}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      <span className="text-slate-400 font-mono mr-1">{occurrenceIndex + 1}.</span>
                      {layout.layoutName}
                    </label>
                    {displayList.length === 0 ? (
                      <p className="text-[11px] text-slate-400">등록된 뷰 그룹이 없습니다. 뷰 그룹 관리에서 먼저 등록해 주세요.</p>
                    ) : (
                      <select
                        value={perLayoutDisplayId[occurrenceIndex] ?? ''}
                        onChange={(e) => setPerLayoutDisplayId((prev) => ({ ...prev, [occurrenceIndex]: e.target.value ? Number(e.target.value) : 0 }))}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#0f5b9e]"
                      >
                        <option value="">뷰 그룹 선택...</option>
                        {displayList.map((d) => (
                          <option key={d.displayId} value={d.displayId}>
                            {d.displayName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-md transition-colors">
            취소
          </button>
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M8 5v14l11-7z" />
            </svg>
            시작
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 그룹 카드 썸네일 (최대 3장 겹치기) ──────────────────────────────────────
function GroupThumbnails({ group, layoutList }: { group: RollingGroup; layoutList: TaskboardLayout[] }) {
  const ids = parseIdArray(group.displayIds);
  const thumbs = ids
    .slice(0, 3)
    .map((id) => layoutList.find((l) => l.layoutId === id)?.fileName)
    .filter(Boolean) as string[];
  const totalCount = ids.length;

  const rotations = [-3, -1.5, 0];
  const offsets = [
    { x: -10, y: 4 },
    { x: -5, y: 2 },
    { x: 0, y: 0 },
  ];

  return (
    <div className="relative mx-4 mt-3 mb-1 h-[58px]">
      {thumbs.length > 0 ? (
        <>
          {thumbs.map((url, i) => (
            <div
              key={i}
              className="absolute rounded-md overflow-hidden border-2 border-white shadow-md bg-slate-200"
              style={{
                width: '92px',
                height: '52px',
                left: `${i * 12}px`,
                top: `${offsets[i]?.y ?? 0}px`,
                transform: `rotate(${rotations[i] ?? 0}deg)`,
                zIndex: thumbs.length - i,
              }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {totalCount > 3 && <div className="absolute bottom-0 left-28 bg-slate-700/90 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold z-20">+{totalCount - 3}</div>}
        </>
      ) : (
        <div className="w-full h-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200">이미지 없음</div>
      )}
    </div>
  );
}

// ─── 그룹 목록 뷰 ───────────────────────────────────────────────────────────
interface GroupListViewProps {
  groups: RollingGroup[];
  layoutList: TaskboardLayout[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (g: RollingGroup) => void;
  onRun: (g: RollingGroup) => void;
  onDelete: (g: RollingGroup) => void;
}

function GroupListView({ groups, layoutList, isLoading, onAdd, onEdit, onRun, onDelete }: GroupListViewProps) {
  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 그룹 관리</h1>
        </div>
        <button
          onClick={onAdd}
          className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          새 그룹 만들기
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <FallbackSpinner />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-24 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white">
          <p className="text-lg font-medium">저장된 그룹이 없습니다.</p>
          <p className="text-sm mt-1">오른쪽 상단의 &quot;새 그룹 만들기&quot;를 눌러 그룹을 만들어 주세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {groups.map((group) => {
            const layoutCount = parseIdArray(group.displayIds).length;
            return (
              <div key={group.groupId} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800 truncate min-w-0">{group.groupName}</h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => onEdit(group)} className="p-1.5 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded transition-colors" title="수정">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => onDelete(group)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="삭제">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <GroupThumbnails group={group} layoutList={layoutList} />

                <div className="px-4 py-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <rect x={3} y={3} width={18} height={18} rx={2} />
                      <path strokeLinecap="round" d="M3 9h18M9 21V9" />
                    </svg>
                    전광판 {layoutCount}개
                  </span>
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <circle cx={12} cy={12} r={10} />
                      <path strokeLinecap="round" d="M12 6v6l4 2" />
                    </svg>
                    {group.intervalSec}초
                  </span>
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={() => onRun(group)}
                    className="w-full py-2.5 bg-[#0f5b9e] text-white text-sm font-bold rounded-lg hover:bg-[#0c4a82] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    롤링 시작
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
type ViewMode = 'list' | 'edit' | 'run-options' | 'rolling';

export default function TaskMgmt() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingGroup, setEditingGroup] = useState<RollingGroup | null>(null);
  const [runningGroup, setRunningGroup] = useState<RollingGroup | null>(null);
  const [rollingLayouts, setRollingLayouts] = useState<RollingLayout[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<RollingGroup | null>(null);

  const { data: groupList = [], isLoading, refetch } = useGetRollingGroupList();
  const { data: layoutList = [] } = useGetTaskboardLayoutList();
  const { data: displayList = [] } = useGetTaskboardDisplayList();
  const deleteGroup = useDeleteRollingGroup();

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup.mutateAsync(deleteTarget.groupId);
      toast.success('그룹이 삭제되었습니다.');
      refetch();
    } catch {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (viewMode === 'rolling' && runningGroup) {
    return (
      <RollingPlayer
        layouts={rollingLayouts}
        intervalSec={runningGroup.intervalSec ?? 5}
        transitionType={runningGroup.transitionType ?? 'fade'}
        onStop={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'edit') {
    return (
      <div className="w-full h-full overflow-hidden">
        <GroupEditView
          group={editingGroup}
          layoutList={layoutList}
          onSave={() => {
            setViewMode('list');
            refetch();
          }}
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  return (
    <>
      <GroupListView
        groups={groupList}
        layoutList={layoutList}
        isLoading={isLoading}
        onAdd={() => {
          setEditingGroup(null);
          setViewMode('edit');
        }}
        onEdit={(g) => {
          setEditingGroup(g);
          setViewMode('edit');
        }}
        onRun={(g) => {
          setRunningGroup(g);
          setViewMode('run-options');
        }}
        onDelete={setDeleteTarget}
      />
      {viewMode === 'run-options' && runningGroup && (
        <RunOptionsView
          group={runningGroup}
          layoutList={layoutList}
          displayList={displayList}
          onStart={(layouts) => {
            setRollingLayouts(layouts);
            setViewMode('rolling');
          }}
          onCancel={() => setViewMode('list')}
        />
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[320px] overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">그룹 삭제</h3>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">&ldquo;{deleteTarget.groupName}&rdquo;</span> 그룹을 삭제하시겠습니까?
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors border-r border-slate-100"
              >
                취소
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
