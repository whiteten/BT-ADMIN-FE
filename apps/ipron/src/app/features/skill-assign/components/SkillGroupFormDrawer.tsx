/**
 * 스킬모음 등록/수정 드로어 (모드 ③).
 *
 * Phase 1: 모음 이름/설명 + 멤버 다중 선택 (스킬셋 picker 일체).
 *
 * 주의: edit 모드에서 멤버 props 가 비어 있으면 멤버 변경 없음 (null) 으로 송신.
 * 멤버를 채워서 전달하면 "전체 교체" 방식으로 송신.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateSkillGroup, useGetAvailableSkillsets, useUpdateSkillGroup } from '../hooks/useSkillAssignQueries';
import type { SkillGroupMemberRequest, SkillGroupResponse } from '../types';

export type SkillGroupDrawerState = { open: false } | { open: true; mode: 'create' } | { open: true; mode: 'edit'; row: SkillGroupResponse };

interface Props {
  state: SkillGroupDrawerState;
  tenantId?: number;
  onClose: () => void;
}

interface MemberRow {
  skillsetId: number;
  skillsetName: string;
  priority: number;
  skillLevel: number;
}

export default function SkillGroupFormDrawer({ state, tenantId, onClose }: Props) {
  const [form] = Form.useForm();
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [memberDirty, setMemberDirty] = useState(false); // edit 모드에서 멤버를 손댔는지
  const [addSkillsetId, setAddSkillsetId] = useState<number | null>(null);

  const { data: availableSkillsets = [] } = useGetAvailableSkillsets({
    params: { tenantId, activeYn: 1 },
    queryOptions: { enabled: state.open },
  });

  const { mutate: createGroup, isPending: isCreating } = useCreateSkillGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스킬모음이 등록되었습니다');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '등록 실패';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateGroup, isPending: isUpdating } = useUpdateSkillGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('스킬모음이 수정되었습니다');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '수정 실패';
        toast.error(msg);
      },
    },
  });

  useEffect(() => {
    if (!state.open) {
      form.resetFields();
      setMemberRows([]);
      setMemberDirty(false);
      setAddSkillsetId(null);
      return;
    }
    if (state.mode === 'edit') {
      form.setFieldsValue({
        skillGroupName: state.row.skillGroupName,
        skillGroupDesc: state.row.skillGroupDesc,
      });
      setMemberRows([]);
      setMemberDirty(false);
    } else {
      setMemberRows([]);
      setMemberDirty(false);
    }
  }, [state, form]);

  const memberSet = useMemo(() => new Set(memberRows.map((m) => m.skillsetId)), [memberRows]);

  const skillsetOptions = useMemo(
    () => availableSkillsets.filter((s) => !memberSet.has(s.skillsetId)).map((s) => ({ value: s.skillsetId, label: `${s.skillsetName} (${s.tenantName ?? '-'})` })),
    [availableSkillsets, memberSet],
  );

  const handleAddMember = () => {
    if (!addSkillsetId) return;
    const s = availableSkillsets.find((x) => x.skillsetId === addSkillsetId);
    if (!s) return;
    setMemberRows((prev) => [...prev, { skillsetId: s.skillsetId, skillsetName: s.skillsetName, priority: 0, skillLevel: 0 }]);
    setMemberDirty(true);
    setAddSkillsetId(null);
  };

  const handleRemoveMember = (skillsetId: number) => {
    setMemberRows((prev) => prev.filter((m) => m.skillsetId !== skillsetId));
    setMemberDirty(true);
  };

  const handleUpdateMember = (skillsetId: number, field: 'priority' | 'skillLevel', value: number | null) => {
    setMemberRows((prev) => prev.map((m) => (m.skillsetId === skillsetId ? { ...m, [field]: value ?? 0 } : m)));
    setMemberDirty(true);
  };

  const memberColumns: ColumnsType<MemberRow> = [
    { title: '스킬셋', dataIndex: 'skillsetName', key: 'skillsetName' },
    {
      title: 'P (0~9)',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (v: number, row) => <InputNumber min={0} max={9} value={v} onChange={(nv) => handleUpdateMember(row.skillsetId, 'priority', nv)} style={{ width: '100%' }} />,
    },
    {
      title: 'L (0~99)',
      dataIndex: 'skillLevel',
      key: 'skillLevel',
      width: 110,
      render: (v: number, row) => <InputNumber min={0} max={99} value={v} onChange={(nv) => handleUpdateMember(row.skillsetId, 'skillLevel', nv)} style={{ width: '100%' }} />,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, row) => <Button size="small" danger icon={<Trash2 className="size-3" />} onClick={() => handleRemoveMember(row.skillsetId)} />,
    },
  ];

  if (!state.open) return null;

  const submitting = isCreating || isUpdating;
  const isEdit = state.mode === 'edit';

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const members: SkillGroupMemberRequest[] = memberRows.map((m) => ({
        skillsetId: m.skillsetId,
        priority: m.priority,
        skillLevel: m.skillLevel,
      }));

      if (isEdit) {
        updateGroup({
          skillGroupId: state.row.skillGroupId,
          body: {
            skillGroupName: values.skillGroupName,
            skillGroupDesc: values.skillGroupDesc,
            // edit 시 멤버를 손대지 않았으면 null = 멤버 변경 없음
            members: memberDirty ? members : undefined,
          },
        });
      } else {
        createGroup({
          tenantId,
          skillGroupName: values.skillGroupName,
          skillGroupDesc: values.skillGroupDesc,
          members,
        });
      }
    } catch {
      // form validation: silent
    }
  };

  return (
    <Drawer
      title={
        <Space>
          {isEdit ? '수정' : '등록'} — 스킬모음
          {isEdit && <Tag color="default">{state.row.skillGroupName}</Tag>}
        </Space>
      }
      width={680}
      open={state.open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose}>취소</Button>
          <Button type="primary" loading={submitting} onClick={onSubmit}>
            저장
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="모음 이름"
          name="skillGroupName"
          rules={[
            { required: true, message: '필수' },
            { max: 200, message: '200자 이내' },
          ]}
        >
          <Input maxLength={200} placeholder="예: 일반상담 풀세트" />
        </Form.Item>
        <Form.Item label="설명" name="skillGroupDesc" rules={[{ max: 512 }]}>
          <Input.TextArea rows={2} maxLength={512} showCount placeholder="용도 설명 (선택)" />
        </Form.Item>
      </Form>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-700">멤버 스킬셋 ({memberRows.length}건)</span>
          <span className="text-xs text-gray-500">
            — P/L 은 기본값. 부여 후 상담사별 조정 가능
            {isEdit && !memberDirty && ' · 손대지 않으면 기존 멤버 유지'}
            {isEdit && memberDirty && ' · 전체 교체 모드'}
          </span>
        </div>
        <Space.Compact className="w-full mb-2">
          <Select
            placeholder="스킬셋 선택"
            value={addSkillsetId ?? undefined}
            onChange={setAddSkillsetId}
            options={skillsetOptions}
            showSearch
            optionFilterProp="label"
            className="flex-1"
          />
          <Button type="primary" onClick={handleAddMember} disabled={!addSkillsetId}>
            ＋ 추가
          </Button>
        </Space.Compact>
        <Table<MemberRow>
          size="small"
          rowKey="skillsetId"
          dataSource={memberRows}
          columns={memberColumns}
          pagination={false}
          scroll={{ y: 280 }}
          locale={{ emptyText: isEdit ? '멤버 변경 없음 (기존 유지) — 추가하면 전체 교체 모드 진입' : '멤버 없음 — 위에서 추가하세요' }}
        />
      </div>
    </Drawer>
  );
}
