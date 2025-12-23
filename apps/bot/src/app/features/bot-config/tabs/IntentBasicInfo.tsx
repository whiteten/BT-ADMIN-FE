import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { confirmModal, toast } from '@/shared-util';
import { modelQueryKeys, useDeleteIntent, useGetIntent, useUpdateIntent } from '../hooks/useModelQueries';
import type { IntentBasicInfoUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function IntentBasicInfo() {
  const { modelId = '', intentId = '' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { TextArea } = Input;
  const [form] = Form.useForm();

  const { data: intentData, isFetching } = useGetIntent({
    params: { modelId, intentId },
    queryOptions: { enabled: !!modelId && !!intentId },
  });

  const { mutate: updateIntent, isPending: isUpdating } = useUpdateIntent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('의도가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntent({ modelId, intentId }).queryKey });
      },
    },
  });

  const { mutate: deleteIntent, isPending: isDeleting } = useDeleteIntent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('의도가 삭제되었습니다.');
        navigate('../..?tab=tab2');
      },
    },
  });

  const onFinish: FormProps<IntentBasicInfoUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateIntent({ params: { modelId, intentId }, data: values });
  };

  const onFinishFailed: FormProps<IntentBasicInfoUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    confirmModal.delete({
      onOk: () => deleteIntent({ modelId, intentId }),
    });
  };

  useEffect(() => {
    if (!intentData) return;
    const { intentName, intentDesc } = intentData;
    form.setFieldsValue({ intentName, intentDesc });
  }, [intentData, form]);

  return (
    <Form form={form} initialValues={{ intentName: '', intentDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="intentName" label="의도이름" required hasFeedback rules={[{ required: true, message: '의도이름을 입력하세요.' }]}>
                <Input placeholder="의도이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="intentDesc" label="의도설명">
                <TextArea rows={4} placeholder="의도설명을 입력하세요." />
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
