/**
 * IE 업무시간 슬롯(시간대) 등록/수정 Drawer.
 *
 * 필드: 적용요일(8) · 시작/종료시간 · 사용여부. (종료>시작, 레거시 정합)
 */
import { useEffect } from 'react';
import { Button, Checkbox, Drawer, Form, Switch, TimePicker, message } from 'antd';
import { type Dayjs } from 'dayjs';
import type { IeWorktimeSlot, IeWorktimeSlotRequest } from '../types';
import { WORKTIME_DAY_FIELDS, byteToKeys, keysToByte, parseHHMM } from '../utils/weekday';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  slot?: IeWorktimeSlot | null;
  onCancel: () => void;
  onSubmit: (req: IeWorktimeSlotRequest) => void;
  loading?: boolean;
}

interface FormValues {
  days: string[];
  startTime?: Dayjs | null;
  finishTime?: Dayjs | null;
  useYn: boolean;
}

export default function IeWorktimeSlotDrawer({ open, mode, slot, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && slot) {
      form.setFieldsValue({
        days: byteToKeys(slot.weekdayByte),
        startTime: parseHHMM(slot.startTime),
        finishTime: parseHHMM(slot.finishTime),
        useYn: slot.useYn === 1,
      });
    } else {
      form.setFieldsValue({ days: [], startTime: null, finishTime: null, useYn: true });
    }
  }, [open, mode, slot, form]);

  const handleFinish = (values: FormValues) => {
    if (!values.startTime || !values.finishTime) {
      void message.error('시작/종료 시간을 입력하세요.');
      return;
    }
    if (Number(values.startTime.format('HHmm')) >= Number(values.finishTime.format('HHmm'))) {
      void message.error('업무 종료시간을 시작시간보다 작게 설정할 수 없습니다.');
      return;
    }
    onSubmit({
      weekdayByte: keysToByte(values.days ?? []),
      startTime: values.startTime.format('HHmm'),
      finishTime: values.finishTime.format('HHmm'),
      useYn: values.useYn ? 1 : 0,
    });
  };

  return (
    <Drawer
      title={mode === 'create' ? '시간대 추가' : '시간대 수정'}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      size={420}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '추가' : '저장'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="startTime" label="시작 시간" rules={[{ required: true, message: '시작 시간을 입력하세요' }]}>
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item name="finishTime" label="종료 시간" rules={[{ required: true, message: '종료 시간을 입력하세요' }]}>
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
        </div>

        <Form.Item name="days" label="적용 요일">
          <Checkbox.Group>
            <div className="flex flex-wrap gap-2">
              {WORKTIME_DAY_FIELDS.map((d) => (
                <Checkbox key={d.key} value={d.key}>
                  {d.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item name="useYn" label="사용 여부" valuePropName="checked">
          <Switch checkedChildren="설정" unCheckedChildren="해제" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
