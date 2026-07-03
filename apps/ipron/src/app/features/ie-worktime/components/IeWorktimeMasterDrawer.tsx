/**
 * IE 업무시간 마스터 등록/수정 Drawer.
 *
 * 필드: 테넌트(읽기전용 표시 — cti-code 패턴) · 업무시간명(필수) · 업무시간KEY(선택, 입력 시 유일) · 설명.
 * 슬롯(시간대)은 카드 확장 영역에서 별도 관리.
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, Typography } from 'antd';
import type { IeWorktimeMaster, IeWorktimeMasterRequest } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  item?: IeWorktimeMaster | null;
  tenantId: number | null;
  tenantName?: string | null; // create 시 선택 테넌트명
  onCancel: () => void;
  onSubmit: (req: IeWorktimeMasterRequest) => void;
  loading?: boolean;
}

interface FormValues {
  worktimeName: string;
  groupKey?: string;
  worktimeDesc?: string;
}

export default function IeWorktimeMasterDrawer({ open, mode, item, tenantId, tenantName, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  // 표시할 테넌트명: 수정 시 항목 소속, 등록 시 선택 테넌트
  const displayTenantName =
    mode === 'edit' && item ? (item.tenantName ?? (item.tenantId != null ? `#${item.tenantId}` : '—')) : (tenantName ?? (tenantId != null ? `#${tenantId}` : '—'));

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item) {
      form.setFieldsValue({ worktimeName: item.worktimeName, groupKey: item.groupKey ?? '', worktimeDesc: item.worktimeDesc ?? '' });
    } else {
      form.setFieldsValue({ worktimeName: '', groupKey: '', worktimeDesc: '' });
    }
  }, [open, mode, item, form]);

  const handleFinish = (values: FormValues) => {
    const req: IeWorktimeMasterRequest = {
      tenantId: mode === 'create' ? (tenantId ?? 0) : (item?.tenantId ?? tenantId ?? 0),
      worktimeName: values.worktimeName,
      groupKey: values.groupKey?.trim() ? values.groupKey.trim() : null,
      worktimeDesc: values.worktimeDesc ?? null,
    };
    onSubmit(req);
  };

  return (
    <Drawer
      title={mode === 'create' ? 'IE 업무시간 등록' : 'IE 업무시간 수정'}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      width={460}
      destroyOnClose
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '등록' : '저장'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        <Form.Item label="테넌트">
          <div className="flex items-center px-3 py-1.5 rounded border border-gray-200 bg-gray-50 min-h-[32px]" style={{ color: 'rgba(0,0,0,0.65)', cursor: 'default' }}>
            <Typography.Text ellipsis style={{ color: 'inherit' }}>
              {displayTenantName}
            </Typography.Text>
          </div>
        </Form.Item>

        <Form.Item
          name="worktimeName"
          label="업무시간명"
          rules={[
            { required: true, message: '업무시간명을 입력하세요' },
            { max: 100, message: '100자까지 입력 가능합니다' },
          ]}
        >
          <Input placeholder="예: 교대근무" maxLength={100} />
        </Form.Item>

        <Form.Item name="groupKey" label="업무시간KEY (선택)" rules={[{ max: 64, message: '64자까지 입력 가능합니다' }]}>
          <Input placeholder="입력 시 중복 불가" maxLength={64} />
        </Form.Item>

        <Form.Item name="worktimeDesc" label="설명" rules={[{ max: 256, message: '256자까지 입력 가능합니다' }]}>
          <Input.TextArea rows={3} maxLength={256} placeholder="설명 (선택)" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
