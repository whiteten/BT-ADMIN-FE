/**
 * 노드 기본 MS 설정 Drawer
 * AS-IS: poNodeWindow (400x200) — RTP 중개 + MS그룹 2개 필드
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Select } from 'antd';
import { toast } from '@/shared-util';
import { msGroupApi } from '../api/msGroupApi';
import { useUpdateNodeMsSetting } from '../hooks/useMsGroupQueries';
import { type MsGroup, NAT_OPTION_OPTIONS, type NodeMsSettingResponse } from '../types';

export interface NodeMsSettingDrawerRef {
  open: (nodeId: number, nodeName: string, msGroups: MsGroup[]) => void;
  close: () => void;
}

interface Props {
  onSuccess: () => void;
}

const NodeMsSettingDrawer = forwardRef<NodeMsSettingDrawerRef, Props>(({ onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [nodeId, setNodeId] = useState<number | null>(null);
  const [nodeName, setNodeName] = useState('');
  const [msGroups, setMsGroups] = useState<MsGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (id: number, name: string, groups: MsGroup[]) => {
      setNodeId(id);
      setNodeName(name);
      setMsGroups(groups);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
    },
  }));

  useEffect(() => {
    if (visible && nodeId) {
      setLoading(true);
      msGroupApi
        .getNodeMsSetting({ id: nodeId })
        .then((setting: NodeMsSettingResponse) => {
          form.setFieldsValue({
            msGroupId: setting.msGroupId ?? 0,
            natOption: setting.natOption ?? 0,
          });
        })
        .catch(() => toast.error('노드 설정을 불러오지 못했습니다'))
        .finally(() => setLoading(false));
    }
  }, [visible, nodeId, form]);

  const { mutate: updateSetting, isPending } = useUpdateNodeMsSetting({
    mutationOptions: {
      onSuccess: () => {
        toast.success('노드 기본 MS 설정이 저장되었습니다');
        setVisible(false);
        onSuccess();
      },
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!nodeId) return;
    try {
      const values = await form.validateFields();
      updateSetting({
        id: nodeId,
        data: {
          msGroupId: values.msGroupId === 0 ? 0 : values.msGroupId,
          natOption: values.natOption,
        },
      });
    } catch {
      /* validation failed */
    }
  }, [form, nodeId, updateSetting]);

  const msGroupOptions = [{ label: '미지정', value: 0 }, ...msGroups.map((g) => ({ label: g.msGroupName, value: g.msGroupId }))];

  return (
    <Drawer
      title={`노드 기본 MS 설정 - ${nodeName}`}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={() => setVisible(false)}
      styles={{ wrapper: { width: 380 } }}
      loading={loading}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ msGroupId: 0, natOption: 0 }}>
        <h4 className="text-sm font-semibold text-gray-700 pb-1.5 mb-3 border-b border-gray-200">RTP 중개</h4>
        <Form.Item name="natOption" label="노드 RTP 중개">
          <Select options={[...NAT_OPTION_OPTIONS]} />
        </Form.Item>

        <Form.Item name="msGroupId" label="MS그룹">
          <Select options={msGroupOptions} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

NodeMsSettingDrawer.displayName = 'NodeMsSettingDrawer';
export default NodeMsSettingDrawer;
