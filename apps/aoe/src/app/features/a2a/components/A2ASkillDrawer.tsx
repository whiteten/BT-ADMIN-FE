import { forwardRef, useImperativeHandle, useState } from 'react';
import { Button, Drawer, Form, Input } from 'antd';
import type { A2ASkill } from '../types';

export interface A2ASkillDrawerRef {
  open: (skill?: A2ASkill) => void;
  close: () => void;
}

interface FormValues {
  skillName: string;
  description?: string;
  tags?: string;
  examples?: string;
}

interface Props {
  onSave: (skill: A2ASkill, isEdit: boolean) => void;
}

const A2ASkillDrawer = forwardRef<A2ASkillDrawerRef, Props>(({ onSave }, ref) => {
  const [open, setOpen] = useState(false);
  const [editSkill, setEditSkill] = useState<A2ASkill | null>(null);
  const [form] = Form.useForm<FormValues>();

  const isEdit = !!editSkill;

  useImperativeHandle(ref, () => ({
    open: (skill) => {
      setEditSkill(skill ?? null);
      if (skill) {
        form.setFieldsValue({
          skillName: skill.skillName,
          description: skill.description,
          tags: (skill.tags ?? []).join(', '),
          examples: (skill.examples ?? []).join('\n'),
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
    setEditSkill(null);
  };

  const onFinish = (values: FormValues) => {
    const skill: A2ASkill = {
      skillId: editSkill?.skillId,
      skillName: values.skillName,
      description: values.description,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      examples: values.examples
        ? values.examples
            .split('\n')
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
    };
    onSave(skill, isEdit);
    handleClose();
  };

  return (
    <Drawer
      title={isEdit ? 'Skill 수정' : 'Skill 추가'}
      open={open}
      onClose={handleClose}
      closable={{ placement: 'end' }}
      styles={{ wrapper: { width: 480 } }}
      destroyOnHidden
      footer={
        <div className="flex gap-2 justify-end">
          <Button onClick={handleClose}>취소</Button>
          <Button type="primary" onClick={() => form.submit()}>
            저장
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="skillName" label="Skill 명" required rules={[{ required: true, message: 'Skill 명을 입력해 주세요.' }]}>
          <Input placeholder="Skill 명을 입력하세요." />
        </Form.Item>
        <Form.Item name="description" label="설명">
          <Input.TextArea placeholder="Skill 설명을 입력하세요." autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
        <Form.Item name="tags" label="Tags" extra="쉼표(,)로 구분">
          <Input placeholder="예: 검색, 조회, 예약" />
        </Form.Item>
        <Form.Item name="examples" label="Examples" extra="줄바꿈으로 구분">
          <Input.TextArea placeholder={'예시 1\n예시 2'} autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

A2ASkillDrawer.displayName = 'A2ASkillDrawer';
export default A2ASkillDrawer;
