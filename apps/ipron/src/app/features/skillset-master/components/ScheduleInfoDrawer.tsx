/**
 * 스케쥴 정보 등록/수정 Drawer (TB_IC_SCHEDULEINFO).
 *
 * 필드: 스케쥴명(1~256, 필수) · 시작일자 · 시작/종료시간(HHMM) · 요일 7종(월~일)
 * AS-IS SWAT IPR20S5010 스케쥴 popup03.
 */
import { useEffect } from 'react';
import { Button, Checkbox, DatePicker, Drawer, Form, Input, Space, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { SCHEDULE_DAY_FIELDS, type ScheduleInfoRequest, type ScheduleInfoResponse } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  schedule?: ScheduleInfoResponse | null;
  tenantId: number | null; // create 시 사용
  onCancel: () => void;
  onSubmit: (req: ScheduleInfoRequest) => void;
  loading?: boolean;
}

interface FormValues {
  scheduleName: string;
  startDate?: Dayjs | null;
  startTime?: Dayjs | null;
  finshTime?: Dayjs | null;
  days: string[]; // ['mon','tue',...]
}

/** "HHMM" → Dayjs (IPRON DnSnrTab 정합 — antd 번들 dayjs 의 'HHmm' 파싱) */
function parseHHMM(v?: string | null): Dayjs | null {
  if (!v || v.length < 3) return null;
  return dayjs(v.padStart(4, '0'), 'HHmm');
}

/** Dayjs → "HHMM" */
function formatHHMM(v?: Dayjs | null): string | null {
  if (!v) return null;
  return v.format('HHmm');
}

export default function ScheduleInfoDrawer({ open, mode, schedule, tenantId, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && schedule) {
      form.setFieldsValue({
        scheduleName: schedule.scheduleName,
        startDate: schedule.startDate ? dayjs(schedule.startDate) : null,
        startTime: parseHHMM(schedule.startTime),
        finshTime: parseHHMM(schedule.finshTime),
        days: SCHEDULE_DAY_FIELDS.filter((d) => schedule[d.key] === 1).map((d) => d.key),
      });
    } else {
      form.setFieldsValue({ scheduleName: '', startDate: null, startTime: null, finshTime: null, days: [] });
    }
  }, [open, mode, schedule, form]);

  const handleFinish = (values: FormValues) => {
    // SWAT IPR20S5010.jsp L620-622: 시작시간 > 종료시간 교차 검증
    if (values.startTime && values.finshTime) {
      const sHm = Number(values.startTime.format('HHmm'));
      const eHm = Number(values.finshTime.format('HHmm'));
      if (sHm > eHm) {
        void message.error('시작시간이 종료시간 보다 클 수 없습니다.');
        return;
      }
    }

    const days = new Set(values.days ?? []);
    const req: ScheduleInfoRequest = {
      tenantId: mode === 'create' ? tenantId : (schedule?.tenantId ?? tenantId),
      scheduleName: values.scheduleName,
      startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
      startTime: formatHHMM(values.startTime),
      finshTime: formatHHMM(values.finshTime),
      mon: days.has('mon') ? 1 : 0,
      tue: days.has('tue') ? 1 : 0,
      wed: days.has('wed') ? 1 : 0,
      thu: days.has('thu') ? 1 : 0,
      fri: days.has('fri') ? 1 : 0,
      sat: days.has('sat') ? 1 : 0,
      sun: days.has('sun') ? 1 : 0,
    };
    onSubmit(req);
  };

  return (
    <Drawer
      title={mode === 'create' ? '스케쥴 등록' : '스케쥴 수정'}
      open={open}
      onClose={onCancel}
      width={440}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '등록' : '저장'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        <Form.Item
          name="scheduleName"
          label="스케쥴명"
          rules={[
            { required: true, message: '스케쥴명을 입력하세요' },
            { max: 128, message: '128자까지 입력 가능합니다' },
          ]}
        >
          <Input placeholder="예: 평일주간" maxLength={128} />
        </Form.Item>

        <Form.Item name="startDate" label="시작 일자" rules={[{ required: true, message: '시작 일자를 선택하세요' }]}>
          <DatePicker className="w-full" format="YYYY-MM-DD" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="startTime" label="시작 시간" rules={[{ required: true, message: '시작 시간을 입력하세요' }]}>
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
          <Form.Item name="finshTime" label="종료 시간" rules={[{ required: true, message: '종료 시간을 입력하세요' }]}>
            <TimePicker className="w-full" format="HH:mm" minuteStep={5} />
          </Form.Item>
        </div>

        <Form.Item name="days" label="적용 요일">
          <Checkbox.Group>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_DAY_FIELDS.map((d) => (
                <Checkbox key={d.key} value={d.key}>
                  {d.label}
                </Checkbox>
              ))}
            </div>
          </Checkbox.Group>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
