import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useDeleteEntity, useGetEntity, useUpdateEntity } from '../hooks/useModelQueries';
import type { EntityBasicInfoUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function EntityBasicInfo() {
  const { modelId = '', entityId = '' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const { TextArea } = Input;
  const [form] = Form.useForm();

  const { data: entityData, isFetching } = useGetEntity({
    params: { modelId, entityId },
    queryOptions: { enabled: !!modelId && !!entityId },
  });

  const { mutate: updateEntity, isPending: isUpdating } = useUpdateEntity({
    mutationOptions: {
      onSuccess: () => {
        toast.success('개체가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntity({ modelId, entityId }).queryKey });
      },
    },
  });

  const { mutate: deleteEntity, isPending: isDeleting } = useDeleteEntity({
    mutationOptions: {
      onSuccess: () => {
        toast.success('개체가 삭제되었습니다.');
        navigate('../..?tab=tab3');
      },
    },
  });

  const onFinish: FormProps<EntityBasicInfoUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateEntity({ params: { modelId, entityId }, data: values });
  };

  const onFinishFailed: FormProps<EntityBasicInfoUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => deleteEntity({ modelId, entityId }),
    });
  };

  useEffect(() => {
    if (!entityData) return;
    const { entityName, entityDesc } = entityData;
    form.setFieldsValue({ entityName, entityDesc });
  }, [entityData, form]);

  return (
    <Form form={form} initialValues={{ entityName: '', entityDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="entityName" label="개체이름" required hasFeedback rules={[{ required: true, message: '개체이름을 입력하세요.' }]}>
                <Input placeholder="개체이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="entityDesc" label="개체설명">
                <TextArea rows={4} placeholder="개체설명을 입력하세요." />
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
