import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetBot, useGetWorkTimeList, useUpdateBotSchedule } from '../hooks/useBotQueries';
import type { BotScheduleUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function BotSchedule() {
  const { serviceId } = useParams();
  const [form] = Form.useForm();

  const { data: bot, isFetching: isFetchingBot } = useGetBot({ params: { serviceId } });
  const { data: workTimeList, isFetching: isFetchingWorkTimeList } = useGetWorkTimeList();
  const workTimeOptions = workTimeList?.map((workTime) => ({ label: workTime.worktimeName, value: workTime.worktimeId })) ?? [];
  workTimeOptions.unshift({ label: '미지정', value: 0 });
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
    const hasWorktimeId = workTimeOptions.some((option) => option.value === bhWorktimeId);
    form.setFieldsValue({ bhWorktimeId: hasWorktimeId ? bhWorktimeId : null, ahMessage });
  }, [bot, form, workTimeOptions]);

  return (
    <Form form={form} initialValues={{ bhWorktimeId: null, ahMessage: '' }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetchingBot || isFetchingWorkTimeList ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="bhWorktimeId" label="봇 상담 가능 시간" required rules={[{ required: true, message: '업무시간을 선택해 주세요.' }]}>
                <Select options={workTimeOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="업무시간을 선택하세요." />
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
        </>
      )}
    </Form>
  );
}
