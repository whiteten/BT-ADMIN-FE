import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select, Slider } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetBot, useGetSttList, useGetTtsList, useUpdateBotVoice } from '../hooks/useBotQueries';
import type { BotVoiceUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function BotVoice() {
  const { serviceId } = useParams();
  const [form] = Form.useForm();

  const { data: sttList, isFetching: isFetchingSttList } = useGetSttList();
  const { data: ttsList, isFetching: isFetchingTtsList } = useGetTtsList();
  const sttOptions = sttList?.map((stt) => ({ label: stt.sttName, value: stt.sttId }));
  const ttsOptions = ttsList?.map((tts) => ({ label: tts.ttsName, value: tts.ttsId }));
  const { data: bot, isFetching: isFetchingBot } = useGetBot({ params: { serviceId } });
  const { mutate: updateBotVoice, isPending: isUpdating } = useUpdateBotVoice({
    mutationOptions: {
      onSuccess: () => {
        toast.success('STT & TTS 설정이 저장되었습니다.');
      },
    },
  });

  const onFinish: FormProps<BotVoiceUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateBotVoice({ params: { serviceId }, data: values });
  };

  const onFinishFailed: FormProps<BotVoiceUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!bot) return;
    const { sttId, ttsId, ttsSpeaker, ttsSpeed, ttsVolume, ttsPitch } = bot;
    form.setFieldsValue({ sttId, ttsId, ttsSpeaker, ttsSpeed, ttsVolume, ttsPitch });
  }, [bot, form]);

  return (
    <Form
      form={form}
      initialValues={{ sttId: null, ttsId: null, ttsSpeaker: '', ttsSpeed: 100, ttsVolume: 100, ttsPitch: 100 }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      layout="vertical"
    >
      {isFetchingBot || isFetchingSttList || isFetchingTtsList ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
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
              <Form.Item name="ttsSpeaker" label="TTS 발화자" rules={[{ pattern: /^[a-zA-Z0-9_-]*$/, message: '영문, 숫자, 언더스코어(_), 하이픈(-)만 입력 가능합니다.' }]}>
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
        </>
      )}
    </Form>
  );
}
