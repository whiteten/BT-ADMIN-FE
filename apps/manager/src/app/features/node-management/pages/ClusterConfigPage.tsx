import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Radio, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetNode } from '../hooks/useNodeQueries';
import { tenantAllocQueryKeys, useGetClusterConfig, useUpdateClusterConfig } from '../hooks/useTenantAllocQueries';
import type { ClusterConfigUpdateData } from '../types/node.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';

export default function ClusterConfigPage() {
  const { nodeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: node } = useGetNode({ params: { nodeId } });
  const { data: config, isFetching } = useGetClusterConfig({
    params: { nodeId },
    queryOptions: { enabled: !!nodeId },
  });

  const iePassiveDr = Form.useWatch('iePassiveDr', form);
  const icPassiveDr = Form.useWatch('icPassiveDr', form);

  const { mutate: updateConfig, isPending } = useUpdateClusterConfig({
    mutationOptions: {
      onSuccess: () => {
        toast.success('클러스터 설정이 저장되었습니다.');
        setIsEditMode(false);
        queryClient.invalidateQueries({ queryKey: tenantAllocQueryKeys.getClusterConfig({ nodeId }).queryKey });
      },
    },
  });

  const onFinish: FormProps<ClusterConfigUpdateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateConfig({ nodeId: Number(nodeId), data: values });
  };

  const onFinishFailed: FormProps<ClusterConfigUpdateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!config) return;
    form.setFieldsValue({
      ieSvcIp: config.ieSvcIp,
      ieAsideIp: config.ieAsideIp,
      ieBsideIp: config.ieBsideIp,
      iePassiveDr: config.iePassiveDr ?? 0,
      ieForceDr: config.ieForceDr ?? 0,
      icAsideIp: config.icAsideIp,
      icBsideIp: config.icBsideIp,
      icPassiveDr: config.icPassiveDr ?? 0,
      icForceDr: config.icForceDr ?? 0,
      gsPrimaryAsideIp: config.gsPrimaryAsideIp,
      gsPrimaryBsideIp: config.gsPrimaryBsideIp,
      gsSecondAsideIp: config.gsSecondAsideIp,
      gsSecondBsideIp: config.gsSecondBsideIp,
      diPrimaryAsideIp: config.diPrimaryAsideIp,
      diPrimaryBsideIp: config.diPrimaryBsideIp,
      diSecondAsideIp: config.diSecondAsideIp,
      diSecondBsideIp: config.diSecondBsideIp,
    });
  }, [config, form]);

  const breadcrumb: BreadcrumbProps['items'] = [
    { title: '시스템' },
    { title: '자원관리' },
    { title: '클러스터 관리', href: '../list' },
    { title: node?.nodeName ?? '-' },
    { title: '클러스터 설정' },
  ];

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="w-full flex-1 min-h-0 bg-white bt-shadow overflow-y-auto">
        {isFetching ? (
          <div className="flex items-center justify-center w-full h-full">
            <FallbackSpinner />
          </div>
        ) : (
          <div className="p-7">
            <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
              {/* IE 설정 */}
              <div className="text-base font-semibold text-gray-800 mb-4">IE 설정</div>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="ieSvcIp" label="IE SVC IP">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="ieAsideIp" label="IE A Side IP">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="ieBsideIp" label="IE B Side IP">
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="iePassiveDr" label="Passive DR">
                    <Radio.Group disabled={!isEditMode}>
                      <Radio value={1}>설정</Radio>
                      <Radio value={0}>해제</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="ieForceDr" label="Force DR">
                    <Radio.Group disabled={!isEditMode || iePassiveDr !== 1}>
                      <Radio value={1}>DR</Radio>
                      <Radio value={0}>정상</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <div className="border-t border-gray-200 my-6" />

              {/* IC 설정 */}
              <div className="text-base font-semibold text-gray-800 mb-4">IC 설정</div>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="icAsideIp" label="IC A Side IP">
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="icBsideIp" label="IC B Side IP">
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="icPassiveDr" label="Passive DR">
                    <Radio.Group disabled={!isEditMode}>
                      <Radio value={1}>설정</Radio>
                      <Radio value={0}>해제</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="icForceDr" label="Force DR">
                    <Radio.Group disabled={!isEditMode || icPassiveDr !== 1}>
                      <Radio value={1}>DR</Radio>
                      <Radio value={0}>정상</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <div className="border-t border-gray-200 my-6" />

              {/* GS 설정 */}
              <div className="text-base font-semibold text-gray-800 mb-4">GS 설정</div>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="gsPrimaryAsideIp" label="Primary A Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="gsPrimaryBsideIp" label="Primary B Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="gsSecondAsideIp" label="Second A Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="gsSecondBsideIp" label="Second B Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
              </Row>

              <div className="border-t border-gray-200 my-6" />

              {/* DI 설정 */}
              <div className="text-base font-semibold text-gray-800 mb-4">DI 설정</div>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="diPrimaryAsideIp" label="Primary A Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="diPrimaryBsideIp" label="Primary B Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={6}>
                  <Form.Item name="diSecondAsideIp" label="Second A Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="diSecondBsideIp" label="Second B Side IP" rules={[{ max: 40, message: '40자 이내여야 합니다.' }]}>
                    <Input disabled={!isEditMode} placeholder="0.0.0.0" maxLength={40} />
                  </Form.Item>
                </Col>
              </Row>

              {/* Footer */}
              <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7 pt-4">
                <Col>
                  <Button variant="solid" onClick={() => navigate(`../list`)}>
                    뒤로
                  </Button>
                </Col>
                {!isEditMode ? (
                  <Col>
                    <Button color="primary" variant="solid" onClick={() => setIsEditMode(true)}>
                      수정
                    </Button>
                  </Col>
                ) : (
                  <>
                    <Col>
                      <Button variant="solid" onClick={() => setIsEditMode(false)}>
                        취소
                      </Button>
                    </Col>
                    <Col>
                      <Button color="primary" variant="solid" htmlType="submit" loading={isPending}>
                        저장
                      </Button>
                    </Col>
                  </>
                )}
              </Row>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
