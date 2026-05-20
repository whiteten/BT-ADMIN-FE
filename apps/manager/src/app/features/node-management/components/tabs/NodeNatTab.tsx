import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { nodeQueryKeys, useGetNode, useUpdateNode } from '../../hooks/useNodeQueries';
import { NAT_OPTION_LABELS, type NodeUpdateData } from '../../types/node.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const natOptions = Object.entries(NAT_OPTION_LABELS).map(([value, label]) => ({
  label,
  value: Number(value),
}));

const enatOptions = [
  { label: '옵션1', value: 1 },
  { label: '옵션2', value: 2 },
  { label: '옵션3', value: 3 },
  { label: '옵션4', value: 4 },
];

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

export default function NodeNatTab() {
  const { nodeId } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: node, isFetching } = useGetNode({ params: { nodeId } });

  const { mutate: updateNode, isPending: isUpdating } = useUpdateNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('중개 NAT 설정이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNode({ nodeId }).queryKey });
      },
    },
  });

  const onFinish: FormProps<NodeUpdateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateNode({ id: Number(nodeId), data: values });
  };

  const onFinishFailed: FormProps<NodeUpdateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!node) return;
    form.setFieldsValue({
      natOption: node.natOption ?? 0,
      msGroupId: node.msGroupId,
      externalIpAddr: node.externalIpAddr,
      enatOption: node.enatOption,
    });
  }, [node, form]);

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
              <Form.Item name="natOption" label="RTP 중개">
                <Select options={natOptions} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="msGroupId" label="MS 그룹">
                <Input placeholder="MS 그룹 ID" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="externalIpAddr" label="외부 IP" rules={[{ max: 400, message: '외부 IP는 400자 이내여야 합니다.' }]}>
                <Input placeholder="외부 IP 주소" maxLength={400} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="enatOption" label="NAT 옵션">
                <Select options={enatOptions} allowClear placeholder="선택" />
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
