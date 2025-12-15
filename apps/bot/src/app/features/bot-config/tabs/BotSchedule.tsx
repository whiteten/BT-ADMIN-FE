import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetBot, useUpdateBotSchedule } from '../hooks/useBotQueries';
import type { BotScheduleUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const worktimeOptions = [
  { label: '24시간 운영', value: 1 },
  { label: '평일 09:00 ~ 18:00', value: 2 },
  { label: '평일 09:00 ~ 21:00', value: 3 },
  { label: '주말 포함 09:00 ~ 18:00', value: 4 },
  { label: '주말 포함 09:00 ~ 21:00', value: 5 },
];

export default function BotSchedule() {
  const { serviceId } = useParams();
  const [form] = Form.useForm();

  const { data: bot, isFetching } = useGetBot({ params: { serviceId } });
  const { mutate: updateBotSchedule, isPending: isUpdating } = useUpdateBotSchedule({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스케쥴 설정이 저장되었습니다.');
      },
    },
  });

  const onFinish: FormProps<BotScheduleUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateBotSchedule({ params: { serviceId }, data: values });
  };

  const onFinishFailed: FormProps<BotScheduleUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!bot) return;
    const { bhWorktimeId, ahMessage } = bot;
    form.setFieldsValue({ bhWorktimeId, ahMessage });
  }, [bot, form]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <Form form={form} initialValues={{ bhWorktimeId: null, ahMessage: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="bhWorktimeId" label="봇 상담 가능 시간" required rules={[{ required: true, message: '업무시간을 선택해 주세요.' }]}>
            <Select options={worktimeOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="업무시간을 선택하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="ahMessage" label="시간 외 메시지">
            <Input.TextArea rows={4} placeholder="업무 시간 외 안내 메시지를 입력하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
        <Col>
          <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating}>
            저장
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
