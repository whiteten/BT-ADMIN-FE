/**
 * BSR 스케줄 등록/수정 Drawer.
 *
 * 필드: 스케줄명(필수/128), 시작일자(필수), 시작시간 HHMM(필수/4자), 종료시간 HHMM(필수/4자), 요일 체크박스(월~일)
 */
import { useEffect } from 'react';
import { Button, Checkbox, DatePicker, Drawer, Form, Input, Space } from 'antd';
import dayjs from 'dayjs';
import type { BsrScheduleInfoCreateRequest, BsrScheduleInfoResponse, BsrScheduleInfoUpdateRequest } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  schedule?: BsrScheduleInfoResponse | null;
  defaultTenantId?: number | null;
  onCancel: () => void;
  onSubmit: (req: BsrScheduleInfoCreateRequest | BsrScheduleInfoUpdateRequest) => void;
  loading?: boolean;
}

interface FormValues {
  bsrScheduleName: string;
  startDate: dayjs.Dayjs;
  startTime: string;
  finshTime: string;
  days: string[];
}

const DAY_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

export default function BsrScheduleFormDrawer({ open, mode, schedule, defaultTenantId, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && schedule) {
      const days: string[] = [];
      if (schedule.mon === 1) days.push('mon');
      if (schedule.tue === 1) days.push('tue');
      if (schedule.wed === 1) days.push('wed');
      if (schedule.thu === 1) days.push('thu');
      if (schedule.fri === 1) days.push('fri');
      if (schedule.sat === 1) days.push('sat');
      if (schedule.sun === 1) days.push('sun');
      form.setFieldsValue({
        bsrScheduleName: schedule.bsrScheduleName ?? '',
        startDate: schedule.startDate ? dayjs(schedule.startDate) : undefined,
        startTime: schedule.startTime ?? '',
        finshTime: schedule.finshTime ?? '',
        days,
      });
    } else {
      form.resetFields();
    }
  }, [open, mode, schedule, form]);

  const handleFinish = (values: FormValues) => {
    const dayFlags = {
      mon: values.days?.includes('mon') ? 1 : 0,
      tue: values.days?.includes('tue') ? 1 : 0,
      wed: values.days?.includes('wed') ? 1 : 0,
      thu: values.days?.includes('thu') ? 1 : 0,
      fri: values.days?.includes('fri') ? 1 : 0,
      sat: values.days?.includes('sat') ? 1 : 0,
      sun: values.days?.includes('sun') ? 1 : 0,
    };
    const tenantId = mode === 'edit' && schedule?.tenantId ? schedule.tenantId : (defaultTenantId as number);
    const req: BsrScheduleInfoCreateRequest = {
      tenantId,
      bsrScheduleName: values.bsrScheduleName,
      startDate: values.startDate.format('YYYY-MM-DD'),
      startTime: values.startTime,
      finshTime: values.finshTime,
      ...dayFlags,
    };
    onSubmit(req);
  };

  return (
    <Drawer
      title={mode === 'create' ? '스케줄 등록' : '스케줄 수정'}
      open={open}
      onClose={onCancel}
      width={480}
      extra={
        <Space>
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            저장
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="bsrScheduleName"
          label="스케줄명"
          rules={[
            { required: true, message: '스케줄명은 필수입니다' },
            { max: 128, message: '최대 128자입니다' },
          ]}
        >
          <Input placeholder="스케줄명 입력" maxLength={128} />
        </Form.Item>

        <Form.Item name="startDate" label="시작일자" rules={[{ required: true, message: '시작일자는 필수입니다' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="startTime"
          label="시작시간 (HHMM)"
          rules={[
            { required: true, message: '시작시간은 필수입니다' },
            { max: 4, message: '4자(HHMM)입니다' },
            { pattern: /^\d{4}$/, message: '0000~2359 형식으로 입력하세요' },
          ]}
        >
          <Input placeholder="예: 0900" maxLength={4} style={{ width: 120 }} />
        </Form.Item>

        <Form.Item
          name="finshTime"
          label="종료시간 (HHMM)"
          rules={[
            { required: true, message: '종료시간은 필수입니다' },
            { max: 4, message: '4자(HHMM)입니다' },
            { pattern: /^\d{4}$/, message: '0000~2359 형식으로 입력하세요' },
          ]}
        >
          <Input placeholder="예: 1800" maxLength={4} style={{ width: 120 }} />
        </Form.Item>

        <Form.Item name="days" label="요일">
          <Checkbox.Group>
            {DAY_OPTIONS.map((d) => (
              <Checkbox key={d.value} value={d.value}>
                {d.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
