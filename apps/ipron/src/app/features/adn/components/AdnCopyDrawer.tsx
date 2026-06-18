/**
 * ADN 복사 Drawer (목업)
 * AS-IS: IPR20S2023_Copy.jsp
 *
 * 동작:
 *  - 선택한 1건의 ADN 을 시작~끝 범위로 일괄 복제
 *  - 자릿수 일치 검증
 *  - md5Auth=1 인 ADN 은 복사 불가 (드로워가 열리지 않게 부모에서 차단)
 */
import { useEffect } from 'react';
import { Alert, Button, Drawer, Form, Input } from 'antd';
import type { AdnResponse } from '../types';
import { getAdnDftStateName } from '../utils/adnEnums';

interface AdnCopyDrawerProps {
  open: boolean;
  source: AdnResponse | null;
  onCancel: () => void;
  onSubmit: (values: AdnCopyFormValues) => void;
}

export interface AdnCopyFormValues {
  startDnNo: string;
  finishDnNo: string;
}

export default function AdnCopyDrawer({ open, source, onCancel, onSubmit }: AdnCopyDrawerProps) {
  const [form] = Form.useForm<AdnCopyFormValues>();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
  }, [open, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    if (values.startDnNo.length !== values.finishDnNo.length) {
      form.setFields([{ name: 'finishDnNo', errors: ['시작/끝 번호의 자릿수가 같아야 합니다'] }]);
      return;
    }
    if (Number(values.finishDnNo) < Number(values.startDnNo)) {
      form.setFields([{ name: 'finishDnNo', errors: ['끝 번호는 시작 번호보다 커야 합니다'] }]);
      return;
    }
    onSubmit(values);
  };

  return (
    <Drawer
      title="ADN 복사 생성"
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      width={480}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" onClick={handleOk} disabled={!source}>
            복사
          </Button>
        </div>
      }
    >
      <Alert type="info" showIcon message="선택한 ADN 의 속성을 그대로 복사해서 시작~끝 범위로 일괄 등록합니다." className="!mb-4" />

      {source && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
          <div className="grid grid-cols-2 gap-y-1">
            <div className="text-gray-500">테넌트</div>
            <div>{source.tenantName}</div>
            <div className="text-gray-500">소스 ADN</div>
            <div className="font-medium">{source.dnNo}</div>
            <div className="text-gray-500">상담원 기본상태</div>
            <div>{getAdnDftStateName(source.adnDftState)}</div>
          </div>
        </div>
      )}

      <Form form={form} layout="vertical" requiredMark>
        <Form.Item
          label="시작 ADN 번호"
          name="startDnNo"
          rules={[
            { required: true, message: '시작 번호를 입력하세요' },
            { pattern: /^\d{3,8}$/, message: '3~8자리 숫자' },
          ]}
        >
          <Input placeholder="예: 8010" maxLength={8} />
        </Form.Item>

        <Form.Item
          label="끝 ADN 번호"
          name="finishDnNo"
          rules={[
            { required: true, message: '끝 번호를 입력하세요' },
            { pattern: /^\d{3,8}$/, message: '3~8자리 숫자' },
          ]}
        >
          <Input placeholder="예: 8020" maxLength={8} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
