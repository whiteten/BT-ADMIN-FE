import { useEffect, useRef, useState } from 'react';
import { toast } from '@/shared-util';
import { useCreateNotice, useDeleteNotice, useGetNoticeList, useUpdateNotice } from '../../features/board/hooks/useTaskboardQueries';
import type { TaskboardNotice } from '../../features/board/types/taskboard.types';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const DISPLAY_TYPE_OPTIONS: { value: TaskboardNotice['displayType']; label: string }[] = [
  { value: 'fixed', label: '고정' },
  { value: 'slide', label: '슬라이드' },
];

const EMPTY_FORM: Omit<TaskboardNotice, 'noticeId' | 'regDt'> = {
  noticeKey: '',
  title: '',
  content: '',
  authorName: '',
  startDt: '',
  endDt: '',
  alwaysActiveYn: 'N',
  activeYn: 'Y',
  displayType: 'slide',
  sortOrder: 0,
  useYn: 'Y',
};

// ─── 폼 컴포넌트 ──────────────────────────────────────────────────────────────

interface NoticeFormProps {
  initial: TaskboardNotice | null;
  onSave: () => void;
  onCancel: () => void;
}

function NoticeForm({ initial, onSave, onCancel }: NoticeFormProps) {
  const [form, setForm] = useState<Omit<TaskboardNotice, 'noticeId' | 'regDt'>>(() =>
    initial
      ? {
          noticeKey: initial.noticeKey,
          title: initial.title ?? '',
          content: initial.content,
          authorName: initial.authorName ?? '',
          startDt: initial.startDt ?? '',
          endDt: initial.endDt ?? '',
          alwaysActiveYn: initial.alwaysActiveYn,
          activeYn: initial.activeYn,
          displayType: initial.displayType,
          sortOrder: initial.sortOrder,
          useYn: initial.useYn,
        }
      : { ...EMPTY_FORM },
  );
  const [isSaving, setIsSaving] = useState(false);

  const createNotice = useCreateNotice({});
  const updateNotice = useUpdateNotice({});

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.noticeKey.trim()) {
      toast.error('공지 키를 입력해 주세요.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('공지 내용을 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      if (initial?.noticeId) {
        await updateNotice.mutateAsync({ ...form, noticeId: initial.noticeId });
        toast.success('공지사항이 수정되었습니다.');
      } else {
        await createNotice.mutateAsync(form);
        toast.success('공지사항이 등록되었습니다.');
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800">{initial ? '공지사항 수정' : '공지사항 등록'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
            ✕
          </button>
        </div>

        {/* 폼 */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 flex flex-col gap-4">
          {/* 공지 키 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              공지 키 <span className="text-red-400">*</span>
              <span className="ml-1 text-[10px] text-slate-400 font-normal">전광판 위젯에서 이 키로 공지를 불러옵니다</span>
            </label>
            <input
              value={form.noticeKey}
              onChange={(e) => set('noticeKey', e.target.value)}
              placeholder="예: MAIN_NOTICE"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] focus:ring-1 focus:ring-[#0f5b9e]/20 font-mono"
            />
          </div>

          {/* 제목 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">제목</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="공지 제목 (선택)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] focus:ring-1 focus:ring-[#0f5b9e]/20"
            />
          </div>

          {/* 내용 */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              내용 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={3}
              placeholder="공지 내용을 입력하세요"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] focus:ring-1 focus:ring-[#0f5b9e]/20 resize-none"
            />
          </div>

          {/* 표시 유형 / 정렬순서 */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 block mb-1">표시 유형</label>
              <div className="flex gap-1">
                {DISPLAY_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('displayType', opt.value)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${form.displayType === opt.value ? 'border-[#0f5b9e] bg-[#0f5b9e] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0f5b9e]'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-28">
              <label className="text-xs font-semibold text-slate-600 block mb-1">정렬 순서</label>
              <input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => set('sortOrder', parseInt(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-[#0f5b9e]"
              />
            </div>
          </div>

          {/* 기간 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">표시 기간</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={form.alwaysActiveYn === 'Y'} onChange={(e) => set('alwaysActiveYn', e.target.checked ? 'Y' : 'N')} className="accent-[#0f5b9e]" />
                <span className="text-xs text-slate-500">상시 표시</span>
              </label>
            </div>
            {form.alwaysActiveYn !== 'Y' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={form.startDt}
                  onChange={(e) => set('startDt', e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e]"
                />
                <span className="self-center text-slate-400 text-xs">~</span>
                <input
                  type="date"
                  value={form.endDt}
                  onChange={(e) => set('endDt', e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e]"
                />
              </div>
            )}
          </div>

          {/* 활성 / 사용 여부 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activeYn === 'Y'} onChange={(e) => set('activeYn', e.target.checked ? 'Y' : 'N')} className="accent-[#0f5b9e]" />
              <span className="text-xs text-slate-600 font-medium">활성화</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.useYn === 'Y'} onChange={(e) => set('useYn', e.target.checked ? 'Y' : 'N')} className="accent-[#0f5b9e]" />
              <span className="text-xs text-slate-600 font-medium">사용 여부</span>
            </label>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
            취소
          </button>
          <button
            onClick={handleSubmit}
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

// ─── 메인 ─────────────────────────────────────────────────────────────────────

export default function TaskNotice() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<TaskboardNotice | null>(null);
  const [searchKey, setSearchKey] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: notices = [], isLoading, refetch } = useGetNoticeList({});
  const deleteNotice = useDeleteNotice({});

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleAdd = () => {
    setEditingNotice(null);
    setFormOpen(true);
  };

  const handleEdit = (notice: TaskboardNotice) => {
    setEditingNotice(notice);
    setFormOpen(true);
  };

  const handleFormSave = () => {
    setFormOpen(false);
    refetch();
  };

  const handleDelete = async (notice: TaskboardNotice) => {
    if (!confirm(`"${notice.title || notice.noticeKey}" 공지사항을 삭제하시겠습니까?`)) return;
    try {
      await deleteNotice.mutateAsync(notice.noticeId);
      toast.success('삭제되었습니다.');
      refetch();
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  const filtered = notices.filter(
    (n) =>
      !searchKey ||
      n.noticeKey.toLowerCase().includes(searchKey.toLowerCase()) ||
      (n.title ?? '').toLowerCase().includes(searchKey.toLowerCase()) ||
      n.content.toLowerCase().includes(searchKey.toLowerCase()),
  );

  // 키별 그룹화
  const grouped = filtered.reduce<Record<string, TaskboardNotice[]>>((acc, n) => {
    const key = n.noticeKey || '(키 없음)';
    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">공지사항 관리</h1>
          <p className="text-sm text-slate-500 mt-1">전광판에 표시할 공지사항을 키(noticeKey)별로 관리합니다.</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          공지 등록
        </button>
      </div>

      {/* 검색 */}
      <div className="mb-5">
        <div className="relative max-w-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx={11} cy={11} r={8} />
            <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={searchRef}
            value={searchKey}
            onChange={(e) => setSearchKey(e.target.value)}
            placeholder="키 / 제목 / 내용 검색..."
            className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] bg-white"
          />
        </div>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">불러오는 중...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="py-24 text-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white">
          <p className="text-lg font-medium">등록된 공지사항이 없습니다.</p>
          <p className="text-sm mt-1">오른쪽 상단의 &quot;공지 등록&quot; 버튼을 눌러 추가하세요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([key, items]) => (
            <div key={key} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {/* 키 헤더 */}
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#0f5b9e] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{key}</span>
                <span className="text-xs text-slate-400">{items.length}건</span>
              </div>

              {/* 공지 항목 */}
              <div className="divide-y divide-slate-50">
                {items
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((notice) => (
                    <div key={notice.noticeId} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                      {/* 상태 뱃지 */}
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${notice.activeYn === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                        >
                          {notice.activeYn === 'Y' ? '활성' : '비활성'}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${notice.useYn === 'Y' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {notice.useYn === 'Y' ? '사용' : '미사용'}
                        </span>
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {notice.title && <p className="text-sm font-semibold text-slate-800 truncate">{notice.title}</p>}
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {notice.displayType === 'slide' ? '슬라이드' : '고정'} · 순서 {notice.sortOrder}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">{notice.content}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                          {notice.alwaysActiveYn === 'Y' ? (
                            <span>상시 표시</span>
                          ) : (
                            <span>
                              {notice.startDt || '—'} ~ {notice.endDt || '—'}
                            </span>
                          )}
                          {notice.regDt && <span>{notice.regDt.slice(0, 10)}</span>}
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(notice)} className="p-1.5 text-slate-400 hover:text-[#0f5b9e] hover:bg-blue-50 rounded transition-colors" title="수정">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(notice)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="삭제">
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
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 폼 모달 */}
      {formOpen && <NoticeForm initial={editingNotice} onSave={handleFormSave} onCancel={() => setFormOpen(false)} />}
    </div>
  );
}
