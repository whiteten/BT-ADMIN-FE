/**
 * 스킬모음 등록/수정 드로어 — 스킬모음 적용 드로어(SkillGroupApplyDrawer)의 2차 드로어.
 *
 * 모음 이름/설명 + 멤버 다중 선택 (스킬셋 picker 일체).
 * edit 모드: 기존 멤버를 조회해 prefill — 손대지 않으면 멤버 변경 없음(undefined) 으로 송신,
 * 멤버를 손대면 현재 표 전체를 "전체 교체" 방식으로 송신.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Trash2 } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateSkillGroup, useGetAvailableSkillsets, useGetSkillGroupMembers, useUpdateSkillGroup } from '../hooks/useSkillAssignQueries';
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

  // edit 모드: 기존 멤버 prefill (목업 정합 — 수정 드로어에 현재 멤버 P/L 표시)
  const editGroupId = state.open && state.mode === 'edit' ? state.row.skillGroupId : null;
  const { data: editMembers = [] } = useGetSkillGroupMembers(editGroupId);
  // state.open 도 의존성에 포함: 같은 row 를 닫았다가 다시 열 때(캐시 히트)
  // editGroupId 나 editMembers 참조가 바뀌지 않아 effect 가 재실행되지 않는 문제 방지.
  useEffect(() => {
    if (editGroupId == null) return;
    setMemberRows(editMembers.map((m) => ({ skillsetId: m.skillsetId, skillsetName: m.skillsetName, priority: m.priority ?? 0, skillLevel: m.skillLevel ?? 0 })));
    setMemberDirty(false);
  }, [editGroupId, editMembers, state.open]);

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
      // edit 모드: 멤버 초기화는 editGroupId/editMembers effect 에서만 수행.
      // 여기서 setMemberRows([]) 하면 캐시 히트 시 이미 로드된 멤버를 덮어씀.
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
      title: '우선순위 (0~9)',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (v: number, row) => <InputNumber min={0} max={9} value={v} onChange={(nv) => handleUpdateMember(row.skillsetId, 'priority', nv)} style={{ width: '100%' }} />,
    },
    {
      title: '스킬레벨 (0~99)',
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
      closable={{ placement: 'end' }}
      width={560}
      zIndex={1010}
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
        <Form.Item
          label="설명"
          name="skillGroupDesc"
          rules={[
            { max: 512, message: '512자 이내로 입력하세요' },
            {
              validator: (_, value: string | undefined) => {
                // SWAT IPR20S5080.jsp:220~222 정합: 공백 제거 후 10자 이하이면 차단
                if (!value) return Promise.resolve(); // 빈 값은 허용 (필수 아님)
                const trimmed = value.replace(/\s/g, '');
                if (trimmed.length > 0 && trimmed.length <= 10) {
                  return Promise.reject(new Error('설명은 공백 제외 11자 이상 입력해주세요'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <Input.TextArea rows={2} maxLength={512} showCount placeholder="용도 설명 (선택)" />
        </Form.Item>
      </Form>

      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-700">멤버 스킬셋 ({memberRows.length}건)</span>
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
          locale={{ emptyText: '멤버 없음 — 위에서 추가하세요' }}
        />
      </div>
    </Drawer>
  );
}
