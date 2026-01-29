import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useCreateIntent } from '../hooks/useModelQueries';
import type { IntentCreateDatas } from '../types';

/**
 * IntentDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface IntentDrawerRef {
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
 * Intent 등록 Drawer
 * - ref.open({ modelId }) : 추가 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const IntentDrawer = forwardRef<IntentDrawerRef>((_, ref) => {
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

  const { mutate: createIntent, isPending: isCreating } = useCreateIntent({
    mutationOptions: {
      onSuccess: () => {
        toast.success('의도가 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getIntents({ modelId }).queryKey });
        handleClose();
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ intentName: '', intentDesc: '' });
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<IntentCreateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    createIntent({ params: { modelId }, data: values });
  };

  const onFinishFailed: FormProps<IntentCreateDatas>['onFinishFailed'] = (errorInfo) => {
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
    <Drawer open={open} onClose={handleClose} title="의도 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ intentName: '', intentDesc: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item
              name="intentName"
              label="의도이름"
              required
              hasFeedback
              rules={[
                { required: true, message: '의도이름을 입력하세요.' },
                {
                  pattern: /^[a-zA-Z가-힣_][a-zA-Z가-힣0-9_]*$/,
                  message: '영문, 한글, 숫자, 언더스코어(_)만 가능하며, 숫자로 시작하거나 공백을 포함할 수 없습니다.',
                },
              ]}
            >
              <Input placeholder="의도이름을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="intentDesc" label="의도설명">
              <TextArea rows={4} placeholder="의도설명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

export default IntentDrawer;
