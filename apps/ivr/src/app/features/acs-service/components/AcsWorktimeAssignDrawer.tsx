/**
 * ACS 업무시간 배정 Drawer (AS-IS popupAcsWorkTime).
 *
 * <p>선택한 ACS 에 아직 배정되지 않은 업무시간 목록을 보여주고 다건 배정한다.
 * AS-IS 와 동일하게 이 안에서 업무시간 마스터의 등록/수정/삭제도 지원한다.</p>
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Popconfirm, Table } from 'antd';
import { CalendarCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import AcsWorktimeFormModal, { type AcsWorktimeFormModalRef } from './AcsWorktimeFormModal';
import { acsServiceQueryKeys, useApplyWorktimes, useDeleteAcsWorktime, useGetAcsWorktimes } from '../hooks/useAcsServiceQueries';
import { type AcsWorktime, formatHHmm, formatWeekdayByte } from '../types/acsService.types';

export interface AcsWorktimeAssignDrawerRef {
  open: (acsId: number) => void;
}

const AcsWorktimeAssignDrawer = forwardRef<AcsWorktimeAssignDrawerRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [acsId, setAcsId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const formModalRef = useRef<AcsWorktimeFormModalRef>(null);

  useImperativeHandle(ref, () => ({
    open: (targetAcsId) => {
      setAcsId(targetAcsId);
      setSelectedIds([]);
      setVisible(true);
    },
  }));

  const { data: worktimes = [], isFetching } = useGetAcsWorktimes({
    params: acsId ? { excludeAcsId: acsId } : undefined,
    queryOptions: { enabled: visible && !!acsId },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsWorktimes._def });
    queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAssignedWorktimes._def });
  };

  const { mutate: applyMutate, isPending: isApplying } = useApplyWorktimes({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배정되었습니다.');
        setSelectedIds([]);
        invalidate();
      },
      onError: (err) => toast.error(`배정 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const { mutate: deleteMutate } = useDeleteAcsWorktime({
    mutationOptions: {
      onSuccess: () => {
        toast.success('삭제되었습니다.');
        setSelectedIds([]);
        invalidate();
      },
      onError: (err) => toast.error(`삭제 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const handleApply = () => {
    if (!acsId) return;
    if (selectedIds.length === 0) {
      toast.warning('배정할 업무시간을 선택하세요.');
      return;
    }
    applyMutate({ acsId, ids: selectedIds });
  };

  const selectedRows = worktimes.filter((w) => selectedIds.includes(w.worktimeId));

  const handleEdit = () => {
    if (selectedRows.length !== 1) {
      toast.warning('수정할 업무시간을 1건 선택하세요.');
      return;
    }
    formModalRef.current?.openEdit(selectedRows[0]);
  };

  const handleDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('삭제할 업무시간을 선택하세요.');
      return;
    }
    selectedRows.forEach((row) => deleteMutate(row.worktimeId));
  };

  return (
    <Drawer
      title="업무시간 배정"
      placement="right"
      styles={{ wrapper: { width: 640 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button icon={<Plus className="size-3.5" />} onClick={() => formModalRef.current?.openCreate()}>
              추가
            </Button>
            <Button icon={<Pencil className="size-3.5" />} onClick={handleEdit}>
              수정
            </Button>
            <Popconfirm title="선택한 업무시간을 삭제할까요? (배정된 항목은 삭제 불가)" onConfirm={handleDelete} okText="삭제" cancelText="취소">
              <Button danger icon={<Trash2 className="size-3.5" />}>
                삭제
              </Button>
            </Popconfirm>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setVisible(false)}>닫기</Button>
            <Button type="primary" icon={<CalendarCheck className="size-3.5" />} loading={isApplying} onClick={handleApply}>
              배정
            </Button>
          </div>
        </div>
      }
    >
      <Table<AcsWorktime>
        rowKey="worktimeId"
        size="small"
        loading={isFetching}
        dataSource={worktimes}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
        columns={[
          { title: 'ID', dataIndex: 'worktimeId', width: 90 },
          { title: '업무시간명', dataIndex: 'worktimeName' },
          { title: '적용요일', dataIndex: 'weekdayByte', width: 160, render: (v: string) => formatWeekdayByte(v) },
          { title: '시작', dataIndex: 'startTime', width: 80, render: (v: string) => formatHHmm(v) },
          { title: '종료', dataIndex: 'finishTime', width: 80, render: (v: string) => formatHHmm(v) },
        ]}
      />
      <AcsWorktimeFormModal ref={formModalRef} />
    </Drawer>
  );
});

AcsWorktimeAssignDrawer.displayName = 'AcsWorktimeAssignDrawer';
export default AcsWorktimeAssignDrawer;
