import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Switch } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { mcpQueryKeys, useDeleteMcp, useGetMcpList, useUpdateMcp } from '../hooks/useMcpQueries';
import type { McpStatus } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FormValues {
  serverName: string;
  url: string;
  description?: string;
  active: boolean;
}

const URL_PATTERN = /^https?:\/\/.+/i;

export default function McpBasicInfo() {
  const { mcpId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();

  const { data: mcpList = [], isLoading } = useGetMcpList();
  const mcp = mcpList.find((m) => m.mcpId === mcpId);

  const { mutate: updateMcp, isPending: isUpdating } = useUpdateMcp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: mcpQueryKeys.getMcpList().queryKey });
      },
      onError: (error) => Log.warn('updateMcp failed', error),
    },
  });

  const { mutate: deleteMcp, isPending: isDeleting } = useDeleteMcp({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MCP 서버가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: mcpQueryKeys.getMcpList().queryKey });
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteMcp failed', error),
    },
  });

  useEffect(() => {
    if (!mcp) return;
    form.setFieldsValue({
      serverName: mcp.serverName,
      url: mcp.url,
      description: mcp.description ?? undefined,
      active: mcp.status !== 'inactive',
    });
  }, [mcp, form]);

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    const status: McpStatus = values.active ? 'active' : 'inactive';
    updateMcp({
      params: { mcpId: mcpId ?? '' },
      data: {
        mcpId: mcpId ?? '',
        serverName: values.serverName,
        url: values.url,
        description: values.description,
        status,
      },
    });
  };

  const handleDelete = () => {
    modal.confirm.delete({ onOk: () => deleteMcp({ mcpId: mcpId ?? '' }) });
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} className="max-w-2xl">
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Form.Item
            name="serverName"
            label="서버명"
            required
            rules={[
              { required: true, message: '서버명을 입력해 주세요.' },
              { max: 255, message: '서버명은 255자 이내여야 합니다.' },
            ]}
          >
            <Input placeholder="MCP 서버 이름을 입력하세요." disabled />
          </Form.Item>
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
          <Form.Item name="description" label="설명" rules={[{ max: 256, message: '설명은 256자 이내여야 합니다.' }]}>
            <Input.TextArea placeholder="설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
          </Form.Item>
          <Form.Item name="active" label="상태" valuePropName="checked" extra="비활성 상태의 서버는 연결되지 않습니다.">
            <Switch checkedChildren="활성" unCheckedChildren="비활성" />
          </Form.Item>
          <Row gutter={20} justify="center">
            <Col>
              <Button variant="solid" onClick={() => navigate('../list')}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleDelete}>
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
