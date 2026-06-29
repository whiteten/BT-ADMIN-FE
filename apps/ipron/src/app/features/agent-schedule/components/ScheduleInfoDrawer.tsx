/**
 * 스케줄 정의(메타) 등록/수정 Drawer.
 *
 * 필드: 스케줄명(필수) · 시작일자 · 시작/종료시간(HHMM) · 적용 요일 7종
 *  - 스킬 스케줄 탭(kind='skill')만: 스킬 Select + 미디어 종류 Select 추가 필드.
 * AS-IS SWAT IPR20S4010/IPR20S4020 스케줄 정의 미니 팝업.
 * 기구현 skillset-master/ScheduleInfoDrawer 패턴 정합 (antd Form + rules).
 */
import { useEffect } from 'react';
import { Button, Checkbox, DatePicker, Drawer, Form, Input, Select, TimePicker, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useGetSkillsets } from '../../skillset-master/hooks/useSkillsetQueries';
import { MEDIA_TYPE_OPTIONS, SCHEDULE_DAY_FIELDS, SCHEDULE_KIND_LABELS, type ScheduleInfoRequest, type ScheduleInfoResponse, type ScheduleKind } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  kind: ScheduleKind;
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
  finishTime?: Dayjs | null;
  days: string[]; // ['mon','tue',...]
  skillId?: number | null;
  mediaType?: number | null;
}

/** "HHMM" → Dayjs (antd 번들 dayjs 의 'HHmm' 파싱) */
function parseHHMM(v?: string | null): Dayjs | null {
  if (!v || v.length < 3) return null;
  return dayjs(v.padStart(4, '0'), 'HHmm');
}

/** Dayjs → "HHMM" */
function formatHHMM(v?: Dayjs | null): string | null {
  if (!v) return null;
  return v.format('HHmm');
}

export default function ScheduleInfoDrawer({ open, mode, kind, schedule, tenantId, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();
  const isSkill = kind === 'skill';

  // 스킬 Select 소스 — 선택 테넌트의 스킬셋 목록 (스킬 풀). 스킬 탭일 때만 조회.
  const skillTenantId = mode === 'edit' ? (schedule?.tenantId ?? tenantId) : tenantId;
  const { data: skillsets = [] } = useGetSkillsets({
    params: skillTenantId != null ? { tenantId: skillTenantId } : undefined,
    queryOptions: { enabled: open && isSkill },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && schedule) {
      form.setFieldsValue({
        scheduleName: schedule.scheduleName,
        startDate: schedule.startDate ? dayjs(schedule.startDate) : null,
        startTime: parseHHMM(schedule.startTime),
        finishTime: parseHHMM(schedule.finishTime),
        days: SCHEDULE_DAY_FIELDS.filter((d) => schedule[d.key] === 1).map((d) => d.key),
        skillId: schedule.skillId ?? null,
        mediaType: schedule.mediaType ?? null,
      });
    } else {
      form.setFieldsValue({ scheduleName: '', startDate: null, startTime: null, finishTime: null, days: [], skillId: null, mediaType: null });
    }
  }, [open, mode, schedule, form]);

  const handleFinish = (values: FormValues) => {
    // 시작시간 > 종료시간 교차 검증 (SWAT 정합)
    if (values.startTime && values.finishTime) {
      const sHm = Number(values.startTime.format('HHmm'));
      const eHm = Number(values.finishTime.format('HHmm'));
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
      finishTime: formatHHMM(values.finishTime),
      mon: days.has('mon') ? 1 : 0,
      tue: days.has('tue') ? 1 : 0,
      wed: days.has('wed') ? 1 : 0,
      thu: days.has('thu') ? 1 : 0,
      fri: days.has('fri') ? 1 : 0,
      sat: days.has('sat') ? 1 : 0,
      sun: days.has('sun') ? 1 : 0,
    };
    if (isSkill) {
      req.skillId = values.skillId ?? null;
      req.mediaType = values.mediaType ?? null;
    }
    onSubmit(req);
  };

  const kindLabel = SCHEDULE_KIND_LABELS[kind];

  return (
    <Drawer
      title={mode === 'create' ? `${kindLabel} 등록` : `${kindLabel} 수정`}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      width={480}
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
        <Form.Item
          name="scheduleName"
          label="스케줄명"
          rules={[
            { required: true, message: '스케줄명을 입력하세요' },
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
          <Form.Item name="finishTime" label="종료 시간" rules={[{ required: true, message: '종료 시간을 입력하세요' }]}>
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

        {isSkill && (
          <>
            <Form.Item name="skillId" label="스킬" rules={[{ required: true, message: '스킬을 선택하세요' }]}>
              <Select placeholder="스킬을 선택하세요" showSearch optionFilterProp="label" options={skillsets.map((s) => ({ value: s.skillsetId, label: s.skillsetName }))} />
            </Form.Item>
            <Form.Item name="mediaType" label="미디어 종류" rules={[{ required: true, message: '미디어 종류를 선택하세요' }]}>
              <Select placeholder="미디어를 선택하세요" options={MEDIA_TYPE_OPTIONS} />
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  );
}
