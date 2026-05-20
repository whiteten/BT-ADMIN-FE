import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { toolQueryKeys, useDeleteToolGroup, useGetToolGroups, useUpdateToolGroup } from '../hooks/useToolQueries';
import type { ToolGroupCreateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FormValues {
  groupName: string;
  description?: string;
}

export default function ToolGroupBasicInfo() {
  const { groupId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();

  const { data: groups = [], isLoading } = useGetToolGroups();
  const group = groups.find((g) => g.groupId === groupId);

  const { mutate: updateToolGroup, isPending: isUpdating } = useUpdateToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: toolQueryKeys.getToolGroups().queryKey });
      },
      onError: (error) => Log.warn('updateToolGroup failed', error),
    },
  });

  const { mutate: deleteToolGroup, isPending: isDeleting } = useDeleteToolGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('그룹이 삭제되었습니다.');
        navigate('../list');
      },
      onError: (error) => Log.warn('deleteToolGroup failed', error),
    },
  });

  useEffect(() => {
    if (!group) return;
    form.setFieldsValue({
      groupName: group.groupName,
      description: group.description ?? undefined,
    });
  }, [group, form]);

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    const data: ToolGroupCreateDatas = {
      groupName: values.groupName,
      description: values.description,
    };
    updateToolGroup({ params: { groupId: groupId ?? '' }, data });
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields[0]?.errors[0];
    if (firstError) toast.error(firstError);
  };

  const handleDelete = () => {
    modal.confirm.delete({ onOk: () => deleteToolGroup({ groupId: groupId ?? '' }) });
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="groupName" label="그룹명" required rules={[{ required: true, message: '그룹명을 입력해 주세요.' }]}>
                <Input placeholder="그룹명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="description" label="설명">
                <Input.TextArea placeholder="그룹에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
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
