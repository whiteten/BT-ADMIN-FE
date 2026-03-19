import { Button, Drawer, Form, Radio } from 'antd';
import { Log } from '@/log';
import type { WidgetActionContext } from '../constants/layoutRenderMapper';

interface DialogIncompleteTopDrawerProps extends WidgetActionContext {
  open: boolean;
  onClose: () => void;
}

const WIDGET_TITLE = '대화 미완결율 순위';

const TOP_N_OPTIONS = [5, 10, 20];

const DialogIncompleteTopDrawer = ({ open, onClose, widgetOptions, setOption }: DialogIncompleteTopDrawerProps) => {
  const [form] = Form.useForm();

  const handleAfterOpenChange = (visible: boolean) => {
    if (visible) {
      form.setFieldsValue({ topN: widgetOptions.topN });
    }
  };

  const onFinish = (values: Record<string, unknown>) => {
    Object.entries(values).forEach(([key, value]) => setOption(key, value));
    onClose();
  };

  const onFinishFailed = (errorInfo: unknown) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={onClose}>
        닫기
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmitBtn}>
        적용
      </Button>
    </div>
  );

  return (
    <Drawer title="위젯 상세 설정" open={open} onClose={onClose} closable={{ placement: 'end' }} size={480} footer={footer} afterOpenChange={handleAfterOpenChange} destroyOnHidden>
      <div className="mb-6 border-l-4 border-[#405189] pl-3">
        <span className="text-xs text-gray-400">위젯</span>
        <p className="text-base font-semibold text-gray-800">{WIDGET_TITLE}</p>
      </div>
      <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <Form.Item name="topN" label="표시 개수">
          <Radio.Group>
            {TOP_N_OPTIONS.map((n) => (
              <Radio key={n} value={n}>
                Top {n}
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default DialogIncompleteTopDrawer;
