import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetClusterGroups } from '../hooks/useClusterGroupQueries';
import { useCreateNode } from '../hooks/useNodeQueries';
import type { NodeCreateData } from '../types/node.types';

const breadcrumb: BreadcrumbProps['items'] = [{ title: '시스템' }, { title: '자원관리' }, { title: '클러스터 관리', href: '../list' }, { title: '노드 등록' }];

const NUMBER_PATTERN = /^[0-9]*$/;

export default function NodeCreatePage() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: clusterGroups } = useGetClusterGroups();

  const clusterGroupOptions = (clusterGroups ?? []).map((g) => ({
    label: g.clusterGrpName,
    value: g.clusterGrpId,
  }));

  const { mutate: createNode, isPending } = useCreateNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('노드가 등록되었습니다.');
        navigate('../list');
      },
    },
  });

  const onFinish: FormProps<NodeCreateData>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    createNode(values);
  };

  const onFinishFailed: FormProps<NodeCreateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
        <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
          <div className="flex gap-2 items-center text-[var(--color-bt-primary)] mb-6">
            <span className="text-[20px] font-bold">기본정보</span>
          </div>
          <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
            <Row gutter={20}>
              <Col span={3}>
                <Form.Item
                  name="nodeId"
                  label="노드 ID"
                  required
                  hasFeedback
                  rules={[
                    { required: true, message: '노드 ID는 필수입니다.' },
                    { type: 'number', min: 1, message: '1 이상이어야 합니다.' },
                    { type: 'number', max: 999999, message: '999999 이내여야 합니다.' },
                  ]}
                >
                  <InputNumber min={1} max={999999} className="!w-full" placeholder="노드 ID" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="nodeName"
                  label="노드명"
                  required
                  hasFeedback
                  rules={[
                    { required: true, message: '노드명은 필수입니다.' },
                    { max: 200, message: '노드명은 200자 이내여야 합니다.' },
                  ]}
                >
                  <Input placeholder="노드명을 입력하세요." maxLength={200} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="nodeAlias"
                  label="노드 약칭"
                  required
                  hasFeedback
                  rules={[
                    { required: true, message: '노드 약칭은 필수입니다.' },
                    { max: 60, message: '노드 약칭은 60자 이내여야 합니다.' },
                  ]}
                >
                  <Input placeholder="약칭을 입력하세요." maxLength={60} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={6}>
                <Form.Item
                  name="regionNum"
                  label="지역번호"
                  rules={[
                    { max: 64, message: '지역번호는 64자 이내여야 합니다.' },
                    { pattern: NUMBER_PATTERN, message: '숫자만 입력 가능합니다.' },
                  ]}
                >
                  <Input placeholder="02" maxLength={64} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="clusterGrpId" label="클러스터 그룹" required rules={[{ required: true, message: '클러스터 그룹은 필수입니다.' }]}>
                  <Select options={clusterGroupOptions} placeholder="클러스터 그룹 선택" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="mainJob" label="주요 업무" rules={[{ max: 512, message: '주요 업무는 512자 이내여야 합니다.' }]}>
                  <Input.TextArea placeholder="주요 업무를 입력하세요." maxLength={512} rows={3} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
              <Col>
                <Button variant="solid" onClick={() => navigate('../list')}>
                  취소
                </Button>
              </Col>
              <Col>
                <Button color="primary" variant="solid" htmlType="submit" loading={isPending}>
                  저장
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </div>
  );
}
