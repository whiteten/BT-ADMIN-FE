import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, type FormProps, Input, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetCodes } from '../hooks/useCommonQueries';
import type { SttModelCreateData } from '../types';

export interface SttModelDrawerRef {
  open: (engineCode?: string) => void;
  close: () => void;
}

const SttModelDrawer = forwardRef<SttModelDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (engineCode?: string) => {
      if (engineCode) {
        form.setFieldValue('engineCode', engineCode);
      }
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  const [form] = Form.useForm<SttModelCreateData>();

  const { data: engines } = useGetCodes({ params: { classCd: 'ENGINE_KIND' } });
  const engineOptions = engines?.map((e) => ({ label: e.value, value: e.code })) ?? [];

  useEffect(() => {
    if (!open) return;
    return () => {
      Log.debug('SttModelDrawer resetFields');
      form.resetFields();
    };
  }, [form, open]);

  const onFinish: FormProps<SttModelCreateData>['onFinish'] = (_values) => {
    toast.warning('모델 생성 API 연동 후 사용 가능합니다.');
  };

  const onFinishFailed: FormProps<SttModelCreateData>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields[0]?.errors[0];
    if (firstError) toast.error(firstError);
    Log.warn('onFinishFailed', errorInfo);
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title="모델 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <Form.Item name="engineCode" label="엔진" required rules={[{ required: true, message: '엔진을 선택해주세요.' }]}>
          <Select options={engineOptions} placeholder="엔진을 선택하세요" />
        </Form.Item>
        <Form.Item name="modelVerName" label="모델 이름" required hasFeedback rules={[{ required: true, message: '모델 이름을 입력해주세요.' }]}>
          <Input placeholder="모델 이름을 입력하세요" />
        </Form.Item>
        <Form.Item name="modelDesc" label="모델 적용 내용">
          <Input.TextArea placeholder="모델 적용 내용을 입력하세요" rows={8} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

SttModelDrawer.displayName = 'SttModelDrawer';
export default SttModelDrawer;
