/**
 * HA 그룹 등록/수정 Drawer.
 * forwardRef + useImperativeHandle 패턴.
 *
 * AS-IS IPR20S8080_HaGroupMaster.jsp: 노드는 선택된 탭에서 고정(수정 불가),
 * 그룹명 중복은 서버 유니크 제약 + 409로 처리(별도 사전조회 없음).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select, Switch } from 'antd';
import { toast } from '@/shared-util';
import { useGetCodes } from '../hooks/useCommonQueries';
import { useCreateHaGroup, useUpdateHaGroup } from '../hooks/useHaGroupQueries';
import { HA_GROUP_MODE_KIND, type HaGroup, type HaGroupCreateRequest } from '../types';

export interface HaGroupDrawerRef {
  open: (data?: HaGroup) => void;
  close: () => void;
}

interface Props {
  /** 노드 탭에서 선택된 노드. 신규 등록 시 이 노드로 고정. */
  selectedNodeId: number | null;
  nodes: { nodeId: number; nodeName: string }[];
  /** 성공 콜백. 신규 등록 시 생성된 그룹을 전달(카드 포커싱용), 수정 시 인자 없음. */
  onSuccess: (created?: HaGroup) => void;
}

const HaGroupDrawer = forwardRef<HaGroupDrawerRef, Props>(({ selectedNodeId, nodes, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<HaGroup | null>(null);
  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: HaGroup) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  const { data: groupModeCodes = [] } = useGetCodes({ params: { classCd: 'HA_GROUP_MODE' }, queryOptions: { enabled: visible } });

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        nodeId: editData.nodeId,
        haGroupName: editData.haGroupName,
        haGroupMode: editData.haGroupMode,
        activateYn: editData.activateYn === '1',
      });
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({ nodeId: selectedNodeId ?? nodes[0]?.nodeId, haGroupMode: HA_GROUP_MODE_KIND.LICENSE_SHARING, activateYn: true });
    }
  }, [visible, editData, selectedNodeId, nodes, form]);

  const { mutate: createHaGroup, isPending: isCreating } = useCreateHaGroup({
    mutationOptions: {
      onSuccess: (created) => {
        toast.success('HA 그룹이 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess(created as HaGroup | undefined);
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '등록에 실패했습니다.'),
    },
  });

  const { mutate: updateHaGroup, isPending: isUpdating } = useUpdateHaGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('HA 그룹이 수정되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => toast.error((err as { message?: string })?.message ?? '수정에 실패했습니다.'),
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const payload: HaGroupCreateRequest = {
      nodeId: values.nodeId as number,
      haGroupName: values.haGroupName as string,
      haGroupMode: values.haGroupMode as number,
      activateYn: values.activateYn ? '1' : '0',
    };

    if (isEditMode && editData) {
      updateHaGroup({ id: editData.haGroupId, data: payload });
    } else {
      createHaGroup(payload);
    }
  }, [form, isEditMode, editData, createHaGroup, updateHaGroup]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'HA 그룹 수정' : 'HA 그룹 추가'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 420 } }}
      destroyOnHidden
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
          <Select options={nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }))} disabled />
        </Form.Item>

        <Form.Item
          name="haGroupName"
          label="HA 그룹명"
          required
          rules={[
            { required: true, message: 'HA 그룹명은 필수입니다' },
            { max: 64, message: '64자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="예: HA_SEOUL_01" maxLength={64} />
        </Form.Item>

        <Form.Item name="haGroupMode" label="HA 모드" required rules={[{ required: true, message: 'HA 모드는 필수입니다' }]}>
          <Select options={groupModeCodes.map((c) => ({ label: c.value, value: Number(c.code) }))} placeholder="HA 모드 선택" />
        </Form.Item>

        <Form.Item name="activateYn" label="활성화 여부" valuePropName="checked">
          <Switch checkedChildren="활성화" unCheckedChildren="비활성화" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

HaGroupDrawer.displayName = 'HaGroupDrawer';
export default HaGroupDrawer;
