import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useGetClusterGroups } from '../../hooks/useClusterGroupQueries';
import { nodeQueryKeys, useDeleteNode, useGetNode, useUpdateNode } from '../../hooks/useNodeQueries';
import type { NodeUpdateData } from '../../types/node.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const NUMBER_PATTERN = /^[0-9]*$/;

export default function NodeBasicInfoTab() {
  const { nodeId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm();

  const { data: node, isFetching } = useGetNode({ params: { nodeId } });
  const { data: clusterGroups } = useGetClusterGroups();

  const clusterGroupOptions = (clusterGroups ?? []).map((g) => ({
    label: g.clusterGrpName,
    value: g.clusterGrpId,
  }));

  const { mutate: updateNode, isPending: isUpdating } = useUpdateNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: nodeQueryKeys.getNode({ nodeId }).queryKey });
      },
    },
  });

  const { mutate: deleteNode, isPending: isDeleting } = useDeleteNode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('노드가 삭제되었습니다.');
        navigate('../../list');
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

  const handleClickDeleteBtn = () => {
    if (node?.clusterGrpId != null) {
      toast.error('클러스터에 소속된 노드는 삭제할 수 없습니다.');
      return;
    }
    modal.confirm.delete({
      options: {
        title: '노드 삭제',
        content: `'${node?.nodeName}' 노드를 삭제하시겠습니까?`,
      },
      onOk: () => deleteNode({ id: nodeId }),
    });
  };

  useEffect(() => {
    if (!node) return;
    form.setFieldsValue({
      nodeName: node.nodeName,
      nodeAlias: node.nodeAlias,
      regionNum: node.regionNum,
      clusterGrpId: node.clusterGrpId,
      mainJob: node.mainJob,
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
            <Col span={3}>
              <Form.Item label="노드 ID">
                <InputNumber disabled value={Number(nodeId)} className="!w-full" />
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
              <Form.Item name="clusterGrpId" label="클러스터 그룹">
                <Select options={clusterGroupOptions} allowClear placeholder="미지정" />
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
              <Button variant="solid" onClick={() => navigate('../../list')}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleClickDeleteBtn}>
                삭제
              </Button>
            </Col>
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
