/**
 * 휴식/ACW 사유 코드 등록/수정 드로어.
 *
 * - REASON_CODE: tenantId/codeType/reasonCode/reasonName/reasonDesc
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, message } from 'antd';
import { toast } from '@/shared-util';
import { useCreateReasonCode, useUpdateReasonCode } from '../hooks/useCtiCodeQueries';
import { REASON_CODE_TYPE_ACW, REASON_CODE_TYPE_REST, type ReasonCodeResponse } from '../types';

type Mode = 'create' | 'edit';

export type CtiCodeDrawerState = { open: false } | { open: true; mode: Mode; codeType: number; tenantId?: number | null; reason?: ReasonCodeResponse };

interface Props {
  state: CtiCodeDrawerState;
  onClose: () => void;
}

function codeTypeLabel(codeType: number): string {
  if (codeType === REASON_CODE_TYPE_REST) return '상담 휴식 사유';
  if (codeType === REASON_CODE_TYPE_ACW) return 'ACW 업무';
  return '';
}

/** SWAT IPR20S4040.jsp:233 — 코드분류 콤보박스의 표시 텍스트 (코드값 포함) */
function codeTypeLabelWithCode(codeType: number): string {
  if (codeType === REASON_CODE_TYPE_REST) return `상담 휴식 사유 (${REASON_CODE_TYPE_REST})`;
  if (codeType === REASON_CODE_TYPE_ACW) return `ACW 업무 (${REASON_CODE_TYPE_ACW})`;
  return String(codeType);
}

export default function CtiCodeFormDrawer({ state, onClose }: Props) {
  const [form] = Form.useForm();

  const { mutate: createReason, isPending: isCreating } = useCreateReasonCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사유 코드가 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '등록 실패'),
    },
  });

  const { mutate: updateReason, isPending: isUpdating } = useUpdateReasonCode({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사유 코드가 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => toast.error(extractMessage(err) ?? '수정 실패'),
    },
  });

  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      return;
    }
    if (state.reason) {
      form.setFieldsValue({
        tenantIdInput: state.reason.tenantId,
        reasonCode: state.reason.reasonCode,
        reasonName: state.reason.reasonName,
        reasonDesc: state.reason.reasonDesc,
      });
    } else if (state.tenantId != null) {
      form.setFieldsValue({ tenantIdInput: state.tenantId });
    }
  }, [state, form]);

  if (!state.open) return null;

  const { mode, codeType } = state;
  const submitting = isCreating || isUpdating;

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (mode === 'create') {
        if (!values.tenantIdInput) {
          message.error('테넌트 ID는 필수입니다');
          return;
        }
        createReason({
          tenantId: values.tenantIdInput,
          codeType,
          reasonCode: values.reasonCode ?? undefined,
          reasonName: values.reasonName,
          reasonDesc: values.reasonDesc,
        });
      } else if (state.reason) {
        updateReason({
          path: {
            tenantId: state.reason.tenantId,
            codeType: state.reason.codeType,
            reasonCode: state.reason.reasonCode,
          },
          body: { reasonName: values.reasonName, reasonDesc: values.reasonDesc },
        });
      }
    } catch {
      // form validation error: silent
    }
  };

  return (
    <Drawer
      title={`${mode === 'create' ? '등록' : '수정'} — ${codeTypeLabel(codeType)}`}
      closable={{ placement: 'end' }}
      width={560}
      open={state.open}
      onClose={onClose}
      destroyOnClose
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        {/* SWAT IPR20S4040.jsp:232-236 — 코드분류 콤보박스. 등록·수정 모두 disabled로 현재 분류 명시 표시 */}
        <Form.Item label="코드분류">
          <Input value={codeTypeLabelWithCode(codeType)} disabled style={{ color: 'rgba(0,0,0,0.65)', backgroundColor: '#f5f5f5', cursor: 'default' }} />
        </Form.Item>
        <Form.Item
          label="테넌트 ID"
          name="tenantIdInput"
          rules={[{ required: true, message: '테넌트 ID는 필수입니다' }]}
          tooltip="현재 선택된 테넌트가 자동 채워지면 그대로 둡니다"
        >
          <InputNumber style={{ width: '100%' }} disabled={mode === 'edit'} placeholder="예: 2025001019" />
        </Form.Item>
        <Form.Item
          label="사유 번호"
          name="reasonCode"
          tooltip="0~29 범위. 비워두면 서버에서 자동 채번 (max+1)"
          rules={[{ type: 'number', min: 0, max: 29, message: '0~29 범위만 입력 가능합니다' }]}
        >
          <InputNumber style={{ width: '100%' }} disabled={mode === 'edit'} placeholder="자동 채번 (0~29)" min={0} max={29} />
        </Form.Item>
        <Form.Item
          label="사유 이름"
          name="reasonName"
          rules={[
            { required: true, message: '필수' },
            { max: 16, message: '16자 이내' },
          ]}
        >
          <Input maxLength={16} placeholder="예: 식사, 교육" />
        </Form.Item>
        <Form.Item label="설명" name="reasonDesc" rules={[{ max: 256 }]}>
          <Input.TextArea rows={3} maxLength={256} showCount placeholder="용도 설명 (선택)" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}

function extractMessage(err: unknown): string | undefined {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message;
}
