import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Radio, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { dictionaryQueryKeys, useCreateSttDictionary } from '../hooks/useDictionaryQueries';
import type { SttDictionaryCreateData, SttDictionarySearchParams } from '../types';

export interface SttDictionaryDrawerRef {
  open: (params: { searchParams: SttDictionarySearchParams }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  searchParams: SttDictionarySearchParams;
}

const SttDictionaryDrawer = forwardRef<SttDictionaryDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    searchParams: {},
  });

  const { open, searchParams } = drawerState;

  useImperativeHandle(ref, () => ({
    open: (params) => setDrawerState({ open: true, searchParams: params.searchParams }),
    close: () => setDrawerState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setDrawerState((prev) => ({ ...prev, open: false }));

  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { mutate: createItem, isPending } = useCreateSttDictionary({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getSttDictionaryList(searchParams).queryKey });
        handleClose();
      },
      onError: () => {
        toast.error('등록에 실패했습니다.');
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({ beforeWord: '', afterWord: '', useYn: '1' });
    return () => {
      Log.debug('SttDictionaryDrawer resetFields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<SttDictionaryCreateData>['onFinish'] = (values) => {
    createItem({ beforeWord: values.beforeWord, afterWord: values.afterWord, useYn: values.useYn });
  };

  const onFinishFailed: FormProps<SttDictionaryCreateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()} loading={isPending}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="후처리 사전 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ beforeWord: '', afterWord: '', useYn: '1' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item name="beforeWord" label="변경할 단어" required hasFeedback rules={[{ required: true, message: '변경할 단어를 입력해주세요.' }]}>
              <Input placeholder="변경할 단어를 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="afterWord" label="수정 단어 (결과)" required hasFeedback rules={[{ required: true, message: '수정 단어를 입력해주세요.' }]}>
              <Input placeholder="수정 단어를 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="useYn" label="사용여부" required rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="1">사용</Radio>
                <Radio value="0">미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

SttDictionaryDrawer.displayName = 'SttDictionaryDrawer';
export default SttDictionaryDrawer;
