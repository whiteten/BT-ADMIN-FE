import { Button, Drawer, Form, Slider } from 'antd';
import { Log } from '@/log';
import type { WidgetActionContext } from '../constants/BotDashboardLayoutRenderMapper';

interface SlotRetryAvgTopDrawerProps extends WidgetActionContext {
  open: boolean;
  onClose: () => void;
}

const WIDGET_TITLE = '슬롯 평균 재시도 횟수 순위';

const ROW_CNT_MIN = 1;
const ROW_CNT_MAX = 10;

const SlotRetryAvgTopDrawer = ({ open, onClose, widgetOptions, setOption }: SlotRetryAvgTopDrawerProps) => {
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
          <Slider
            min={ROW_CNT_MIN}
            max={ROW_CNT_MAX}
            marks={Object.fromEntries(Array.from({ length: ROW_CNT_MAX - ROW_CNT_MIN + 1 }, (_, i) => [ROW_CNT_MIN + i, `${ROW_CNT_MIN + i}`]))}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default SlotRetryAvgTopDrawer;
