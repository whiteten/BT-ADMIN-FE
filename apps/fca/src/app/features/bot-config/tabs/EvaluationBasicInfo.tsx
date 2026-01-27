import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useDeleteEvaluation, useGetEvaluation, useUpdateEvaluation } from '../hooks/useModelQueries';
import type { EvaluationUpdateDatas } from '../types/evaluation';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function EvaluationBasicInfo() {
  const { modelId = '', evalId = '' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const [form] = Form.useForm();

  const { data: evaluationData, isFetching } = useGetEvaluation({
    params: { modelId, evalId },
    queryOptions: { enabled: !!modelId && !!evalId },
  });

  const { mutate: updateEvaluation, isPending: isUpdating } = useUpdateEvaluation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEvaluation({ modelId, evalId }).queryKey });
      },
    },
  });

  const { mutate: deleteEvaluation, isPending: isDeleting } = useDeleteEvaluation({
    mutationOptions: {
      onSuccess: () => {
        toast.success('평가가 삭제되었습니다.');
        navigate('../..?tab=tab4');
      },
    },
  });

  const onFinish: FormProps<EvaluationUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateEvaluation({ params: { modelId, evalId }, data: values });
  };

  const onFinishFailed: FormProps<EvaluationUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => deleteEvaluation({ modelId, evalId }),
    });
  };

  useEffect(() => {
    if (!evaluationData) return;
    const { evalName } = evaluationData;
    form.setFieldsValue({ evalName });
  }, [evaluationData, form]);

  return (
    <Form form={form} initialValues={{ evalName: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="evalName" label="평가셋 이름" required hasFeedback rules={[{ required: true, message: '평가셋이름을 입력하세요.' }]}>
                <Input placeholder="평가셋 이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting}>
                저장
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleClickDeleteBtn}>
                삭제
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
