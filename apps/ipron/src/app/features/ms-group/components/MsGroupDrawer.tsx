/**
 * MS그룹 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 *
 * Tab 1 기본정보: 노드(disabled), 그룹명(required, max 128), 분배방식(ROUTE_TYPE, default 균등=2, exclude Main/Backup=3)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMsGroup, useUpdateMsGroup } from '../hooks/useMsGroupQueries';
import { type MsGroup, type MsGroupCreateRequest, ROUTE_TYPE_OPTIONS } from '../types';

interface NodeOption {
  nodeId: number;
  nodeName: string;
}

export interface MsGroupDrawerRef {
  open: (data?: MsGroup, nodeId?: number, nodeName?: string, nodeList?: NodeOption[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const MsGroupDrawer = forwardRef<MsGroupDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<MsGroup | null>(null);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState<string>('');
  const [nodeOptions, setNodeOptions] = useState<NodeOption[]>([]);

  const isEditMode = !!editData;
  // 노드 미선택(전체) 상태로 등록 → 드로어 안에서 노드 선택
  const isNodeSelectable = !isEditMode && !nodeId && nodeOptions.length > 0;

  useImperativeHandle(ref, () => ({
    open: (data?: MsGroup, initNodeId?: number, initNodeName?: string, nodeList?: NodeOption[]) => {
      setEditData(data ?? null);
      setNodeId(data?.nodeId ?? initNodeId ?? null);
      setNodeName(initNodeName ?? '');
      setNodeOptions(nodeList ?? []);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      setNodeId(null);
      setNodeName('');
      setNodeOptions([]);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        msGroupName: editData.msGroupName,
        routeType: editData.routeType,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createMsGroup, isPending: isCreating } = useCreateMsGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MS그룹이 등록되었습니다');
        setVisible(false);
        setEditData(null);
        setNodeId(null);
        setNodeName('');
        setNodeOptions([]);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const { mutate: updateMsGroup, isPending: isUpdating } = useUpdateMsGroup({
    mutationOptions: {
      onSuccess: () => {
        toast.success('MS그룹이 수정되었습니다');
        setVisible(false);
        setEditData(null);
        setNodeId(null);
        setNodeName('');
        setNodeOptions([]);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      // 노드 선택 모드일 때 form 에서 nodeId 를 가져옴
      const targetNodeId = nodeId ?? values.nodeId;
      if (!targetNodeId) return;

      const payload: MsGroupCreateRequest = {
        msGroupName: values.msGroupName,
        nodeId: targetNodeId,
        routeType: values.routeType,
      };

      if (isEditMode && editData) {
        updateMsGroup({ id: editData.msGroupId, data: payload });
      } else {
        createMsGroup(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, nodeId, createMsGroup, updateMsGroup]);

  return (
    <Drawer
      title={isEditMode ? 'MS그룹 수정' : 'MS그룹 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={() => {
        setVisible(false);
        setEditData(null);
        setNodeId(null);
        setNodeName('');
        setNodeOptions([]);
        form.resetFields();
      }}
      styles={{ wrapper: { width: 420 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setVisible(false);
              setEditData(null);
              setNodeId(null);
              setNodeName('');
              setNodeOptions([]);
              form.resetFields();
            }}
          >
            취소
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ routeType: '2' }}>
        {isNodeSelectable ? (
          <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드를 선택하세요' }]}>
            <Select placeholder="노드를 선택하세요" options={nodeOptions.map((n) => ({ label: n.nodeName, value: n.nodeId }))} showSearch optionFilterProp="label" />
          </Form.Item>
        ) : (
          <Form.Item label="노드">
            <Input value={nodeName} disabled />
          </Form.Item>
        )}

        <Form.Item
          name="msGroupName"
          label="MS 그룹 이름"
          required
          rules={[
            { required: true, message: 'MS그룹명은 필수입니다' },
            { max: 128, message: 'MS그룹명은 128자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="MS그룹명을 입력하세요" maxLength={128} />
        </Form.Item>

        <Form.Item name="routeType" label="분배방식" required rules={[{ required: true, message: '분배방식은 필수입니다' }]}>
          <Select options={[...ROUTE_TYPE_OPTIONS]} placeholder="분배방식을 선택하세요" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

MsGroupDrawer.displayName = 'MsGroupDrawer';
export default MsGroupDrawer;
