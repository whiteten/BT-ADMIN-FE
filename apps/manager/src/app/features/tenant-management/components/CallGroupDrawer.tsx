import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Radio, Row, Select } from 'antd';
import { Log } from '@/log';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { tenantQueryKeys, useCreateCallGroup, useGetTenants, useUpdateCallGroup } from '../hooks/useTenantQueries';
import type { CallGroupCreateData, CallGroupItem } from '../types';

/**
 * CallGroupDrawer ref 타입
 */
export interface CallGroupDrawerRef {
  open: (params: { tenantId: number; callGroupData?: CallGroupItem }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  tenantId: number;
  callGroupData?: CallGroupItem;
}

/**
 * 통화그룹 폼 데이터 타입
 */
interface CallGroupFormData {
  targetTenantId: number;
  gubun: number;
  useYn: number;
}

/**
 * 통화그룹 등록/수정 Drawer
 * - ref.open({ tenantId }) : 추가 모드로 열기
 * - ref.open({ tenantId, callGroupData }) : 편집 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const CallGroupDrawer = forwardRef<CallGroupDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    tenantId: 0,
    callGroupData: undefined,
  });

  const { open, tenantId, callGroupData } = drawerState;
  const isEditMode = !!callGroupData;

  // 테넌트 목록 조회 (대상 테넌트 선택용)
  const { data: tenantList } = useGetTenants();
  const tenantOptions = (tenantList ?? []).filter((t) => t.tenantId !== tenantId).map((t) => ({ label: t.tenantName, value: t.tenantId }));

  useImperativeHandle(ref, () => ({
    open: (params) => {
      setDrawerState({
        open: true,
        tenantId: params.tenantId,
        callGroupData: params.callGroupData,
      });
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const invalidateCallGroups = () => {
    queryClient.invalidateQueries({ queryKey: tenantQueryKeys.getCallGroups._def });
  };

  // Mutation 훅
  const createMutation = useCreateCallGroup({
    mutationOptions: {
      onSuccess: () => {
        invalidateCallGroups();
        toast.success('통화그룹이 추가되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('통화그룹 추가에 실패했습니다.');
      },
    },
  });

  const updateMutation = useUpdateCallGroup({
    mutationOptions: {
      onSuccess: () => {
        invalidateCallGroups();
        toast.success('통화그룹이 수정되었습니다.');
        handleClose();
      },
      onError: () => {
        toast.error('통화그룹 수정에 실패했습니다.');
      },
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const title = isEditMode ? '통화그룹 수정' : '통화그룹 추가';
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (callGroupData) {
      form.setFieldsValue({
        targetTenantId: callGroupData.tenantId,
        gubun: callGroupData.gubun,
        useYn: callGroupData.useYn,
      });
    }
    return () => {
      Log.debug('Reset Form Fields');
      form.resetFields();
    };
  }, [callGroupData, form, open]);

  const onFinish: FormProps<CallGroupFormData>['onFinish'] = (values) => {
    Log.debug('onFinish', values, 'tenantId:', tenantId);
    if (isEditMode && callGroupData) {
      updateMutation.mutate({
        id: tenantId,
        targetTenantId: callGroupData.tenantId,
        data: { useYn: values.useYn },
      });
    } else {
      createMutation.mutate({
        id: tenantId,
        data: values as CallGroupCreateData,
      });
    }
  };

  const onFinishFailed: FormProps<CallGroupFormData>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose} disabled={isLoading}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isLoading}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={title} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} initialValues={{ targetTenantId: null, gubun: 0, useYn: 1 }} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row>
          <Col span={24}>
            <Form.Item name="targetTenantId" label="대상 테넌트" required hasFeedback rules={[{ required: true, message: '대상 테넌트를 선택하세요.' }]}>
              <Select options={tenantOptions} allowClear showSearch optionFilterProp="label" placeholder="테넌트를 선택하세요." disabled={isEditMode} />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="gubun" label="구분" required rules={[{ required: true, message: '구분을 선택하세요.' }]}>
              <Radio.Group disabled={isEditMode}>
                <Radio value={0}>발신</Radio>
                <Radio value={1}>착신</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="useYn" label="사용여부" required>
              <Radio.Group>
                <Radio value={1}>ON</Radio>
                <Radio value={0}>OFF</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

export default CallGroupDrawer;
