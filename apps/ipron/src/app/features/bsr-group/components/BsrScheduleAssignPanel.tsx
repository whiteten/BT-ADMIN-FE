/**
 * BSR 스케줄 배정 패널 — 스케줄 탭 내 배정모드 전환용 (CTI큐 배정 패널 동일 패턴).
 *
 * - 탭 내 스왑(tabMode 'scheduleAssign') 방식으로 진입. 모달 미사용.
 * - 탭1 "기존 스케줄 선택": 테넌트/그룹 기준 풀 자동 로드 → 체크 → [N건 배정]
 * - 탭2 "새로 만들기": 스케줄 폼 → [배정]
 * - [N건 배정] = API 호출 + 성공 토스트 + 자동 복귀 (onDone 콜백)
 * - [닫기] = 복귀만 (onDone)
 * - 그리드 9규칙 완전 준수: useAggridOptions / rowSelection 객체 직접 prop /
 *   pagination:false / tooltipField / null='-' / 상주 배너 금지 / 수정버튼 금지
 */
import { useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Checkbox, DatePicker, Form, Input, Tabs } from 'antd';
import type dayjs from 'dayjs';
import type { BsrScheduleInfoCreateRequest, BsrScheduleInfoResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface Props {
  /** 현재 선택된 BSR 그룹 ID */
  targetBsrGroupId: number;
  /** 현재 선택된 BSR 그룹명 — 타이틀에 사용 */
  targetBsrGroupName: string;
  /** 배정 후보 풀 (이 그룹에 아직 배정 안 된 스케줄) */
  schedulePool: BsrScheduleInfoResponse[];
  isPoolLoading: boolean;
  /** 기존 스케줄 선택: 선택된 스케줄 ID 배열 배정 */
  onAssignExisting: (scheduleIds: number[]) => void;
  isAssigning: boolean;
  /** 새로 만들기: 스케줄 생성 후 즉시 배정 */
  onCreateAndAssign: (req: BsrScheduleInfoCreateRequest) => void;
  isCreating: boolean;
  /** 완료/닫기 → 스케줄 관리 모드 복귀 */
  onDone: () => void;
  /** 테넌트 ID — 새 스케줄 생성 시 필요 */
  tenantId: number;
}

function getScheduleDays(data: BsrScheduleInfoResponse | undefined | null): string {
  if (!data) return '-';
  const days: string[] = [];
  if (data.mon === 1) days.push('월');
  if (data.tue === 1) days.push('화');
  if (data.wed === 1) days.push('수');
  if (data.thu === 1) days.push('목');
  if (data.fri === 1) days.push('금');
  if (data.sat === 1) days.push('토');
  if (data.sun === 1) days.push('일');
  return days.join(' ') || '-';
}

const SCHEDULE_COLS: ColDef<BsrScheduleInfoResponse>[] = [
  { field: 'bsrScheduleName', headerName: '스케줄명', flex: 1, tooltipField: 'bsrScheduleName', valueFormatter: ({ value }) => (value as string | null) ?? '-' },
  { field: 'startDate', headerName: '시작일', minWidth: 110, valueFormatter: ({ value }) => (value as string | null) ?? '-' },
  { field: 'startTime', headerName: '시작시간', minWidth: 85, valueFormatter: ({ value }) => (value as string | null) ?? '-' },
  { field: 'finshTime', headerName: '종료시간', minWidth: 85, valueFormatter: ({ value }) => (value as string | null) ?? '-' },
  {
    headerName: '요일',
    minWidth: 120,
    flex: 1,
    filterValueGetter: ({ data }) => getScheduleDays(data),
    valueGetter: ({ data }) => getScheduleDays(data),
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

export default function BsrScheduleAssignPanel({
  targetBsrGroupId: _targetBsrGroupId,
  targetBsrGroupName,
  schedulePool,
  isPoolLoading,
  onAssignExisting,
  isAssigning,
  onCreateAndAssign,
  isCreating,
  onDone,
  tenantId,
}: Props) {
  const { gridOptions } = useAggridOptions();
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);
  const [form] = Form.useForm<NewScheduleForm>();

  const panelGridOptions = useMemo(() => ({ ...gridOptions, pagination: false, statusBar: undefined, sideBar: false }), [gridOptions]);

  const handleAssign = () => {
    if (activeTab === 'existing') {
      if (selectedScheduleIds.length === 0) return;
      onAssignExisting(selectedScheduleIds);
    } else {
      form.submit();
    }
  };

  const handleFormFinish = (values: NewScheduleForm) => {
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

  const assignDisabled = activeTab === 'existing' ? selectedScheduleIds.length === 0 : false;
  const isLoading = activeTab === 'existing' ? isAssigning : isCreating;

  const assignLabel = activeTab === 'existing' && selectedScheduleIds.length > 0 ? `${selectedScheduleIds.length}건 배정` : '배정';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* 헤더 액션바 */}
      <div className="px-4 h-[44px] border-b border-gray-100 flex items-center flex-shrink-0 gap-2">
        <span className="text-sm font-semibold text-gray-700 truncate">[{targetBsrGroupName}] 스케줄 배정</span>
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <Button type="primary" onClick={handleAssign} loading={isLoading} disabled={assignDisabled}>
            {assignLabel}
          </Button>
          <Button onClick={onDone}>닫기</Button>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setActiveTab(k as 'existing' | 'new');
            setSelectedScheduleIds([]);
          }}
          items={[
            {
              key: 'existing',
              label: '기존 스케줄 선택',
              children: (
                <div style={{ height: 340 }}>
                  <AgGridReact<BsrScheduleInfoResponse>
                    {...panelGridOptions}
                    rowData={schedulePool}
                    columnDefs={SCHEDULE_COLS}
                    loading={isPoolLoading}
                    rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }}
                    onSelectionChanged={(e) => setSelectedScheduleIds(e.api.getSelectedRows().map((r) => r.bsrScheduleId))}
                    overlayNoRowsTemplate="<span class='text-gray-400 text-sm'>검색된 데이터가 없습니다.</span>"
                  />
                </div>
              ),
            },
            {
              key: 'new',
              label: '새로 만들기',
              children: (
                <Form form={form} layout="vertical" onFinish={handleFormFinish} style={{ maxWidth: 480 }}>
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
      </div>
    </div>
  );
}
