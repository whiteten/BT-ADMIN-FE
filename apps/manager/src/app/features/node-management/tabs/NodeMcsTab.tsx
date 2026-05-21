import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, InputNumber, Radio, Row, Select, Slider } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { nodeQueryKeys, useGetNode, useGetNodes, useUpdateNode } from '../hooks/useNodeQueries';
import { MCS_ROUTE_METHOD_LABELS, type NodeUpdateData } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const routeMethodOptions = Object.entries(MCS_ROUTE_METHOD_LABELS).map(([value, label]) => ({
  label,
  value: Number(value),
}));

export default function NodeMcsTab() {
  const { nodeId } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: node, isFetching } = useGetNode({ params: { nodeId } });
  const { data: nodeList } = useGetNodes();

  // 백업 노드 선택 옵션 (자기 자신 제외)
  const backupNodeOptions = (nodeList ?? []).filter((n) => n.nodeId !== Number(nodeId)).map((n) => ({ label: `${n.nodeName} (ID:${n.nodeId})`, value: n.nodeId }));

  const { mutate: updateNode, isPending: isUpdating } = useUpdateNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MCS 설정이 저장되었습니다.');
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
      mcsBkNodeId: node.mcsBkNodeId,
      mcsBkGsaIpv4Address: node.mcsBkGsaIpv4Address,
      mcsBkGsbIpv4Address: node.mcsBkGsbIpv4Address,
      mcsBkRouteMethod: node.mcsBkRouteMethod ?? 0,
      mcsBkRouteRatio: node.mcsBkRouteRatio ?? 50,
      mcsIcdownUseYn: node.mcsIcdownUseYn ?? 0,
      mcsIedownUseYn: node.mcsIedownUseYn ?? 0,
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
              <Form.Item name="mcsBkNodeId" label="백업 MCS 노드">
                <Select options={backupNodeOptions} allowClear placeholder="미지정" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="mcsBkGsaIpv4Address" label="A Side IP" rules={[{ max: 40, message: 'IP는 40자 이내여야 합니다.' }]}>
                <Input placeholder="0.0.0.0" maxLength={40} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="mcsBkGsbIpv4Address" label="B Side IP" rules={[{ max: 40, message: 'IP는 40자 이내여야 합니다.' }]}>
                <Input placeholder="0.0.0.0" maxLength={40} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="mcsBkRouteMethod" label="분배방식">
                <Select options={routeMethodOptions} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="mcsBkRouteRatio" label="비율 (%)">
                <Slider min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="mcsIcdownUseYn" label="IC 우회">
                <Radio.Group>
                  <Radio value={1}>사용</Radio>
                  <Radio value={0}>미사용</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="mcsIedownUseYn" label="IE 우회">
                <Radio.Group>
                  <Radio value={1}>사용</Radio>
                  <Radio value={0}>미사용</Radio>
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
