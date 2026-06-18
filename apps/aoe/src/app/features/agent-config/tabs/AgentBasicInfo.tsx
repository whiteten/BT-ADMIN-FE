import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { CheckCircle2, Copy } from 'lucide-react';
import { Log } from '@/log';
import { copyToClipboard, toast } from '@/shared-util';
import FormSummaryPanel from '../../shared/components/FormSummaryPanel';
import FormSummaryValue from '../../shared/components/FormSummaryValue';
import AgentUsageSummary from '../components/AgentUsageSummary';
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

  // 우측 "수정 정보 요약" 패널 — 폼 입력값을 실시간(useWatch)으로 반영
  const formValues = Form.useWatch([], form);
  const agentTypeLabel = agentTypeOptions.find((opt) => opt.value === formValues?.agentType)?.label;
  const summaryItems = [
    {
      key: 'agentName',
      label: '에이전트 이름',
      children: <FormSummaryValue value={formValues?.agentName} valid={!!formValues?.agentName} className="font-medium" />,
    },
    {
      key: 'agentType',
      label: '에이전트 타입',
      children: <FormSummaryValue value={agentTypeLabel} valid={!!formValues?.agentType} />,
    },
  ];

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
    <div className="flex w-full flex-1 min-h-0 gap-4">
      <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
        <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
          {isFetching || isFetchingAgentTypes ? (
            <div className="flex items-center justify-center w-full h-full">
              <FallbackSpinner />
            </div>
          ) : (
            <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
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
              <Row gutter={20} className="mb-2">
                <Col span={18}>
                  <AgentUsageSummary agentId={agentId} />
                </Col>
              </Row>
            </Form>
          )}
        </div>
        <div className="w-full px-7 pb-7 pt-4">
          <Row gutter={20} justify="center">
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
              <Button color="primary" variant="solid" onClick={() => form.submit()} loading={isUpdating}>
                저장
              </Button>
            </Col>
          </Row>
        </div>
      </div>
      <FormSummaryPanel title="수정 정보 요약" loading={isFetching || isFetchingAgentTypes} items={summaryItems} />
    </div>
  );
}
