import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, Radio, Row, Select } from 'antd';
import { Log } from '@/log';
import { toast } from '@/shared-util';
import { useGetTenants } from '../hooks/useCommonQueries';
import { dnQueryKeys, useCreateSttDn, useUpdateSttDn } from '../hooks/useDnQueries';
import type { SttDnCreateData, SttDnItem } from '../types';

export interface SttDnDrawerRef {
  open: (hostName: string, item?: SttDnItem) => void;
  close: () => void;
}

const SttDnDrawer = forwardRef<SttDnDrawerRef>((_, ref) => {
  const [open, setOpen] = useState(false);
  const [hostName, setHostName] = useState('');
  const [editItem, setEditItem] = useState<SttDnItem | null>(null);
  const isEdit = !!editItem;

  const [form] = Form.useForm<SttDnCreateData>();
  const queryClient = useQueryClient();

  const { data: tenants } = useGetTenants({});
  const tenantOptions = tenants?.map((t) => ({ label: t.tenantName, value: String(t.tenantId) })) ?? [];

  useImperativeHandle(ref, () => ({
    open: (hn: string, item?: SttDnItem) => {
      setHostName(hn);
      setEditItem(item ?? null);
      setOpen(true);
    },
    close: () => setOpen(false),
  }));

  const handleClose = () => setOpen(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: dnQueryKeys.getSttDnList._def });

  const { mutate: createDn, isPending: isCreating } = useCreateSttDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('등록되었습니다.');
        invalidate();
        handleClose();
      },
    },
  });

  const { mutate: updateDn, isPending: isUpdating } = useUpdateSttDn({
    mutationOptions: {
      onSuccess: () => {
        toast.success('수정되었습니다.');
        invalidate();
        handleClose();
      },
      onError: () => toast.error('수정에 실패했습니다.'),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      form.setFieldsValue({
        dnNo: editItem.dnNo,
        phoneIp: editItem.phoneIp,
        tenantId: String(editItem.tenantId),
        agentId: editItem.agentId,
        dnStatus: String(editItem.dnStatus),
        useYn: String(editItem.useYn),
      });
    } else {
      form.setFieldsValue({
        dnStatus: '1',
        useYn: '1',
        tenantId: tenants?.[0] ? String(tenants[0].tenantId) : undefined,
      });
    }
    return () => {
      Log.debug('SttDnDrawer resetFields');
      form.resetFields();
    };
  }, [form, open, editItem, tenants]);

  const handleDnNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setFieldValue('dnNo', e.target.value.replace(/[^0-9]/g, '').slice(0, 24));
  };

  const handlePhoneIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setFieldValue('phoneIp', e.target.value.replace(/[^0-9.]/g, '').slice(0, 32));
  };

  const onFinish: FormProps<SttDnCreateData>['onFinish'] = (values) => {
    if (isEdit) {
      updateDn({ ...values, hostName });
    } else {
      createDn({ ...values, hostName });
    }
  };

  const onFinishFailed: FormProps<SttDnCreateData>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={() => form.submit()} loading={isCreating || isUpdating}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={isEdit ? '내선정보 수정' : '내선정보 추가'} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} layout="vertical" initialValues={{ dnStatus: '1', useYn: '1' }} onFinish={onFinish} onFinishFailed={onFinishFailed}>
        <Row>
          <Col span={24}>
            <Form.Item name="dnNo" label="내선번호" required hasFeedback rules={[{ required: true, message: 'DN 번호를 입력해주세요.' }]}>
              <Input placeholder="DN 번호를 입력하세요." maxLength={24} onChange={handleDnNoChange} disabled={isEdit} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="phoneIp" label="전화기IP" required hasFeedback rules={[{ required: true, message: '전화기IP를 입력해주세요.' }]}>
              <Input placeholder="전화기IP를 입력하세요." maxLength={32} onChange={handlePhoneIpChange} disabled={isEdit} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="tenantId" label="테넌트" required hasFeedback rules={[{ required: true, message: '테넌트를 선택해주세요.' }]}>
              <Select options={tenantOptions} placeholder="테넌트를 선택하세요." className="w-full" />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="agentId" label="상담원ID" required hasFeedback rules={[{ required: true, message: '상담원ID를 입력해주세요.' }]}>
              <Input placeholder="상담원ID를 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={20}>
          <Col span={12}>
            <Form.Item name="dnStatus" label="내선상태" required rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="1">등록</Radio>
                <Radio value="0">미등록</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="useYn" label="사용여부" required rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="1">사용</Radio>
                <Radio value="0">미사용</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

SttDnDrawer.displayName = 'SttDnDrawer';
export default SttDnDrawer;
