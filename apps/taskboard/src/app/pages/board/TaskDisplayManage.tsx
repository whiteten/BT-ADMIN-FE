import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { MultiSelectDropdown } from '../../features/board/components/MultiSelectDropdown';
import {
  useCreateTaskboardDisplay,
  useCreateTaskboardDisplayLayout,
  useDeleteTaskboardDisplay,
  useDeleteTaskboardDisplayLayout,
  useGetCtiAgentList,
  useGetCtiGroupList,
  useGetCtiQueueList,
  useGetTaskboardDisplayLayoutList,
  useGetTaskboardDisplayList,
  useGetTaskboardLayoutList,
  useUpdateTaskboardDisplay,
} from '../../features/board/hooks/useTaskboardQueries';
import type { TaskboardDisplay, TaskboardDisplayLayout, TaskboardDisplaySelection } from '../../features/board/types/taskboard.types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

function parseSelection(selectionJson?: string): TaskboardDisplaySelection {
  if (!selectionJson) return {};
  try {
    return JSON.parse(selectionJson) as TaskboardDisplaySelection;
  } catch {
    return {};
  }
}

// ─── 디스플레이(그룹핑) 등록/수정 폼 ──────────────────────────────────────────

interface DisplayFormProps {
  initial: TaskboardDisplay | null;
  onSave: () => void;
  onCancel: () => void;
}

function DisplayForm({ initial, onSave, onCancel }: DisplayFormProps) {
  const initialSelection = parseSelection(initial?.selectionJson);
  const userInfo = useAuthStore((s) => s.userInfo);

  const [displayName, setDisplayName] = useState(initial?.displayName ?? '새 디스플레이');
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>(initialSelection.queueIds ?? []);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialSelection.groupIds ?? []);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(initialSelection.agentIds ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const [queueDropdownOpen, setQueueDropdownOpen] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const queueDropdownRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  const { data: queueRows = [], isFetching: queueFetching } = useGetCtiQueueList({ queryOptions: { refetchInterval: false } });
  const { data: groupRows = [], isFetching: groupFetching } = useGetCtiGroupList({ queryOptions: { refetchInterval: false } });
  const { data: agentRows = [], isFetching: agentFetching } = useGetCtiAgentList({ queryOptions: { refetchInterval: false } });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (queueDropdownRef.current && !queueDropdownRef.current.contains(e.target as Node)) setQueueDropdownOpen(false);
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) setGroupDropdownOpen(false);
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) setAgentDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleQueue = (id: string) => setSelectedQueueIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
  const toggleAllQueues = () => setSelectedQueueIds((prev) => (prev.length === queueRows.length && queueRows.length > 0 ? [] : queueRows.map((q) => q.ctiqId)));

  const toggleGroup = (id: string) => setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  const toggleAllGroups = () => setSelectedGroupIds((prev) => (prev.length === groupRows.length && groupRows.length > 0 ? [] : groupRows.map((g) => g.groupId)));

  const toggleAgent = (id: string) => setSelectedAgentIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  const toggleAllAgents = () => setSelectedAgentIds((prev) => (prev.length === agentRows.length && agentRows.length > 0 ? [] : agentRows.map((a) => a.agentId)));

  const createDisplay = useCreateTaskboardDisplay({});
  const updateDisplay = useUpdateTaskboardDisplay({});

  const handleSubmit = async () => {
    if (!displayName.trim()) {
      toast.error('디스플레이 이름을 입력해 주세요.');
      return;
    }
    const selectionJson = JSON.stringify({
      queueIds: selectedQueueIds,
      groupIds: selectedGroupIds,
      agentIds: selectedAgentIds,
    });
    setIsSaving(true);
    try {
      if (initial?.displayId) {
        await updateDisplay.mutateAsync({ displayId: initial.displayId, displayName, selectionJson });
        toast.success('디스플레이가 수정되었습니다.');
      } else {
        await createDisplay.mutateAsync({ tenantId: userInfo?.tenant ?? '', displayName, selectionJson });
        toast.success('디스플레이가 등록되었습니다.');
      }
      onSave();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{initial ? '디스플레이 수정' : '디스플레이 등록'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">디스플레이 이름</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 1팀 그룹, 본사 로비"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">이 디스플레이에서 보여줄 데이터</label>
            <div className="flex flex-col gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-cyan-800 whitespace-nowrap w-14 flex-shrink-0">큐</span>
                <MultiSelectDropdown
                  label="큐"
                  color="#0891b2"
                  isFetching={queueFetching}
                  items={queueRows.map((q) => ({ id: q.ctiqId, name: q.ctiqName }))}
                  selectedIds={selectedQueueIds}
                  isOpen={queueDropdownOpen}
                  dropdownRef={queueDropdownRef}
                  onToggleOpen={() => setQueueDropdownOpen((v) => !v)}
                  onToggleItem={toggleQueue}
                  onToggleAll={toggleAllQueues}
                  emptyText="큐 데이터 없음"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-violet-700 whitespace-nowrap w-14 flex-shrink-0">상담그룹</span>
                <MultiSelectDropdown
                  label="상담그룹"
                  color="#7c3aed"
                  isFetching={groupFetching}
                  items={groupRows.map((g) => ({ id: g.groupId, name: g.groupName }))}
                  selectedIds={selectedGroupIds}
                  isOpen={groupDropdownOpen}
                  dropdownRef={groupDropdownRef}
                  onToggleOpen={() => setGroupDropdownOpen((v) => !v)}
                  onToggleItem={toggleGroup}
                  onToggleAll={toggleAllGroups}
                  emptyText="그룹 데이터 없음"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap w-14 flex-shrink-0">상담사</span>
                <MultiSelectDropdown
                  label="상담사"
                  color="#059669"
                  isFetching={agentFetching}
                  items={agentRows.map((a) => ({ id: a.agentId, name: a.agentName }))}
                  selectedIds={selectedAgentIds}
                  isOpen={agentDropdownOpen}
                  dropdownRef={agentDropdownRef}
                  onToggleOpen={() => setAgentDropdownOpen((v) => !v)}
                  onToggleItem={toggleAgent}
                  onToggleAll={toggleAllAgents}
                  emptyText="상담사 데이터 없음"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-md transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm disabled:opacity-60"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 레이아웃 연결 칩 + 추가 드롭다운 ─────────────────────────────────────────

interface LayoutLinkSectionProps {
  displayId: number;
  links: TaskboardDisplayLayout[];
  layouts: { layoutId: number; layoutName: string }[];
  onChanged: () => void;
}

function LayoutLinkSection({ displayId, links, layouts, onChanged }: LayoutLinkSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const createLink = useCreateTaskboardDisplayLayout({});
  const deleteLink = useDeleteTaskboardDisplayLayout({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const linkedLayoutIds = new Set(links.map((l) => l.layoutId));
  const availableLayouts = layouts.filter((l) => !linkedLayoutIds.has(l.layoutId));

  const handleAdd = async (layoutId: number) => {
    try {
      await createLink.mutateAsync({ displayId, layoutId });
      onChanged();
    } catch {
      toast.error('전광판 연결에 실패했습니다.');
    }
  };

  const handleRemove = async (displayLayoutId: number) => {
    try {
      await deleteLink.mutateAsync(displayLayoutId);
      onChanged();
    } catch {
      toast.error('전광판 연결 해제에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {links.length === 0 && <span className="text-[11px] text-slate-400">연결된 전광판 없음</span>}
      {links.map((link) => (
        <span key={link.displayLayoutId} className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
          {link.layoutName ?? `#${link.layoutId}`}
          <button onClick={() => handleRemove(link.displayLayoutId)} className="text-slate-400 hover:text-red-500 leading-none">
            &times;
          </button>
        </span>
      ))}
      <div className="relative" ref={pickerRef}>
        <button
          onClick={() => setPickerOpen((v) => !v)}
          disabled={availableLayouts.length === 0}
          className="text-[11px] font-semibold text-[#0f5b9e] border border-[#0f5b9e]/40 px-2 py-1 rounded-full hover:bg-[#0f5b9e]/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          + 전광판 추가
        </button>
        {pickerOpen && (
          <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 min-w-[200px] max-h-60 overflow-y-auto">
            {availableLayouts.map((layout) => (
              <button
                key={layout.layoutId}
                onClick={() => {
                  handleAdd(layout.layoutId);
                  setPickerOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 truncate"
              >
                {layout.layoutName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TaskDisplayManage (메인) ─────────────────────────────────────────────────

export default function TaskDisplayManage() {
  const { data: displays = [], isLoading, refetch } = useGetTaskboardDisplayList();
  const { data: layouts = [] } = useGetTaskboardLayoutList({});
  const { data: links = [], refetch: refetchLinks } = useGetTaskboardDisplayLayoutList();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState<TaskboardDisplay | null>(null);

  const deleteDisplay = useDeleteTaskboardDisplay({});
  const modal = useModal();

  const handleAdd = () => {
    setEditingDisplay(null);
    setFormOpen(true);
  };

  const handleEdit = (display: TaskboardDisplay) => {
    setEditingDisplay(display);
    setFormOpen(true);
  };

  const handleFormSave = () => {
    setFormOpen(false);
    refetch();
  };

  const handleDelete = (display: TaskboardDisplay) => {
    modal.confirm.delete({ onOk: () => doDelete(display) });
  };

  const doDelete = async (display: TaskboardDisplay) => {
    try {
      await deleteDisplay.mutateAsync(display.displayId);
      toast.success('삭제되었습니다.');
      refetch();
      refetchLinks();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">디스플레이 관리</h1>
          <p className="text-sm text-slate-500 mt-1">큐/그룹/상담사 선택값(그룹핑)을 만들고, 여러 전광판(레이아웃)에 그대로 재사용할 수 있습니다.</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          디스플레이 등록
        </button>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-slate-400">불러오는 중...</div>
      ) : displays.length === 0 ? (
        <div className="py-24 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white">
          <p className="text-lg font-medium">등록된 디스플레이가 없습니다.</p>
          <p className="text-sm mt-1">오른쪽 상단의 &quot;디스플레이 등록&quot; 버튼을 눌러 추가하세요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {displays.map((d) => (
            <div key={d.displayId} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-800">{d.displayName}</div>
                  <div className="text-xs text-slate-400">#{d.displayId}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(d)}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    className="px-3 py-1.5 text-xs font-semibold border border-red-200 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1.5">연결된 전광판</div>
                <LayoutLinkSection
                  displayId={d.displayId}
                  links={links.filter((l) => l.displayId === d.displayId)}
                  layouts={layouts.map((l) => ({ layoutId: l.layoutId, layoutName: l.layoutName }))}
                  onChanged={() => refetchLinks()}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && <DisplayForm initial={editingDisplay} onSave={handleFormSave} onCancel={() => setFormOpen(false)} />}
    </div>
  );
}
