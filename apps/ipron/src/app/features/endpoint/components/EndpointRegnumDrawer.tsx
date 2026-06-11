/**
 * 국선 인증번호 등록/수정 Drawer
 * AS-IS: IPR20S1010_SQL.xml + IPR20S1010.jsp (endptRegnumDetailWindow)
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Checkbox, Col, Drawer, Form, Input, InputNumber, Row, Select, Switch } from 'antd';
import { X } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateRegnum, useUpdateRegnum } from '../hooks/useEndpointQueries';
import type { EndpointRegnum, EndpointRegnumCreateRequest } from '../types';

export interface EndpointRegnumDrawerRef {
  open: (data?: EndpointRegnum) => void;
  close: () => void;
}

interface Props {
  endptId: number;
  tenantOptions?: Array<{ label: string; value: number }>;
  onSuccess: () => void;
}

const EndpointRegnumDrawer = forwardRef<EndpointRegnumDrawerRef, Props>(({ endptId, tenantOptions = [], onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<EndpointRegnum | null>(null);

  const isEditMode = !!editData;

  useImperativeHandle(ref, () => ({
    open: (data?: EndpointRegnum) => {
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
        regNum: editData.regNum,
        regMd5Id: editData.regMd5Id,
        regMd5Pwd: '',
        regInterval: editData.regInterval,
        regActivateYn: editData.regActivateYn === 1,
        tenantId: editData.tenantId || null,
        extOptions0: (editData as any).extOptions === '1',
      });
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editData, form]);

  const { mutate: createRegnum, isPending: isCreating } = useCreateRegnum({
    mutationOptions: {
      onSuccess: () => {
        toast.success('인증번호가 등록되었습니다');
        setVisible(false);
        setEditData(null);
        form.resetFields();
        onSuccess();
      },
    },
  });

  const { mutate: updateRegnum, isPending: isUpdating } = useUpdateRegnum({
    mutationOptions: {
      onSuccess: () => {
        toast.success('인증번호가 수정되었습니다');
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
      const payload: EndpointRegnumCreateRequest = {
        regNum: values.regNum,
        regMd5Id: values.regMd5Id,
        regMd5Pwd: values.regMd5Pwd,
        regInterval: values.regInterval,
        tenantId: values.tenantId || null,
        regActivateYn: values.regActivateYn ? 1 : 0,
        expireDate: null,
      };
      if (isEditMode && editData) {
        updateRegnum({ id: endptId, regId: editData.endptRegnumId, data: payload });
      } else {
        createRegnum({ id: endptId, data: payload });
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, endptId, createRegnum, updateRegnum]);

  return (
    <Drawer
      title={isEditMode ? '인증번호 수정' : '인증번호 등록'}
      closable={{ placement: 'end' }}
      open={visible}
      onClose={() => {
        setVisible(false);
        setEditData(null);
        form.resetFields();
      }}
      styles={{ wrapper: { width: 420 } }}
      closeIcon={<X className="size-4" />}
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
      <Form form={form} layout="vertical" initialValues={{ regInterval: 60, regActivateYn: true }}>
        <Form.Item
          name="regNum"
          label="인증번호"
          required
          rules={[
            { required: true, message: '인증번호를 입력해주세요' },
            { max: 23, message: '인증번호는 23자까지 입력가능합니다' },
            { pattern: /^[0-9~!@#$%^&*()_+|<>?:{}]*$/, message: '숫자와 특수문자만 가능합니다' },
          ]}
        >
          <Input placeholder="인증번호" maxLength={23} />
        </Form.Item>

        <Form.Item name="tenantId" label="테넌트">
          <Select options={[{ label: '미지정', value: 0 }, ...tenantOptions]} allowClear placeholder="테넌트 선택" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="regMd5Id"
              label="인증 아이디"
              required
              rules={[
                { required: true, message: '인증아이디를 입력해주세요' },
                { max: 20, message: '인증아이디는 20자까지 입력가능합니다' },
                { pattern: /^[0-9a-zA-Z_]*$/, message: '영문, 숫자, 밑줄만 가능합니다' },
              ]}
            >
              <Input placeholder="인증 아이디" maxLength={20} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="regMd5Pwd" label="인증 비밀번호" required={!isEditMode} rules={isEditMode ? [] : [{ required: true, message: '인증비밀번호를 입력해주세요' }]}>
              <Input.Password placeholder={isEditMode ? '변경 시 입력' : '비밀번호'} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="regInterval" label="주기(초)" required rules={[{ required: true, message: '주기를 입력해주세요' }]}>
              <InputNumber min={0} className="!w-full" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="regActivateYn" label="사용여부" valuePropName="checked">
              <Switch checkedChildren="사용" unCheckedChildren="사용안함" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="extOptions0" valuePropName="checked">
          <Checkbox>우선순위 역순 사용</Checkbox>
        </Form.Item>
      </Form>
    </Drawer>
  );
});

EndpointRegnumDrawer.displayName = 'EndpointRegnumDrawer';
export default EndpointRegnumDrawer;
