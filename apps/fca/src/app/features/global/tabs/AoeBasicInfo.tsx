import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { aoeQueryKeys, useCreateAoeBasic, useGetAoeBasicDetail } from '../hooks/useAoeQueries';
import type { AoeBasicFormDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function AoeBasicInfo() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // GET 방식으로 bff bot-aoe-detail API 호출
  const { data: aoeBasicDetail, isFetching } = useGetAoeBasicDetail({});
  const { mutate: createAoeBasic, isPending: isCreating } = useCreateAoeBasic({
    mutationOptions: {
      onSuccess: () => {
        toast.success('AOE 연동 URL이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: aoeQueryKeys.getAoeBasicDetail().queryKey });
      },
    },
  });

  const onFinish: FormProps<AoeBasicFormDatas>['onFinish'] = (values) => {
    Log.debug('onFinish', values);

    // upsert 방식으로 서버에서 처리
    const data = {
      url: values.aoeUrl ?? '',
    };
    createAoeBasic(data);
  };

  const onFinishFailed: FormProps<AoeBasicFormDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  // API 응답 데이터를 Form에 설정
  useEffect(() => {
    if (!aoeBasicDetail) return;
    const { url } = aoeBasicDetail;
    form.setFieldsValue({ aoeUrl: url });
  }, [aoeBasicDetail, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed}>
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="aoeUrl" label="AOE 연동 URL" rules={[{ required: true, message: 'AOE 연동 URL을 입력하세요.' }]}>
                <Input placeholder="AOE 연동 URL을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isCreating}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
