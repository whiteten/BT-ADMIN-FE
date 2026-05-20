import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Divider, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { tenantQueryKeys, useGetTenant, useUpdateTenant } from '../../hooks/useTenantQueries';
import type { TenantUpdateData } from '../../types/tenant.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const contractStatusOptions = [
  { label: '요청', value: '1' },
  { label: '계약', value: '2' },
  { label: '정지', value: '3' },
  { label: '해지', value: '9' },
];

export default function TenantContractInfo() {
  const { tenantId } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: tenant, isFetching } = useGetTenant({ params: { id: tenantId } });

  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('계약사항이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: tenantQueryKeys.getTenant({ id: tenantId }).queryKey });
      },
    },
  });

  const onFinish: FormProps<TenantUpdateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateTenant({ id: Number(tenantId), data: values });
  };

  const onFinishFailed: FormProps<TenantUpdateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!tenant) return;
    form.setFieldsValue({
      contractStartDate: tenant.contractStartDate,
      contractFinshDate: tenant.contractFinshDate,
      contractMonth: tenant.contractMonth,
      contractStatus: tenant.contractStatus,
      maxCoAmount: tenant.maxCoAmount,
      maxExtAmount: tenant.maxExtAmount,
      didLicAmount: tenant.didLicAmount,
      dodLicAmount: tenant.dodLicAmount,
      maxCtiAmount: tenant.maxCtiAmount,
      maxArsAmount: tenant.maxArsAmount,
      maxVlcAmount: tenant.maxVlcAmount,
      maxEmsAmount: tenant.maxEmsAmount,
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
              <Form.Item name="contractStartDate" label="계약일자">
                <Input type="date" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="contractFinshDate" label="만료일자">
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item
                name="contractMonth"
                label="계약기간 (개월)"
                rules={[
                  { type: 'number', min: 1, message: '1개월 이상이어야 합니다.' },
                  { type: 'number', max: 9999, message: '9999개월 이내여야 합니다.' },
                ]}
              >
                <InputNumber min={1} max={9999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="contractStatus" label="계약상태">
                <Select options={contractStatusOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Divider className="!my-4" />
          <div className="text-sm font-semibold text-[#495057] mb-4">계약 수량</div>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="maxCoAmount" label="최대 국선수">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="maxExtAmount" label="최대 내선수">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="didLicAmount" label="계약 DID">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="dodLicAmount" label="계약 DOD">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="maxCtiAmount" label="CTI수">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="maxArsAmount" label="최대 ARS">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="maxVlcAmount" label="녹취수량">
                <InputNumber min={0} max={999999} className="!w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="maxEmsAmount" label="최대 운영자">
                <InputNumber min={0} max={999999} className="!w-full" />
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
