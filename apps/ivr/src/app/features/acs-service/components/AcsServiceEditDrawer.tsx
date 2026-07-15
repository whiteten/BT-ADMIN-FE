/**
 * ACS 서비스 기본정보 수정 Drawer (AS-IS popupAcsServiceMaster).
 *
 * <p>등록은 없다 — 시나리오 관리에서 ACS 시나리오(20/70) 등록 시 자동 생성.</p>
 * <p>ACS 기간(시작~종료일자)은 스케줄링 제어 타입이 기간제어(1)일 때만 의미가 있어
 * 기간제어 선택 시에만 입력 가능하며, 미사용 저장 시 일자는 비운다.</p>
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Radio } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { toast } from '@/shared-util';
import { acsServiceQueryKeys, useUpdateAcsService } from '../hooks/useAcsServiceQueries';
import type { AcsService } from '../types/acsService.types';

interface FormValues {
  acsServiceName: string;
  dupYn: number;
  maxObReqCnt: number;
  controlType: number;
  period?: [Dayjs, Dayjs] | null;
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
  const isPeriodControl = controlType === 1;

  useImperativeHandle(ref, () => ({
    openEdit: (acs) => {
      form.resetFields();
      form.setFieldsValue({
        acsServiceName: acs.acsServiceName,
        dupYn: acs.dupYn,
        maxObReqCnt: acs.maxObReqCnt,
        controlType: acs.controlType,
        period: acs.startDate && acs.finishDate ? [dayjs(acs.startDate), dayjs(acs.finishDate)] : undefined,
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
    // 기간제어일 때만 일자 저장 — 미사용이면 의미 없는 값이라 비운다
    const usePeriod = values.controlType === 1;
    if (usePeriod && !values.period) {
      toast.error('기간제어 사용 시 ACS 기간은 필수입니다.');
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
          startDate: usePeriod && values.period ? values.period[0].format('YYYY-MM-DD') : null,
          finishDate: usePeriod && values.period ? values.period[1].format('YYYY-MM-DD') : null,
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
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
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
          name="period"
          label="ACS 기간 (시작 ~ 종료일자)"
          required={isPeriodControl}
          rules={isPeriodControl ? [{ required: true, message: '기간제어 사용 시 ACS 기간은 필수입니다' }] : []}
          extra={isPeriodControl ? undefined : '기간제어 선택 시에만 입력할 수 있습니다'}
        >
          <DatePicker.RangePicker className="!w-full" disabled={!isPeriodControl} />
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
