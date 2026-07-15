/**
 * ACS 휴일 배정 Drawer (AS-IS popupAcsHoliday).
 *
 * <p>선택한 ACS 에 아직 배정되지 않은 휴일 목록을 보여주고 다건 배정한다.
 * AS-IS 와 동일하게 이 안에서 휴일 마스터의 등록/수정/삭제도 지원한다.</p>
 */
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Popconfirm, Table } from 'antd';
import { CalendarCheck, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import AcsHolidayFormModal, { type AcsHolidayFormModalRef } from './AcsHolidayFormModal';
import { acsServiceQueryKeys, useApplyHolidays, useDeleteAcsHoliday, useGetAcsHolidays } from '../hooks/useAcsServiceQueries';
import { type AcsHoliday, HOLI_TYPE_LABELS, REPEAT_OPT_LABELS } from '../types/acsService.types';

export interface AcsHolidayAssignDrawerRef {
  open: (acsId: number) => void;
}

const AcsHolidayAssignDrawer = forwardRef<AcsHolidayAssignDrawerRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [acsId, setAcsId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const formModalRef = useRef<AcsHolidayFormModalRef>(null);

  useImperativeHandle(ref, () => ({
    open: (targetAcsId) => {
      setAcsId(targetAcsId);
      setSelectedIds([]);
      setVisible(true);
    },
  }));

  const { data: holidays = [], isFetching } = useGetAcsHolidays({
    params: acsId ? { excludeAcsId: acsId } : undefined,
    queryOptions: { enabled: visible && !!acsId },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsHolidays._def });
    queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAssignedHolidays._def });
  };

  const { mutate: applyMutate, isPending: isApplying } = useApplyHolidays({
    mutationOptions: {
      onSuccess: () => {
        toast.success('배정되었습니다.');
        setSelectedIds([]);
        invalidate();
      },
      onError: (err) => toast.error(`배정 실패: ${(err as Error).message ?? '오류'}`),
    },
  });

  const { mutate: deleteMutate } = useDeleteAcsHoliday({
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
      toast.warning('배정할 휴일을 선택하세요.');
      return;
    }
    applyMutate({ acsId, ids: selectedIds });
  };

  const selectedRows = holidays.filter((h) => selectedIds.includes(h.holiId));

  const handleEdit = () => {
    if (selectedRows.length !== 1) {
      toast.warning('수정할 휴일을 1건 선택하세요.');
      return;
    }
    formModalRef.current?.openEdit(selectedRows[0]);
  };

  const handleDelete = () => {
    if (selectedRows.length === 0) {
      toast.warning('삭제할 휴일을 선택하세요.');
      return;
    }
    selectedRows.forEach((row) => deleteMutate(row.holiId));
  };

  return (
    <Drawer
      title="휴일 배정"
      placement="right"
      styles={{ wrapper: { width: 720 } }}
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
            <Popconfirm title="선택한 휴일을 삭제할까요? (배정된 항목은 삭제 불가)" onConfirm={handleDelete} okText="삭제" cancelText="취소">
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
      <Table<AcsHoliday>
        rowKey="holiId"
        size="small"
        loading={isFetching}
        dataSource={holidays}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as number[]),
        }}
        columns={[
          { title: 'ID', dataIndex: 'holiId', width: 90 },
          { title: '휴일명', dataIndex: 'holiName' },
          { title: '반복유형', dataIndex: 'repeatOpt', width: 90, render: (v: number) => REPEAT_OPT_LABELS[v] ?? v },
          { title: '휴일타입', dataIndex: 'holiType', width: 110, render: (v: number) => HOLI_TYPE_LABELS[v] ?? v },
          { title: '시작일자', dataIndex: 'startDate', width: 110 },
          { title: '종료일자', dataIndex: 'finishDate', width: 110 },
        ]}
      />
      <AcsHolidayFormModal ref={formModalRef} />
    </Drawer>
  );
});

AcsHolidayAssignDrawer.displayName = 'AcsHolidayAssignDrawer';
export default AcsHolidayAssignDrawer;
