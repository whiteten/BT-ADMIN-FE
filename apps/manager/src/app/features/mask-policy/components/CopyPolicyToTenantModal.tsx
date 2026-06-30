/**
 * v1.3: 마스킹 정책을 특정 테넌트로 복사 모달.
 *
 * 흐름: 정책 선택 (sourcePolicy) → 대상 테넌트 입력 → POST copy-to-tenant.
 */
import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Form, Modal, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCopyPolicyToTenant, useGetTenantsForMask } from '../hooks/useMaskPolicyQueries';
import type { MaskPolicy } from '../types';

export interface CopyPolicyToTenantModalRef {
  open: (policy: MaskPolicy) => void;
}

interface FormValues {
  targetTenantId: number;
}

const CopyPolicyToTenantModal = forwardRef<CopyPolicyToTenantModalRef>((_props, ref) => {
  const [open, setOpen] = useState(false);
  const [sourcePolicy, setSourcePolicy] = useState<MaskPolicy | null>(null);
  const [form] = Form.useForm<FormValues>();
  const { data: tenants = [] } = useGetTenantsForMask();
  // 원본 정책이 이미 속한 테넌트는 옵션에서 제외 (같은 테넌트로 복사 불가 — BE 가 409 반환)
  const tenantOptions = useMemo(
    () => tenants.filter((t) => sourcePolicy == null || t.tenantId !== sourcePolicy.tenantId).map((t) => ({ value: t.tenantId, label: `${t.tenantName} (${t.tenantId})` })),
    [tenants, sourcePolicy],
  );

  const { mutate: copy, isPending } = useCopyPolicyToTenant({
    mutationOptions: {
      onSuccess: () => {
        toast.success('정책이 테넌트로 복사되었습니다');
        setOpen(false);
        form.resetFields();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : '복사 실패';
        toast.error(msg);
      },
    },
  });

  useImperativeHandle(ref, () => ({
    open: (policy: MaskPolicy) => {
      setSourcePolicy(policy);
      form.resetFields();
      setOpen(true);
    },
  }));

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!sourcePolicy) return;
      copy({ policyId: sourcePolicy.policyId, targetTenantId: values.targetTenantId });
    } catch {
      // validation 오류 — 자동 표시됨
    }
  };

  const sourceOrigin = sourcePolicy?.tenantId == null ? '글로벌' : `테넌트 ${sourcePolicy.tenantId}`;

  return (
    <Modal title="정책을 테넌트로 복사" open={open} onCancel={() => setOpen(false)} onOk={handleSubmit} confirmLoading={isPending} okText="복사" cancelText="취소" width={480}>
      {sourcePolicy && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">원본 정책 (#{sourcePolicy.policyId})</span>
            <span className="ml-auto rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">{sourceOrigin}</span>
          </div>
          <div className="mt-1 font-mono text-xs text-gray-800">
            {sourcePolicy.category} · {sourcePolicy.pattern} · {sourcePolicy.ruleType}
          </div>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item
          name="targetTenantId"
          label="대상 테넌트"
          rules={[{ required: true, message: '대상 테넌트를 선택하세요' }]}
          extra="원본과 같은 (category, pattern) 정책이 이미 그 테넌트에 있으면 409 에러"
        >
          <Select showSearch placeholder="테넌트 선택" options={tenantOptions} optionFilterProp="label" style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
});

CopyPolicyToTenantModal.displayName = 'CopyPolicyToTenantModal';
export default CopyPolicyToTenantModal;
