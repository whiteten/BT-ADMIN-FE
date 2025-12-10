import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Form, type FormProps, Input, Row, Select, type SelectProps, Slider, Tag } from 'antd';
import { Log } from '@/log';
import { confirmModal } from '@/shared-util';
import { useDeleteServiceBot, useGetServiceBot, useUpdateServiceBot } from '../hooks/useServiceBotQueries';
import type { ServiceBotBasicInfoUpdateDatas } from '../types';
import { IconTag } from '@/components/custom/Icons';
import { FallbackSpinner } from '@/libs/shared-ui/src/components/custom/FallbackSpinner';

const modelOptions = [
  { label: 'NLU 모델 1', value: '1200000001' },
  { label: 'NLU 모델 2', value: '1200000002' },
  { label: 'NLU 모델 3', value: '1200000003' },
];

export default function ServiceBotBasicInfo() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { TextArea } = Input;
  const [form] = Form.useForm();
  const [serviceVer, setServiceVer] = useState('');
  const [confidence, setConfidence] = useState([40, 80]);

  const { data: serviceBot, isFetching } = useGetServiceBot({ params: { serviceId } });

  const { mutate: updateServiceBot, isPending: isUpdating } = useUpdateServiceBot({
    mutationOptions: {
      onSuccess: () => {
        navigate('../list');
      },
    },
  });

  const { mutateAsync: deleteServiceBot, isPending: isDeleting } = useDeleteServiceBot({
    mutationOptions: {
      onSuccess: () => {
        navigate('../list');
      },
    },
  });

  const getSliderRailBackground = () => {
    const [min, max] = confidence;
    return `linear-gradient(to right, #F06548 0%, #F06548 ${min}%, #d9d9d9 ${min}%, #d9d9d9 ${max}%, #405189 ${max}%, #405189 100%)`;
  };

  const tagRender: SelectProps['tagRender'] = (props) => {
    const { label, closable, onClose } = props;
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

  const onFinish: FormProps<ServiceBotBasicInfoUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateServiceBot({ params: { serviceId }, data: values });
  };

  const onFinishFailed: FormProps<ServiceBotBasicInfoUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    confirmModal.delete({
      onOk: () => deleteServiceBot({ serviceId }),
    });
  };

  useEffect(() => {
    if (!serviceBot) return;
    const { serviceName, serviceDesc, modelId, confidence, tags, serviceVer } = serviceBot;
    form.setFieldsValue({ serviceName, serviceDesc, modelId, confidence, tags });
    setServiceVer(serviceVer ?? '');
    setConfidence(confidence);
  }, [serviceBot, form]);

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <Form form={form} initialValues={{ modelId: null, confidence: [40, 80], tags: [] }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={9}>
          <Form.Item name="serviceName" label="봇 이름" required hasFeedback rules={[{ required: true, message: '봇 이름을 입력해 주세요.' }]}>
            <Input placeholder="봇 이름을 입력하세요." />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="봇 버전">
            <Input disabled value={serviceVer} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
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
      <Row gutter={20}>
        <Col span={24}>
          <Form.Item name="tags" label="태그">
            <Select mode="tags" tagRender={tagRender} classNames={{ root: '!p-1' }} placeholder="태그를 입력하세요(Enter로 추가)" tokenSeparators={[',']} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
        <Col>
          <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting}>
            저장
          </Button>
        </Col>
        <Col>
          <Button color="red" variant="solid" loading={isDeleting} onClick={handleClickDeleteBtn}>
            삭제
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
