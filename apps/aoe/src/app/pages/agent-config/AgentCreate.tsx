import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import { useCreateAgent, useGetAgentTypes } from '../../features/agent-config/hooks/useAgentQueries';
import type { AgentCreateDatas } from '../../features/agent-config/types';
import FormSummaryPanel from '../../features/shared/components/FormSummaryPanel';
import FormSummaryValue from '../../features/shared/components/FormSummaryValue';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: 'Agent', path: '/aoe/agent-config/agent' },
  { title: 'Agent 생성', path: '/aoe/agent-config/agent/create' },
];

export default function AgentCreate() {
  const navigate = useNavigate();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const canWrite = useNavigationStore((s) => s.permissions.includes(AOE_PERM.AGENT_WRITE));
  const [form] = Form.useForm<AgentCreateDatas>();
  const formValues = Form.useWatch([], form);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { data: agentTypeList, isFetching: isFetchingAgentTypes } = useGetAgentTypes({});
  const agentTypeOptions = agentTypeList?.map((type) => ({ label: type.agentTypeName, value: type.agentType })) ?? [];

  const { mutate: createAgent, isPending } = useCreateAgent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('에이전트가 생성되었습니다.');
        navigate('../list');
      },
    },
  });

  const onFinish: FormProps<AgentCreateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    createAgent(values);
  };

  const onFinishFailed: FormProps<AgentCreateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const agentName = formValues?.agentName;
  const agentType = formValues?.agentType;
  const agentTypeLabel = agentTypeOptions.find((opt) => opt.value === agentType)?.label;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="w-full flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            {isFetchingAgentTypes ? (
              <div className="flex items-center justify-center w-full h-full">
                <FallbackSpinner />
              </div>
            ) : (
              <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
                <Row gutter={20}>
                  <Col span={12}>
                    <Form.Item name="agentName" label="에이전트 이름" required hasFeedback rules={[{ required: true, message: '에이전트 이름을 입력해 주세요.' }]}>
                      <Input placeholder="에이전트 이름을 입력하세요." />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={20}>
                  <Col span={12}>
                    <Form.Item name="agentType" label="에이전트 타입" required hasFeedback rules={[{ required: true, message: '에이전트 타입을 선택해 주세요.' }]}>
                      <Select options={agentTypeOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="에이전트 타입을 선택하세요." />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            )}
          </div>
          <div className="w-full px-7 pb-7">
            <Row gutter={20} justify="center">
              <Col>
                <Button variant="solid" onClick={() => navigate('../list')}>
                  취소
                </Button>
              </Col>
              <Col>
                <Button variant="solid" color="primary" onClick={() => form.submit()} loading={isPending} disabled={!canWrite}>
                  저장
                </Button>
              </Col>
            </Row>
          </div>
        </div>
        <FormSummaryPanel
          loading={isFetchingAgentTypes}
          items={[
            {
              key: 'agentName',
              label: '에이전트 이름',
              children: <FormSummaryValue value={agentName} valid={!!agentName} className="font-medium" />,
            },
            {
              key: 'agentType',
              label: '에이전트 타입',
              children: <FormSummaryValue value={agentTypeLabel} valid={!!agentType} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
