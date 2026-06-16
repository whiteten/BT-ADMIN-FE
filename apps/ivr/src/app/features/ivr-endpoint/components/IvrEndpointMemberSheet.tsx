/**
 * IVR EndPoint 멤버 등록/수정 Drawer.
 * regType=COMMON(10)일 때만 인증 ID/PW 6필드 활성, INDIVIDUAL(20)이면 비활성.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Button, Col, Drawer, Form, Input, InputNumber, Radio, Row, Select, Switch } from 'antd';
import { User, Users } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateMember, useUpdateMember } from '../hooks/useIvrEndpointQueries';
import { type IvrEndpointMember, type IvrEndpointMemberCreateRequest, REG_METHOD_OPTIONS } from '../types';

export interface IvrEndpointMemberSheetRef {
  open: (data?: IvrEndpointMember) => void;
  close: () => void;
}

interface Props {
  endptId: number;
  /**
   * 부모 Master의 endptType. '90'(CHAT)이면 IP/PORT/이름 외 부가 필드는 disabled.
   * AS-IS IPR20S6011_Member.jsp의 disable()/enable() 정책과 일치.
   */
  parentEndptType?: string | null;
  onSuccess: () => void;
}

const IvrEndpointMemberSheet = forwardRef<IvrEndpointMemberSheetRef, Props>(({ endptId, parentEndptType, onSuccess }, ref) => {
  const [form] = Form.useForm();
  const [visible, setVisible] = useState(false);
  const [editData, setEditData] = useState<IvrEndpointMember | null>(null);
  const regType = Form.useWatch('regType', form);
  const isCommon = regType === '10';
  const isEditMode = !!editData;
  /** 부모 Master가 CHAT(90)이면 부가 필드 잠금 (AS-IS와 동일) */
  const isParentChat = parentEndptType === '90';

  useImperativeHandle(ref, () => ({
    open: (data?: IvrEndpointMember) => {
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
        endptMembName: editData.endptMembName,
        endptIp: editData.endptIp,
        endptPort: editData.endptPort,
        domainName: editData.domainName ?? '',
        blockState: editData.blockState === 1,
        priority: editData.priority,
        regType: editData.regType,
        regIdAddpfx: editData.regIdAddpfx ?? '',
        regIdLen: editData.regIdLen ?? 0,
        regIdMethod: editData.regIdMethod ?? '10',
        regPwAddpfx: '',
        regPwLen: editData.regPwLen ?? 0,
        regPwMethod: editData.regPwMethod ?? '10',
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
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '등록 실패');
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
      onError: (err: unknown) => {
        toast.error((err as { message?: string })?.message ?? '수정 실패');
      },
    },
  });

  const isPending = isCreating || isUpdating;

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const payload: IvrEndpointMemberCreateRequest = {
        endptMembName: values.endptMembName,
        endptIp: values.endptIp,
        endptPort: values.endptPort,
        domainName: values.domainName || null,
        blockState: values.blockState ? 1 : 0,
        priority: values.priority,
        regType: values.regType,
        regIdAddpfx: values.regType === '10' ? values.regIdAddpfx || null : null,
        regIdLen: values.regType === '10' ? (values.regIdLen ?? 0) : null,
        regIdMethod: values.regType === '10' ? values.regIdMethod : null,
        regPwAddpfx: values.regType === '10' ? values.regPwAddpfx || null : null,
        regPwLen: values.regType === '10' ? (values.regPwLen ?? 0) : null,
        regPwMethod: values.regType === '10' ? values.regPwMethod : null,
      };
      if (isEditMode && editData) {
        updateMember({ memberId: editData.endptMembId, data: payload });
      } else {
        createMember({ id: endptId, data: payload });
      }
    } catch {
      /* validation failed */
    }
  }, [form, isEditMode, editData, endptId, createMember, updateMember]);

  const handleClose = () => {
    setVisible(false);
    setEditData(null);
    form.resetFields();
  };

  return (
    <Drawer
      title={isEditMode ? '멤버 수정' : '멤버 등록'}
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
          endptPort: 5060,
          priority: 0,
          blockState: false,
          regType: '20',
          regIdLen: 0,
          regIdMethod: '10',
          regPwLen: 0,
          regPwMethod: '10',
        }}
      >
        <Form.Item
          name="endptMembName"
          label="이름"
          required
          rules={[
            { required: true, message: '이름은 필수입니다' },
            { max: 64, message: '64자 이내' },
          ]}
        >
          <Input placeholder="멤버명" maxLength={64} />
        </Form.Item>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="endptIp"
              label="SIP IP"
              required
              rules={[
                { required: true, message: 'IP는 필수입니다' },
                { pattern: /^(\d{1,3}\.){3}\d{1,3}$/, message: '올바른 IPv4 형식이 아닙니다' },
              ]}
            >
              <Input placeholder="192.168.1.10" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="endptPort" label="PORT" required rules={[{ required: true, message: 'PORT 필수' }]}>
              <InputNumber min={1} max={65535} className="!w-full" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="domainName" label="Domain" rules={[{ max: 64, message: '64자 이내' }]}>
              <Input placeholder="(선택)" maxLength={64} disabled={isParentChat} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="priority" label="우선순위" required={!isParentChat} rules={!isParentChat ? [{ required: true, message: '필수' }] : []}>
              <InputNumber min={0} max={100} className="!w-full" disabled={isParentChat} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="blockState" label="블럭 설정" valuePropName="checked" required={!isParentChat}>
          <Switch checkedChildren="설정" unCheckedChildren="해제" disabled={isParentChat} />
        </Form.Item>

        <Form.Item name="regType" label="ID/PW 유형" required={!isParentChat}>
          <Radio.Group disabled={isParentChat}>
            <Radio value="10">
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 text-blue-600" />
                공통
              </span>
            </Radio>
            <Radio value="20">
              <span className="inline-flex items-center gap-1.5">
                <User className="size-3.5 text-gray-500" />
                개별
              </span>
            </Radio>
          </Radio.Group>
        </Form.Item>

        {/*
          인증 ID/PW 영역 활성 조건:
          - 부모 Master가 CHAT(90)이면 무조건 잠금
          - regType이 '공통(10)'일 때만 활성 (개별이면 잠금)
        */}
        {(() => {
          const authActive = isCommon && !isParentChat;
          const authDisabled = !authActive;
          return (
            <>
              <div
                style={{
                  padding: 12,
                  border: '1px dashed #e5e7eb',
                  borderRadius: 6,
                  background: authActive ? '#fafbff' : '#f5f5f5',
                  opacity: authActive ? 1 : 0.6,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 10 }}>인증 ID</div>
                <Form.Item name="regIdAddpfx" label="인증 아이디" rules={[{ max: 32, message: '32자 이내' }]}>
                  <Input placeholder="" maxLength={32} disabled={authDisabled} />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="regIdLen" label="편집길이">
                      <InputNumber min={0} max={128} className="!w-full" disabled={authDisabled} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="regIdMethod" label="옵션">
                      <Select options={REG_METHOD_OPTIONS as unknown as { label: string; value: string }[]} disabled={authDisabled} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <div
                style={{
                  padding: 12,
                  border: '1px dashed #e5e7eb',
                  borderRadius: 6,
                  background: authActive ? '#fafbff' : '#f5f5f5',
                  opacity: authActive ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 10 }}>인증 비밀번호</div>
                <Form.Item name="regPwAddpfx" label="인증 비밀번호" rules={[{ max: 32, message: '32자 이내' }]}>
                  <Input placeholder={isEditMode ? '변경 시 새 비밀번호 입력' : ''} maxLength={32} disabled={authDisabled} />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="regPwLen" label="편집길이">
                      <InputNumber min={0} max={128} className="!w-full" disabled={authDisabled} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="regPwMethod" label="옵션">
                      <Select options={REG_METHOD_OPTIONS as unknown as { label: string; value: string }[]} disabled={authDisabled} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </>
          );
        })()}
      </Form>
    </Drawer>
  );
});

IvrEndpointMemberSheet.displayName = 'IvrEndpointMemberSheet';
export default IvrEndpointMemberSheet;
