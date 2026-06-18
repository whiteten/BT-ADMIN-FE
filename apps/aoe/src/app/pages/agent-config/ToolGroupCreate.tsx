import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import FormSummaryPanel from '../../features/shared/components/FormSummaryPanel';
import FormSummaryValue from '../../features/shared/components/FormSummaryValue';
import { toolQueryKeys, useCreateToolGroup } from '../../features/tool/hooks/useToolQueries';
import type { ToolGroupCreateDatas } from '../../features/tool/types';

interface FormValues {
  groupName: string;
  description?: string;
}

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: '도구', path: '/aoe/agent-config/tool/list' },
  { title: '추가', path: '/aoe/agent-config/tool/create' },
];

export default function ToolGroupCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [form] = Form.useForm<FormValues>();
  const formValues = Form.useWatch([], form);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const { mutate: createToolGroup, isPending } = useCreateToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹이 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getToolGroups().queryKey });
        navigate('../list');
      },
      onError: (error) => Log.warn('createToolGroup failed', error),
    },
  });

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    const data: ToolGroupCreateDatas = {
      groupName: values.groupName,
      description: values.description,
    };
    createToolGroup(data);
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields[0]?.errors[0];
    if (firstError) toast.error(firstError);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
              <Row gutter={20}>
                <Col span={12}>
                  <Form.Item name="groupName" label="그룹명" required rules={[{ required: true, message: '그룹명을 입력해 주세요.' }]}>
                    <Input placeholder="그룹명을 입력하세요." />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={24}>
                  <Form.Item name="description" label="설명">
                    <Input.TextArea placeholder="그룹에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
          <div className="w-full px-7 pb-7 pt-4">
            <Row gutter={20} justify="center">
              <Col>
                <Button variant="solid" onClick={() => navigate('../list')}>
                  취소
                </Button>
              </Col>
              <Col>
                <Button color="primary" variant="solid" loading={isPending} onClick={() => form.submit()}>
                  저장
                </Button>
              </Col>
            </Row>
          </div>
        </div>
        <FormSummaryPanel
          items={[
            {
              key: 'groupName',
              label: '그룹명',
              children: <FormSummaryValue value={formValues?.groupName} valid={!!formValues?.groupName} className="font-medium" />,
            },
            {
              key: 'description',
              label: '설명',
              children: <FormSummaryValue value={formValues?.description} valid={!!formValues?.description} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
