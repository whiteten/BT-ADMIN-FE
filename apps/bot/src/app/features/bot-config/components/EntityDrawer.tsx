import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useCreateEntity } from '../hooks/useModelQueries';
import type { EntityCreateDatas } from '../types/entity';

/**
 * EntityDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface EntityDrawerRef {
  open: (params: { modelId: string }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  modelId: string;
}

/**
 * Entity 등록 Drawer
 * - ref.open({ modelId }) : 추가 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const EntityDrawer = forwardRef<EntityDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    modelId: '',
  });

  const { open, modelId } = drawerState;

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        modelId: params.modelId,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const [form] = Form.useForm();
  const { TextArea } = Input;
  const queryClient = useQueryClient();

  const { mutate: createEntity, isPending: isCreating } = useCreateEntity({
    mutationOptions: {
      onSuccess: () => {
        toast.success('개체가 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getEntities({ modelId }).queryKey });
        handleClose();
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ entityName: '', entityDesc: '' });
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<EntityCreateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    createEntity({ params: { modelId }, data: values });
  };

  const onFinishFailed: FormProps<EntityCreateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isCreating}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="개체 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ entityName: '', entityDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item name="entityName" label="개체이름" required hasFeedback rules={[{ required: true, message: '개체이름을 입력하세요.' }]}>
              <Input placeholder="개체이름을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="entityDesc" label="개체설명">
              <TextArea rows={4} placeholder="개체설명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

export default EntityDrawer;
