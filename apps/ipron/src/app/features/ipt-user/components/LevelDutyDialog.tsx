/**
 * 직급/직책 관리 Dialog (AS-IS IPR20S2055_LevelDuty 팝업 — 탭 2개).
 *
 * TYPE 1=직급 / 2=직책. 명·정렬순서 CRUD. 삭제는 서버가 사용 중 검증(409) —
 * 실패 시 사용자명 목록 안내 (레거시 실삭제 안 되던 버그의 TO-BE 정상화).
 */
import { useState } from 'react';
import { Button, Input, InputNumber, Modal, Tabs } from 'antd';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { iptUserApi } from '../api/iptUserApi';
import { useCreateIptLevelDuty, useDeleteIptLevelDuty, useGetIptLevelDuties, useUpdateIptLevelDuty } from '../hooks/useIptUserQueries';
import type { IptLevelDuty } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface LevelDutyDialogProps {
  open: boolean;
  onClose: () => void;
}

interface EditState {
  levelDutyId: number | null; // null = 신규
  name: string;
  sortSeq: number | null;
}

function LevelDutyTab({ type }: { type: number }) {
  const modal = useModal();
  const [edit, setEdit] = useState<EditState | null>(null);

  const { data: rows = [], isLoading } = useGetIptLevelDuties(type);

  const { mutate: createRow, isPending: isCreating } = useCreateIptLevelDuty({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        setEdit(null);
      },
    },
  });
  const { mutate: updateRow, isPending: isUpdating } = useUpdateIptLevelDuty({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수정되었습니다.');
        setEdit(null);
      },
    },
  });
  const { mutate: deleteRow } = useDeleteIptLevelDuty({
    mutationOptions: {
      onSuccess: () => toast.success('삭제되었습니다.'),
      onError: async (_err, levelDutyId) => {
        // 409 — 사용 중 사용자 안내 (공통 에러 토스트 외 상세 목록 보조 안내)
        try {
          const users = await iptUserApi.getLevelDutyUsers(levelDutyId);
          if (users.length > 0) {
            toast.warning(`사용 중인 사용자: ${users.slice(0, 10).join(', ')}${users.length > 10 ? ` 외 ${users.length - 10}명` : ''}`);
          }
        } catch {
          /* 안내 실패는 무시 — 공통 에러 토스트가 이미 표시됨 */
        }
      },
    },
  });

  const handleSave = () => {
    if (!edit) return;
    if (!edit.name.trim()) {
      toast.error('명칭을 입력하세요.');
      return;
    }
    if (edit.levelDutyId == null) {
      createRow({ type, name: edit.name.trim(), sortSeq: edit.sortSeq });
    } else {
      updateRow({ levelDutyId: edit.levelDutyId, body: { type, name: edit.name.trim(), sortSeq: edit.sortSeq } });
    }
  };

  const handleDelete = (row: IptLevelDuty) => {
    modal.confirm.delete({
      onOk: () => deleteRow(row.levelDutyId),
    });
  };

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button size="small" icon={<Plus className="size-3.5" />} onClick={() => setEdit({ levelDutyId: null, name: '', sortSeq: null })}>
          추가
        </Button>
      </div>
      <div className="max-h-72 overflow-auto rounded border border-gray-100">
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5 text-[12px] font-semibold text-gray-600">
          <span className="flex-1">명칭</span>
          <span className="w-16 text-center">정렬순서</span>
          <span className="w-16 text-center">사용자수</span>
          <span className="w-14" />
        </div>
        {isLoading && <div className="py-6 text-center text-sm text-gray-400">불러오는 중…</div>}
        {!isLoading && rows.length === 0 && !edit && <div className="py-6 text-center text-sm text-[var(--color-bt-fg-muted)]">등록된 항목이 없습니다.</div>}
        {rows.map((row) =>
          edit?.levelDutyId === row.levelDutyId ? (
            <div key={row.levelDutyId} className="flex items-center gap-2 border-b border-gray-50 px-3 py-1.5">
              <Input size="small" className="flex-1" value={edit.name} maxLength={100} onChange={(e) => setEdit({ ...edit, name: e.target.value })} onPressEnter={handleSave} />
              <InputNumber size="small" className="!w-16" min={0} value={edit.sortSeq} onChange={(v) => setEdit({ ...edit, sortSeq: v ?? null })} />
              <span className="w-16 text-center text-[12px] text-gray-400">{row.userCount}</span>
              <span className="flex w-14 items-center justify-center gap-1">
                <Button size="small" type="primary" loading={isUpdating} onClick={handleSave}>
                  저장
                </Button>
                <button type="button" onClick={() => setEdit(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="size-3.5" />
                </button>
              </span>
            </div>
          ) : (
            <div key={row.levelDutyId} className="flex items-center gap-2 border-b border-gray-50 px-3 py-1.5 hover:bg-gray-50">
              <span className="flex-1 text-[13px] text-gray-800">{row.name}</span>
              <span className="w-16 text-center text-[12px] text-gray-500">{row.sortSeq ?? '-'}</span>
              <span className="w-16 text-center text-[12px] text-gray-500">{row.userCount}</span>
              <span className="flex w-14 items-center justify-center gap-0.5">
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-[var(--color-bt-primary-soft)] hover:text-[var(--color-bt-primary)]"
                  onClick={() => setEdit({ levelDutyId: row.levelDutyId, name: row.name, sortSeq: row.sortSeq })}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-500"
                  onClick={() => handleDelete(row)}
                  title={row.userCount > 0 ? '사용 중인 사용자가 있어 삭제할 수 없습니다' : '삭제'}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            </div>
          ),
        )}
        {edit && edit.levelDutyId == null && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Input
              size="small"
              className="flex-1"
              placeholder="명칭"
              value={edit.name}
              maxLength={100}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              onPressEnter={handleSave}
            />
            <InputNumber size="small" className="!w-16" min={0} placeholder="자동" value={edit.sortSeq} onChange={(v) => setEdit({ ...edit, sortSeq: v ?? null })} />
            <span className="w-16" />
            <span className="flex w-14 items-center justify-center gap-1">
              <Button size="small" type="primary" loading={isCreating} onClick={handleSave}>
                저장
              </Button>
              <button type="button" onClick={() => setEdit(null)} className="text-gray-400 hover:text-gray-600">
                <X className="size-3.5" />
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LevelDutyDialog({ open, onClose }: LevelDutyDialogProps) {
  return (
    <Modal title="직급/직책 관리" open={open} onCancel={onClose} footer={<Button onClick={onClose}>닫기</Button>} width={520}>
      <Tabs
        items={[
          { key: '1', label: '직급', children: <LevelDutyTab type={1} /> },
          { key: '2', label: '직책', children: <LevelDutyTab type={2} /> },
        ]}
      />
    </Modal>
  );
}
