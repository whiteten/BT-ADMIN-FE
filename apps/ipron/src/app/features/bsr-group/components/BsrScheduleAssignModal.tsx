/**
 * BSR 그룹 스케줄 배정 모달 (bsr-group-v3 목업 1:1).
 *
 * 탭1 "기존 스케줄 선택": 이 그룹에 아직 배정되지 않은 스케줄 목록 → 체크 → [배정]
 * 탭2 "새로 만들기": 스케줄 폼(스케줄명/시작일/시작시간/종료시간/요일) → [배정]
 */
import { useEffect, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Checkbox, DatePicker, Form, Input, Modal, Tabs } from 'antd';
import type dayjs from 'dayjs';
import type { BsrScheduleInfoCreateRequest, BsrScheduleInfoResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  open: boolean;
  /** 배정 풀 — 아직 이 그룹에 배정 안 된 스케줄 목록 */
  schedulePool: BsrScheduleInfoResponse[];
  isPoolLoading: boolean;
  tenantId: number | null;
  onClose: () => void;
  /** 기존 스케줄 선택 탭: 선택된 스케줄 ID 배열 배정 */
  onAssignExisting: (scheduleIds: number[]) => void;
  isAssigning: boolean;
  /** 새로 만들기 탭: 스케줄 생성 후 즉시 배정 */
  onCreateAndAssign: (req: BsrScheduleInfoCreateRequest) => void;
  isCreating: boolean;
}

const SCHEDULE_COLS: ColDef<BsrScheduleInfoResponse>[] = [
  {
    headerCheckboxSelection: true,
    checkboxSelection: true,
    width: 44,
    pinned: 'left' as const,
    suppressHeaderMenuButton: true,
  },
  { field: 'bsrScheduleName', headerName: '스케줄명', flex: 1 },
  { field: 'startDate', headerName: '시작일', width: 110 },
  { field: 'startTime', headerName: '시작시간', width: 85 },
  { field: 'finshTime', headerName: '종료시간', width: 85 },
  {
    headerName: '요일',
    width: 160,
    valueGetter: ({ data }) => {
      if (!data) return '';
      const days: string[] = [];
      if (data.mon === 1) days.push('월');
      if (data.tue === 1) days.push('화');
      if (data.wed === 1) days.push('wed');
      if (data.thu === 1) days.push('목');
      if (data.fri === 1) days.push('금');
      if (data.sat === 1) days.push('토');
      if (data.sun === 1) days.push('일');
      return days.join(' ');
    },
  },
];

const DAY_OPTIONS = [
  { value: 'mon', label: '월' },
  { value: 'tue', label: '화' },
  { value: 'wed', label: '수' },
  { value: 'thu', label: '목' },
  { value: 'fri', label: '금' },
  { value: 'sat', label: '토' },
  { value: 'sun', label: '일' },
];

interface NewScheduleForm {
  bsrScheduleName: string;
  startDate: dayjs.Dayjs;
  startTime: string;
  finshTime: string;
  days: string[];
}

export default function BsrScheduleAssignModal({ open, schedulePool, isPoolLoading, tenantId, onClose, onAssignExisting, isAssigning, onCreateAndAssign, isCreating }: Props) {
  const [activeTab, setActiveTab] = useState('existing');
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);
  const [form] = Form.useForm<NewScheduleForm>();
  const { gridOptions } = useAggridOptions();

  useEffect(() => {
    if (!open) return;
    setActiveTab('existing');
    setSelectedScheduleIds([]);
    form.resetFields();
  }, [open, form]);

  const handleAssign = () => {
    if (activeTab === 'existing') {
      if (selectedScheduleIds.length === 0) return;
      onAssignExisting(selectedScheduleIds);
    } else {
      form.submit();
    }
  };

  const handleFormFinish = (values: NewScheduleForm) => {
    if (!tenantId) return;
    const dayFlags = {
      mon: values.days?.includes('mon') ? 1 : 0,
      tue: values.days?.includes('tue') ? 1 : 0,
      wed: values.days?.includes('wed') ? 1 : 0,
      thu: values.days?.includes('thu') ? 1 : 0,
      fri: values.days?.includes('fri') ? 1 : 0,
      sat: values.days?.includes('sat') ? 1 : 0,
      sun: values.days?.includes('sun') ? 1 : 0,
    };
    onCreateAndAssign({
      tenantId,
      bsrScheduleName: values.bsrScheduleName,
      startDate: values.startDate.format('YYYY-MM-DD'),
      startTime: values.startTime,
      finshTime: values.finshTime,
      ...dayFlags,
    });
  };

  const isLoading = activeTab === 'existing' ? isAssigning : isCreating;
  const assignDisabled = activeTab === 'existing' ? selectedScheduleIds.length === 0 : false;

  return (
    <Modal
      title="스케줄 배정"
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={isLoading} disabled={assignDisabled} onClick={handleAssign}>
            배정
          </Button>
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={(k) => {
          setActiveTab(k);
          setSelectedScheduleIds([]);
        }}
        items={[
          {
            key: 'existing',
            label: '기존 스케줄 선택',
            children: (
              <div style={{ height: 260 }}>
                <AgGridReact<BsrScheduleInfoResponse>
                  {...gridOptions}
                  rowData={schedulePool}
                  columnDefs={SCHEDULE_COLS}
                  loading={isPoolLoading}
                  rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true }}
                  onSelectionChanged={(e) => setSelectedScheduleIds(e.api.getSelectedRows().map((r) => r.bsrScheduleId))}
                />
              </div>
            ),
          },
          {
            key: 'new',
            label: '새로 만들기',
            children: (
              <Form form={form} layout="vertical" onFinish={handleFormFinish}>
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
                <div className="flex gap-3">
                  <Form.Item
                    name="startTime"
                    label="시작시간 (HHMM)"
                    style={{ flex: 1 }}
                    rules={[
                      { required: true, message: '필수' },
                      { pattern: /^\d{4}$/, message: 'HHMM 형식' },
                    ]}
                  >
                    <Input placeholder="예: 0900" maxLength={4} />
                  </Form.Item>
                  <Form.Item
                    name="finshTime"
                    label="종료시간 (HHMM)"
                    style={{ flex: 1 }}
                    rules={[
                      { required: true, message: '필수' },
                      { pattern: /^\d{4}$/, message: 'HHMM 형식' },
                    ]}
                  >
                    <Input placeholder="예: 1800" maxLength={4} />
                  </Form.Item>
                </div>
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
            ),
          },
        ]}
      />
    </Modal>
  );
}
