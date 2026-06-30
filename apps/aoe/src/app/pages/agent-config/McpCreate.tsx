import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { type BreadcrumbProps, Button, Col, Form, Input, Row } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { AOE_PERM } from '../../constants/permissions';
import { mcpQueryKeys, useCreateMcp } from '../../features/mcp/hooks/useMcpQueries';
import type { McpCreateDatas } from '../../features/mcp/types';
import FormSummaryPanel from '../../features/shared/components/FormSummaryPanel';
import FormSummaryValue from '../../features/shared/components/FormSummaryValue';

interface FormValues {
  serverName: string;
  url: string;
  description?: string;
}

const URL_PATTERN = /^https?:\/\/.+/i;

const breadcrumb: BreadcrumbProps['items'] = [
  { title: 'AOE 관리', path: '/aoe/agent-config' },
  { title: 'MCP', path: '/aoe/agent-config/mcp/list' },
  { title: '추가', path: '/aoe/agent-config/mcp/create' },
];

export default function McpCreate() {
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

  const { mutate: createMcp, isPending } = useCreateMcp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MCP 서버가 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: mcpQueryKeys.getMcpList().queryKey });
        navigate('../list');
      },
      onError: (error) => Log.warn('createMcp failed', error),
    },
  });

  const handleSubmit = (values: FormValues) => {
    const data: McpCreateDatas = {
      serverName: values.serverName,
      url: values.url,
      description: values.description,
      status: 'active',
    };
    createMcp(data);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex w-full flex-1 min-h-0 gap-4">
        <div className="w-full h-full min-h-0 bg-white bt-shadow flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto p-7 pb-0">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Row gutter={20}>
                <Col span={12}>
                  <Form.Item
                    name="serverName"
                    label="서버명"
                    required
                    rules={[
                      { required: true, message: '서버명을 입력해 주세요.' },
                      { max: 255, message: '서버명은 255자 이내여야 합니다.' },
                    ]}
                  >
                    <Input placeholder="MCP 서버 이름을 입력하세요." />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={12}>
                  <Form.Item
                    name="url"
                    label="URL"
                    required
                    rules={[
                      { required: true, message: 'URL을 입력해 주세요.' },
                      { max: 256, message: 'URL은 256자 이내여야 합니다.' },
                      { pattern: URL_PATTERN, message: 'http:// 또는 https:// 로 시작하는 URL을 입력하세요.' },
                    ]}
                  >
                    <Input placeholder="https://example.com" className="font-mono" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={20}>
                <Col span={24}>
                  <Form.Item name="description" label="설명" rules={[{ max: 256, message: '설명은 256자 이내여야 합니다.' }]}>
                    <Input.TextArea placeholder="MCP 서버에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
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
              key: 'serverName',
              label: '서버명',
              children: <FormSummaryValue value={formValues?.serverName} valid={!!formValues?.serverName} className="font-medium" />,
            },
            {
              key: 'url',
              label: 'URL',
              children: <FormSummaryValue value={formValues?.url} valid={!!formValues?.url} className="truncate" />,
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
