import { Button, Drawer, Form, InputNumber, Select, type SelectProps, Tag } from 'antd';
import { Eraser } from 'lucide-react';
import { Log } from '@/log';
import type { WidgetActionContext } from '../constants/BotDashboardLayoutRenderMapper';
import { ROW_CNT_MAX, ROW_CNT_MIN } from '../constants/dashboardConstants';

interface KeywordTopConfigDrawerProps extends WidgetActionContext {
  open: boolean;
  onClose: () => void;
}

const WIDGET_TITLE = '키워드 현황';

const KeywordTopConfigDrawer = ({ open, onClose, widgetOptions, setOption }: KeywordTopConfigDrawerProps) => {
  const [form] = Form.useForm();

  const tagRender: SelectProps['tagRender'] = (props) => {
    const { label, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };
    return (
      <Tag
        variant="filled"
        icon={<Eraser className="mr-0.5" size={14} />}
        className="!inline-flex items-center !px-2 !py-1 !mr-1"
        classNames={{ content: 'max-w-[80px] truncate' }}
        onMouseDown={onPreventMouseDown}
        closable={closable}
        onClose={onClose}
      >
        {label}
      </Tag>
    );
  };

  const handleAfterOpenChange = (visible: boolean) => {
    if (visible) {
      form.setFieldsValue(widgetOptions);
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
        <Form.Item name="excludeWords" label="제외 키워드 (포함되는 단어를 모두 제외)">
          <Select mode="tags" tagRender={tagRender} classNames={{ root: '!p-1' }} placeholder="제외할 키워드를 입력하세요(Enter로 추가)" tokenSeparators={[',']} />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default KeywordTopConfigDrawer;
