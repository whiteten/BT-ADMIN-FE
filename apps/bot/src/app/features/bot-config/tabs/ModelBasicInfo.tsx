import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Checkbox, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { confirmModal, toast } from '@/shared-util';
import { modelQueryKeys, useDeleteModel, useGetModel, useUpdateModel } from '../hooks/useModelQueries';
import type { ModelBasicInfoUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function ModelBasicInfo() {
  const { modelId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: model, isFetching } = useGetModel({ params: { modelId } });

  const { mutate: updateModel, isPending: isUpdating } = useUpdateModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델 기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getModel({ modelId }).queryKey });
      },
    },
  });

  const { mutateAsync: deleteModel, isPending: isDeleting } = useDeleteModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 삭제되었습니다.');
        navigate('../list');
      },
    },
  });

  const onFinish: FormProps<ModelBasicInfoUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateModel({ params: { modelId }, data: values });
  };

  const onFinishFailed: FormProps<ModelBasicInfoUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    confirmModal.delete({
      onOk: () => deleteModel({ modelId }),
    });
  };

  useEffect(() => {
    if (!model) return;
    const { modelName, expansion1, faqIntentYn } = model;
    form.setFieldsValue({ modelName, expansion1, faqIntentYn });
  }, [model, form]);

  return (
    <Form form={form} initialValues={{ modelName: '', expansion1: '', faqIntentYn: 0 }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="modelName" label="모델 이름" required hasFeedback rules={[{ required: true, message: '모델 이름을 입력해 주세요.' }]}>
                <Input placeholder="모델 이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="expansion1" label="모델 설명">
                <Input.TextArea rows={4} placeholder="모델 설명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col>
              <Form.Item name="faqIntentYn" label="의도 유형별 활성화" getValueFromEvent={(e) => (e.target.checked ? 1 : 0)} getValueProps={(value) => ({ checked: value === 1 })}>
                <Checkbox>FAQ 의도</Checkbox>
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
