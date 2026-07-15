/**
 * ACS 업무시간 등록/수정 Modal (AS-IS popupAcsWorkTimeDetail).
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Checkbox, Form, Input, Modal, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { acsServiceQueryKeys, useCreateAcsWorktime, useUpdateAcsWorktime } from '../hooks/useAcsServiceQueries';
import { type AcsWorktime, WEEKDAY_LABELS } from '../types/acsService.types';

interface FormValues {
  worktimeName: string;
  weekdays: number[]; // 선택된 요일 인덱스 (0=월 ~ 6=일)
  startTime: Dayjs;
  finishTime: Dayjs;
}

export interface AcsWorktimeFormModalRef {
  openCreate: () => void;
  openEdit: (worktime: AcsWorktime) => void;
}

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, index) => ({ label, value: index }));

const AcsWorktimeFormModal = forwardRef<AcsWorktimeFormModalRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<AcsWorktime | null>(null);
  const isEditMode = editing !== null;

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      form.resetFields();
      form.setFieldsValue({
        weekdays: [0, 1, 2, 3, 4],
        startTime: dayjs('09:00', 'HH:mm'),
        finishTime: dayjs('18:00', 'HH:mm'),
      });
      setEditing(null);
      setVisible(true);
    },
    openEdit: (worktime) => {
      form.resetFields();
      form.setFieldsValue({
        worktimeName: worktime.worktimeName,
        weekdays: WEEKDAY_LABELS.map((_, i) => i).filter((i) => worktime.weekdayByte[i] === '1'),
        startTime: dayjs(worktime.startTime, 'HHmm'),
        finishTime: dayjs(worktime.finishTime, 'HHmm'),
      });
      setEditing(worktime);
      setVisible(true);
    },
  }));

  const { mutateAsync: createAsync, isPending: isCreating } = useCreateAcsWorktime();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateAcsWorktime();
  const isPending = isCreating || isUpdating;

  const handleSubmit = async (values: FormValues) => {
    const action = isEditMode ? '수정' : '등록';
    const startTime = values.startTime.format('HHmm');
    const finishTime = values.finishTime.format('HHmm');
    if (startTime >= finishTime) {
      toast.error('시작시각은 종료시각보다 빨라야 합니다.');
      return;
    }
    const data = {
      worktimeName: values.worktimeName,
      weekdayByte: WEEKDAY_LABELS.map((_, i) => (values.weekdays.includes(i) ? '1' : '0')).join(''),
      startTime,
      finishTime,
    };
    try {
      if (isEditMode && editing) {
        await updateAsync({ worktimeId: editing.worktimeId, data });
      } else {
        await createAsync(data);
      }
      toast.success(`${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsWorktimes._def });
      queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAssignedWorktimes._def });
      setVisible(false);
    } catch (err) {
      toast.error(`${action} 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  return (
    <Modal
      title={isEditMode ? '업무시간 수정' : '업무시간 등록'}
      open={visible}
      onCancel={() => setVisible(false)}
      onOk={() => form.submit()}
      okText={isEditMode ? '저장' : '등록'}
      cancelText="취소"
      confirmLoading={isPending}
      destroyOnHidden
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
        <Form.Item
          name="worktimeName"
          label="업무시간명"
          required
          rules={[
            { required: true, message: '업무시간명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="업무시간명 (최대 100자)" maxLength={100} />
        </Form.Item>
        <Form.Item name="weekdays" label="적용요일" required rules={[{ required: true, message: '적용요일을 1개 이상 선택하세요' }]}>
          <Checkbox.Group options={WEEKDAY_OPTIONS} />
        </Form.Item>
        <div className="flex gap-4">
          <Form.Item name="startTime" label="시작시각" required rules={[{ required: true, message: '시작시각은 필수입니다' }]} className="flex-1">
            <TimePicker format="HH:mm" className="!w-full" needConfirm={false} />
          </Form.Item>
          <Form.Item name="finishTime" label="종료시각" required rules={[{ required: true, message: '종료시각은 필수입니다' }]} className="flex-1">
            <TimePicker format="HH:mm" className="!w-full" needConfirm={false} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
});

AcsWorktimeFormModal.displayName = 'AcsWorktimeFormModal';
export default AcsWorktimeFormModal;
