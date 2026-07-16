/**
 * 시나리오 메뉴 제어 등록/수정 Drawer (AS-IS IPR30S3035_01 팝업).
 * forwardRef + useImperativeHandle 패턴.
 *
 * 서비스제어(없음/블럭제어/공지제어)는 activateYn+serviceStatus+nextType 조합을 화면에서
 * 편하게 고르는 편의 선택값 — 저장 값은 아니고 선택 시 하위 필드에 반영한다
 * (AS-IS IPR30S3035_01.jsp p1SvcControl과 동일 역할).
 */
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Checkbox, DatePicker, Drawer, Form, Input, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from '@/shared-util';
import { useGetMentFiles } from '../../mentfile/hooks/useMentFileQueries';
import { useUpdateScenarioMenuControl } from '../hooks/useScenarioMenuControlQueries';
import {
  SCENARIO_MENU_CONTROL_KIND,
  SCENARIO_MENU_CONTROL_KIND_LABELS,
  SCENARIO_MENU_DATE_TYPE,
  SCENARIO_MENU_DATE_TYPE_LABELS,
  SCENARIO_MENU_MENT_TYPE,
  SCENARIO_MENU_MENT_TYPE_LABELS,
  SCENARIO_MENU_NEXT_TYPE,
  SCENARIO_MENU_NEXT_TYPE_LABELS,
  type ScenarioMenuControlKind,
  type ScenarioMenuControlRow,
  getScenarioMenuControlKind,
} from '../types';

// customParseFormat 미등록 시 dayjs(str, format)이 format을 무시하고 네이티브 Date 파싱으로 폴백해
// "1100"/"0000" 같은 포맷 문자열을 엉뚱한 연도로 잘못 해석한다(START_TIME/FINSH_TIME parsing 버그의 원인).
dayjs.extend(customParseFormat);

export interface ScenarioMenuControlDrawerRef {
  open: (row: ScenarioMenuControlRow) => void;
  close: () => void;
}

interface Props {
  serviceId: number | null;
  serviceVer: string | null;
  /** "이동할 메뉴" 선택지 — 현재 그리드에 로드된 메뉴 목록(자기 자신 제외는 open 시점에 처리). */
  menuRows: ScenarioMenuControlRow[];
  onSuccess: () => void;
}

const WEEKDAY_OPTIONS = [
  { label: '일', value: '1' },
  { label: '월', value: '2' },
  { label: '화', value: '3' },
  { label: '수', value: '4' },
  { label: '목', value: '5' },
  { label: '금', value: '6' },
  { label: '토', value: '7' },
];

const CONTROL_KIND_OPTIONS = [
  { label: SCENARIO_MENU_CONTROL_KIND_LABELS[SCENARIO_MENU_CONTROL_KIND.NONE], value: SCENARIO_MENU_CONTROL_KIND.NONE },
  { label: SCENARIO_MENU_CONTROL_KIND_LABELS[SCENARIO_MENU_CONTROL_KIND.BLOCK], value: SCENARIO_MENU_CONTROL_KIND.BLOCK },
  { label: SCENARIO_MENU_CONTROL_KIND_LABELS[SCENARIO_MENU_CONTROL_KIND.NOTICE], value: SCENARIO_MENU_CONTROL_KIND.NOTICE },
];

const DATE_TYPE_OPTIONS = Object.entries(SCENARIO_MENU_DATE_TYPE_LABELS).map(([value, label]) => ({ label, value: Number(value) }));
const NEXT_TYPE_OPTIONS = Object.entries(SCENARIO_MENU_NEXT_TYPE_LABELS).map(([value, label]) => ({ label, value: Number(value) }));
const MENT_TYPE_OPTIONS = Object.entries(SCENARIO_MENU_MENT_TYPE_LABELS).map(([value, label]) => ({ label, value: Number(value) }));

/**
 * START_TIME/FINSH_TIME 방어 파싱 — 레거시 원본 데이터는 "HHmm"(콜론 없음, 예: "1100")로 저장돼 있고,
 * 이 화면에서 저장한 값은 "HH:mm"(예: "11:00", 콜론이 있으면 뒤에 ":ss"가 붙어 있어도 무시하고 시:분만 읽는다)라
 * 두 포맷이 공존한다. 값이 없으면 00:00.
 */
function parseControlTime(value?: string | null) {
  if (!value) return dayjs('0000', 'HHmm');
  const parsed = dayjs(value, value.includes(':') ? 'HH:mm' : 'HHmm');
  return parsed.isValid() ? parsed : dayjs('0000', 'HHmm');
}

const ScenarioMenuControlDrawer = forwardRef<ScenarioMenuControlDrawerRef, Props>(({ serviceId, serviceVer, menuRows, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editRow, setEditRow] = useState<ScenarioMenuControlRow | null>(null);

  const dateType = Form.useWatch('dateType', form);
  const nextType = Form.useWatch('nextType', form);

  useImperativeHandle(ref, () => ({
    open: (row: ScenarioMenuControlRow) => {
      setEditRow(row);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { data: mentFiles = [] } = useGetMentFiles({ queryOptions: { enabled: visible } });

  useEffect(() => {
    if (!visible || !editRow) return;
    const kind = getScenarioMenuControlKind(editRow);
    form.setFieldsValue({
      controlKind: kind,
      activateYn: editRow.activateYn ?? 0,
      serviceStatus: editRow.serviceStatus ?? 0,
      startDate: editRow.startDate ? dayjs(editRow.startDate) : dayjs(),
      finshDate: editRow.finshDate ? dayjs(editRow.finshDate) : dayjs(),
      startTime: parseControlTime(editRow.startTime),
      finshTime: parseControlTime(editRow.finshTime),
      dateType: editRow.dateType ?? SCENARIO_MENU_DATE_TYPE.ALWAYS,
      dateList: editRow.dateList ?? '',
      specificDay: editRow.dateType === SCENARIO_MENU_DATE_TYPE.SPECIFIC_DAY && editRow.dateList ? dayjs(editRow.dateList) : null,
      specificWeekday: editRow.dateType === SCENARIO_MENU_DATE_TYPE.SPECIFIC_WEEKDAY && editRow.dateList ? editRow.dateList.split(',') : [],
      mentType: editRow.mentType ?? SCENARIO_MENU_MENT_TYPE.MENT_ID,
      serviceMent: editRow.serviceMent ?? undefined,
      serviceMentDesc: editRow.serviceMentDesc ?? '',
      mentPlaySt: editRow.mentPlaySt === 1,
      mentPlayEt: editRow.mentPlayEt === 1,
      mentPlayPp: editRow.mentPlayPp === 1,
      nextType: editRow.nextType ?? SCENARIO_MENU_NEXT_TYPE.END,
      userMenuId: editRow.userMenuId ?? undefined,
    });
  }, [visible, editRow, form]);

  const handleControlKindChange = (kind: ScenarioMenuControlKind) => {
    if (kind === SCENARIO_MENU_CONTROL_KIND.NONE) {
      form.setFieldsValue({ activateYn: 0, serviceStatus: 0 });
    } else if (kind === SCENARIO_MENU_CONTROL_KIND.BLOCK) {
      form.setFieldsValue({ activateYn: 1, serviceStatus: 0 });
    } else {
      form.setFieldsValue({ activateYn: 1, serviceStatus: 1, nextType: SCENARIO_MENU_NEXT_TYPE.NEXT });
    }
  };

  const { mutate: updateControl, isPending } = useUpdateScenarioMenuControl({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오 메뉴 제어가 저장되었습니다.');
        setVisible(false);
        onSuccess();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '저장에 실패했습니다.'),
    },
  });

  const handleClose = () => setVisible(false);

  const handleSubmit = async () => {
    if (!serviceId || !serviceVer || !editRow) return;
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const dateTypeValue = values.dateType as number;
    let dateList: string | null = null;
    if (dateTypeValue === SCENARIO_MENU_DATE_TYPE.SPECIFIC_DAY) {
      dateList = values.specificDay ? (values.specificDay as dayjs.Dayjs).format('YYYY-MM-DD') : null;
    } else if (dateTypeValue === SCENARIO_MENU_DATE_TYPE.SPECIFIC_WEEKDAY) {
      dateList = Array.isArray(values.specificWeekday) ? (values.specificWeekday as string[]).join(',') : null;
    }

    updateControl({
      serviceId,
      serviceVer,
      menuId: editRow.menuId,
      data: {
        activateYn: values.activateYn as number,
        serviceStatus: values.serviceStatus as number,
        startDate: values.startDate ? (values.startDate as dayjs.Dayjs).format('YYYYMMDD') : null,
        finshDate: values.finshDate ? (values.finshDate as dayjs.Dayjs).format('YYYYMMDD') : null,
        startTime: values.startTime ? (values.startTime as dayjs.Dayjs).format('HHmm') : null,
        finshTime: values.finshTime ? (values.finshTime as dayjs.Dayjs).format('HHmm') : null,
        dateType: dateTypeValue,
        dateList,
        mentType: (values.mentType as number) ?? null,
        serviceMent: (values.serviceMent as string) ?? null,
        serviceMentDesc: (values.serviceMentDesc as string) || null,
        mentPlaySt: values.mentPlaySt ? 1 : 0,
        mentPlayEt: values.mentPlayEt ? 1 : 0,
        mentPlayPp: values.mentPlayPp ? 1 : 0,
        nextType: values.nextType as number,
        userMenuId: (values.userMenuId as string) ?? null,
      },
    });
  };

  const menuOptions = menuRows.filter((m) => m.menuId !== editRow?.menuId).map((m) => ({ label: `${m.menuName ?? m.menuId} (${m.menuId})`, value: m.menuId }));

  return (
    <Drawer
      title={editRow ? `시나리오 메뉴 제어 — ${editRow.menuName ?? editRow.menuId}` : '시나리오 메뉴 제어'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 480 } }}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="controlKind" label="서비스제어">
          <Select options={CONTROL_KIND_OPTIONS} onChange={handleControlKindChange} />
        </Form.Item>
        <Form.Item name="activateYn" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="serviceStatus" hidden>
          <Input />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-3">
          <Form.Item name="startDate" label="시작일자">
            <DatePicker className="!w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="finshDate" label="종료일자">
            <DatePicker className="!w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="startTime" label="시작시간">
            <TimePicker className="!w-full" format="HH:mm" needConfirm={false} />
          </Form.Item>
          <Form.Item name="finshTime" label="종료시간">
            <TimePicker className="!w-full" format="HH:mm" needConfirm={false} />
          </Form.Item>
        </div>

        <Form.Item name="dateType" label="적용일자타입" required rules={[{ required: true, message: '적용일자타입은 필수입니다' }]}>
          <Select options={DATE_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="specificDay" label="특정일" extra={dateType !== SCENARIO_MENU_DATE_TYPE.SPECIFIC_DAY ? "적용일자타입이 '특정일'일 때만 사용" : undefined}>
          <DatePicker className="!w-full" format="YYYY-MM-DD" disabled={dateType !== SCENARIO_MENU_DATE_TYPE.SPECIFIC_DAY} />
        </Form.Item>
        <Form.Item name="specificWeekday" label="특정요일" extra={dateType !== SCENARIO_MENU_DATE_TYPE.SPECIFIC_WEEKDAY ? "적용일자타입이 '특정요일'일 때만 사용" : undefined}>
          <Checkbox.Group options={WEEKDAY_OPTIONS} disabled={dateType !== SCENARIO_MENU_DATE_TYPE.SPECIFIC_WEEKDAY} />
        </Form.Item>

        <Form.Item name="mentType" label="멘트종류">
          <Select options={MENT_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item name="serviceMent" label="안내멘트">
          <Select allowClear showSearch optionFilterProp="label" options={mentFiles.map((m) => ({ label: m.mentName, value: String(m.mentfileId) }))} placeholder="선택하세요" />
        </Form.Item>
        <Form.Item name="serviceMentDesc" label="멘트설명">
          <Input.TextArea rows={2} maxLength={200} showCount />
        </Form.Item>

        <div className="flex items-center gap-4">
          <Form.Item name="mentPlaySt" valuePropName="checked" className="!mb-0">
            <Checkbox>송출멘트 ST</Checkbox>
          </Form.Item>
          <Form.Item name="mentPlayEt" valuePropName="checked" className="!mb-0">
            <Checkbox>송출멘트 ET</Checkbox>
          </Form.Item>
          <Form.Item name="mentPlayPp" valuePropName="checked" className="!mb-0">
            <Checkbox>송출멘트 PP</Checkbox>
          </Form.Item>
        </div>

        <Form.Item name="nextType" label="다음이동유형" required rules={[{ required: true, message: '다음이동유형은 필수입니다' }]} className="!mt-3">
          <Select options={NEXT_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="userMenuId"
          label="이동할 메뉴"
          required={nextType === SCENARIO_MENU_NEXT_TYPE.CUSTOM_MENU}
          rules={[{ required: nextType === SCENARIO_MENU_NEXT_TYPE.CUSTOM_MENU, message: '이동할 메뉴는 필수입니다' }]}
          extra={nextType !== SCENARIO_MENU_NEXT_TYPE.CUSTOM_MENU ? "다음이동유형이 '사용자 지정 메뉴'일 때만 사용" : undefined}
        >
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            options={menuOptions}
            disabled={nextType !== SCENARIO_MENU_NEXT_TYPE.CUSTOM_MENU}
            placeholder="이동할 메뉴를 선택하세요"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

ScenarioMenuControlDrawer.displayName = 'ScenarioMenuControlDrawer';
export default ScenarioMenuControlDrawer;
