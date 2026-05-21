/**
 * 패턴 정책 등록/수정 Drawer
 *
 * 카테고리 선택 후, 해당 카테고리에 적용될 마스킹 패턴을 등록/수정한다.
 * forwardRef + useImperativeHandle 패턴.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useCreatePolicy, useUpdatePolicy } from '../hooks/useMaskPolicyQueries';
import { type MaskPolicy, type MaskPolicyCreateRequest, type MaskPolicyUpdateRequest, PATTERN_TYPE_OPTIONS, RULE_TYPE_OPTIONS } from '../types';

export interface MaskPolicyDrawerRef {
  open: (data?: MaskPolicy) => void;
  close: () => void;
}

interface Props {
  /** 현재 선택된 카테고리 (신규 등록 시 자동 채움) */
  category: string;
  /** 등록/수정 성공 후 호출 */
  onSuccess: () => void;
}

interface FormValues {
  pattern: string;
  patternType: 'REGEX' | 'WILDCARD';
  ruleType: 'HEAD' | 'MIDDLE' | 'TAIL' | 'HIDE' | 'KEEP';
  ruleParam: number | null;
  maskChar: string;
  priority: number;
  enabled: boolean;
  description: string;
}

const MaskPolicyDrawer = forwardRef<MaskPolicyDrawerRef, Props>(({ category, onSuccess }, ref) => {
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<MaskPolicy | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: MaskPolicy) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  // 폼 값 초기화
  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        pattern: editData.pattern,
        patternType: editData.patternType,
        ruleType: editData.ruleType,
        ruleParam: editData.ruleParam,
        maskChar: editData.maskChar ?? '*',
        priority: editData.priority,
        enabled: editData.enabled === 1,
        description: editData.description ?? '',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createPolicy, isPending: isCreating } = useCreatePolicy({
    mutationOptions: {
      onSuccess: () => {
        toast.success('패턴 정책이 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const { mutate: updatePolicy, isPending: isUpdating } = useUpdatePolicy({
    mutationOptions: {
      onSuccess: () => {
        toast.success('패턴 정책이 수정되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      if (isEditMode && editData) {
        const payload: MaskPolicyUpdateRequest = {
          pattern: values.pattern,
          patternType: values.patternType,
          ruleType: values.ruleType,
          ruleParam: values.ruleParam ?? null,
          maskChar: values.maskChar || '*',
          priority: values.priority,
          enabled: values.enabled ? 1 : 0,
          description: values.description || undefined,
        };
        updatePolicy({ policyId: editData.policyId, data: payload });
      } else {
        const payload: MaskPolicyCreateRequest = {
          category,
          pattern: values.pattern,
          patternType: values.patternType,
          ruleType: values.ruleType,
          ruleParam: values.ruleParam ?? null,
          maskChar: values.maskChar || '*',
          priority: values.priority,
          enabled: values.enabled ? 1 : 0,
          description: values.description || undefined,
        };
        createPolicy(payload);
      }
    } catch {
      /* validation 실패 시 antd가 자동 표시 */
    }
  }, [form, isEditMode, editData, category, createPolicy, updatePolicy]);

  return (
    <Drawer
      title={isEditMode ? '패턴 정책 수정' : '패턴 정책 등록'}
      open={visible}
      onClose={() => {
        setVisible(false);
        setEditData(null);
        form.resetFields();
      }}
      styles={{ wrapper: { width: 460 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setVisible(false);
              setEditData(null);
              form.resetFields();
            }}
          >
            취소
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={isPending}>
            {isEditMode ? '수정' : '등록'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          patternType: 'REGEX',
          ruleType: 'MIDDLE',
          ruleParam: 4,
          maskChar: '*',
          priority: 10,
          enabled: true,
          description: '',
        }}
      >
        {/* 카테고리 표시 (수정 불가) */}
        <Form.Item label="카테고리">
          <Input value={category} disabled />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="patternType"
              label="패턴 타입"
              required
              rules={[{ required: true, message: '패턴 타입은 필수입니다' }]}
              tooltip="REGEX(정규식) 또는 WILDCARD(* 와일드카드)"
            >
              <Select options={PATTERN_TYPE_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="priority"
              label="우선순위"
              required
              rules={[{ required: true, message: '우선순위는 필수입니다' }]}
              tooltip="낮을수록 먼저 매칭. fallback(.*)은 99 권장"
            >
              <InputNumber min={1} max={999} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="pattern"
          label="패턴"
          required
          rules={[
            { required: true, message: '패턴은 필수입니다' },
            { max: 500, message: '500자 이내여야 합니다' },
          ]}
          tooltip="REGEX 예: ^010\d{8}$ · WILDCARD 예: 02-*"
        >
          <Input placeholder="^010\d{8}$" maxLength={500} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="ruleType" label="마스킹 룰" required rules={[{ required: true, message: '마스킹 룰은 필수입니다' }]}>
              <Select
                options={RULE_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: `${o.label} — ${o.help}`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="ruleParam" label="자릿수" tooltip="마스킹할 문자 개수 (HEAD/MIDDLE/TAIL)">
              <InputNumber min={0} max={50} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="maskChar" label="마스크 문자" tooltip="기본값 *" rules={[{ max: 1, message: '한 글자만 가능합니다' }]}>
              <Input maxLength={1} placeholder="*" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="description" label="설명" rules={[{ max: 200, message: '200자 이내여야 합니다' }]}>
          <Input.TextArea rows={2} maxLength={200} placeholder="패턴 용도 설명 (선택)" />
        </Form.Item>

        <Form.Item name="enabled" label="활성화" valuePropName="checked">
          <Switch checkedChildren="활성" unCheckedChildren="비활성" />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

MaskPolicyDrawer.displayName = 'MaskPolicyDrawer';
export default MaskPolicyDrawer;
