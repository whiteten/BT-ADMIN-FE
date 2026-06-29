/**
 * 스케줄 배정 관리 Drawer (배정된 / 배정 가능 2패널).
 *
 * 단일 스케줄에 상담사 또는 상담그룹(subject)을 배정/해제한다.
 * AS-IS SWAT IPR20S4010/IPR20S4020 스케줄 탭 좌(배정됨)/우(배정가능) 2-리스트.
 * 기구현 skillset-master/SkillsetScheduleDrawer 패턴 정합.
 *
 *  - 상단: 배정된 주체 목록 (해제 X 버튼)
 *  - 하단: 배정 가능한 주체 (검색 + 체크 후 배정 버튼)
 */
import { useMemo, useState } from 'react';
import { Button, Drawer, Empty, Input, Select } from 'antd';
import { Search, UserPlus, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useAssignTargets, useGetAssignableTargets, useGetAssignedTargets, useUnassignTargets } from '../hooks/useAgentScheduleQueries';
import { MEDIA_TYPE_OPTIONS, SUBJECT_LABELS, type ScheduleAssignTarget, type ScheduleInfoResponse, type ScheduleKind, type ScheduleSubject } from '../types';

interface Props {
  open: boolean;
  kind: ScheduleKind;
  subject: ScheduleSubject;
  schedule: ScheduleInfoResponse | null;
  onClose: () => void;
}

function targetSubText(t: ScheduleAssignTarget, subject: ScheduleSubject): string | null {
  if (subject === 'agent') {
    const login = t.loginId ? `(${t.loginId})` : '';
    return [login, t.groupName].filter(Boolean).join(' ') || null;
  }
  return t.memberCount != null ? `${t.memberCount.toLocaleString()}명 소속` : null;
}

export default function ScheduleAssignDrawer({ open, kind, subject, schedule, onClose }: Props) {
  const scheduleId = schedule?.scheduleId ?? null;
  const subjectLabel = SUBJECT_LABELS[subject];
  const isMedia = kind === 'media';

  const [keyword, setKeyword] = useState('');
  const [selection, setSelection] = useState<Set<number>>(() => new Set());
  const [selectedMediaType, setSelectedMediaType] = useState<number | null>(null);

  const { data: assigned = [], isLoading: loadingAssigned } = useGetAssignedTargets(kind, open ? scheduleId : null, subject);
  const { data: assignable = [], isLoading: loadingAssignable } = useGetAssignableTargets(kind, open ? scheduleId : null, subject);

  const { mutate: assign, isPending: assigning } = useAssignTargets(kind, subject, {
    mutationOptions: {
      onSuccess: (n) => {
        toast.success(`${n}건의 ${subjectLabel}이(가) 배정되었습니다`);
        setSelection(new Set());
        if (isMedia) setSelectedMediaType(null);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '배정 실패')),
    },
  });
  const { mutate: unassign } = useUnassignTargets(kind, subject, {
    mutationOptions: {
      onSuccess: () => toast.success('배정이 해제되었습니다'),
      onError: (e: unknown) => toast.error(extractMsg(e, '해제 실패')),
    },
  });

  const selectedCount = useMemo(() => selection.size, [selection]);

  const filteredAssignable = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return assignable;
    return assignable.filter((t) => {
      const fields: (string | null | undefined)[] = [t.name, t.loginId, t.groupName];
      return fields.some((f) => f != null && f.toLowerCase().includes(kw));
    });
  }, [assignable, keyword]);

  const toggle = (id: number) =>
    setSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const isAssignDisabled = selectedCount === 0 || (isMedia && selectedMediaType == null);

  const handleAssign = () => {
    if (!scheduleId || selectedCount === 0) return;
    if (isMedia && selectedMediaType == null) {
      toast.warning('미디어 종류를 선택하세요');
      return;
    }
    assign({
      scheduleId,
      targetIds: Array.from(selection),
      ...(isMedia && selectedMediaType != null ? { mediaType: selectedMediaType } : {}),
    });
  };

  const handleUnassign = (t: ScheduleAssignTarget) => {
    if (!scheduleId) return;
    unassign({ scheduleId, targetIds: [t.targetId] });
  };

  const handleClose = () => {
    setSelection(new Set());
    setSelectedMediaType(null);
    setKeyword('');
    onClose();
  };

  return (
    <Drawer title={schedule ? `배정 관리 — ${schedule.scheduleName}` : '배정 관리'} closable={{ placement: 'end' }} open={open} onClose={handleClose} width={520} destroyOnClose>
      {/* ── 미디어 종류 선택 (미디어 탭 전용) ── */}
      {isMedia && (
        <div className="mb-4">
          <div className="text-sm font-semibold text-gray-700 mb-1.5">미디어 종류</div>
          <Select
            className="w-full"
            placeholder="미디어 종류를 선택하세요"
            value={selectedMediaType}
            onChange={(v: number) => setSelectedMediaType(v)}
            options={MEDIA_TYPE_OPTIONS}
            allowClear
            onClear={() => setSelectedMediaType(null)}
          />
        </div>
      )}

      {/* ── 배정된 주체 ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">
          배정된 {subjectLabel} ({assigned.length})
        </span>
      </div>
      <div className="border border-gray-100 rounded mb-5 divide-y divide-gray-100 min-h-[60px]">
        {loadingAssigned ? (
          <div className="py-6 text-center text-xs text-gray-400">불러오는 중...</div>
        ) : assigned.length === 0 ? (
          <div className="py-6">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`배정된 ${subjectLabel}이(가) 없습니다`} />
          </div>
        ) : (
          assigned.map((t) => {
            const sub = targetSubText(t, subject);
            return (
              <div key={`assigned-${t.targetId}`} className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-gray-800 truncate">{t.name}</span>
                  {sub && <span className="ml-2 text-[11px] text-gray-500">{sub}</span>}
                </div>
                <button type="button" title="배정 해제" className="flex-shrink-0 text-gray-400 hover:text-red-500" onClick={() => handleUnassign(t)}>
                  <X className="size-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* ── 배정 가능한 주체 ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">
          배정 가능한 {subjectLabel} ({filteredAssignable.length})
        </span>
        <Button type="primary" size="small" icon={<UserPlus className="size-3.5" />} loading={assigning} disabled={isAssignDisabled} onClick={handleAssign}>
          {selectedCount > 0 ? `배정 (${selectedCount})` : '배정'}
        </Button>
      </div>
      <div className="mb-2">
        <Input
          allowClear
          prefix={<Search className="size-3.5 text-gray-400" />}
          placeholder={subject === 'agent' ? '이름/로그인ID 검색' : '그룹명 검색'}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>
      <div className="border border-gray-100 rounded divide-y divide-gray-100 min-h-[60px]">
        {loadingAssignable ? (
          <div className="py-6 text-center text-xs text-gray-400">불러오는 중...</div>
        ) : filteredAssignable.length === 0 ? (
          <div className="py-6">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`배정 가능한 ${subjectLabel}이(가) 없습니다`} />
          </div>
        ) : (
          filteredAssignable.map((t) => {
            const checked = selection.has(t.targetId);
            const sub = targetSubText(t, subject);
            return (
              <div
                key={`assignable-${t.targetId}`}
                className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${checked ? 'bg-[#eef0f7]' : 'hover:bg-gray-50'}`}
                onClick={() => toggle(t.targetId)}
              >
                <input type="checkbox" className="mt-1 flex-shrink-0" checked={checked} onChange={() => toggle(t.targetId)} onClick={(e) => e.stopPropagation()} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gray-800 truncate">{t.name}</div>
                  {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Drawer>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
