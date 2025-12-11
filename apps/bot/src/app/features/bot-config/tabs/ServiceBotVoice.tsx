import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select, Slider } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetServiceBot, useUpdateServiceBotVoice } from '../hooks/useServiceBotQueries';
import type { ServiceBotVoiceUpdateDatas } from '../types';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';
const sttOptions = [
  { label: 'STT 타입 1', value: 1000000001 },
  { label: 'STT 타입 2', value: 1000000002 },
  { label: 'STT 타입 3', value: 1000000003 },
];
const ttsOptions = [
  { label: 'TTS 타입 1', value: 1100000001 },
  { label: 'TTS 타입 2', value: 1100000002 },
  { label: 'TTS 타입 3', value: 1100000003 },
];

export default function ServiceBotVoice() {
  const { serviceId } = useParams();
  const [form] = Form.useForm();

  const { data: serviceBot, isFetching } = useGetServiceBot({ params: { serviceId } });
  const { mutate: updateServiceBotVoice, isPending: isUpdating } = useUpdateServiceBotVoice({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT & TTS 설정이 저장되었습니다.');
      },
    },
  });

  const onFinish: FormProps<ServiceBotVoiceUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateServiceBotVoice({ params: { serviceId }, data: values });
  };

  const onFinishFailed: FormProps<ServiceBotVoiceUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!serviceBot) return;
    const { sttId, ttsId, ttsSpeaker, ttsSpeed, ttsVolume, ttsPitch } = serviceBot;
    form.setFieldsValue({ sttId, ttsId, ttsSpeaker, ttsSpeed, ttsVolume, ttsPitch });
  }, [serviceBot, form]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <Form
      form={form}
      initialValues={{ sttId: null, ttsId: null, ttsSpeaker: '', ttsSpeed: 100, ttsVolume: 100, ttsPitch: 100 }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      layout="vertical"
    >
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="sttId" label="STT 타입" required rules={[{ required: true, message: 'STT 타입을 선택해 주세요.' }]}>
            <Select options={sttOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="STT 타입을 선택하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="ttsId" label="TTS 타입" required rules={[{ required: true, message: 'TTS 타입을 선택해 주세요.' }]}>
            <Select options={ttsOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="TTS 타입을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ttsSpeaker" label="TTS 발화자">
            <Input placeholder="TTS 발화자를 입력하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item name="ttsSpeed" label="TTS 속도">
            <Slider min={50} max={150} step={1} marks={{ 50: '50', 150: '150' }} tooltip={{ formatter: (value) => `${value}%` }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ttsVolume" label="TTS 볼륨">
            <Slider min={50} max={150} step={1} marks={{ 50: '50', 150: '150' }} tooltip={{ formatter: (value) => `${value}%` }} />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="ttsPitch" label="TTS 피치">
            <Slider min={50} max={150} step={1} marks={{ 50: '50', 150: '150' }} tooltip={{ formatter: (value) => `${value}%` }} />
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
