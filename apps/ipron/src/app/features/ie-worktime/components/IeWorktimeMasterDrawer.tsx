/**
 * IE 업무시간 마스터 등록/수정 Drawer.
 *
 * 필드: 테넌트 · 업무시간명(필수) · 업무시간KEY(선택, 입력 시 유일) · 설명.
 * 슬롯(시간대)은 카드 확장 영역에서 별도 관리.
 *
 * 테넌트 처리(CallScreenDrawer 정합):
 *  - 운영자 전체(view-all) 등록: presetTenantId=null → 필수 Select 로 대상 테넌트를 직접 고르게 강제.
 *  - 운영자 대행(특정 테넌트)/일반 모드/수정: presetTenantId 고정 → Select 잠금(운영자) 또는 읽기전용 표시(일반).
 *  - 제출 시 req.tenantId 로 대상 테넌트 전달(create API 는 actAsTenantFromBody 로 승격).
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, Select, Typography } from 'antd';
import { useAuthStore, useOperatorScopeStore } from '@/shared-store';
import { toast } from '@/shared-util';
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
  tenantId?: number;
  worktimeName: string;
  groupKey?: string;
  worktimeDesc?: string;
}

export default function IeWorktimeMasterDrawer({ open, mode, item, tenantId, tenantName, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  // 운영자 모드에서만 "테넌트" Select 노출. 일반 콘솔은 로그인(활성) 테넌트로 고정 → 읽기전용 표시.
  const operatorMode = useOperatorScopeStore((s) => s.operatorMode);
  const activeTenantId = useAuthStore((s) => {
    const t = s.userInfo?.tenant;
    return t != null ? Number(t) : null;
  });
  // 운영자 모드에서 노출할 테넌트 옵션(접근 가능한 전체 테넌트) — 목록 화면과 동일 소스.
  const availableTenants = useAuthStore((s) => s.userInfo?.availableTenants);

  // 사전 지정 테넌트: 수정=자원 테넌트, 운영자 대행=선택 테넌트, 일반=활성 테넌트, 운영자 전체=null(직접 선택).
  const presetTenantId = mode === 'edit' && item ? (item.tenantId ?? null) : (tenantId ?? (operatorMode ? null : activeTenantId));
  // 잠금: 수정 || 일반 모드 || 운영자 대행(특정 테넌트 지정). 운영자 전체(초기 테넌트 없음)면 선택 가능.
  const tenantLocked = mode === 'edit' || !operatorMode || tenantId != null;

  // 표시할 테넌트명: 수정 시 항목 소속, 등록 시 선택 테넌트
  const displayTenantName =
    mode === 'edit' && item ? (item.tenantName ?? (item.tenantId != null ? `#${item.tenantId}` : '—')) : (tenantName ?? (tenantId != null ? `#${tenantId}` : '—'));

  // 테넌트 Select 옵션 — 접근 가능한 전체 테넌트 + (옵션에 없을 수 있는) 사전 지정 테넌트 보강.
  const tenantOptions = (() => {
    const opts = (availableTenants ?? []).map((t) => ({ label: t.tenantName ?? String(t.tenantId), value: t.tenantId }));
    if (presetTenantId != null && !opts.some((o) => o.value === presetTenantId)) {
      opts.push({ label: displayTenantName, value: presetTenantId });
    }
    return opts;
  })();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item) {
      form.setFieldsValue({ tenantId: item.tenantId ?? undefined, worktimeName: item.worktimeName, groupKey: item.groupKey ?? '', worktimeDesc: item.worktimeDesc ?? '' });
    } else {
      form.setFieldsValue({ tenantId: presetTenantId ?? undefined, worktimeName: '', groupKey: '', worktimeDesc: '' });
    }
  }, [open, mode, item, presetTenantId, form]);

  const handleFinish = (values: FormValues) => {
    // 운영자 모드는 폼 선택값, 그 외(일반/대행)는 사전 지정 테넌트 사용.
    const effectiveTenantId = (operatorMode ? values.tenantId : presetTenantId) ?? presetTenantId;
    if (mode === 'create' && effectiveTenantId == null) {
      toast.error('테넌트를 선택하세요');
      return;
    }
    const req: IeWorktimeMasterRequest = {
      tenantId: mode === 'create' ? (effectiveTenantId ?? 0) : (item?.tenantId ?? effectiveTenantId ?? 0),
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
      size={460}
      destroyOnHidden
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
        {operatorMode ? (
          <Form.Item name="tenantId" label="테넌트" required rules={[{ required: true, message: '테넌트를 선택하세요' }]}>
            <Select placeholder="테넌트 선택" options={tenantOptions} disabled={tenantLocked} showSearch optionFilterProp="label" />
          </Form.Item>
        ) : (
          <Form.Item label="테넌트">
            <div className="flex items-center px-3 py-1.5 rounded border border-gray-200 bg-gray-50 min-h-[32px]" style={{ color: 'rgba(0,0,0,0.65)', cursor: 'default' }}>
              <Typography.Text ellipsis style={{ color: 'inherit' }}>
                {displayTenantName}
              </Typography.Text>
            </div>
          </Form.Item>
        )}

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
