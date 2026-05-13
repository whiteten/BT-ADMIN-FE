import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, Select } from 'antd';
import { Minus, Plus } from 'lucide-react';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetAgents } from '../../agent-config/hooks/useAgentQueries';
import { a2aQueryKeys, useCreateA2A, useDeleteA2A, useUpdateA2A } from '../hooks/useA2aQueries';
import type { A2ACreateDatas, A2AItem, A2AUpdateDatas } from '../types';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export interface A2ADrawerRef {
  open: (agent?: A2AItem) => void;
  close: () => void;
}

interface SkillFormRow {
  skillId?: string;
  skillName: string;
  description?: string;
  tags?: string;
  examples?: string;
}

interface FormValues {
  agentId?: string;
  agentName: string;
  agentDescription?: string;
  skills?: SkillFormRow[];
}

const A2ADrawer = forwardRef<A2ADrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const modal = useModal();
  const [open, setOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<A2AItem | null>(null);
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!editAgent;

  const { data: agents = [] } = useGetAgents({ queryOptions: { enabled: open && !isEdit } });
  const deployedAgents = agents.filter((a) => a.aoeDeployFlag === 1);

  const { mutate: createA2A, isPending: isCreating } = useCreateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 생성되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('createA2A failed', error),
    },
  });

  const { mutate: updateA2A, isPending: isUpdating } = useUpdateA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('updateA2A failed', error),
    },
  });

  const { mutate: deleteA2A, isPending: isDeleting } = useDeleteA2A({
    mutationOptions: {
      onSuccess: () => {
        toast.success('A2A 서버가 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: a2aQueryKeys.getA2AList().queryKey });
        handleClose();
      },
      onError: (error) => Log.warn('deleteA2A failed', error),
    },
  });

  useImperativeHandle(ref, () => ({
    open: (agent) => {
      setEditAgent(agent ?? null);
      if (agent) {
        form.setFieldsValue({
          agentName: agent.agentName,
          agentDescription: agent.agentDescription,
          skills: (agent.skills ?? []).map((s) => ({
            skillId: s.skillId,
            skillName: s.skillName,
            description: s.description,
            tags: (s.tags ?? []).join(', '),
            examples: (s.examples ?? []).join('\n'),
          })),
        });
      } else {
        form.resetFields();
      }
      setOpen(true);
    },
    close: handleClose,
  }));

  const handleClose = () => {
    setOpen(false);
    form.resetFields();
    setEditAgent(null);
  };

  const handleAgentChange = (agentId: string) => {
    const agent = deployedAgents.find((a) => a.agentId === agentId);
    if (agent) form.setFieldValue('agentName', agent.agentName);
  };

  const buildSkills = (rows: SkillFormRow[]) =>
    rows.map((s, i) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      description: s.description,
      tags: s.tags
        ? s.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      examples: s.examples
        ? s.examples
            .split('\n')
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
      seq: i + 1,
    }));

  const onFinish = (values: FormValues) => {
    const skills = buildSkills(values.skills ?? []);

    if (isEdit && editAgent) {
      const data: A2AUpdateDatas = {
        a2aId: editAgent.a2aId,
        agentName: values.agentName,
        agentDescription: values.agentDescription,
        skills,
      };
      updateA2A({ params: { a2aId: editAgent.a2aId }, data });
    } else {
      const selectedAgent = deployedAgents.find((a) => a.agentId === values.agentId);
      const data: A2ACreateDatas = {
        agentId: values.agentId,
        agentName: values.agentName,
        agentDescription: values.agentDescription,
        aoeApiKey: selectedAgent?.aoeApiKey,
        skills,
      };
      createA2A(data);
    }
  };

  const handleDelete = () => {
    if (!editAgent) return;
    modal.confirm.delete({
      onOk: () => deleteA2A({ a2aId: editAgent.a2aId }),
    });
  };

  return (
    <Drawer
      title={isEdit ? 'A2A 서버 수정' : 'A2A 서버 생성'}
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 600 } }}
      destroyOnHidden
      footer={
        <div className="flex items-center justify-between">
          {isEdit && (
            <Button color="danger" variant="solid" loading={isDeleting} onClick={handleDelete}>
              삭제
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleClose}>취소</Button>
            <Button type="primary" loading={isCreating || isUpdating} onClick={() => form.submit()}>
              저장
            </Button>
          </div>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {!isEdit && (
          <Form.Item name="agentId" label="배포 Agent" required rules={[{ required: true, message: 'Agent를 선택해 주세요.' }]}>
            <Select
              showSearch
              placeholder="배포할 Agent를 선택하세요."
              options={deployedAgents.map((a) => ({ label: a.agentName, value: a.agentId }))}
              onChange={handleAgentChange}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        )}

        <Form.Item name="agentName" label="Agent 명" required rules={[{ required: true, message: 'Agent 명을 입력해 주세요.' }]}>
          <Input placeholder="Agent 명을 입력하세요." />
        </Form.Item>

        <Form.Item name="agentDescription" label="설명">
          <Input.TextArea placeholder="Agent에 대한 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>

        {/* Skills */}
        <Form.List name="skills">
          {(fields, { add, remove }) => (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Skills</span>
                <Button size="small" icon={<Plus className="size-3" />} onClick={() => add()}>
                  추가
                </Button>
              </div>
              {fields.length === 0 && <p className="text-xs text-gray-400 text-center py-2 border border-dashed border-gray-200 rounded-lg">Skill이 없습니다.</p>}
              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 bg-gray-100 border-b border-gray-200" style={{ height: 36 }}>
                    <Form.Item noStyle shouldUpdate>
                      {() => {
                        const skillName = form.getFieldValue(['skills', name, 'skillName']) as string | undefined;
                        return <span className="text-sm font-medium text-gray-700">{skillName ?? `Skill ${name + 1}`}</span>;
                      }}
                    </Form.Item>
                    <Button size="small" variant="text" color="danger" icon={<Minus className="size-3" />} onClick={() => remove(name)} />
                  </div>
                  <div className="p-3 flex flex-col gap-2 bg-gray-50">
                    <Form.Item {...restField} name={[name, 'skillName']} label="Skill 명" className="mb-0" rules={[{ required: true, message: 'Skill 명을 입력하세요.' }]}>
                      <Input placeholder="Skill 명" size="small" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'description']} label="설명" className="mb-0">
                      <Input.TextArea placeholder="Skill 설명" size="small" autoSize={{ minRows: 1, maxRows: 3 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'tags']} label="Tags" className="mb-0" extra="쉼표(,)로 구분">
                      <Input placeholder="예: 검색, 조회, 예약" size="small" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'examples']} label="Examples" className="mb-0" extra="줄바꿈으로 구분">
                      <Input.TextArea placeholder={'예시 1\n예시 2'} size="small" autoSize={{ minRows: 2, maxRows: 4 }} />
                    </Form.Item>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Form.List>
      </Form>
    </Drawer>
  );
});

A2ADrawer.displayName = 'A2ADrawer';
export default A2ADrawer;
