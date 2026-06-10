/**
 * 스킬셋별 스케쥴 관리 Drawer.
 *
 * AS-IS SWAT IPR20S5010 스케쥴 popup02 (스킬셋에 배정된 스케쥴 목록 + 배정/해제).
 *
 * 구조:
 *  - 상단: 배정된 스케쥴 목록 (요일/시간 칩 + 해제 버튼)
 *  - 하단: 배정 가능한 스케쥴 (동일 테넌트 미배정분) — 체크 후 배정
 *  - 스케쥴 마스터 자체 CRUD 는 ScheduleInfoDrawer 로 (등록/수정/삭제)
 */
import { useMemo, useState } from 'react';
import { Button, Drawer, Empty, Tag } from 'antd';
import { CalendarPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from '@/shared-util';
import {
  useAssignSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  useGetAssignableSchedules,
  useGetAssignedSchedules,
  useUnassignSchedule,
  useUpdateSchedule,
} from '../hooks/useSkillsetQueries';
import { SCHEDULE_DAY_FIELDS, type ScheduleInfoRequest, type ScheduleInfoResponse, type SkillsetResponse } from '../types';
import ScheduleInfoDrawer from './ScheduleInfoDrawer';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface Props {
  open: boolean;
  skillset: SkillsetResponse | null;
  onClose: () => void;
}

function fmtTime(v?: string | null): string {
  if (!v) return '';
  const p = v.padStart(4, '0');
  return `${p.slice(0, 2)}:${p.slice(2, 4)}`;
}

function DayChips({ schedule }: { schedule: ScheduleInfoResponse }) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {SCHEDULE_DAY_FIELDS.map((d) => (
        <span
          key={d.key}
          className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${schedule[d.key] === 1 ? 'bg-[#405189] text-white' : 'bg-gray-100 text-gray-400'}`}
        >
          {d.label}
        </span>
      ))}
    </div>
  );
}

export default function SkillsetScheduleDrawer({ open, skillset, onClose }: Props) {
  const modal = useModal();
  const skillsetId = skillset?.skillsetId ?? null;

  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [infoMode, setInfoMode] = useState<'create' | 'edit'>('create');
  const [infoTarget, setInfoTarget] = useState<ScheduleInfoResponse | null>(null);
  const [assignSelection, setAssignSelection] = useState<Set<number>>(() => new Set());

  const { data: assigned = [], isLoading: loadingAssigned } = useGetAssignedSchedules(open ? skillsetId : null);
  const { data: assignable = [], isLoading: loadingAssignable } = useGetAssignableSchedules(open ? skillsetId : null);

  const { mutate: assign, isPending: assigning } = useAssignSchedules({
    mutationOptions: {
      onSuccess: (n) => {
        toast.success(`${n}건의 스케쥴이 배정되었습니다`);
        setAssignSelection(new Set());
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '배정 실패')),
    },
  });
  const { mutate: unassign } = useUnassignSchedule({
    mutationOptions: {
      onSuccess: () => toast.success('스케쥴 배정이 해제되었습니다'),
      onError: (e: unknown) => toast.error(extractMsg(e, '해제 실패')),
    },
  });
  const { mutate: createSchedule, isPending: creating } = useCreateSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케쥴이 등록되었습니다');
        setInfoDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '등록 실패')),
    },
  });
  const { mutate: updateSchedule, isPending: updating } = useUpdateSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케쥴이 수정되었습니다');
        setInfoDrawerOpen(false);
      },
      onError: (e: unknown) => toast.error(extractMsg(e, '수정 실패')),
    },
  });
  const { mutate: deleteSchedule } = useDeleteSchedule({
    mutationOptions: {
      onSuccess: () => toast.success('스케쥴이 삭제되었습니다'),
      onError: (e: unknown) => toast.error(extractMsg(e, '삭제 실패')),
    },
  });

  const selectedCount = useMemo(() => assignSelection.size, [assignSelection]);

  const toggleAssign = (id: number) =>
    setAssignSelection((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const handleAssign = () => {
    if (!skillsetId || selectedCount === 0) return;
    assign({ skillsetId, scheduleIds: Array.from(assignSelection) });
  };

  const handleUnassign = (s: ScheduleInfoResponse) => {
    if (!skillsetId) return;
    unassign({ skillsetId, scheduleId: s.scheduleId });
  };

  const handleCreate = () => {
    setInfoMode('create');
    setInfoTarget(null);
    setInfoDrawerOpen(true);
  };

  const handleEdit = (s: ScheduleInfoResponse) => {
    setInfoMode('edit');
    setInfoTarget(s);
    setInfoDrawerOpen(true);
  };

  const handleDelete = (s: ScheduleInfoResponse) => {
    modal.confirm.execute({
      onOk: () => deleteSchedule(s.scheduleId),
      options: { title: '스케쥴 삭제', content: `"${s.scheduleName}" 스케쥴을 삭제하시겠습니까? 배정된 스킬셋에서도 해제됩니다.` },
    });
  };

  const handleInfoSubmit = (req: ScheduleInfoRequest) => {
    if (infoMode === 'create') createSchedule(req);
    else if (infoTarget) updateSchedule({ id: infoTarget.scheduleId, body: req });
  };

  const renderScheduleMeta = (s: ScheduleInfoResponse) => (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      <DayChips schedule={s} />
      {(s.startTime || s.finshTime) && (
        <span className="text-[11px] text-gray-500">
          {fmtTime(s.startTime)}
          {s.finshTime ? ` ~ ${fmtTime(s.finshTime)}` : ''}
        </span>
      )}
      {s.startDate && <span className="text-[11px] text-gray-400">시작 {s.startDate}</span>}
    </div>
  );

  return (
    <Drawer title={skillset ? `스케쥴 관리 — ${skillset.skillsetName}` : '스케쥴 관리'} closable={{ placement: 'end' }} open={open} onClose={onClose} width={520} destroyOnClose>
      {/* ── 배정된 스케쥴 ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">배정된 스케쥴 ({assigned.length})</span>
      </div>
      <div className="border border-gray-100 rounded mb-5 divide-y divide-gray-100 min-h-[60px]">
        {loadingAssigned ? (
          <div className="py-6 text-center text-xs text-gray-400">불러오는 중...</div>
        ) : assigned.length === 0 ? (
          <div className="py-6">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="배정된 스케쥴이 없습니다" />
          </div>
        ) : (
          assigned.map((s) => (
            <div key={s.scheduleId} className="flex items-start justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-gray-800 truncate">{s.scheduleName}</div>
                {renderScheduleMeta(s)}
              </div>
              <button type="button" title="배정 해제" className="flex-shrink-0 text-gray-400 hover:text-red-500 mt-0.5" onClick={() => handleUnassign(s)}>
                <X className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ── 배정 가능한 스케쥴 ── */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">배정 가능한 스케쥴 ({assignable.length})</span>
        <div className="flex items-center gap-2">
          <Button size="small" icon={<Plus className="size-3.5" />} onClick={handleCreate}>
            스케쥴 등록
          </Button>
          <Button type="primary" size="small" icon={<CalendarPlus className="size-3.5" />} loading={assigning} disabled={selectedCount === 0} onClick={handleAssign}>
            {selectedCount > 0 ? `배정 (${selectedCount})` : '배정'}
          </Button>
        </div>
      </div>
      <div className="border border-gray-100 rounded divide-y divide-gray-100 min-h-[60px]">
        {loadingAssignable ? (
          <div className="py-6 text-center text-xs text-gray-400">불러오는 중...</div>
        ) : assignable.length === 0 ? (
          <div className="py-6">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="배정 가능한 스케쥴이 없습니다" />
          </div>
        ) : (
          assignable.map((s) => {
            const checked = assignSelection.has(s.scheduleId);
            return (
              <div
                key={s.scheduleId}
                className={`flex items-start gap-2 px-3 py-2 cursor-pointer ${checked ? 'bg-[#eef0f7]' : 'hover:bg-gray-50'}`}
                onClick={() => toggleAssign(s.scheduleId)}
              >
                <input type="checkbox" className="mt-1 flex-shrink-0" checked={checked} onChange={() => toggleAssign(s.scheduleId)} onClick={(e) => e.stopPropagation()} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-gray-800 truncate">{s.scheduleName}</div>
                  {renderScheduleMeta(s)}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    title="스케쥴 수정"
                    className="text-gray-400 hover:text-[#405189]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(s);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    title="스케쥴 삭제"
                    className="text-gray-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {assignable.length === 0 && assigned.length === 0 && skillset?.tenantId == null && (
        <Tag className="mt-3" color="warning">
          테넌트가 없는 스킬셋은 스케쥴을 배정할 수 없습니다
        </Tag>
      )}

      <ScheduleInfoDrawer
        open={infoDrawerOpen}
        mode={infoMode}
        schedule={infoTarget}
        tenantId={skillset?.tenantId ?? null}
        onCancel={() => setInfoDrawerOpen(false)}
        onSubmit={handleInfoSubmit}
        loading={creating || updating}
      />
    </Drawer>
  );
}

function extractMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}
