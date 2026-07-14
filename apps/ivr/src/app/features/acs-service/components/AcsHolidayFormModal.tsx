/**
 * ACS 휴일 등록/수정 Modal (AS-IS popupAcsHolidayDetail).
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DatePicker, Form, Input, Modal, Radio, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { acsServiceQueryKeys, useCreateAcsHoliday, useUpdateAcsHoliday } from '../hooks/useAcsServiceQueries';
import { type AcsHoliday, HOLI_TYPE_LABELS, REPEAT_OPT_LABELS } from '../types/acsService.types';

const { TextArea } = Input;

interface FormValues {
  holiName: string;
  repeatOpt: number;
  holiType: number;
  period: [Dayjs, Dayjs];
  holiDesc?: string;
}

export interface AcsHolidayFormModalRef {
  openCreate: () => void;
  openEdit: (holiday: AcsHoliday) => void;
}

const AcsHolidayFormModal = forwardRef<AcsHolidayFormModalRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<AcsHoliday | null>(null);
  const isEditMode = editing !== null;

  useImperativeHandle(ref, () => ({
    openCreate: () => {
      form.resetFields();
      form.setFieldsValue({ repeatOpt: 0, holiType: 1 });
      setEditing(null);
      setVisible(true);
    },
    openEdit: (holiday) => {
      form.resetFields();
      form.setFieldsValue({
        holiName: holiday.holiName,
        repeatOpt: holiday.repeatOpt,
        holiType: holiday.holiType,
        period: [dayjs(holiday.startDate), dayjs(holiday.finishDate)],
        holiDesc: holiday.holiDesc ?? undefined,
      });
      setEditing(holiday);
      setVisible(true);
    },
  }));

  const { mutateAsync: createAsync, isPending: isCreating } = useCreateAcsHoliday();
  const { mutateAsync: updateAsync, isPending: isUpdating } = useUpdateAcsHoliday();
  const isPending = isCreating || isUpdating;

  const handleSubmit = async (values: FormValues) => {
    const action = isEditMode ? '수정' : '등록';
    const data = {
      holiName: values.holiName,
      repeatOpt: values.repeatOpt,
      holiType: values.holiType,
      startDate: values.period[0].format('YYYY-MM-DD'),
      finishDate: values.period[1].format('YYYY-MM-DD'),
      holiDesc: values.holiDesc ?? null,
    };
    try {
      if (isEditMode && editing) {
        await updateAsync({ holiId: editing.holiId, data });
      } else {
        await createAsync(data);
      }
      toast.success(`${action}되었습니다.`);
      queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsHolidays._def });
      queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAssignedHolidays._def });
      setVisible(false);
    } catch (err) {
      toast.error(`${action} 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  return (
    <Modal
      title={isEditMode ? '휴일 수정' : '휴일 등록'}
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
          name="holiName"
          label="휴일명"
          required
          rules={[
            { required: true, message: '휴일명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="휴일명 (최대 100자)" maxLength={100} />
        </Form.Item>
        <Form.Item name="repeatOpt" label="반복유형" required rules={[{ required: true, message: '반복유형은 필수입니다' }]}>
          <Radio.Group options={Object.entries(REPEAT_OPT_LABELS).map(([value, label]) => ({ value: Number(value), label }))} />
        </Form.Item>
        <Form.Item name="holiType" label="휴일타입" required rules={[{ required: true, message: '휴일타입은 필수입니다' }]}>
          <Select options={Object.entries(HOLI_TYPE_LABELS).map(([value, label]) => ({ value: Number(value), label }))} />
        </Form.Item>
        <Form.Item name="period" label="휴일기간 (시작 ~ 종료)" required rules={[{ required: true, message: '휴일기간은 필수입니다' }]}>
          <DatePicker.RangePicker className="!w-full" />
        </Form.Item>
        <Form.Item name="holiDesc" label="휴일 설명" rules={[{ max: 300, message: '300자 이내' }]}>
          <TextArea rows={3} maxLength={300} showCount placeholder="설명 (최대 300자)" />
        </Form.Item>
      </Form>
    </Modal>
  );
});

AcsHolidayFormModal.displayName = 'AcsHolidayFormModal';
export default AcsHolidayFormModal;
