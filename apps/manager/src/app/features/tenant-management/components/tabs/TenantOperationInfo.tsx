import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, InputNumber, Radio, Row, Select, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { tenantQueryKeys, useGetTenant, useUpdateTenant } from '../../hooks/useTenantQueries';
import { STAT_TYPE_LABELS, type TenantUpdateData } from '../../types/tenant.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const statTypeOptions = Object.entries(STAT_TYPE_LABELS).map(([value, label]) => ({
  label,
  value: Number(value),
}));

export default function TenantOperationInfo() {
  const { tenantId } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: tenant, isFetching } = useGetTenant({ params: { id: tenantId } });

  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('운영 설정이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.getTenant({ id: tenantId }).queryKey });
      },
    },
  });

  const onFinish: FormProps<TenantUpdateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const formData = { ...values } as Record<string, unknown>;
    const dashInitTime = formData.dashInitTime as dayjs.Dayjs | null;
    if (dashInitTime) {
      formData.dashInitHour = dashInitTime.format('HH');
      formData.dashInitMinute = dashInitTime.format('mm');
    }
    delete formData.dashInitTime;
    updateTenant({ id: Number(tenantId), data: formData as unknown as TenantUpdateData });
  };

  const onFinishFailed: FormProps<TenantUpdateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!tenant) return;
    const hour = tenant.dashInitHour ?? '01';
    const minute = tenant.dashInitMinute ?? '00';
    form.setFieldsValue({
      dashInitTime: dayjs(`${hour}:${minute}`, 'HH:mm'),
      custTalkMax: tenant.custTalkMax,
      statType: tenant.statType,
      accQwaittimeUseYn: tenant.accQwaittimeUseYn,
      ivrQwaittimeUseYn: tenant.ivrQwaittimeUseYn,
    });
  }, [tenant, form]);

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="dashInitTime" label="CTI 모니터링 초기화">
                <TimePicker format="HH:mm" className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="custTalkMax"
                label="고객 동시 Talk 상담수"
                required
                rules={[
                  { required: true, message: '동시 Talk 상담수는 필수입니다.' },
                  { type: 'number', min: 0, message: '0 이상이어야 합니다.' },
                  { type: 'number', max: 99, message: '99 이내여야 합니다.' },
                ]}
              >
                <InputNumber min={0} max={99} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="statType" label="통계 집계 옵션" required rules={[{ required: true, message: '통계 집계 옵션은 필수입니다.' }]}>
                <Select options={statTypeOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="accQwaittimeUseYn" label="큐 누적 대기시간">
                <Radio.Group>
                  <Radio value={1}>활성</Radio>
                  <Radio value={0}>비활성</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="ivrQwaittimeUseYn" label="IVR 전환 대기시간 포함">
                <Radio.Group>
                  <Radio value={1}>활성</Radio>
                  <Radio value={0}>비활성</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
