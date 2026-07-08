import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Radio, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { dictionaryQueryKeys, useCreateSttDictionary, useUpdateSttDictionary } from '../hooks/useDictionaryQueries';
import type { SttDictionaryCreateData, SttDictionaryItem } from '../types';

export interface SttDictionaryDrawerRef {
  open: (item?: SttDictionaryItem) => void;
  close: () => void;
}

const SttDictionaryDrawer = forwardRef<SttDictionaryDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<SttDictionaryItem | null>(null);
  const isEdit = !!editItem;

  useImperativeHandle(ref, () => ({
    open: (item?: SttDictionaryItem) => {
      setEditItem(item ?? null);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: dictionaryQueryKeys.getSttDictionaryList(undefined).queryKey });

  const { mutate: createItem, isPending: isCreating } = useCreateSttDictionary({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        invalidate();
        handleClose();
      },
      onError: () => toast.error('등록에 실패했습니다.'),
    },
  });

  const { mutate: updateItem, isPending: isUpdating } = useUpdateSttDictionary({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수정되었습니다.');
        invalidate();
        handleClose();
      },
      onError: () => toast.error('수정에 실패했습니다.'),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      form.setFieldsValue({ beforeWord: editItem.beforeWord, afterWord: editItem.afterWord, useYn: String(editItem.useYn) });
    } else {
      form.setFieldsValue({ beforeWord: '', afterWord: '', useYn: '1' });
    }
    return () => {
      Log.debug('SttDictionaryDrawer resetFields');
      form.resetFields();
    };
  }, [form, open, editItem]);

  const onFinish: FormProps<SttDictionaryCreateData>['onFinish'] = (values) => {
    if (isEdit) {
      updateItem({ id: editItem.id, beforeWord: editItem.beforeWord, afterWord: values.afterWord, useYn: values.useYn });
    } else {
      createItem({ beforeWord: values.beforeWord, afterWord: values.afterWord, useYn: values.useYn });
    }
  };

  const onFinishFailed: FormProps<SttDictionaryCreateData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()} loading={isCreating || isUpdating}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={isEdit ? '후처리 사전 수정' : '후처리 사전 추가'} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ beforeWord: '', afterWord: '', useYn: '1' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item
              name="beforeWord"
              label="변경할 단어"
              required
              hasFeedback
              rules={[
                { required: true, message: '변경할 단어를 입력해주세요.' },
                { pattern: /^[가-힣ㄱ-ㅎㅏ-ㅣ0-9 ]+$/, message: '영문자 및 특수문자는 입력할 수 없습니다.' },
              ]}
            >
              <Input placeholder="변경할 단어를 입력하세요." disabled={isEdit} />
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
