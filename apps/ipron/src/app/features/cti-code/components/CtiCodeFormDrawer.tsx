/**
 * 휴식/ACW 사유 코드 등록/수정 드로어.
 *
 * - REASON_CODE: tenantId/codeType/reasonCode/reasonName/reasonDesc
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Typography } from 'antd';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useCreateReasonCode, useUpdateReasonCode } from '../hooks/useCtiCodeQueries';
import { REASON_CODE_TYPE_ACW, REASON_CODE_TYPE_REST, type ReasonCodeResponse } from '../types';

type Mode = 'create' | 'edit';

export type CtiCodeDrawerState = { open: false } | { open: true; mode: Mode; codeType: number; tenantId?: number | null; tenantName?: string | null; reason?: ReasonCodeResponse };

interface Props {
  state: CtiCodeDrawerState;
  onClose: () => void;
}

function codeTypeLabel(codeType: number): string {
  if (codeType === REASON_CODE_TYPE_REST) return '상담 휴식 사유';
  if (codeType === REASON_CODE_TYPE_ACW) return '후처리(ACW) 업무';
  return '';
}

function codeTypeLabelWithCode(codeType: number): string {
  if (codeType === REASON_CODE_TYPE_REST) return '상담 휴식 사유';
  if (codeType === REASON_CODE_TYPE_ACW) return '후처리(ACW) 업무';
  return String(codeType);
}

export default function CtiCodeFormDrawer({ state, onClose }: Props) {
  const [form] = Form.useForm();
  // 운영자 모드에서만 "테넌트" 표시 필드 노출. 일반 콘솔은 로그인(활성) 테넌트로 고정 → 숨김.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });

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
    } else {
      // 등록: 일반 모드는 로그인 테넌트로 고정(부모 전달값 우선, 없으면 활성 테넌트 폴백).
      form.setFieldsValue({ tenantIdInput: state.tenantId ?? (operatorMode ? undefined : (activeTenantId ?? undefined)) });
    }
  }, [state, form, operatorMode, activeTenantId]);

  if (!state.open) return null;

  // 현재 표시할 테넌트 이름 결정
  const displayTenantName: string = (() => {
    if (state.reason) {
      return state.reason.tenantName ?? `#${state.reason.tenantId}`;
    }
    if (state.tenantName) return state.tenantName;
    if (state.tenantId != null) return `#${state.tenantId}`;
    return '';
  })();

  const { mode, codeType } = state;
  const submitting = isCreating || isUpdating;

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (mode === 'create') {
        if (!values.tenantIdInput) {
          toast.error('테넌트는 필수입니다');
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
      size={560}
      open={state.open}
      onClose={onClose}
      destroyOnHidden
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
        <Form.Item label="코드분류">
          <Input value={codeTypeLabelWithCode(codeType)} disabled style={{ color: 'rgba(0,0,0,0.65)', backgroundColor: '#f5f5f5', cursor: 'default' }} />
        </Form.Item>
        {operatorMode && (
          <Form.Item label="테넌트">
            <div className="flex items-center px-3 py-1.5 rounded border border-gray-200 bg-gray-50 min-h-[32px]" style={{ color: 'rgba(0,0,0,0.65)', cursor: 'default' }}>
              <Typography.Text ellipsis style={{ color: 'inherit' }}>
                {displayTenantName || '—'}
              </Typography.Text>
            </div>
          </Form.Item>
        )}
        {/* tenantIdInput hidden — 제출 시 값 유지용 */}
        <Form.Item name="tenantIdInput" hidden>
          <InputNumber />
        </Form.Item>
        <Form.Item
          label="사유 번호"
          name="reasonCode"
          tooltip="0~29 범위. 비워두면 자동으로 부여됩니다"
          rules={[{ type: 'number', min: 0, max: 29, message: '0~29 범위만 입력 가능합니다' }]}
        >
          <InputNumber style={{ width: '100%' }} disabled={mode === 'edit'} placeholder="자동 부여 (0~29)" min={0} max={29} />
        </Form.Item>
        <Form.Item
          label="사유 이름"
          name="reasonName"
          rules={[
            { required: true, message: '사유 이름은(는) 필수입니다' },
            { max: 16, message: '16자 이내여야 합니다' },
          ]}
        >
          <Input maxLength={16} placeholder="예: 식사, 교육" />
        </Form.Item>
        <Form.Item label="설명" name="reasonDesc" rules={[{ max: 256, message: '256자 이내여야 합니다' }]}>
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
