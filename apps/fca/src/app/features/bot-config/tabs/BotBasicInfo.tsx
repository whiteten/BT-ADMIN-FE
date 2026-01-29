import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Select, type SelectProps, Slider, Tag } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys, useDeleteBot, useGetBot, useUpdateBot } from '../hooks/useBotQueries';
import { useGetModels } from '../hooks/useModelQueries';
import type { BotBasicInfoUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconTag } from '@/components/custom/Icons';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function BotBasicInfo() {
  const { serviceId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const modal = useModal();
  const { TextArea } = Input;
  const [form] = Form.useForm();
  const [serviceVer, setServiceVer] = useState('');
  const [confidence, setConfidence] = useState([40, 80]);

  const { data: modelList, isFetching: isFetchingModelList } = useGetModels();
  const modelOptions = modelList?.map((model) => ({ label: model.modelName, value: model.modelId })) ?? [];
  const { data: bot, isFetching } = useGetBot({ params: { serviceId } });

  const { mutate: updateBot, isPending: isUpdating } = useUpdateBot({
    mutationOptions: {
      onSuccess: () => {
        toast.success('봇 기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBot({ serviceId }).queryKey });
      },
    },
  });

  const { mutate: deleteBot, isPending: isDeleting } = useDeleteBot({
    mutationOptions: {
      onSuccess: () => {
        toast.success('봇이 삭제되었습니다.');
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

  const onFinish: FormProps<BotBasicInfoUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    updateBot({ params: { serviceId }, data: values });
  };

  const onFinishFailed: FormProps<BotBasicInfoUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => deleteBot({ serviceId }),
    });
  };

  useEffect(() => {
    if (!bot) return;
    const { serviceName, serviceDesc, modelId, confidence, tags, serviceVer } = bot;
    const hasModelId = modelOptions.some((option) => option.value === modelId);
    form.setFieldsValue({ serviceName, serviceDesc, modelId: hasModelId ? modelId : null, confidence, tags });
    setServiceVer(serviceVer ?? '');
    setConfidence(confidence);
  }, [bot, form, modelOptions]);

  return (
    <Form form={form} initialValues={{ modelId: null, confidence: [40, 80], tags: [] }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching || isFetchingModelList ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={9}>
              <Form.Item
                name="serviceName"
                label="봇 이름"
                required
                hasFeedback
                rules={[
                  { required: true, message: '봇 이름을 입력해 주세요.' },
                  { pattern: /^[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣0-9_\s]+$/, message: '영문, 한글, 숫자, 언더스코어(_), 공백만 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="봇 이름을 입력하세요." disabled />
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
        </>
      )}
    </Form>
  );
}
