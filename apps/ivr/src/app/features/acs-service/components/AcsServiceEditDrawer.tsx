/**
 * ACS 서비스 기본정보 수정 Drawer (AS-IS popupAcsServiceMaster).
 *
 * <p>등록은 없다 — 시나리오 관리에서 ACS 시나리오(20/70) 등록 시 자동 생성.
 * 시나리오 이름/ACS Type 은 수정 불가 (AS-IS 동일).</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Radio } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { acsServiceQueryKeys, useUpdateAcsService } from '../hooks/useAcsServiceQueries';
import { ACS_TYPE_LABELS, type AcsService } from '../types/acsService.types';

interface FormValues {
  acsServiceName: string;
  dupYn: number;
  maxObReqCnt: number;
  controlType: number;
  startDate: Dayjs | null;
  finishDate: Dayjs | null;
  useYn: number;
  acsPeriod: number;
}

export interface AcsServiceEditDrawerRef {
  openEdit: (acs: AcsService) => void;
  close: () => void;
}

const AcsServiceEditDrawer = forwardRef<AcsServiceEditDrawerRef>((_props, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<AcsService | null>(null);
  const controlType = Form.useWatch('controlType', form);

  useImperativeHandle(ref, () => ({
    openEdit: (acs) => {
      form.resetFields();
      form.setFieldsValue({
        acsServiceName: acs.acsServiceName,
        dupYn: acs.dupYn,
        maxObReqCnt: acs.maxObReqCnt,
        controlType: acs.controlType,
        startDate: acs.startDate ? dayjs(acs.startDate) : null,
        finishDate: acs.finishDate ? dayjs(acs.finishDate) : null,
        useYn: acs.useYn,
        acsPeriod: acs.acsPeriod,
      });
      setEditing(acs);
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { mutateAsync: updateAsync, isPending } = useUpdateAcsService();

  const handleSubmit = async (values: FormValues) => {
    if (!editing) return;
    if (values.controlType === 1 && (!values.startDate || !values.finishDate)) {
      toast.error('기간제어 사용 시 ACS 시작/종료일자는 필수입니다.');
      return;
    }
    if (values.startDate && values.finishDate && values.startDate.isAfter(values.finishDate, 'day')) {
      toast.error('ACS 시작일자는 종료일자보다 클 수 없습니다.');
      return;
    }
    try {
      await updateAsync({
        acsId: editing.acsId,
        data: {
          acsServiceName: values.acsServiceName,
          dupYn: values.dupYn,
          maxObReqCnt: values.maxObReqCnt,
          controlType: values.controlType,
          startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
          finishDate: values.finishDate ? values.finishDate.format('YYYY-MM-DD') : null,
          useYn: values.useYn,
          acsPeriod: values.acsPeriod,
        },
      });
      toast.success('수정되었습니다.');
      queryClient.invalidateQueries({ queryKey: acsServiceQueryKeys.getAcsServices.queryKey });
      setVisible(false);
    } catch (err) {
      toast.error(`수정 실패: ${(err as Error).message ?? '오류'}`);
    }
  };

  return (
    <Drawer
      title="ACS 서비스 수정"
      placement="right"
      styles={{ wrapper: { width: 480 } }}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isPending} onClick={() => form.submit()}>
            저장
          </Button>
        </div>
      }
    >
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
        💡 <b>시나리오 이름 / ACS Type</b> 은 시나리오 관리에 종속되어 변경할 수 없습니다 (AS-IS 동일)
      </div>
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
        <Form.Item label="시나리오 이름">
          <Input disabled value={editing?.serviceName ?? ''} />
        </Form.Item>
        <Form.Item label="ACS Type">
          <Input disabled value={editing ? (ACS_TYPE_LABELS[editing.acsType] ?? String(editing.acsType)) : ''} />
        </Form.Item>
        <Form.Item
          name="acsServiceName"
          label="ACS 서비스명"
          required
          rules={[
            { required: true, message: 'ACS 서비스명은 필수입니다' },
            { max: 100, message: '100자 이내' },
          ]}
        >
          <Input placeholder="ACS 서비스명 (최대 100자)" maxLength={100} />
        </Form.Item>
        <Form.Item name="dupYn" label="중복 실행" required rules={[{ required: true, message: '중복 실행 여부는 필수입니다' }]}>
          <Radio.Group
            options={[
              { value: 1, label: '사용' },
              { value: 0, label: '미사용' },
            ]}
          />
        </Form.Item>
        <Form.Item name="maxObReqCnt" label="최대 요청 건수" required rules={[{ required: true, message: '최대 요청 건수는 필수입니다' }]}>
          <InputNumber min={0} className="!w-full" />
        </Form.Item>
        <Form.Item name="controlType" label="스케줄링 제어 타입" required rules={[{ required: true, message: '스케줄링 제어 타입은 필수입니다' }]}>
          <Radio.Group
            options={[
              { value: 1, label: '기간제어' },
              { value: 0, label: '미사용' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="startDate"
          label="ACS 시작일자"
          required={controlType === 1}
          rules={controlType === 1 ? [{ required: true, message: '기간제어 사용 시 시작일자는 필수입니다' }] : []}
        >
          <DatePicker className="!w-full" />
        </Form.Item>
        <Form.Item
          name="finishDate"
          label="ACS 종료일자"
          required={controlType === 1}
          rules={controlType === 1 ? [{ required: true, message: '기간제어 사용 시 종료일자는 필수입니다' }] : []}
        >
          <DatePicker className="!w-full" />
        </Form.Item>
        <Form.Item name="useYn" label="ACS 사용여부" required rules={[{ required: true, message: '사용여부는 필수입니다' }]}>
          <Radio.Group
            options={[
              { value: 1, label: '사용' },
              { value: 0, label: '미사용' },
            ]}
          />
        </Form.Item>
        <Form.Item name="acsPeriod" label="ACS 동작주기" required rules={[{ required: true, message: '동작주기는 필수입니다' }]} extra="0 입력 시 동작 중지">
          <InputNumber min={0} className="!w-full" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

AcsServiceEditDrawer.displayName = 'AcsServiceEditDrawer';
export default AcsServiceEditDrawer;
