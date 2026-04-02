import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { Check, X } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useCreateAgent, useGetAgentTypes } from '../../features/agent-config/hooks/useAgentQueries';
import type { AgentCreateDatas } from '../../features/agent-config/types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/aoe/agent-config' },
  { title: 'Agent', path: '/aoe/agent-config/agent' },
  { title: 'Agent 생성', path: '/aoe/agent-config/agent/create' },
];

const displayValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined || value === '') return <span className="text-gray-300">-</span>;
  return value as React.ReactNode;
};

export default function AgentCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm<AgentCreateDatas>();
  const formValues = Form.useWatch([], form);

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

  const renderValidationIcon = (fieldName: keyof AgentCreateDatas) => {
    const value = formValues?.[fieldName];
    const hasValue = value !== null && value !== undefined && value !== '';
    return hasValue ? <Check className="w-4 h-4 text-green-500 ml-2 shrink-0" /> : <X className="w-4 h-4 text-red-500 ml-2 shrink-0" />;
  };

  function renderFormSummary() {
    const agentName = formValues?.agentName;
    const agentType = formValues?.agentType;
    const agentTypeLabel = agentTypeOptions.find((opt) => opt.value === agentType)?.label;

    if (isFetchingAgentTypes) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">에이전트 이름</span>
          <span className="text-gray-800 font-medium flex-1">{displayValue(agentName)}</span>
          {renderValidationIcon('agentName')}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500 w-24 shrink-0">에이전트 타입</span>
          <span className="text-gray-800 flex-1">{displayValue(agentTypeLabel)}</span>
          {renderValidationIcon('agentType')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
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
                <Button variant="solid" color="primary" onClick={() => form.submit()} loading={isPending}>
                  저장
                </Button>
              </Col>
            </Row>
          </div>
        </div>
        <div className="!w-[400px] !min-w-[400px] h-full min-h-0 bg-white bt-shadow hidden xl:flex flex-col">
          <div className="text-base font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-200 px-5 pt-5">입력 정보 요약</div>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">{renderFormSummary()}</div>
        </div>
      </div>
    </div>
  );
}
