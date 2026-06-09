/**
 * 스킬셋 등록/수정 Drawer.
 *
 * 필드: 테넌트(필수) · 업무그룹(선택, 트리에서 선택) · 스킬셋명(1~100) ·
 *       미디어타입(필수) · 활성화(필수) · 정렬순서 · 설명(0~256)
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Switch } from 'antd';
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
  sortSeq?: number;
  skillsetDesc?: string;
}

export default function SkillsetFormDrawer({ open, mode, skillset, defaultTenantId, defaultTreeId, tenants, groups, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

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
        sortSeq: 1,
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
        sortSeq: values.sortSeq ?? 0,
      };
      onSubmit(req);
    } else {
      const req: SkillsetUpdateRequest = {
        treeId: normalizedTreeId,
        skillsetName: values.skillsetName,
        skillsetDesc: values.skillsetDesc ?? null,
        mediaType: values.mediaType,
        activateYn: values.activateYn ? 1 : 0,
        sortSeq: values.sortSeq ?? 0,
      };
      onSubmit(req);
    }
  };

  return (
    <Drawer
      title={mode === 'create' ? '스킬셋 등록' : '스킬셋 수정'}
      open={open}
      onClose={onCancel}
      width={480}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '등록' : '저장'}
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        <Form.Item name="tenantId" label="테넌트" rules={[{ required: mode === 'create', message: '테넌트를 선택하세요' }]}>
          <Select
            disabled={mode === 'edit'}
            placeholder="테넌트 선택"
            options={tenants.map((t) => ({ value: t.tenantId, label: t.tenantName ?? '-' }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

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

        <Form.Item name="sortSeq" label="정렬순서" rules={[{ required: true, message: '정렬순서를 입력하세요' }]}>
          <InputNumber min={1} max={999999} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="skillsetDesc" label="설명" rules={[{ max: 127, message: '127자까지 입력 가능합니다' }]}>
          <Input.TextArea rows={3} maxLength={127} placeholder="스킬셋 설명" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
