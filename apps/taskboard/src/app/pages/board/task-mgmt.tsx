import { useState } from 'react';
import { toast } from '@/shared-util';
import { type RollingLayout, RollingPlayer, TRANSITION_OPTIONS, TRANSITION_PREVIEW_ANIMATION, TRANSITION_PREVIEW_CSS } from '../../features/board/components/RollingDisplay';
import {
  useCreateRollingGroup,
  useDeleteRollingGroup,
  useGetRollingGroupList,
  useGetTaskboardLayoutList,
  useUpdateRollingGroup,
} from '../../features/board/hooks/useTaskboardQueries';
import type { RollingGroup, TaskboardLayout } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const parseLayoutIds = (raw?: string): number[] => {
  try {
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
};

// ─── 그룹 편집 뷰 ─────────────────────────────────────────────────────────────
interface GroupEditViewProps {
  group: RollingGroup | null;
  layoutList: TaskboardLayout[];
  onSave: () => void;
  onCancel: () => void;
}

function GroupEditView({ group, layoutList, onSave, onCancel }: GroupEditViewProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => parseLayoutIds(group?.layoutIds));
  const [groupName, setGroupName] = useState(group?.groupName ?? '새 그룹');
  const [intervalSec, setIntervalSec] = useState(group?.intervalSec ?? 5);
  const [transitionType, setTransitionType] = useState(group?.transitionType ?? 'fade');
  const [isSaving, setIsSaving] = useState(false);

  const createGroup = useCreateRollingGroup();
  const updateGroup = useUpdateRollingGroup();

  const toggleSelect = (id: number) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedLayouts = selectedIds.map((id) => layoutList.find((l) => l.layoutId === id)).filter(Boolean) as TaskboardLayout[];

  const handleSave = async () => {
    if (selectedLayouts.length === 0) {
      toast.error('레이아웃을 1개 이상 선택해 주세요.');
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
        layoutIds: JSON.stringify(selectedIds),
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
      {/* 왼쪽: 레이아웃 선택 리스트 */}
      <div className="w-1/2 flex flex-col border-r border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">레이아웃 선택</h2>
          <p className="text-xs text-slate-500 mt-0.5">롤링할 레이아웃을 클릭하여 선택하세요. ({selectedIds.length}개 선택됨)</p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {layoutList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p>레이아웃이 없습니다.</p>
              <p className="text-xs mt-1">전광판 목록에서 먼저 레이아웃을 만들어 주세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {layoutList.map((item) => {
                const isSelected = selectedIds.includes(item.layoutId);
                const order = selectedIds.indexOf(item.layoutId) + 1;
                return (
                  <div
                    key={item.layoutId}
                    onClick={() => toggleSelect(item.layoutId)}
                    className={`relative bg-white rounded-xl border-2 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-[#0f5b9e] ring-2 ring-[#0f5b9e]/20' : 'border-transparent hover:border-slate-200'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-[#0f5b9e] text-white text-[10px] font-bold flex items-center justify-center shadow-md">
                        {order}
                      </div>
                    )}
                    <div className="aspect-video bg-slate-100 relative overflow-hidden">
                      {item.fileName ? (
                        <img src={item.fileName} alt={item.layoutName} className={`w-full h-full object-cover transition-all ${isSelected ? 'scale-105' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                          <span className="text-slate-500 text-xs">이미지 없음</span>
                        </div>
                      )}
                      {isSelected && <div className="absolute inset-0 bg-[#0f5b9e]/10 pointer-events-none" />}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.layoutName}</p>
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

          {/* 선택된 레이아웃 순서 */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 min-h-[60px]">
            <p className="text-xs font-semibold text-blue-700 mb-1">롤링 순서 ({selectedLayouts.length}개)</p>
            {selectedLayouts.length === 0 ? (
              <p className="text-xs text-blue-400">왼쪽에서 레이아웃을 선택해 주세요.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {selectedLayouts.map((l, i) => (
                  <div key={l.layoutId} className="flex items-center gap-2 text-xs text-blue-800">
                    <span className="w-4 h-4 rounded-full bg-[#0f5b9e] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
                    <span className="truncate">{l.layoutName}</span>
                  </div>
                ))}
              </div>
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
            <input type="range" min={3} max={60} step={1} value={intervalSec} onChange={(e) => setIntervalSec(Number(e.target.value))} className="w-full accent-[#0f5b9e] mb-1" />
            <div className="flex justify-between text-[10px] text-slate-400 mb-2">
              <span>3초</span>
              <span>60초</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">직접 입력:</span>
              <input
                type="number"
                min={3}
                max={60}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Math.max(3, Math.min(60, Number(e.target.value))))}
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

// ─── 그룹 카드 썸네일 (최대 3장 겹치기) ──────────────────────────────────────
function GroupThumbnails({ group, layoutList }: { group: RollingGroup; layoutList: TaskboardLayout[] }) {
  const ids = parseLayoutIds(group.layoutIds);
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
          <p className="text-sm text-slate-500 mt-1">레이아웃 그룹을 만들고 롤링을 실행하세요.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((group) => {
            const layoutCount = parseLayoutIds(group.layoutIds).length;
            return (
              <div key={group.groupId} className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 truncate">{group.groupName}</h3>
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
                    {layoutCount}개
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
type ViewMode = 'list' | 'edit' | 'rolling';

export default function TaskMgmt() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingGroup, setEditingGroup] = useState<RollingGroup | null>(null);
  const [rollingLayouts, setRollingLayouts] = useState<RollingLayout[]>([]);
  const [rollingInterval, setRollingInterval] = useState(5);
  const [rollingTransitionType, setRollingTransitionType] = useState('fade');

  const { data: groupList = [], isLoading, refetch } = useGetRollingGroupList();
  const { data: layoutList = [] } = useGetTaskboardLayoutList();
  const deleteGroup = useDeleteRollingGroup();

  const handleRun = (group: RollingGroup) => {
    const ids = parseLayoutIds(group.layoutIds);
    const layouts: RollingLayout[] = ids
      .map((id) => layoutList.find((l) => l.layoutId === id))
      .filter((l): l is TaskboardLayout => l !== undefined)
      .map((l) => ({
        layoutId: l.layoutId,
        layoutName: l.layoutName,
        fileName: l.fileName,
        layoutJson: l.layoutJson,
      }));
    if (layouts.length === 0) {
      toast.error('선택된 레이아웃이 없습니다. 그룹을 수정해 주세요.');
      return;
    }
    setRollingLayouts(layouts);
    setRollingInterval(group.intervalSec ?? 5);
    setRollingTransitionType(group.transitionType ?? 'fade');
    setViewMode('rolling');
  };

  const handleDelete = async (group: RollingGroup) => {
    if (!confirm(`"${group.groupName}" 그룹을 삭제하시겠습니까?`)) return;
    try {
      await deleteGroup.mutateAsync(group.groupId);
      toast.success('그룹이 삭제되었습니다.');
      refetch();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  if (viewMode === 'rolling') {
    return <RollingPlayer layouts={rollingLayouts} intervalSec={rollingInterval} transitionType={rollingTransitionType} onStop={() => setViewMode('list')} />;
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
      onRun={handleRun}
      onDelete={handleDelete}
    />
  );
}
