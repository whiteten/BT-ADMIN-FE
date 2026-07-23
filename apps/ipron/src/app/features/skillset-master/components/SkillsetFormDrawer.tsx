/**
 * 스킬셋 등록/수정 Drawer.
 *
 * 필드: 테넌트(필수) · 업무그룹(선택, 트리에서 선택) · 스킬셋명(1~100) ·
 *       미디어타입(필수) · 활성화(필수) · 정렬순서 · 설명(0~256)
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Switch } from 'antd';
import { MEDIA_TYPE_OPTIONS, type SkillsetCreateRequest, type SkillsetGroupResponse, type SkillsetResponse, type SkillsetUpdateRequest } from '../types';

interface TenantOption {
  tenantId: number;
  tenantName: string | null;
}

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  skillset?: SkillsetResponse | null; // edit 시 필수
  defaultTenantId?: number | null; // create 시 카드에서 선택된 테넌트
  defaultTreeId?: number | null; // create 시 트리에서 선택된 그룹
  tenants: TenantOption[];
  groups: SkillsetGroupResponse[]; // 평탄화된 그룹 (해당 테넌트만)
  /** 운영자 모드 — create 시 폼에서 대행 테넌트를 직접 선택. 일반 콘솔은 테넌트 선택 숨김(활성 테넌트). */
  operatorMode?: boolean;
  onCancel: () => void;
  onSubmit: (req: SkillsetCreateRequest | SkillsetUpdateRequest) => void;
  loading?: boolean;
}

interface FormValues {
  tenantId?: number | null;
  treeId?: number | null;
  skillsetName: string;
  mediaType: number;
  activateYn: boolean;
  sortSeq?: number | null;
  skillsetDesc?: string;
}

export default function SkillsetFormDrawer({ open, mode, skillset, defaultTenantId, defaultTreeId, tenants, groups, operatorMode, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();
  // 테넌트 선택 노출: 운영자 모드에서만(create=대행 테넌트 선택, edit=현재 테넌트 표시·비활성).
  // 일반 콘솔은 create/edit 모두 로그인 테넌트로 고정 → 숨김(값만 유지).
  const showTenantSelect = !!operatorMode;

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && skillset) {
      form.setFieldsValue({
        tenantId: skillset.tenantId,
        treeId: skillset.treeId,
        skillsetName: skillset.skillsetName,
        mediaType: skillset.mediaType ?? 0,
        activateYn: skillset.activateYn === 1,
        sortSeq: skillset.sortSeq ?? 1,
        skillsetDesc: skillset.skillsetDesc ?? '',
      });
    } else {
      form.setFieldsValue({
        tenantId: defaultTenantId ?? undefined,
        treeId: defaultTreeId ?? undefined,
        skillsetName: '',
        mediaType: 0,
        activateYn: true,
        sortSeq: undefined, // 미입력 시 BE 가 동일 테넌트 MAX(SORT_SEQ)+1 자동 채번
        skillsetDesc: '',
      });
    }
  }, [open, mode, skillset, defaultTenantId, defaultTreeId, form]);

  const handleFinish = (values: FormValues) => {
    // sentinel: 0 = "미배정" 옵션 → BE 에 null 로 보냄
    const normalizedTreeId = values.treeId === 0 ? null : (values.treeId ?? null);
    if (mode === 'create') {
      const req: SkillsetCreateRequest = {
        tenantId: values.tenantId ?? null,
        treeId: normalizedTreeId,
        skillsetName: values.skillsetName,
        skillsetDesc: values.skillsetDesc ?? null,
        mediaType: values.mediaType,
        activateYn: values.activateYn ? 1 : 0,
        // 미입력(빈값) 시 null 전송 → BE 자동 채번(MAX(SORT_SEQ)+1). 값이 있으면 수동 지정값 그대로.
        sortSeq: values.sortSeq == null ? null : values.sortSeq,
      };
      onSubmit(req);
    } else {
      const req: SkillsetUpdateRequest = {
        treeId: normalizedTreeId,
        skillsetName: values.skillsetName,
        skillsetDesc: values.skillsetDesc ?? null,
        mediaType: values.mediaType,
        activateYn: values.activateYn ? 1 : 0,
        // 수정 시 기존 정렬순서 보존(프리필된 현재값 그대로 전송)
        sortSeq: values.sortSeq ?? null,
      };
      onSubmit(req);
    }
  };

  return (
    <Drawer
      title={mode === 'create' ? '스킬셋 등록' : '스킬셋 수정'}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      size={480}
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
        {showTenantSelect ? (
          <Form.Item name="tenantId" label="테넌트" rules={[{ required: mode === 'create', message: '테넌트를 선택하세요' }]}>
            <Select
              disabled={mode === 'edit'}
              placeholder="대행할 테넌트를 선택하세요"
              options={tenants.map((t) => ({ value: t.tenantId, label: t.tenantName ?? '-' }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
        ) : (
          // 일반 콘솔 create — 테넌트 선택 숨김(활성 테넌트로 자동 등록)
          <Form.Item name="tenantId" hidden>
            <Input />
          </Form.Item>
        )}

        <Form.Item name="treeId" label="업무그룹">
          <Select
            placeholder="업무그룹 선택"
            allowClear
            options={[{ value: 0, label: '미배정', className: 'text-amber-600' }, ...groups.map((g) => ({ value: g.treeId, label: g.treeName }))]}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          name="skillsetName"
          label="스킬셋명"
          rules={[
            { required: true, message: '스킬셋명을 입력하세요' },
            { max: 100, message: '100자까지 입력 가능합니다' },
          ]}
        >
          <Input placeholder="예: 일반상담 스킬셋" />
        </Form.Item>

        <Form.Item name="mediaType" label="미디어 타입" rules={[{ required: true, message: '미디어 타입을 선택하세요' }]}>
          <Select options={MEDIA_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
        </Form.Item>

        <Form.Item name="activateYn" label="활성화" valuePropName="checked">
          <Switch checkedChildren="ON" unCheckedChildren="OFF" />
        </Form.Item>

        <Form.Item name="sortSeq" label="정렬순서" extra="미입력 시 자동으로 가장 큰 순서 다음 값으로 채번됩니다.">
          <InputNumber min={1} max={999999} style={{ width: '100%' }} placeholder="자동 채번" />
        </Form.Item>

        <Form.Item name="skillsetDesc" label="설명" rules={[{ max: 127, message: '127자까지 입력 가능합니다' }]}>
          <Input.TextArea rows={3} maxLength={127} placeholder="스킬셋 설명" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
