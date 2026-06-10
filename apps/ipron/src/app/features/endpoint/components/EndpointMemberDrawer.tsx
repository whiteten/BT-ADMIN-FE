/**
 * 국선 멤버 등록/수정 Drawer
 * forwardRef + useImperativeHandle 패턴
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { toast } from '@/shared-util';
import { useCreateMember, useUpdateMember } from '../hooks/useEndpointQueries';
import { type EndpointMember, type EndpointMemberCreateRequest, TRANSPORT_OPTIONS } from '../types';

export interface EndpointMemberDrawerRef {
  open: (data?: EndpointMember) => void;
  close: () => void;
}

interface Props {
  endptId: number;
  onSuccess: () => void;
}

const EndpointMemberDrawer = forwardRef<EndpointMemberDrawerRef, Props>(({ endptId, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<EndpointMember | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: EndpointMember) => {
      setEditData(data ?? null);
      setVisible(true);
    },
    close: () => {
      setVisible(false);
      setEditData(null);
      form.resetFields();
    },
  }));

  useEffect(() => {
    if (visible && editData) {
      form.setFieldsValue({
        endptMemName: editData.endptMemName,
        ipAddress: editData.ipAddress,
        portNo: editData.portNo,
        priority: editData.priority,
        blockYn: editData.blockYn === 1,
        transportType: editData.transportType,
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createMember, isPending: isCreating } = useCreateMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 등록되었습니다.');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const { mutate: updateMember, isPending: isUpdating } = useUpdateMember({
    mutationOptions: {
      onSuccess: () => {
        toast.success('멤버가 수정되었습니다.');
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
      const payload: EndpointMemberCreateRequest = {
        endptMemName: values.endptMemName,
        ipAddress: values.ipAddress,
        portNo: values.portNo,
        priority: values.priority,
        blockYn: values.blockYn ? 1 : 0,
        transportType: values.transportType,
      };
      if (isEditMode && editData) {
        updateMember({ id: endptId, memId: editData.endptMemId, data: payload });
      } else {
        createMember({ id: endptId, data: payload });
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, endptId, createMember, updateMember]);

  return (
    <Drawer
      title={isEditMode ? '멤버 수정' : '멤버 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={() => {
        setVisible(false);
        setEditData(null);
        form.resetFields();
      }}
      styles={{ wrapper: { width: 420 } }}
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
      <Form form={form} layout="vertical" initialValues={{ priority: 1, blockYn: false, transportType: '0', portNo: 5060 }}>
        <Form.Item
          name="endptMemName"
          label="멤버명"
          required
          rules={[
            { required: true, message: '멤버명은 필수입니다' },
            { max: 127, message: '127자 이내여야 합니다' },
          ]}
        >
          <Input placeholder="멤버명" maxLength={127} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="ipAddress"
              label="IP 주소"
              required
              rules={[
                { required: true, message: 'IP 주소는 필수입니다' },
                { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '올바른 IPv4 형식이 아닙니다' },
              ]}
            >
              <Input placeholder="0.0.0.0" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="portNo" label="포트" required rules={[{ required: true, message: '포트는 필수입니다' }]}>
              <InputNumber min={1} max={65535} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="priority" label="우선순위" required rules={[{ required: true, message: '우선순위는 필수입니다' }]}>
              <InputNumber min={1} max={99} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="blockYn" label="블럭설정여부" valuePropName="checked">
              <Switch checkedChildren="설정" unCheckedChildren="해제" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

EndpointMemberDrawer.displayName = 'EndpointMemberDrawer';
export default EndpointMemberDrawer;
