import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { a2aQueryKeys, useDeleteA2A, useGetA2AList, useUpdateA2A } from '../hooks/useA2aQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FormValues {
  agentName: string;
  agentDescription?: string;
}

export default function A2ABasicInfo() {
  const { a2aId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();

  const { data: a2aList = [], isLoading } = useGetA2AList();
  const a2a = a2aList.find((a) => a.a2aId === a2aId);

  const { mutate: updateA2A, isPending: isUpdating } = useUpdateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
      },
      onError: (error) => Log.warn('updateA2A failed', error),
    },
  });

  const { mutate: deleteA2A, isPending: isDeleting } = useDeleteA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 삭제되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteA2A failed', error),
    },
  });

  useEffect(() => {
    if (!a2a) return;
    form.setFieldsValue({
      agentName: a2a.agentName,
      agentDescription: a2a.agentDescription ?? undefined,
    });
  }, [a2a, form]);

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    updateA2A({
      params: { a2aId: a2aId ?? '' },
      data: {
        a2aId: a2aId ?? '',
        agentName: values.agentName,
        agentDescription: values.agentDescription,
        skills: a2a?.skills ?? [],
      },
    });
  };

  const handleDelete = () => {
    modal.confirm.delete({ onOk: () => deleteA2A({ a2aId: a2aId ?? '' }) });
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="agentName" label="Agent 명" required rules={[{ required: true, message: 'Agent 명을 입력해 주세요.' }]}>
                <Input placeholder="Agent 명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="agentDescription" label="설명">
                <Input.TextArea placeholder="설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7 pt-2">
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
