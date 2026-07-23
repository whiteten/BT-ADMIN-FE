import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, DatePicker, Form, type FormProps, Input, InputNumber, Row, Select } from 'antd';
import { type Dayjs } from 'dayjs';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { CAMPAIGN_IN_USE_OPTIONS, CAMPAIGN_SERVICE_TYPE_OPTIONS } from '../constants/campaignManagementConstants';
import { campaignQueryKeys, useCreateCampaignMaster } from '../hooks/useCampaignQueries';
import { splitCampaignDateTime } from '../utils/campaignMasterUtils';

type CampaignBasicInfoCreateFormValues = {
  campaignName: string;
  executionPeriod?: [Dayjs, Dayjs];
  sortOrder?: number;
  priority?: number;
  serviceType?: string;
  inUse?: boolean;
};

const initialValues: Partial<CampaignBasicInfoCreateFormValues> = {
  inUse: true,
};

export default function CampaignBasicInfoCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CampaignBasicInfoCreateFormValues>();

  const createCampaignMaster = useCreateCampaignMaster({
    mutationOptions: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: campaignQueryKeys.getCampaignMasterList().queryKey });
        toast.success('캠페인이 저장되었습니다.');
        navigate('../basic-info');
      },
      onError: (error) => {
        Log.warn('createCampaignMaster', error);
        toast.error('캠페인 저장에 실패했습니다.');
      },
    },
  });

  const onFinish: FormProps<CampaignBasicInfoCreateFormValues>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const [start, end] = values.executionPeriod ?? [];
    const { date: campaignStartdate, time: campaignStarttime } = splitCampaignDateTime(start);
    const { date: campaignEnddate, time: campaignEndtime } = splitCampaignDateTime(end);

    createCampaignMaster.mutate({
      campaignName: values.campaignName,
      campaignStartdate,
      campaignStarttime,
      campaignEnddate,
      campaignEndtime,
      sortSeq: values.sortOrder ?? null,
      priority: values.priority ?? null,
      expansion1: values.serviceType ?? null,
      enableYn: values.inUse ? 1 : 0,
    });
  };

  const onFinishFailed: FormProps<CampaignBasicInfoCreateFormValues>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    if (firstError) toast.error(firstError);
  };

  const handleClickCancelBtn = () => {
    form.resetFields();
    navigate(-1);
  };

  return (
    <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      <Row gutter={20}>
        <Col span={9}>
          <Form.Item
            name="campaignName"
            label="캠페인"
            required
            hasFeedback
            rules={[
              { required: true, message: '캠페인 이름을 입력해 주세요.' },
              { whitespace: true, message: '캠페인 이름을 입력해 주세요.' },
            ]}
          >
            <Input placeholder="캠페인 이름을 입력하세요." />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="캠페인ID" required>
            <Input disabled placeholder="자동생성" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={12}>
          <Form.Item name="executionPeriod" label="실행기간">
            <DatePicker.RangePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={4}>
          <Form.Item name="sortOrder" label="정렬순서">
            <InputNumber min={1} className="w-full" placeholder="정렬순서" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="priority" label="우선순위">
            <InputNumber min={1} className="w-full" placeholder="우선순위" />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="serviceType" label="서비스구분">
            <Select options={[...CAMPAIGN_SERVICE_TYPE_OPTIONS]} allowClear placeholder="서비스구분을 선택하세요." />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="inUse" label="사용여부">
            <Select options={[...CAMPAIGN_IN_USE_OPTIONS]} placeholder="사용여부를 선택하세요." />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={6}>
          <Form.Item label="작업자">
            <Input disabled placeholder="저장시 입력" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="작업일시">
            <Input disabled placeholder="저장시 입력" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
        <Col>
          <Button color="primary" variant="solid" htmlType="submit" loading={createCampaignMaster.isPending}>
            저장
          </Button>
        </Col>
        <Col>
          <Button variant="solid" onClick={handleClickCancelBtn}>
            취소
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
