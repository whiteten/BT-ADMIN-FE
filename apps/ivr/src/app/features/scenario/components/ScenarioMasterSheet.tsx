/**
 * 시나리오 마스터 등록/수정 Sheet.
 * 테넌트는 로그인 정보로 자동 적용 — Sheet에서 입력받지 않음.
 */
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, Form, Input, InputNumber, Select } from 'antd';
import { toast } from '@/shared-util';
import { scenarioQueryKeys, useCreateScenario, useUpdateScenario } from '../hooks/useScenarioQueries';
import { SCENARIO_TYPE_OPTIONS, type Scenario, type ScenarioType } from '../types';

interface ScenarioMasterSheetProps {
  onSuccess?: () => void;
}

export interface ScenarioMasterSheetRef {
  open: (scenario?: Scenario) => void;
  close: () => void;
}

interface FormValues {
  serviceName: string;
  serviceType: ScenarioType;
  mentfilePath?: string;
  commonPath?: string;
  maxKeepTime?: number;
  daemonPeriod?: number;
  defaultFilename: string;
  serviceDesc?: string;
}

const ScenarioMasterSheet = forwardRef<ScenarioMasterSheetRef, ScenarioMasterSheetProps>(({ onSuccess }, ref) => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Scenario | null>(null);

  const isEdit = !!editing;
  const isAcsType = editing?.serviceType === '20' || editing?.serviceType === '70';

  useImperativeHandle(ref, () => ({
    open: (scenario) => {
      setEditing(scenario ?? null);
      if (scenario) {
        form.setFieldsValue({
          serviceName: scenario.serviceName,
          serviceType: scenario.serviceType,
          mentfilePath: scenario.mentfilePath ?? undefined,
          commonPath: scenario.commonPath ?? undefined,
          maxKeepTime: scenario.maxKeepTime ?? undefined,
          daemonPeriod: scenario.daemonPeriod ?? undefined,
          defaultFilename: scenario.defaultFilename,
          serviceDesc: scenario.serviceDesc ?? undefined,
        });
      } else {
        form.resetFields();
      }
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  const { mutate: createMutate, isPending: isCreating } = useCreateScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오가 등록되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
        setVisible(false);
        onSuccess?.();
      },
    },
  });

  const { mutate: updateMutate, isPending: isUpdating } = useUpdateScenario({
    mutationOptions: {
      onSuccess: () => {
        toast.success('시나리오가 수정되었습니다.');
        queryClient.invalidateQueries({ queryKey: scenarioQueryKeys.getScenarios._def });
        setVisible(false);
        onSuccess?.();
      },
    },
  });

  const handleSubmit = (values: FormValues) => {
    if (isEdit && editing) {
      const { defaultFilename, ...updateData } = values;
      updateMutate({ params: { serviceId: editing.serviceId }, data: updateData });
    } else {
      createMutate(values);
    }
  };

  return (
    <Drawer
      title={isEdit ? '시나리오 수정' : '시나리오 추가'}
      placement="right"
      width={520}
      open={visible}
      onClose={() => setVisible(false)}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => setVisible(false)}>취소</Button>
          <Button type="primary" loading={isCreating || isUpdating} onClick={() => form.submit()}>
            {isEdit ? '수정' : '저장'}
          </Button>
        </div>
      }
    >
      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit} requiredMark>
        <Form.Item
          name="serviceName"
          label="시나리오명"
          rules={[
            { required: true, message: '시나리오명은 필수입니다' },
            { max: 33, message: '시나리오명은 33자 이내여야 합니다' },
            { pattern: /^[a-zA-Z0-9가-힣_ ]+$/, message: '영문, 숫자, 한글, 밑줄, 공백만 가능합니다' },
          ]}
        >
          <Input placeholder="예: 신용카드_본인확인" maxLength={33} />
        </Form.Item>

        <Form.Item name="serviceType" label="시나리오 종류" initialValue="10" rules={[{ required: true, message: '시나리오 종류는 필수입니다' }]}>
          <Select
            placeholder="선택"
            disabled={isAcsType}
            options={SCENARIO_TYPE_OPTIONS.filter((o) => !isEdit || !['20', '70'].includes(o.value)).map((o) => ({ label: o.label, value: o.value }))}
          />
        </Form.Item>

        <Form.Item
          name="defaultFilename"
          label="기본 파일명"
          rules={[
            { required: true, message: '기본 파일명은 필수입니다' },
            { max: 100, message: '기본 파일명은 100자 이내여야 합니다' },
            { pattern: /^[a-zA-Z0-9_]+$/, message: '영문, 숫자, 밑줄만 가능합니다' },
          ]}
          extra="SXML 파일명 prefix (예: creditcard → creditcard_v1.0.sxml)"
        >
          <Input placeholder="예: creditcard" maxLength={100} disabled={isEdit} />
        </Form.Item>

        <Form.Item
          name="mentfilePath"
          label="멘트 경로"
          initialValue="IPRON/ment/"
          rules={[
            { required: true, message: '멘트 경로는 필수입니다' },
            { max: 256, message: '256자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="IPRON/ment/" maxLength={256} />
        </Form.Item>

        <Form.Item
          name="maxKeepTime"
          label="최대 유지시간 (초)"
          initialValue={0}
          extra="0 ~ 9999999999"
          rules={[
            { required: true, message: '최대 유지시간은 필수입니다' },
            { type: 'number', min: 0, max: 9999999999, message: '0 ~ 9999999999 범위여야 합니다' },
          ]}
        >
          <InputNumber min={0} max={9999999999} precision={0} keyboard style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="serviceDesc" label="설명" rules={[{ max: 256, message: '256자 이내여야 합니다' }]}>
          <Input.TextArea rows={3} maxLength={256} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

ScenarioMasterSheet.displayName = 'ScenarioMasterSheet';
export default ScenarioMasterSheet;
