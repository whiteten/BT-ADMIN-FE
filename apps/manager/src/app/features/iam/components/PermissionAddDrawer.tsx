/**
 * 권한 추가 Drawer
 * - ref.open() : Drawer 열기
 * - ref.close() : Drawer 닫기
 * - action은 'read'로 고정
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useBreadcrumbStore } from '@/shared-store';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, Input, Row, Select } from 'antd';
import { toast } from '@/shared-util';
import { useGetApps } from '../hooks/useAppQueries';
import { permissionQueryKeys, useCreatePermission } from '../hooks/usePermissionQueries';
import type { PermissionCreateRequest } from '../types/iam.types';

export interface PermissionAddDrawerRef {
  open: () => void;
  close: () => void;
}

const PermissionAddDrawer = forwardRef<PermissionAddDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form] = Form.useForm<PermissionCreateRequest>();

  const { data: apps = [] } = useGetApps();

  const createPermissionMutation = useCreatePermission({
    mutationOptions: {
      onSuccess: () => {
        toast.success('권한이 생성되었습니다');
        handleClose();
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getAuthList.queryKey });
        queryClient.invalidateQueries({ queryKey: permissionQueryKeys.getGroupedPermissions.queryKey });
      },
    },
  });

  const appOptions = apps.map((a) => ({ label: a.appName, value: a.appId }));

  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  useEffect(() => {
    if (isOpen) {
      form.setFieldsValue({ action: 'read' });
    }
    return () => {
      form.resetFields();
    };
  }, [form, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSubmit = () => {
    form.submit();
  };

  const onFinish = (values: PermissionCreateRequest) => {
    createPermissionMutation.mutate(values);
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmit} loading={createPermissionMutation.isPending}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={isOpen} onClose={handleClose} title="권한 추가" closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} onFinish={onFinish} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="앱" name="appId" rules={[{ required: true, message: '앱을 선택해주세요' }]}>
              <Select placeholder="앱 선택" options={appOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="도메인" name="domain" rules={[{ required: true, message: '도메인을 입력해주세요' }]}>
              <Input placeholder="예: resource, mgmt, stats" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="리소스" name="resourceKey" rules={[{ required: true, message: '리소스를 입력해주세요' }]}>
              <Input placeholder="예: user, role, bot" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="액션" name="action" rules={[{ required: true, message: '액션을 선택해주세요' }]}>
              <Select disabled options={[{ label: 'read', value: 'read' }]} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="설명" name="description">
          <Input.TextArea placeholder="권한에 대한 설명을 입력해주세요" rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  );
});

PermissionAddDrawer.displayName = 'PermissionAddDrawer';

export default PermissionAddDrawer;
