import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Form, Input, Row } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/campaign/management' },
  { title: '캠페인', path: '/campaign/management/campaign' },
  { title: '캠페인 생성', path: '/campaign/management/campaign/create' },
];

export default function CampaignCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const handleCancel = () => {
    navigate('../list');
  };

  const handleSubmit = () => {
    form.validateFields().then(() => {
      toast.success('캠페인이 저장되었습니다. (백엔드 연동 전)');
      navigate('../list');
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="w-full h-full bg-white bt-shadow flex flex-col">
        <div className="w-full flex-1 min-h-0 overflow-y-auto p-7">
          <Form form={form} layout="vertical">
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item
                  name="campaignName"
                  label="캠페인"
                  required
                  rules={[
                    { required: true, message: '캠페인 이름을 입력해 주세요.' },
                    { whitespace: true, message: '캠페인 이름을 입력해 주세요.' },
                  ]}
                >
                  <Input placeholder="캠페인 이름을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={24}>
                <Form.Item name="campaignDesc" label="캠페인 설명">
                  <Input.TextArea rows={4} placeholder="캠페인 설명을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
        <div className="w-full px-7 pb-7">
          <Row gutter={20} justify="center">
            <Col>
              <Button onClick={handleCancel}>취소</Button>
            </Col>
            <Col>
              <Button type="primary" onClick={handleSubmit}>
                저장
              </Button>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
}
