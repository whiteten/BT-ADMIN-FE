import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { knowledgeQueryKeys, useDeleteKnowledgeEval, useGetKnowledgeEval, useUpdateKnowledgeEval } from '../hooks/useKnowledgeQueries';
import type { KnowledgeEvalUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

interface FormValues {
  evalName: string;
  description?: string;
}

export default function EvalBasicInfo() {
  const { documentId, evalId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm<FormValues>();

  const { data: evalData, isLoading } = useGetKnowledgeEval({ params: { documentId, evalId } });

  const { mutate: updateEval, isPending: isUpdating } = useUpdateKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가셋 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEval({ documentId, evalId }).queryKey });
        queryClient.invalidateQueries({ queryKey: knowledgeQueryKeys.getKnowledgeEvals({ documentId }).queryKey });
      },
      onError: (error) => Log.warn('updateKnowledgeEval failed', error),
    },
  });

  const { mutate: deleteEval, isPending: isDeleting } = useDeleteKnowledgeEval({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가셋이 삭제되었습니다.');
        navigate(`/aoe/agent-config/knowledge/${documentId}?tab=tab3`);
      },
      onError: (error) => Log.warn('deleteKnowledgeEval failed', error),
    },
  });

  useEffect(() => {
    if (!evalData) return;
    form.setFieldsValue({
      evalName: evalData.evalName,
      description: evalData.description,
    });
  }, [evalData, form]);

  const onFinish: FormProps<FormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const data: KnowledgeEvalUpdateDatas = {
      evalName: values.evalName,
      description: values.description,
    };
    if (!documentId || !evalId) return;
    updateEval({ params: { documentId, evalId }, data });
  };

  const onFinishFailed: FormProps<FormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields[0]?.errors[0];
    if (firstError) toast.error(firstError);
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleDelete = () => {
    if (!documentId || !evalId) return;
    modal.confirm.delete({
      onOk: () => deleteEval({ documentId, evalId }),
    });
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
              <Form.Item name="evalName" label="평가셋 명" required rules={[{ required: true, message: '평가셋 명을 입력해 주세요.' }]}>
                <Input placeholder="평가셋 명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="description" label="설명">
                <Input.TextArea placeholder="평가셋에 대한 설명을 입력하세요." autoSize={{ minRows: 3, maxRows: 5 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
            <Col>
              <Button variant="solid" onClick={() => navigate(`/aoe/agent-config/knowledge/${documentId}?tab=tab3`)}>
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
