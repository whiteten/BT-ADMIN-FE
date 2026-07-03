/**
 * IR 업무시간 등록/수정 Drawer (마스터 + 단일 슬롯 병합 폼).
 *
 * 필드: 테넌트(읽기전용 표시 — cti-code 패턴) · 업무시간명(필수) · 업무시간KEY(필수) · 설명 · 적용요일(8) · 시작/종료시간 · 사용여부.
 * 레거시 IPR30S4022: IR 은 KEY 필수 + 슬롯 1개 + 종료>시작.
 */
import { useEffect } from 'react';
import { Button, Checkbox, Drawer, Form, Input, Switch, TimePicker, Typography, message } from 'antd';
import { type Dayjs } from 'dayjs';
import type { IrWorktime, IrWorktimeRequest } from '../types';
import { WORKTIME_DAY_FIELDS, byteToKeys, keysToByte, parseHHMM } from '../utils/weekday';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  item?: IrWorktime | null;
  tenantId: number | null; // create 시 현재 테넌트
  tenantName?: string | null; // create 시 선택 테넌트명
  onCancel: () => void;
  onSubmit: (req: IrWorktimeRequest) => void;
  loading?: boolean;
}

interface FormValues {
  worktimeName: string;
  groupKey: string;
  worktimeDesc?: string;
  days: string[];
  startTime?: Dayjs | null;
  finishTime?: Dayjs | null;
  useYn: boolean;
}

export default function IrWorktimeDrawer({ open, mode, item, tenantId, tenantName, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  // 표시할 테넌트명: 수정 시 항목 소속, 등록 시 선택 테넌트
  const displayTenantName =
    mode === 'edit' && item ? (item.tenantName ?? (item.tenantId != null ? `#${item.tenantId}` : '—')) : (tenantName ?? (tenantId != null ? `#${tenantId}` : '—'));

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item) {
      form.setFieldsValue({
        worktimeName: item.worktimeName,
        groupKey: item.groupKey,
        worktimeDesc: item.worktimeDesc ?? '',
        days: byteToKeys(item.weekdayByte),
        startTime: parseHHMM(item.startTime),
        finishTime: parseHHMM(item.finishTime),
        useYn: item.useYn === 1,
      });
    } else {
      form.setFieldsValue({ worktimeName: '', groupKey: '', worktimeDesc: '', days: [], startTime: null, finishTime: null, useYn: true });
    }
  }, [open, mode, item, form]);

  const handleFinish = (values: FormValues) => {
    if (!values.startTime || !values.finishTime) {
      void message.error('시작/종료 시간을 입력하세요.');
      return;
    }
    // 종료 > 시작 (레거시 정합)
    if (Number(values.startTime.format('HHmm')) >= Number(values.finishTime.format('HHmm'))) {
      void message.error('업무 종료시간을 시작시간보다 작게 설정할 수 없습니다.');
      return;
    }
    const req: IrWorktimeRequest = {
      tenantId: mode === 'create' ? (tenantId ?? 0) : (item?.tenantId ?? tenantId ?? 0),
      worktimeName: values.worktimeName,
      groupKey: values.groupKey,
      worktimeDesc: values.worktimeDesc ?? null,
      weekdayByte: keysToByte(values.days ?? []),
      startTime: values.startTime.format('HHmm'),
      finishTime: values.finishTime.format('HHmm'),
      useYn: values.useYn ? 1 : 0,
    };
    onSubmit(req);
  };

  return (
    <Drawer
      title={mode === 'create' ? 'IR 업무시간 등록' : 'IR 업무시간 수정'}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      width={460}
      destroyOnClose
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '등록' : '저장'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        <Form.Item label="테넌트">
          <div className="flex items-center px-3 py-1.5 rounded border border-gray-200 bg-gray-50 min-h-[32px]" style={{ color: 'rgba(0,0,0,0.65)', cursor: 'default' }}>
            <Typography.Text ellipsis style={{ color: 'inherit' }}>
              {displayTenantName}
            </Typography.Text>
          </div>
        </Form.Item>

        <Form.Item
          name="worktimeName"
          label="업무시간명"
          rules={[
            { required: true, message: '업무시간명을 입력하세요' },
            { max: 100, message: '100자까지 입력 가능합니다' },
          ]}
        >
          <Input placeholder="예: 주간업무" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="groupKey"
          label="업무시간KEY"
          rules={[
            { required: true, message: '업무시간KEY를 입력하세요' },
            { max: 64, message: '64자까지 입력 가능합니다' },
          ]}
        >
          <Input placeholder="예: day" maxLength={64} />
        </Form.Item>

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

        <Form.Item name="worktimeDesc" label="설명" rules={[{ max: 256, message: '256자까지 입력 가능합니다' }]}>
          <Input.TextArea rows={3} maxLength={256} placeholder="설명 (선택)" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
