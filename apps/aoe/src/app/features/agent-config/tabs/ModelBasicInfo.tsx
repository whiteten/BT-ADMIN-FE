import { useParams } from 'react-router-dom';
import { Col, Form, Input, Row } from 'antd';
import { useGetModel } from '../hooks/useModelQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

export default function ModelBasicInfo() {
  const { modelId } = useParams();
  const { data: model, isFetching } = useGetModel({ params: { modelId } });

  if (isFetching) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <FallbackSpinner />
      </div>
    );
  }

  return (
    <Form layout="vertical">
      <Row gutter={20}>
        <Col span={9}>
          <Form.Item label="모델 ID">
            <Input value={model?.modelId} disabled />
          </Form.Item>
        </Col>
        <Col span={9}>
          <Form.Item label="모델 타입">
            <Input value={model?.modelTypeName ?? model?.modelType} disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={20}>
        <Col span={9}>
          <Form.Item label="모델 그룹명">
            <Input value={model?.modelName} disabled />
          </Form.Item>
        </Col>
        <Col span={9}>
          <Form.Item label="API Key">
            <Input.Password value={model?.apiKey} disabled />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
}
