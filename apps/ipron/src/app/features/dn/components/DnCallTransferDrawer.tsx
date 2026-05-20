/**
 * DN 조건부 착신 전환 Drawer (IPR20S2020 _CallTrans).
 *
 * - DnFormPage 착신설정 탭에서 caseTransSvc 토글 ON + 수정 모드일 때만 활성
 * - 우측 Drawer: 상단 그리드(N건) + 하단 인라인 폼(추가/수정)
 * - 한 행 더블클릭/연필 → 폼 로드, 저장 → 그리드 갱신
 * - 휴지통 → 단건 삭제
 *
 * 비즈니스 분기 (AS-IS):
 *  - transType === '1' (전환) → transDnis 필수
 *  - transType === '9' (거부) → transDnis 비활성
 *  - transKind !== '1' (시간조건 외) → transPattern 필수
 *  - transType 변경 시 transReasonCode 옵션을 그룹별로 필터
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Form, Input, Select, Switch, Tag, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { List, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../did-trans/components/NumPatternDrawer';
import type { NumPattern } from '../../did-trans/types';
import { useCreateDnCallTransfer, useDeleteDnCallTransfer, useGetDnCallTransferList, useUpdateDnCallTransfer } from '../hooks/useDnQueries';
import {
  CALL_TRANS_KIND_LABELS,
  type CallTransKindCode,
  type CallTypeCode,
  DN_CALL_TRANSFER_INITIAL_VALUES,
  DN_CALL_TYPE_LABELS,
  type DnCallTransferRequest,
  type DnCallTransferResponse,
  TRANSFER_DENY_TYPE_LABELS,
  TRANS_REASON_CODE_LABELS,
  TRANS_REASON_GROUPS,
  type TransReasonCodeCode,
  type TransferDenyType,
} from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

interface DnCallTransferDrawerProps {
  open: boolean;
  dnId: number | null;
  dnNo?: string | null;
  onClose: () => void;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;

function weekdayBitsToBoolArr(bits: string): boolean[] {
  return WEEKDAYS.map((_, i) => bits.charAt(i) === '1');
}
function boolArrToWeekdayBits(arr: boolean[]): string {
  return arr.map((v) => (v ? '1' : '0')).join('');
}
function hhmmToDayjs(s: string | null | undefined): Dayjs | null {
  if (!s || s.length !== 4) return null;
  return dayjs(`${s.slice(0, 2)}:${s.slice(2)}`, 'HH:mm');
}
function dayjsToHhmm(d: Dayjs | null | undefined): string | null {
  return d ? d.format('HHmm') : null;
}

export default function DnCallTransferDrawer({ open, dnId, dnNo, onClose }: DnCallTransferDrawerProps) {
  const { gridOptions } = useAggridOptions();
  const [form] = Form.useForm<DnCallTransferRequest>();
  const [editingId, setEditingId] = useState<number | null>(null); // null=신규
  const [weekdayChecks, setWeekdayChecks] = useState<boolean[]>(weekdayBitsToBoolArr('1111100'));
  const [startTime, setStartTime] = useState<Dayjs | null>(dayjs('09:00', 'HH:mm'));
  const [finshTime, setFinshTime] = useState<Dayjs | null>(dayjs('18:00', 'HH:mm'));
  const transType = Form.useWatch('transType', form) as TransferDenyType | undefined;
  const transKind = Form.useWatch('transKind', form) as CallTransKindCode | undefined;

  // 번호 패턴 공용 Drawer
  const [patternDrawerOpen, setPatternDrawerOpen] = useState(false);
  const numPatternDrawerRef = useRef<NumPatternDrawerRef>(null);
  const handleOpenPatternDrawer = useCallback(() => {
    setPatternDrawerOpen(true);
    numPatternDrawerRef.current?.open();
  }, []);
  const handlePatternSelect = useCallback(
    (pattern: NumPattern) => {
      form.setFieldsValue({ transPattern: pattern.numPattern });
      setPatternDrawerOpen(false);
    },
    [form],
  );
  const handlePatternDrawerClose = useCallback(() => {
    setPatternDrawerOpen(false);
  }, []);

  const { data: list = [], refetch } = useGetDnCallTransferList(dnId);
  const createMut = useCreateDnCallTransfer();
  const updateMut = useUpdateDnCallTransfer();
  const deleteMut = useDeleteDnCallTransfer();

  // 사유 코드 옵션을 transType 그룹으로 필터
  const reasonOptions = useMemo(() => {
    return (Object.keys(TRANS_REASON_CODE_LABELS) as TransReasonCodeCode[])
      .filter((code) => !transType || TRANS_REASON_GROUPS[code] === transType)
      .map((code) => ({ value: code, label: TRANS_REASON_CODE_LABELS[code] }));
  }, [transType]);

  // Drawer 열릴 때 초기화
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue(DN_CALL_TRANSFER_INITIAL_VALUES);
    setEditingId(null);
    setWeekdayChecks(weekdayBitsToBoolArr('1111100'));
    setStartTime(dayjs('09:00', 'HH:mm'));
    setFinshTime(dayjs('18:00', 'HH:mm'));
  };

  const loadRow = (row: DnCallTransferResponse) => {
    setEditingId(row.caseTransId);
    form.setFieldsValue({
      transType: row.transType,
      callType: row.callType,
      transKind: row.transKind,
      transReasonCode: row.transReasonCode,
      holiApplyYn: row.holiApplyYn,
      activateYn: row.activateYn,
      transDnis: row.transDnis ?? '',
      transPattern: row.transPattern ?? '',
    } as DnCallTransferRequest);
    setWeekdayChecks(weekdayBitsToBoolArr(row.weekdayByte ?? '0000000'));
    setStartTime(hhmmToDayjs(row.startTime));
    setFinshTime(hhmmToDayjs(row.finshTime));
  };

  // transType 바뀌면 사유 코드도 그룹 첫번째로 보정
  useEffect(() => {
    const cur = form.getFieldValue('transReasonCode') as TransReasonCodeCode | undefined;
    if (transType && cur && TRANS_REASON_GROUPS[cur] !== transType) {
      const first = (Object.keys(TRANS_REASON_CODE_LABELS) as TransReasonCodeCode[]).find((c) => TRANS_REASON_GROUPS[c] === transType);
      if (first) form.setFieldValue('transReasonCode', first);
    }
  }, [transType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!dnId) return;
    let values: DnCallTransferRequest;
    try {
      values = (await form.validateFields()) as DnCallTransferRequest;
    } catch {
      return;
    }
    const payload: DnCallTransferRequest = {
      ...values,
      weekdayByte: boolArrToWeekdayBits(weekdayChecks),
      startTime: dayjsToHhmm(startTime) ?? '0000',
      finshTime: dayjsToHhmm(finshTime) ?? '0000',
      transDnis: values.transDnis || null,
      transPattern: values.transPattern || null,
    };

    try {
      if (editingId) {
        await updateMut.mutateAsync({ dnId, caseTransId: editingId, data: payload });
        toast.success('수정되었습니다');
      } else {
        await createMut.mutateAsync({ dnId, data: payload });
        toast.success('등록되었습니다');
      }
      await refetch();
      resetForm();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? '저장 실패');
    }
  };

  const handleDelete = async (caseTransId: number) => {
    if (!dnId) return;
    try {
      await deleteMut.mutateAsync({ dnId, caseTransId });
      toast.success('삭제되었습니다');
      await refetch();
      if (editingId === caseTransId) resetForm();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? '삭제 실패');
    }
  };

  const columnDefs = useMemo<ColDef<DnCallTransferResponse>[]>(
    () => [
      { headerName: '구분', field: 'transType', width: 70, valueFormatter: (p) => TRANSFER_DENY_TYPE_LABELS[p.value as TransferDenyType] ?? '' },
      { headerName: '인입', field: 'callType', width: 90, valueFormatter: (p) => DN_CALL_TYPE_LABELS[p.value as CallTypeCode] ?? '' },
      { headerName: '착신변환', field: 'transKind', width: 90, valueFormatter: (p) => CALL_TRANS_KIND_LABELS[p.value as CallTransKindCode] ?? '' },
      { headerName: '사유', field: 'transReasonCode', width: 110, valueFormatter: (p) => TRANS_REASON_CODE_LABELS[p.value as TransReasonCodeCode] ?? '' },
      { headerName: '요일', field: 'weekdayByte', width: 110, valueFormatter: (p) => WEEKDAYS.filter((_, i) => p.value?.charAt?.(i) === '1').join(',') },
      { headerName: '시작', field: 'startTime', width: 70, valueFormatter: (p) => (p.value?.length === 4 ? `${p.value.slice(0, 2)}:${p.value.slice(2)}` : '') },
      { headerName: '종료', field: 'finshTime', width: 70, valueFormatter: (p) => (p.value?.length === 4 ? `${p.value.slice(0, 2)}:${p.value.slice(2)}` : '') },
      { headerName: '활성', field: 'activateYn', width: 60, cellRenderer: (p: { value: number }) => (p.value === 1 ? <Tag color="green">ON</Tag> : <Tag>OFF</Tag>) },
      { headerName: 'DNIS', field: 'transDnis', width: 110 },
      { headerName: '패턴', field: 'transPattern', width: 140, tooltipField: 'transPattern' },
      {
        headerName: '',
        width: 90,
        pinned: 'right',
        cellRenderer: (p: { data: DnCallTransferResponse }) => (
          <div className="flex items-center gap-1 h-full">
            <Button size="small" type="text" icon={<Pencil className="size-3.5" />} onClick={() => loadRow(p.data)} />
            <Button size="small" type="text" danger icon={<Trash2 className="size-3.5" />} onClick={() => handleDelete(p.data.caseTransId)} />
          </div>
        ),
        sortable: false,
        filter: false,
      },
    ],
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dnisRequired = transType === '1';
  const patternRequired = transKind && transKind !== '1';

  return (
    <>
      <Drawer
        title={`DN ${dnNo ?? ''} — 조건부 착신 전환`}
        open={open}
        onClose={onClose}
        width={920}
        placement="right"
        styles={{
          body: { display: 'flex', flexDirection: 'column', padding: 16 },
          wrapper: { width: 920, display: patternDrawerOpen ? 'none' : undefined },
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>닫기</Button>
            {editingId && <Button onClick={resetForm}>새로 작성</Button>}
            <Button type="primary" onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending}>
              {editingId ? '수정' : '등록'}
            </Button>
          </div>
        }
      >
        {/* 그리드 */}
        <div className="flex items-center justify-between mb-2 flex-shrink-0">
          <div className="text-sm font-semibold text-gray-700">조건부 착신 전환 규칙</div>
          <Button size="small" icon={<Plus className="size-3.5" />} onClick={resetForm}>
            폼 초기화
          </Button>
        </div>
        <div className="ag-theme-alpine flex-1 min-h-[240px]" style={{ width: '100%' }}>
          <AgGridReact<DnCallTransferResponse>
            {...gridOptions}
            rowData={list}
            columnDefs={columnDefs}
            defaultColDef={{ filter: true, sortable: true, suppressHeaderMenuButton: true }}
            onRowDoubleClicked={(e) => e.data && loadRow(e.data)}
            pagination={false}
            sideBar={false}
            statusBar={undefined}
          />
        </div>

        {/* 인라인 폼 — 컴팩트 */}
        <div className="mt-3 p-2.5 border border-gray-200 rounded-md bg-white flex-shrink-0">
          <div className="text-xs font-semibold text-gray-700 mb-2">{editingId ? '수정' : '신규 등록'}</div>
          <Form form={form} layout="vertical" size="small" initialValues={DN_CALL_TRANSFER_INITIAL_VALUES}>
            {/* 1행: 구분 / 인입 / 착신변환 / 사유 (4열) */}
            <div className="grid grid-cols-4 gap-2">
              <Form.Item name="transType" label="구분" required rules={[{ required: true }]} className="!mb-2">
                <Select
                  options={(Object.keys(TRANSFER_DENY_TYPE_LABELS) as TransferDenyType[]).map((c) => ({
                    value: c,
                    label: TRANSFER_DENY_TYPE_LABELS[c],
                  }))}
                />
              </Form.Item>
              <Form.Item name="callType" label="인입호" required rules={[{ required: true }]} className="!mb-2">
                <Select
                  options={(Object.keys(DN_CALL_TYPE_LABELS) as CallTypeCode[]).map((c) => ({
                    value: c,
                    label: DN_CALL_TYPE_LABELS[c],
                  }))}
                />
              </Form.Item>
              <Form.Item name="transKind" label="착신변환" required rules={[{ required: true }]} className="!mb-2">
                <Select
                  options={(Object.keys(CALL_TRANS_KIND_LABELS) as CallTransKindCode[]).map((c) => ({
                    value: c,
                    label: CALL_TRANS_KIND_LABELS[c],
                  }))}
                />
              </Form.Item>
              <Form.Item name="transReasonCode" label="사유" required rules={[{ required: true }]} className="!mb-2">
                <Select options={reasonOptions} />
              </Form.Item>
            </div>

            {/* 2행: 시작/종료 시간 + 활성/휴일 (4열) */}
            <div className="grid grid-cols-4 gap-2">
              <Form.Item label="시작" className="!mb-2">
                <TimePicker value={startTime} onChange={setStartTime} format="HH:mm" minuteStep={5} className="w-full" />
              </Form.Item>
              <Form.Item label="종료" className="!mb-2">
                <TimePicker value={finshTime} onChange={setFinshTime} format="HH:mm" minuteStep={5} className="w-full" />
              </Form.Item>
              <Form.Item
                name="activateYn"
                label="활성"
                valuePropName="checked"
                getValueFromEvent={(c: boolean) => (c ? 1 : 0)}
                getValueProps={(v: number) => ({ checked: v === 1 })}
                className="!mb-2"
              >
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
              <Form.Item
                name="holiApplyYn"
                label="휴일"
                valuePropName="checked"
                getValueFromEvent={(c: boolean) => (c ? 1 : 0)}
                getValueProps={(v: number) => ({ checked: v === 1 })}
                className="!mb-2"
              >
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
            </div>

            {/* 3행: 적용 요일 (인라인) */}
            <Form.Item label="적용 요일" className="!mb-2">
              <div className="flex gap-2 flex-wrap">
                {WEEKDAYS.map((d, i) => (
                  <label key={d} className="flex items-center gap-1 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={weekdayChecks[i]}
                      onChange={(e) => {
                        const next = [...weekdayChecks];
                        next[i] = e.target.checked;
                        setWeekdayChecks(next);
                      }}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </Form.Item>

            {/* 4행: DNIS / 패턴 (2열) */}
            <div className="grid grid-cols-2 gap-2">
              <Form.Item
                name="transDnis"
                label={`착신전환 DNIS${dnisRequired ? ' (필수)' : ''}`}
                rules={[
                  { max: 31, message: '31자 이내' },
                  { pattern: /^[0-9]*$/, message: '숫자만' },
                ]}
                className="!mb-1"
              >
                <Input placeholder={dnisRequired ? '전환 시 필수' : '거부 시 불필요'} disabled={!dnisRequired} maxLength={31} />
              </Form.Item>
              <Form.Item
                name="transPattern"
                label={
                  <div className="flex items-center gap-1">
                    <span>번호 패턴{patternRequired ? ' (필수)' : ''}</span>
                    <Button
                      type="text"
                      size="small"
                      icon={<List className="size-3.5" />}
                      onClick={handleOpenPatternDrawer}
                      title="번호 패턴 관리"
                      disabled={!patternRequired}
                      className="text-gray-400 hover:text-blue-500"
                    />
                  </div>
                }
                rules={[{ max: 256, message: '256자 이내' }]}
                className="!mb-1"
              >
                <Input placeholder={patternRequired ? '시간조건 외 필수' : '시간조건 시 불필요'} disabled={!patternRequired} maxLength={256} style={{ fontFamily: 'monospace' }} />
              </Form.Item>
            </div>
          </Form>
        </div>
      </Drawer>
      <NumPatternDrawer ref={numPatternDrawerRef} onSelect={handlePatternSelect} onClose={handlePatternDrawerClose} />
    </>
  );
}
