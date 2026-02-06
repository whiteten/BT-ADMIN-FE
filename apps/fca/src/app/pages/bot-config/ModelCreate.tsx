import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Col, Form, type FormProps, Input, Row, Upload, type UploadFile } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useCreateModel } from '../../features/bot-config/hooks/useModelQueries';
import { useModelRoute } from '../../features/bot-config/hooks/useModelRoute';
import type { ModelCreateDatas } from '../../features/bot-config/types';
import { ModelType } from '../../features/bot-config/types/model';
import PageHeader from '@/components/custom/PageHeader';

export default function ModelCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { isPublic } = useModelRoute();

  const privateBreadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/fca/bot-config' },
    { title: '모델', path: '/fca/bot-config/model' },
    { title: '모델 생성', path: '/fca/bot-config/model/create' },
  ];

  const publicBreadcrumb: BreadcrumbProps['items'] = [
    { title: '봇 관리', path: '/fca/bot-config' },
    { title: '공용 모델', path: '/fca/global/model' },
    { title: '공용 모델 생성', path: '/fca/global/model/create' },
  ];

  const initialValues = { modelName: '', expansion1: '' };

  const { mutate: createModel, isPending: isCreatingModel } = useCreateModel({
    mutationOptions: {
      onSuccess: () => {
        toast.success('모델이 생성되었습니다.');
        navigate('../list');
      },
    },
  });
  const onFinish: FormProps<ModelCreateDatas & { file?: UploadFile[] }>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    const file = values.file?.[0]?.originFileObj as File | undefined;
    createModel({ ...values, file, modelType: isPublic ? ModelType.PUBLIC : ModelType.NORMAL });
  };
  const onFinishFailed: FormProps<ModelCreateDatas>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };
  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={isPublic ? publicBreadcrumb : privateBreadcrumb} />
      <div className="w-full h-full bg-white bt-shadow overflow-y-auto">
        <div className="flex flex-col w-full h-full p-7 pb-0">
          <Form form={form} initialValues={initialValues} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
            <Row gutter={20}>
              <Col span={12}>
                <Form.Item
                  name="modelName"
                  label="모델 이름"
                  required
                  hasFeedback
                  rules={[
                    { required: true, message: '모델 이름을 입력해 주세요.' },
                    { pattern: /^\S*$/, message: '공백은 사용할 수 없습니다.' },
                  ]}
                >
                  <Input placeholder="모델 이름을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={24}>
                <Form.Item name="expansion1" label="모델 설명">
                  <Input.TextArea rows={4} placeholder="모델 설명을 입력하세요." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20}>
              <Col span={9}>
                <Form.Item
                  name="file"
                  label="엑셀 파일"
                  valuePropName="fileList"
                  tooltip={{
                    title: <span style={{ whiteSpace: 'pre-line' }}>{`모델에서 Export한 엑셀 파일을 업로드하여, 모델을 생성합니다.\n의도, 개체 정보를 포함하여 생성됩니다.`}</span>,
                    styles: { root: { maxWidth: 400 } },
                  }}
                  getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
                >
                  <Upload.Dragger
                    accept=".xlsx,.xls"
                    maxCount={1}
                    beforeUpload={(file) => {
                      const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                      if (!isExcel) {
                        toast.warning('지정된 확장자의 파일만 업로드할 수 있습니다.(.xlsx, .xls)');
                        return Upload.LIST_IGNORE;
                      }
                      const isWithinLimit = file.size / 1024 / 1024 < 10;
                      if (!isWithinLimit) {
                        toast.warning('파일 크기는 10MB 이하여야 합니다.');
                        return Upload.LIST_IGNORE;
                      }
                      return false;
                    }}
                  >
                    <p className="text-sm">파일을 드래그하거나 클릭하여 선택하세요</p>
                    <p className="text-xs text-gray-500">허용 가능한 확장자: .xlsx, .xls</p>
                  </Upload.Dragger>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={20} justify="center" className="sticky bottom-0 bg-white/90 z-10 pb-7">
              <Col>
                <Button variant="solid" color="primary" htmlType="submit" loading={isCreatingModel}>
                  저장
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </div>
  );
}
