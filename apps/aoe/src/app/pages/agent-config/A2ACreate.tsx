import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, Input, Row, Select, Steps } from 'antd';
import { Minus, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { a2aQueryKeys, useCreateA2A } from '../../features/a2a/hooks/useA2aQueries';
import type { A2ACreateDatas } from '../../features/a2a/types';
import { useGetAgents } from '../../features/agent-config/hooks/useAgentQueries';
import PageHeader from '@/components/custom/PageHeader';

interface Step1FormValues {
  agentId: string;
  agentName: string;
  agentDescription?: string;
}

interface SkillFormRow {
  skillName: string;
  description?: string;
  tags?: string;
  examples?: string;
}

interface Step2FormValues {
  skills?: SkillFormRow[];
}

const breadcrumb: BreadcrumbProps['items'] = [{ title: '관리', path: '/aoe/agent-config' }, { title: 'A2A', path: '/aoe/agent-config/a2a/list' }, { title: '추가' }];

const steps = [{ title: '기본 정보' }, { title: 'Skills 설정' }];

export default function A2ACreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [step1Form] = Form.useForm<Step1FormValues>();
  const [step2Form] = Form.useForm<Step2FormValues>();

  const { data: agents = [] } = useGetAgents();
  const deployedAgents = agents.filter((a) => a.aoeDeployFlag === 1);

  const { mutate: createA2A, isPending } = useCreateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
        navigate('../list');
      },
      onError: (error) => Log.warn('createA2A failed', error),
    },
  });

  const handleAgentChange = (agentId: string) => {
    const agent = deployedAgents.find((a) => a.agentId === agentId);
    if (agent) step1Form.setFieldValue('agentName', agent.agentName);
  };

  const handleNext = async () => {
    try {
      await step1Form.validateFields();
      setCurrentStep(1);
    } catch (error) {
      Log.warn('step1 validation failed', error);
    }
  };

  const handleSubmit = () => {
    const step1 = step1Form.getFieldsValue();
    const step2 = step2Form.getFieldsValue();
    const selectedAgent = deployedAgents.find((a) => a.agentId === step1.agentId);

    const data: A2ACreateDatas = {
      agentId: step1.agentId,
      agentName: step1.agentName,
      agentDescription: step1.agentDescription,
      aoeApiKey: selectedAgent?.aoeApiKey,
      skills: (step2.skills ?? []).map((s, i) => ({
        skillName: s.skillName,
        description: s.description,
        tags: s.tags
          ? s.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        examples: s.examples
          ? s.examples
              .split('\n')
              .map((e) => e.trim())
              .filter(Boolean)
          : [],
        seq: i + 1,
      })),
    };
    createA2A(data);
  };

  function renderStep1() {
    return (
      <Form form={step1Form} layout="vertical" className="max-w-2xl">
        <Form.Item name="agentId" label="배포 Agent" required rules={[{ required: true, message: 'Agent를 선택해 주세요.' }]}>
          <Select
            showSearch
            placeholder="배포된 Agent를 선택하세요."
            options={deployedAgents.map((a) => ({ label: a.agentName, value: a.agentId }))}
            onChange={handleAgentChange}
            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>
        <Form.Item name="agentName" label="Agent 명" required rules={[{ required: true, message: 'Agent 명을 입력해 주세요.' }]}>
          <Input placeholder="Agent 명을 입력하세요." />
        </Form.Item>
        <Form.Item name="agentDescription" label="설명">
          <Input.TextArea placeholder="설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>
      </Form>
    );
  }

  function renderStep2() {
    return (
      <Form form={step2Form} layout="vertical" className="max-w-2xl">
        <Form.List name="skills">
          {(fields, { add, remove }) => (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Skills</span>
                <Button size="small" icon={<Plus className="size-3" />} onClick={() => add()}>
                  추가
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-200 rounded-lg">Skill이 없습니다. Skills가 없어도 저장 가능합니다.</p>
              )}
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 bg-gray-100 border-b border-gray-200" style={{ height: 36 }}>
                    <Form.Item noStyle shouldUpdate>
                      {() => {
                        const skillName = step2Form.getFieldValue(['skills', name, 'skillName']) as string | undefined;
                        return <span className="text-sm font-medium text-gray-700">{skillName ?? `Skill ${name + 1}`}</span>;
                      }}
                    </Form.Item>
                    <Button size="small" variant="text" color="danger" icon={<Minus className="size-3" />} onClick={() => remove(name)} />
                  </div>
                  <div className="px-3 pt-2 pb-1 bg-gray-50">
                    <Row gutter={[12, 0]}>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'skillName']} label="Skill 명" className="mb-2" rules={[{ required: true, message: 'Skill 명을 입력하세요.' }]}>
                          <Input placeholder="Skill 명" size="small" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'tags']} label="Tags" className="mb-2">
                          <Input placeholder="예: 검색, 조회 (쉼표로 구분)" size="small" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'description']} label="설명" className="mb-1">
                          <Input placeholder="Skill 설명" size="small" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item {...restField} name={[name, 'examples']} label="Examples" className="mb-1">
                          <Input.TextArea placeholder={'예시 1\n예시 2'} size="small" autoSize={{ minRows: 1, maxRows: 5 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Form.List>
      </Form>
    );
  }

  function renderFooter() {
    return (
      <Row gutter={20} justify="center">
        <Col>
          <Button variant="solid" onClick={() => navigate('../list')}>
            취소
          </Button>
        </Col>
        {currentStep > 0 && (
          <Col>
            <Button variant="solid" onClick={() => setCurrentStep((prev) => prev - 1)}>
              이전
            </Button>
          </Col>
        )}
        {currentStep < steps.length - 1 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleNext}>
              다음
            </Button>
          </Col>
        )}
        {currentStep === steps.length - 1 && (
          <Col>
            <Button color="primary" variant="solid" onClick={handleSubmit} loading={isPending}>
              저장
            </Button>
          </Col>
        )}
      </Row>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex items-center justify-center w-full h-[58px] min-h-[58px] bg-white bt-shadow px-7 py-2">
        <Steps current={currentStep} items={steps.map((s) => ({ title: s.title }))} size="small" style={{ width: `${steps.length * 250}px` }} responsive={false} />
      </div>
      <div className="w-full flex-1 min-h-0 bg-white bt-shadow flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col p-7 pb-0">
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }} className="overflow-y-auto h-full">
            {renderStep1()}
          </div>
          <div style={{ display: currentStep === 1 ? 'block' : 'none' }} className="overflow-y-auto h-full">
            {renderStep2()}
          </div>
        </div>
        <div className="w-full px-7 pb-7 pt-4">{renderFooter()}</div>
      </div>
    </div>
  );
}
