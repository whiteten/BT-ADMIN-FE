import { Button, Drawer, Form, InputNumber } from 'antd';
import { Log } from '@/log';
import type { WidgetActionContext } from '../constants/BotDashboardLayoutRenderMapper';
import { ROW_CNT_MAX, ROW_CNT_MIN } from '../constants/dashboardConstants';

interface IntentFailRateTopDrawerProps extends WidgetActionContext {
  open: boolean;
  onClose: () => void;
}

const WIDGET_TITLE = '의도 신뢰도 실패율 순위';

const IntentFailRateTopDrawer = ({ open, onClose, widgetOptions, setOption }: IntentFailRateTopDrawerProps) => {
  const [form] = Form.useForm();

  const handleAfterOpenChange = (visible: boolean) => {
    if (visible) {
      form.setFieldsValue({ rowCnt: widgetOptions.rowCnt });
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
        <Form.Item name="rowCnt" label="최대 표시 개수">
          <InputNumber min={ROW_CNT_MIN} max={ROW_CNT_MAX} className="w-full" />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default IntentFailRateTopDrawer;
