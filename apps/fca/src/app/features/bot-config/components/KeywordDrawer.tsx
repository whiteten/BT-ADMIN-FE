import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { modelQueryKeys, useCreateKeyword, useUpdateKeyword } from '../hooks/useModelQueries';
import type { KeywordCreateDatas, KeywordListItem } from '../types/keyword';

export interface KeywordDrawerRef {
  open: (params: { modelId: string; keywordData?: KeywordListItem }) => void;
  close: () => void;
}

interface DrawerState {
  open: boolean;
  modelId: string;
  keywordData?: KeywordListItem;
}

const KeywordDrawer = forwardRef<KeywordDrawerRef>((_, ref) => {
  const [drawerState, setDrawerState] = useState<DrawerState>({ open: false, modelId: '' });
  const [form] = Form.useForm<KeywordCreateDatas>();
  const queryClient = useQueryClient();

  const { open, modelId, keywordData } = drawerState;
  const isEditMode = !!keywordData;

  useImperativeHandle(ref, () => ({
    open: (params) => setDrawerState({ open: true, modelId: params.modelId, keywordData: params.keywordData }),
    close: () => setDrawerState((prev) => ({ ...prev, open: false })),
  }));

  const handleClose = () => setDrawerState((prev) => ({ ...prev, open: false }));

  const { mutate: createKeyword, isPending: isCreating } = useCreateKeyword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('키워드가 추가되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getKeywords({ modelId }).queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('createKeyword failed', error),
    },
  });

  const { mutate: updateKeyword, isPending: isUpdating } = useUpdateKeyword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('키워드가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: modelQueryKeys.getKeywords({ modelId }).queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('updateKeyword failed', error),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEditMode && keywordData) {
      form.setFieldsValue({ keyword: keywordData.keyword });
    }
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [form, open, keywordData, isEditMode]);

  const onFinish: FormProps<KeywordCreateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    if (isEditMode && keywordData) {
      updateKeyword({ params: { modelId, keywordId: keywordData.keywordId }, data: values });
    } else {
      createKeyword({ params: { modelId }, data: values });
    }
  };

  const onFinishFailed: FormProps<KeywordCreateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
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
    <Drawer open={open} onClose={handleClose} title={isEditMode ? '키워드 수정' : '키워드 추가'} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ keyword: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item
              name="keyword"
              label="키워드명"
              required
              hasFeedback
              rules={[
                { required: true, whitespace: true, message: '키워드명을 입력하세요.' },
                { pattern: /^[가-힣][가-힣\s]*$/, message: '한글과 공백만 입력 가능하며, 한글로 시작해야 합니다.' },
              ]}
            >
              <Input placeholder="키워드명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

KeywordDrawer.displayName = 'KeywordDrawer';
export default KeywordDrawer;
