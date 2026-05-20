/**
 * DN SNR (순차 호출) + TOD (시간대 규칙) 탭.
 * AS-IS IPR20S2020_Snr.jsp + IPR20S2020_SnrTod.jsp 리뉴얼.
 *
 * UI:
 *   - SNR 목록(ag-Grid) — 각 row에 [스케줄] [삭제] 버튼
 *   - "새 SNR" 버튼 / 더블클릭 → 우측 SNR 편집 Drawer (560px)
 *   - 그리드의 [스케줄] 버튼 → 우측 Schedule Drawer (720px): TOD 그리드 + 편집 모달
 *
 * 제약:
 *   - AS-IS JSP: SNR 1 DN당 최대 4개, TOD 1 SNR당 최대 30개 (메시지상 의도).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Button, Drawer, Form, Input, InputNumber, Modal, Select, Switch, Tag, TimePicker, Tooltip } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { CalendarClock, List, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import NumPatternDrawer, { type NumPatternDrawerRef } from '../../did-trans/components/NumPatternDrawer';
import type { NumPattern } from '../../did-trans/types';
import {
  useCreateDnSnr,
  useCreateDnSnrTod,
  useDeleteDnSnr,
  useDeleteDnSnrTod,
  useGetDnSnrList,
  useGetDnSnrTodList,
  useUpdateDnSnr,
  useUpdateDnSnrTod,
} from '../hooks/useDnQueries';
import { DN_SNR_INITIAL_VALUES, type DnSnrRequest, type DnSnrResponse, type DnSnrTodRequest, type DnSnrTodResponse } from '../types';
import useAggridOptions from '@/libs/shared-ui/src/hooks/useAggridOptions';

const MAX_SNR = 4;
const MAX_TOD = 30;

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일', '휴일'] as const;

// AS-IS 공통코드 DN_CALL_TYPE: 1=내부, 2=외부, 3=내부/외부 (SQLite CHECK 제약: IN (1,2,3))
const CALL_TYPE_OPTIONS = [
  { value: 1, label: '내부' },
  { value: 2, label: '외부' },
  { value: 3, label: '내부/외부' },
];

interface DnSnrTabProps {
  dnId: number;
}

export default function DnSnrTab({ dnId }: DnSnrTabProps) {
  const { gridOptions } = useAggridOptions();

  // ── Drawer 상태 ──
  const [snrDrawerOpen, setSnrDrawerOpen] = useState(false);
  const [editingSnr, setEditingSnr] = useState<DnSnrResponse | null>(null);

  // ── 스케줄 그리드는 메인 화면에 표시: selectedSnr 기준 ──
  const [selectedSnr, setSelectedSnr] = useState<DnSnrResponse | null>(null);

  // ── 번호 패턴 Drawer 상태 ──
  const [patternDrawerOpen, setPatternDrawerOpen] = useState(false);
  const numPatternDrawerRef = useRef<NumPatternDrawerRef>(null);

  const [form] = Form.useForm<DnSnrRequest>();

  // ── 스케줄 규칙(TOD) 편집 Drawer 상태 ──
  const [todDrawerOpen, setTodDrawerOpen] = useState(false);
  const [editingTod, setEditingTod] = useState<DnSnrTodResponse | null>(null);
  const [todForm] = Form.useForm();

  // ── queries ──
  const { data: snrList = [], refetch: refetchSnr } = useGetDnSnrList(dnId);
  const { data: todList = [], refetch: refetchTod } = useGetDnSnrTodList(dnId, selectedSnr?.snrId ?? null);

  // SNR 목록 변경 시 선택된 SNR 동기화 (서버 응답 최신화)
  useEffect(() => {
    if (!selectedSnr) return;
    const updated = snrList.find((s) => s.snrId === selectedSnr.snrId);
    if (updated && updated !== selectedSnr) setSelectedSnr(updated);
    if (!updated) setSelectedSnr(null);
  }, [snrList, selectedSnr]);

  // ── mutations ──
  const createSnrMut = useCreateDnSnr({
    mutationOptions: {
      onSuccess: (d: unknown) => {
        toast.success('SNR이 등록되었습니다');
        setSnrDrawerOpen(false);
        setEditingSnr(d as DnSnrResponse);
        void refetchSnr();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '등록 실패'),
    },
  });
  const updateSnrMut = useUpdateDnSnr({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SNR이 수정되었습니다');
        setSnrDrawerOpen(false);
        void refetchSnr();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '수정 실패'),
    },
  });
  const deleteSnrMut = useDeleteDnSnr({
    mutationOptions: {
      onSuccess: () => {
        toast.success('SNR이 삭제되었습니다');
        void refetchSnr();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '삭제 실패'),
    },
  });

  const createTodMut = useCreateDnSnrTod({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 등록되었습니다');
        setTodDrawerOpen(false);
        void refetchTod();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '스케줄 등록 실패'),
    },
  });
  const updateTodMut = useUpdateDnSnrTod({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 수정되었습니다');
        setTodDrawerOpen(false);
        void refetchTod();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '스케줄 수정 실패'),
    },
  });
  const deleteTodMut = useDeleteDnSnrTod({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케줄이 삭제되었습니다');
        void refetchTod();
      },
      onError: (e: any) => toast.error(e?.response?.data?.message ?? '스케줄 삭제 실패'),
    },
  });

  // ── SNR Drawer 열릴 때 폼 초기화 ──
  useEffect(() => {
    if (!snrDrawerOpen) return;
    if (editingSnr) {
      form.setFieldsValue({
        remoteNum: editingSnr.remoteNum,
        remoteNumType: editingSnr.remoteNumType ?? 0,
        ringWait: editingSnr.ringWait ?? 0,
        ringDur: editingSnr.ringDur ?? 0,
        activeYn: editingSnr.activeYn ?? 1,
        allowOpt: editingSnr.allowOpt ?? 1,
        allowPtn: editingSnr.allowPtn ?? '',
        snrDesc: editingSnr.snrDesc ?? '',
      });
    } else {
      form.resetFields();
      form.setFieldsValue(DN_SNR_INITIAL_VALUES);
    }
  }, [snrDrawerOpen, editingSnr, form]);

  // ── TOD columns ──
  const todColumns: ColDef<DnSnrTodResponse>[] = useMemo(
    () => [
      {
        headerName: '콜종류',
        field: 'callType',
        width: 100,
        valueFormatter: (p) => CALL_TYPE_OPTIONS.find((o) => o.value === p.value)?.label ?? '-',
      },
      {
        headerName: '요일',
        field: 'weekdayByte',
        flex: 1,
        minWidth: 160,
        valueFormatter: (p) => {
          const v = p.value ?? '';
          const names = WEEKDAY_LABELS.filter((_, i) => v[i] === '1');
          return names.length > 0 ? names.join(', ') : '-';
        },
      },
      {
        headerName: '시작',
        field: 'startTime',
        width: 80,
        valueFormatter: (p) => (p.value?.length === 4 ? `${p.value.slice(0, 2)}:${p.value.slice(2)}` : (p.value ?? '')),
      },
      {
        headerName: '종료',
        field: 'finshTime',
        width: 80,
        valueFormatter: (p) => (p.value?.length === 4 ? `${p.value.slice(0, 2)}:${p.value.slice(2)}` : (p.value ?? '')),
      },
      {
        headerName: '활성',
        field: 'activeYn',
        width: 70,
        valueFormatter: (p) => (p.value === 1 ? 'ON' : 'OFF'),
      },
      {
        headerName: '',
        width: 44,
        pinned: 'right',
        sortable: false,
        filter: false,
        cellRenderer: (p: any) => (
          <button
            className="text-gray-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              deleteTodMut.mutate({
                dnId,
                snrId: selectedSnr!.snrId,
                todId: p.data.snrTodId,
              });
            }}
          >
            <Trash2 size={14} />
          </button>
        ),
      },
    ],
    [deleteTodMut, dnId, selectedSnr],
  );

  // ── handlers ──
  const handleNewSnr = () => {
    if (snrList.length >= MAX_SNR) {
      toast.warning(`SNR은 DN당 최대 ${MAX_SNR}개까지 등록 가능합니다`);
      return;
    }
    setEditingSnr(null);
    setSnrDrawerOpen(true);
  };

  const handleSaveSnr = async () => {
    const values = await form.validateFields();
    if (editingSnr) {
      updateSnrMut.mutate({ dnId, snrId: editingSnr.snrId, data: values });
    } else {
      createSnrMut.mutate({ dnId, data: values });
    }
  };

  const handleOpenTod = (tod: DnSnrTodResponse | null) => {
    if (!selectedSnr) {
      toast.warning('SNR을 먼저 선택하세요');
      return;
    }
    if (!tod && todList.length >= MAX_TOD) {
      toast.warning(`스케줄은 SNR당 최대 ${MAX_TOD}개까지 등록 가능합니다`);
      return;
    }
    setEditingTod(tod);
    if (tod) {
      todForm.setFieldsValue({
        callType: tod.callType ?? 3,
        weekdayChecked: (tod.weekdayByte ?? '00000000').split('').map((c) => c === '1'),
        startTime: tod.startTime?.length === 4 ? dayjs(tod.startTime, 'HHmm') : dayjs('0000', 'HHmm'),
        finshTime: tod.finshTime?.length === 4 ? dayjs(tod.finshTime, 'HHmm') : dayjs('0000', 'HHmm'),
        activeYn: tod.activeYn ?? 1,
      });
    } else {
      todForm.resetFields();
      todForm.setFieldsValue({
        callType: 3, // AS-IS 기본값 (selectIndex:2 → '내부/외부')
        weekdayChecked: [false, false, false, false, false, false, false, false],
        startTime: dayjs('0000', 'HHmm'),
        finshTime: dayjs('0000', 'HHmm'),
        activeYn: 1,
      });
    }
    setTodDrawerOpen(true);
  };

  // ── 번호 패턴 Drawer 핸들러 ──
  const handleOpenPatternDrawer = useCallback(() => {
    setPatternDrawerOpen(true);
    numPatternDrawerRef.current?.open();
  }, []);

  const handlePatternSelect = useCallback(
    (pattern: NumPattern) => {
      form.setFieldsValue({ allowPtn: pattern.numPattern });
      setPatternDrawerOpen(false);
    },
    [form],
  );

  const handlePatternDrawerClose = useCallback(() => {
    setPatternDrawerOpen(false);
  }, []);

  const handleSaveTod = async () => {
    if (!selectedSnr) return;
    const v = await todForm.validateFields();
    const weekdayByte = (v.weekdayChecked as boolean[]).map((b) => (b ? '1' : '0')).join('');
    const body: DnSnrTodRequest = {
      callType: v.callType,
      weekdayByte,
      startTime: (v.startTime as Dayjs).format('HHmm'),
      finshTime: (v.finshTime as Dayjs).format('HHmm'),
      activeYn: v.activeYn,
    };
    if (editingTod) {
      updateTodMut.mutate({
        dnId,
        snrId: selectedSnr.snrId,
        todId: editingTod.snrTodId,
        data: body,
      });
    } else {
      createTodMut.mutate({ dnId, snrId: selectedSnr.snrId, data: body });
    }
  };

  const isEditSnr = editingSnr != null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          SNR (순차 호출)
          <span className="ml-2 text-xs text-gray-400">
            {snrList.length} / {MAX_SNR}
          </span>
        </h4>
        <Button type="primary" icon={<Plus size={14} />} onClick={handleNewSnr} disabled={snrList.length >= MAX_SNR}>
          새 SNR
        </Button>
      </div>

      {/* SNR 카드 목록 (최대 4장) */}
      <div className="flex flex-wrap gap-3">
        {snrList.map((snr) => {
          const isActive = selectedSnr?.snrId === snr.snrId;
          return (
            <div
              key={snr.snrId}
              onClick={() => setSelectedSnr(snr)}
              onDoubleClick={() => {
                setEditingSnr(snr);
                setSnrDrawerOpen(true);
              }}
              className={`w-[280px] bg-white border rounded-lg p-3.5 flex flex-col transition cursor-pointer ${
                isActive ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-800 truncate">{snr.remoteNum}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{snr.remoteNumType === 1 ? '이동전화' : '일반'}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Tooltip title="수정">
                    <button
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSnr(snr);
                        setSnrDrawerOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip title="이 SNR의 스케줄 선택">
                    <button
                      className="p-1 text-gray-400 hover:text-[#405189] hover:bg-blue-50 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSnr(snr);
                      }}
                    >
                      <CalendarClock size={14} />
                    </button>
                  </Tooltip>
                  <Tooltip title="삭제">
                    <button
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        Modal.confirm({
                          title: 'SNR 삭제',
                          content: '하위 시간대 규칙(TOD)도 함께 삭제됩니다. 진행하시겠습니까?',
                          okType: 'danger',
                          onOk: () => deleteSnrMut.mutate({ dnId, snrId: snr.snrId }),
                        });
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </Tooltip>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                <Tag color={snr.activeYn === 1 ? 'blue' : 'default'}>{snr.activeYn === 1 ? '활성' : '비활성'}</Tag>
                <Tag color={snr.allowOpt === 1 ? 'green' : 'red'}>{snr.allowOpt === 1 ? '허용' : '금지'}</Tag>
              </div>
              {snr.allowPtn && (
                <div className="text-[11px] text-gray-500 mb-1 truncate">
                  ANI 패턴: <span className="text-gray-700">{snr.allowPtn}</span>
                </div>
              )}
              {snr.snrDesc && (
                <div className="text-[11px] text-gray-500 truncate" title={snr.snrDesc}>
                  {snr.snrDesc}
                </div>
              )}
            </div>
          );
        })}

        {/* 빈 카드 (추가 버튼) — 최대 4개 미만일 때만 */}
        {snrList.length < MAX_SNR && (
          <button
            onClick={handleNewSnr}
            className="w-[280px] min-h-[130px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#405189] hover:text-[#405189] hover:bg-blue-50/30 transition"
          >
            <Plus size={20} />
            <span className="text-xs">새 SNR 추가</span>
          </button>
        )}

        {snrList.length === 0 && <div className="w-full text-xs text-gray-400 mt-2">등록된 SNR이 없습니다. 좌측 카드를 클릭해서 새 SNR을 추가하세요.</div>}
      </div>

      {/* ─── 스케줄 그리드 (선택된 SNR의 TOD 목록) ─────────────────── */}
      <div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-semibold text-gray-700">시간대 스케줄</h5>
            {selectedSnr ? (
              <span className="text-xs text-gray-500">
                SNR <span className="font-medium text-gray-700">{selectedSnr.remoteNum}</span>
                <span className="ml-2 text-gray-400">
                  {todList.length} / {MAX_TOD}
                </span>
              </span>
            ) : (
              <span className="text-xs text-gray-400">SNR 카드를 선택하세요</span>
            )}
          </div>
          <Button type="primary" icon={<Plus size={14} />} onClick={() => handleOpenTod(null)} disabled={!selectedSnr || todList.length >= MAX_TOD}>
            규칙 추가
          </Button>
        </div>
        <div className="ag-theme-alpine" style={{ height: 240, width: '100%' }}>
          <AgGridReact<DnSnrTodResponse>
            {...gridOptions}
            pagination={false}
            suppressPaginationPanel
            statusBar={undefined}
            rowData={todList}
            columnDefs={todColumns}
            defaultColDef={{ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: true }}
            onRowDoubleClicked={(e) => e.data && handleOpenTod(e.data)}
          />
        </div>
      </div>

      {/* ─── SNR 편집 Drawer ─────────────────────────────────────────── */}
      <Drawer
        title={isEditSnr ? `SNR 수정 — ${editingSnr!.remoteNum}` : '새 SNR 등록'}
        open={snrDrawerOpen}
        onClose={() => setSnrDrawerOpen(false)}
        placement="right"
        styles={{ wrapper: { width: 560, display: patternDrawerOpen ? 'none' : undefined } }}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSnrDrawerOpen(false)}>취소</Button>
            <Button type="primary" onClick={handleSaveSnr} loading={createSnrMut.isPending || updateSnrMut.isPending}>
              {isEditSnr ? '수정' : '등록'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" initialValues={DN_SNR_INITIAL_VALUES}>
          <Form.Item
            label="착신번호"
            name="remoteNum"
            rules={[
              { required: true, message: '착신번호는 필수입니다' },
              { max: 48, message: '48자 이내' },
            ]}
          >
            <Input placeholder="착신번호 입력" maxLength={48} />
          </Form.Item>

          <div className="grid grid-cols-3 gap-3">
            <Form.Item label="활성화" name="activeYn" valuePropName="checked" getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}>
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
            <Form.Item label="이동전화" name="remoteNumType" valuePropName="checked" getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}>
              <Switch checkedChildren="모바일" unCheckedChildren="일반" />
            </Form.Item>
            <Form.Item label="착신 허용" name="allowOpt" valuePropName="checked" getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}>
              <Switch checkedChildren="허용" unCheckedChildren="금지" />
            </Form.Item>
          </div>

          {/* ringWait/ringDur: AS-IS 미지원 필드 — UI 노출 없이 DB 기본값(0) 저장 */}
          <Form.Item name="ringWait" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name="ringDur" hidden>
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="allowPtn"
            label={
              <div className="flex items-center gap-1">
                <span>ANI 패턴</span>
                <Button
                  type="text"
                  size="small"
                  icon={<List className="size-3.5" />}
                  onClick={handleOpenPatternDrawer}
                  title="번호 패턴 관리"
                  className="text-gray-400 hover:text-blue-500"
                />
              </div>
            }
            rules={[{ max: 256, message: '256자 이내' }]}
            extra="발신번호가 이 패턴과 매치될 때만 동작 (선택)"
          >
            <Input placeholder="예: 010* / 02-*" maxLength={256} style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item label="설명" name="snrDesc" rules={[{ max: 128, message: '128자 이내' }]}>
            <Input placeholder="메모" maxLength={128} />
          </Form.Item>
        </Form>
      </Drawer>

      <NumPatternDrawer ref={numPatternDrawerRef} onSelect={handlePatternSelect} onClose={handlePatternDrawerClose} />

      {/* ─── 스케줄 규칙(TOD) 편집 Drawer — 규칙 추가/수정 전용 ─── */}
      <Drawer
        title={editingTod ? '스케줄 규칙 수정' : '스케줄 규칙 등록'}
        open={todDrawerOpen}
        onClose={() => setTodDrawerOpen(false)}
        width={480}
        placement="right"
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setTodDrawerOpen(false)}>취소</Button>
            <Button type="primary" onClick={handleSaveTod} loading={createTodMut.isPending || updateTodMut.isPending}>
              {editingTod ? '수정' : '등록'}
            </Button>
          </div>
        }
      >
        <Form form={todForm} layout="vertical">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="활성화" name="activeYn" valuePropName="checked" getValueFromEvent={(checked: boolean) => (checked ? 1 : 0)}>
              <Switch checkedChildren="ON" unCheckedChildren="OFF" />
            </Form.Item>
            <Form.Item label="콜 종류" name="callType">
              <Select options={CALL_TYPE_OPTIONS} />
            </Form.Item>
          </div>
          <Form.Item label="요일" required>
            <Form.Item name={['weekdayChecked']} noStyle>
              <WeekdayCheckbox />
            </Form.Item>
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item label="시작 시간" name="startTime">
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="끝 시간" name="finshTime">
              <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

// ─── WeekdayCheckbox (월~휴일 8개 토글) ───────────────────────────────────
function WeekdayCheckbox({ value = [], onChange }: { value?: boolean[]; onChange?: (v: boolean[]) => void }) {
  const arr = value.length === 8 ? value : [false, false, false, false, false, false, false, false];
  const toggle = (i: number) => {
    const next = [...arr];
    next[i] = !next[i];
    onChange?.(next);
  };
  return (
    <div className="flex gap-1">
      {WEEKDAY_LABELS.map((label, i) => (
        <button
          key={label}
          type="button"
          className={`px-2.5 py-1 text-xs rounded border transition ${
            arr[i] ? 'bg-[#405189] border-[#405189] text-white' : 'bg-white border-gray-300 text-gray-600 hover:border-[#c5cbe0]'
          }`}
          onClick={() => toggle(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
