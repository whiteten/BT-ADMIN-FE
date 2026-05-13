import { forwardRef, useImperativeHandle, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { Button, Drawer, Form, Input, Upload } from 'antd';
import { toast } from '@/shared-util';

export interface LicenseRegisterDrawerRef {
  open: () => void;
  close: () => void;
}

interface LicenseRegisterDrawerProps {
  onRegister: (licenseKey: string) => void;
  isLoading?: boolean;
}

const LicenseRegisterDrawer = forwardRef<LicenseRegisterDrawerRef, LicenseRegisterDrawerProps>(({ onRegister, isLoading }, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm();

  useImperativeHandle(ref, () => ({
    open: () => {
      form.resetFields();
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
  }));

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onRegister(values.licenseKey);
    });
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmit} loading={isLoading}>
        등록
      </Button>
    </div>
  );

  return (
    <Drawer open={isOpen} onClose={handleClose} title="라이선스 등록" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical">
        <Form.Item
          label="라이선스 암호화 키"
          name="licenseKey"
          rules={[{ required: true, message: '암호화 키를 입력하세요.' }]}
          extra="라이선스 발급 시 제공된 암호화 키를 입력하거나, 아래 파일에서 불러올 수 있습니다."
        >
          <Input.TextArea placeholder="암호화 키를 붙여넣으세요..." rows={10} maxLength={10000} className="!resize-none" />
        </Form.Item>

        <Form.Item label="라이선스 파일">
          <Upload.Dragger
            accept=".txt"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              const isTxt = /\.txt$/i.test(file.name);
              if (!isTxt) {
                toast.warning('확장자가 .txt 파일만 가능합니다.');
                return Upload.LIST_IGNORE;
              }
              const reader = new FileReader();
              reader.onload = () => {
                form.setFieldsValue({ licenseKey: reader.result as string });
                toast.success(`${file.name} 파일을 불러왔습니다.`);
              };
              reader.readAsText(file, 'UTF-8');
              return false;
            }}
          >
            <p className="text-sm">파일을 드래그하거나 클릭하여 선택하세요</p>
            <p className="text-xs text-gray-500">허용 가능한 확장자: .txt</p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Drawer>
  );
});

LicenseRegisterDrawer.displayName = 'LicenseRegisterDrawer';
export default LicenseRegisterDrawer;
