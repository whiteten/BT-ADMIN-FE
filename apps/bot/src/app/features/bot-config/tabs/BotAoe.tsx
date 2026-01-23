import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Row, Select, Switch } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { botQueryKeys, useGetBotAoeDetail, useUpdateBotAoe } from '../hooks/useBotQueries';
import { useGetAoeAgents } from '../hooks/useModelQueries';
import type { BotAoeUpdateDatas } from '../types';
import { AgentType } from '../types/aoe';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function BotAoe() {
  const { serviceId } = useParams();
  const queryClient = useQueryClient();
  const { data: botAoeDetail, isFetching: isFetchingBotAoeDetail } = useGetBotAoeDetail({ params: { serviceId } });
  const { data: aoeAgents, isFetching: isFetchingAoeAgents } = useGetAoeAgents({ params: { agentType: AgentType.FAQ } });
  const { mutate: updateBotAoe, isPending: isUpdating } = useUpdateBotAoe({
    mutationOptions: {
      onSuccess: () => {
        toast.success('AOE 설정이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: botQueryKeys.getBotAoeDetail({ serviceId }).queryKey });
      },
    },
  });
  const aoeAgentOptions = aoeAgents?.map((agent) => ({ label: agent.agentName, value: agent.agentId })) ?? [];
  const [form] = Form.useForm();
  const useAoe = Form.useWatch('useAoe', form);

  const onFinish: FormProps<BotAoeUpdateDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const data = {
      ...values,
      agentId: values.useAoe ? values.agentId : null,
    };
    updateBotAoe({ params: { serviceId }, data });
  };

  const onFinishFailed: FormProps<BotAoeUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  useEffect(() => {
    if (!botAoeDetail) return;
    const { useAoe, agentId } = botAoeDetail;
    form.setFieldsValue({ useAoe, agentId });
  }, [botAoeDetail, form]);

  return (
    <Form form={form} initialValues={{ useAoe: 0, agentId: null }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="horizontal">
      {isFetchingBotAoeDetail || isFetchingAoeAgents ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="useAoe" label="AOE 활성화" required getValueProps={(value) => ({ checked: value === 1 })} getValueFromEvent={(checked) => (checked ? 1 : 0)}>
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          {useAoe === 1 && (
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item name="agentId" label="FAQ Agent" required hasFeedback rules={[{ required: true, message: 'FAQ Agent를 선택하세요.' }]}>
                  <Select options={aoeAgentOptions} loading={isFetchingAoeAgents} allowClear showSearch={{ optionFilterProp: 'label' }} placeholder="FAQ Agent를 선택하세요." />
                </Form.Item>
              </Col>
            </Row>
          )}
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
