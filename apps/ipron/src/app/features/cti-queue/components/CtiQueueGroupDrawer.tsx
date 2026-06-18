/**
 * CTI 큐 업무그룹 추가/수정 사이드 Drawer (스킬셋 관리 SkillsetGroupDrawer 와 동형).
 *
 * - mode='create': parent=null 이면 루트 그룹, parent 있으면 하위 그룹
 * - mode='edit': group 의 이름/정렬 수정
 * - 삭제는 트리에서 호버 액션 → confirm Modal 처리
 */
import { useEffect } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import type { CtiQueueGroupCreateRequest, CtiQueueGroupResponse, CtiQueueGroupUpdateRequest } from '../types';

interface Props {
  open: boolean;
  mode: 'create' | 'edit';
  tenantId: number | null; // create 시 필수
  parent?: CtiQueueGroupResponse | null;
  group?: CtiQueueGroupResponse | null;
  onCancel: () => void;
  onSubmit: (req: CtiQueueGroupCreateRequest | CtiQueueGroupUpdateRequest) => void;
  loading?: boolean;
}

interface FormValues {
  treeName: string;
  sortSeq?: number;
}

export default function CtiQueueGroupDrawer({ open, mode, tenantId, parent, group, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && group) {
      form.setFieldsValue({ treeName: group.treeName, sortSeq: group.sortSeq ?? 0 });
    } else {
      form.setFieldsValue({ treeName: '', sortSeq: 0 });
    }
  }, [open, mode, group, form]);

  const title = mode === 'create' ? (parent ? `하위 그룹 추가 — ${parent.treeName}` : '루트 업무그룹 추가') : `업무그룹 수정 — ${group?.treeName ?? ''}`;

  const handleFinish = (values: FormValues) => {
    if (mode === 'create') {
      if (!tenantId) return;
      const req: CtiQueueGroupCreateRequest = {
        tenantId,
        priorTreeId: parent?.treeId ?? null,
        treeName: values.treeName,
        sortSeq: values.sortSeq ?? 0,
      };
      onSubmit(req);
    } else {
      const req: CtiQueueGroupUpdateRequest = {
        treeName: values.treeName,
        sortSeq: values.sortSeq ?? 0,
      };
      onSubmit(req);
    }
  };

  return (
    <Drawer
      title={title}
      closable={{ placement: 'end' }}
      open={open}
      onClose={onCancel}
      width={420}
      destroyOnClose
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onCancel}>취소</Button>
          <Button type="primary" loading={loading} onClick={() => form.submit()}>
            {mode === 'create' ? '추가' : '저장'}
          </Button>
        </div>
      }
    >
      {mode === 'create' && !tenantId && <div className="mb-3 text-xs text-red-500">테넌트를 먼저 선택하세요.</div>}
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark>
        {mode === 'create' && parent && (
          <div className="mb-3 text-xs text-gray-500">
            상위 그룹: <span className="font-semibold text-gray-700">{parent.treeName}</span>
          </div>
        )}
        <Form.Item
          name="treeName"
          label="그룹명"
          rules={[
            { required: true, message: '그룹명을 입력하세요' },
            { max: 200, message: '200자까지 입력 가능합니다' },
          ]}
        >
          <Input placeholder="예: CS 본부" />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
