import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { CheckCircle2, Copy } from 'lucide-react';
import { Log } from '@/log';
import { copyToClipboard, toast } from '@/shared-util';
import { agentQueryKeys, useDeleteAgent, useGetAgent, useGetAgentTypes, useUpdateAgent } from '../hooks/useAgentQueries';
import type { AgentUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function AgentBasicInfo() {
  const { agentId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm<AgentUpdateDatas>();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    try {
      await copyToClipboard(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      Log.warn('handleCopy failed', error);
    }
  };

  const { data: agent, isFetching } = useGetAgent({ params: { agentId } });
  const { data: agentTypeList, isFetching: isFetchingAgentTypes } = useGetAgentTypes({});
  const agentTypeOptions = agentTypeList?.map((type) => ({ label: type.agentTypeName, value: type.agentType })) ?? [];

  const modal = useModal();

  const { mutate: updateAgent, isPending: isUpdating } = useUpdateAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트 기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: agentQueryKeys.getAgent({ agentId }).queryKey });
        navigate('../list');
      },
    },
  });

  const { mutate: deleteAgent } = useDeleteAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트가 삭제되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteAgent failed', error),
    },
  });

  const handleDelete = () => {
    modal.confirm.delete({
      onOk: () => {
        if (agentId && agent) deleteAgent({ agentId, aoeDeployFlag: agent.aoeDeployFlag, aoeApiKey: agent.aoeApiKey });
      },
    });
  };

  const onFinish: FormProps<AgentUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (!agentId) return;
    updateAgent({ agentId, data: values });
  };

  const onFinishFailed: FormProps<AgentUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!agent) return;
    form.setFieldsValue({ agentName: agent.agentName, agentType: agent.agentType });
  }, [agent, form]);

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching || isFetchingAgentTypes ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={9}>
              <Form.Item label="에이전트 ID">
                <Input
                  value={agent?.agentId}
                  disabled
                  addonAfter={
                    <span className="cursor-pointer flex items-center gap-1" onClick={() => agent?.agentId && handleCopy(agent.agentId, 'agentId')}>
                      {copiedField === 'agentId' ? <CheckCircle2 className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </span>
                  }
                />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item label="AOE 사용 Key">
                <Input
                  value={agent?.aoeApiKey ?? '-'}
                  disabled
                  addonAfter={
                    <span className="cursor-pointer flex items-center gap-1" onClick={() => agent?.aoeApiKey && handleCopy(agent.aoeApiKey, 'aoeApiKey')}>
                      {copiedField === 'aoeApiKey' ? <CheckCircle2 className="size-4 text-green-500" /> : <Copy className="size-4" />}
                    </span>
                  }
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={9}>
              <Form.Item name="agentName" label="에이전트 이름" required hasFeedback rules={[{ required: true, message: '에이전트 이름을 입력해 주세요.' }]}>
                <Input placeholder="에이전트 이름을 입력하세요." />
              </Form.Item>
            </Col>
            <Col span={9}>
              <Form.Item name="agentType" label="에이전트 타입" required hasFeedback rules={[{ required: true, message: '에이전트 타입을 선택해 주세요.' }]}>
                <Select options={agentTypeOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="에이전트 타입을 선택하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={9}>
              <Form.Item label="RAG 사용여부">
                <Badge status={agent?.ragUseYn === 'Y' ? 'success' : 'default'} text={agent?.ragUseYn === 'Y' ? '사용' : '미사용'} />
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
              <Button color="danger" variant="solid" onClick={handleDelete}>
                삭제
              </Button>
            </Col>
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
