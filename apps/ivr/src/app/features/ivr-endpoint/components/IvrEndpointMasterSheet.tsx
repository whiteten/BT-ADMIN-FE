/**
 * IVR EndPoint 마스터 등록/수정 Drawer.
 * forwardRef + useImperativeHandle 패턴.
 * Type='특수(90)' 선택 시 부가필드 8개 자동 disable.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMaster, useUpdateMaster } from '../hooks/useIvrEndpointQueries';
import { ALLOC_METHOD_OPTIONS, CONN_TYPE_OPTIONS, ENDPT_TYPE_OPTIONS, type IvrEndpointMaster, type IvrEndpointMasterCreateRequest, LINE_TYPE_OPTIONS } from '../types';

export interface IvrEndpointMasterSheetRef {
  open: (data?: IvrEndpointMaster, defaultNodeId?: number) => void;
  close: () => void;
}

interface Props {
  nodes: { nodeId: number; nodeName: string }[];
  onSuccess: () => void;
}

/**
 * Type=Chat(90) 선택/진입 시 강제 디폴트 (AS-IS IPR20S6011_EndPoint.jsp setDefalutValue(false) 1:1 이식).
 * DB값보다 우선하여 덮어쓰기 + 입력 disable → [저장] 시 항상 디폴트로 갱신.
 */
const CHAT_TYPE_DEFAULTS = {
  lineType: '20', // EXTENSION (AS-IS poAddLineType=20)
  connType: '10', // UDP
  allocMethod: '10', // PRIORITY
  regInterval: 60,
  aliveChk: 0,
  blockState: false,
} as const;

const IvrEndpointMasterSheet = forwardRef<IvrEndpointMasterSheetRef, Props>(({ nodes, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IvrEndpointMaster | null>(null);
  const endptType = Form.useWatch('endptType', form);
  const isSpecial = endptType === '90';
  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: IvrEndpointMaster, defaultNodeId?: number) => {
      setEditData(data ?? null);
      setVisible(true);
      // useEffect에서 form.setFieldsValue 처리
      if (!data && defaultNodeId) {
        setTimeout(() => form.setFieldsValue({ nodeId: defaultNodeId }), 0);
      }
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      // AS-IS 동작: 편집 진입 시 type=90이면 DB값 무시하고 디폴트 강제
      if (editData.endptType === '90') {
        form.setFieldsValue({
          nodeId: editData.nodeId,
          endptName: editData.endptName,
          endptType: editData.endptType,
          ...CHAT_TYPE_DEFAULTS,
        });
      } else {
        form.setFieldsValue({
          nodeId: editData.nodeId,
          endptName: editData.endptName,
          endptType: editData.endptType,
          lineType: editData.lineType ?? '10',
          connType: editData.connType ?? '10',
          regInterval: editData.regInterval ?? 60,
          aliveChk: editData.aliveChk ?? 0,
          blockState: editData.blockState === 1,
          allocMethod: editData.allocMethod ?? '10',
        });
      }
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  // AS-IS onChangedType: type을 90으로 바꾸는 즉시 디폴트 강제 (콤보 변경 시)
  useEffect(() => {
    if (visible && endptType === '90') {
      form.setFieldsValue(CHAT_TYPE_DEFAULTS);
    }
  }, [visible, endptType, form]);

  const { mutate: createMaster, isPending: isCreating } = useCreateMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('EndPoint가 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '등록에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  const { mutate: updateMaster, isPending: isUpdating } = useUpdateMaster({
    mutationOptions: {
      onSuccess: () => {
        toast.success('EndPoint가 수정되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
      onError: (err: unknown) => {
        const msg = (err as { message?: string })?.message ?? '수정에 실패했습니다.';
        toast.error(msg);
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload: IvrEndpointMasterCreateRequest = {
        nodeId: values.nodeId,
        endptName: values.endptName,
        endptType: values.endptType,
        lineType: values.lineType,
        connType: values.connType,
        blockState: values.blockState ? 1 : 0,
        regInterval: values.regInterval,
        aliveChk: values.aliveChk,
        allocMethod: values.allocMethod,
      };
      if (isEditMode && editData) {
        // nodeId는 수정 불가
        const { nodeId, ...updatePayload } = payload;
        void nodeId;
        updateMaster({ id: editData.endptId, data: updatePayload });
      } else {
        createMaster(payload);
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, createMaster, updateMaster]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? 'EndPoint 수정' : 'EndPoint 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={handleClose}
      styles={{ wrapper: { width: 560 } }}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleClose}>취소</Button>
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
          endptType: '10',
          lineType: '10',
          connType: '10',
          blockState: false,
          regInterval: 60,
          aliveChk: 0,
          allocMethod: '10',
        }}
      >
        <Form.Item name="nodeId" label="노드" required rules={[{ required: true, message: '노드는 필수입니다' }]}>
          <Select options={nodes.map((n) => ({ label: n.nodeName, value: n.nodeId }))} placeholder="노드 선택" disabled={isEditMode} />
        </Form.Item>

        <Form.Item
          name="endptName"
          label="End Point 표시명"
          required
          rules={[
            { required: true, message: '표시명은 필수입니다' },
            { max: 64, message: '64자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="예: EP01_SeoulSIP1" maxLength={64} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="endptType" label="Type" required>
              <Select options={ENDPT_TYPE_OPTIONS as unknown as { label: string; value: string }[]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="allocMethod" label="서버 할당방식">
              <Select options={ALLOC_METHOD_OPTIONS as unknown as { label: string; value: string }[]} disabled={isSpecial} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="lineType" label="연동방식">
              <Select options={LINE_TYPE_OPTIONS as unknown as { label: string; value: string }[]} disabled={isSpecial} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="connType" label="SIP 연결방식">
              <Select options={CONN_TYPE_OPTIONS as unknown as { label: string; value: string }[]} disabled={isSpecial} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="regInterval" label="REG 주기(초)" rules={[{ type: 'number', min: 5, max: 3600, message: '5~3600 사이' }]}>
              <InputNumber min={5} max={3600} className="!w-full" disabled={isSpecial} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="aliveChk" label="Alive Check(ms)" rules={[{ type: 'number', min: 0, max: 3600, message: '0~3600 사이' }]}>
              <InputNumber min={0} max={3600} className="!w-full" disabled={isSpecial} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="blockState" label="블럭 설정" valuePropName="checked">
          <Switch checkedChildren="설정" unCheckedChildren="해제" disabled={isSpecial} />
        </Form.Item>

        {isSpecial && <p className="text-xs text-gray-500 mt-2">※ Type이 '특수'인 경우 위 부가 필드는 저장되지 않습니다.</p>}
      </Form>
    </Drawer>
  );
});

IvrEndpointMasterSheet.displayName = 'IvrEndpointMasterSheet';
export default IvrEndpointMasterSheet;
