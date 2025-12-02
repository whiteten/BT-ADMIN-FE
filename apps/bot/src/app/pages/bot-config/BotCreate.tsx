import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select, type SelectProps, Slider, Tag } from 'antd';
import { Log } from '@/log';
import type { BotCreateField } from '../../features/bot-config/types';
import { IconTag } from '@/components/custom/Icons';
import PageHeader from '@/components/custom/PageHeader';

export default function BotCreate() {
  const navigate = useNavigate();
  const { TextArea } = Input;
  const [confidence, setConfidence] = useState([40, 80]);
  const modelOptions = [
    { label: 'NLU 모델 1', value: 'nluModel1' },
    { label: 'NLU 모델 2', value: 'nluModel2' },
    { label: 'NLU 모델 3', value: 'nluModel3' },
  ];
  const [form] = Form.useForm();
  const getSliderRailBackground = () => {
    const [min, max] = confidence;
    return `linear-gradient(to right, #F06548 0%, #F06548 ${min}%, #d9d9d9 ${min}%, #d9d9d9 ${max}%, #405189 ${max}%, #405189 100%)`;
  };

  const tagRender: SelectProps['tagRender'] = (props) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };
    return (
      <Tag
        variant="filled"
        icon={<IconTag className="mr-0.5" />}
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

  const onFinish: FormProps<BotCreateField>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    navigate('../list');
  };

  const onFinishFailed: FormProps<BotCreateField>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full overflow-hidden">
      <PageHeader title="봇 생성" breadcrumb="봇 관리 > 봇 > 봇 생성" />
      <div className="w-full h-[calc(100%-58px-20px)] min-h-[calc(100%-58px-20px)] bg-white bt-shadow p-7 overflow-y-auto">
        <Form form={form} initialValues={{ modelId: null, confidence: [40, 80], tags: [] }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
          <Row>
            <Col span={12}>
              <Form.Item name="serviceName" label="봇 이름" required hasFeedback rules={[{ required: true, message: '봇 이름을 입력해 주세요.' }]}>
                <Input placeholder="봇 이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="serviceDesc" label="봇 설명">
                <TextArea rows={4} placeholder="봇 설명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={6}>
              <Form.Item name="modelId" label="NLU 모델" required hasFeedback rules={[{ required: true, message: 'NLU 모델을 선택해 주세요.' }]}>
                <Select options={modelOptions} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="봇이 이용할 언어 모델을 선택하세요." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="confidence" label="신뢰도" required hasFeedback rules={[{ required: true, message: '신뢰도를 설정해 주세요.' }]}>
                <Slider
                  range
                  value={confidence}
                  onChange={setConfidence}
                  min={0}
                  max={100}
                  step={1}
                  marks={{ 0: '0', 100: '100' }}
                  tooltip={{ formatter: (value) => `${value}%` }}
                  styles={{
                    rail: { background: getSliderRailBackground() },
                    track: { background: 'transparent' },
                  }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24}>
              <Form.Item name="tags" label="태그">
                <Select mode="tags" tagRender={tagRender} classNames={{ root: '!p-1' }} placeholder="태그를 입력하세요(Enter로 추가)" tokenSeparators={[',']} />
              </Form.Item>
            </Col>
          </Row>
          <Row justify="center">
            <Col>
              <Button color="primary" variant="solid" htmlType="submit">
                저장
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
}
