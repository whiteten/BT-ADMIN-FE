import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, InputNumber, Row, Switch } from 'antd';
import { sharedApi } from '@/shared-api';
import { toast } from '@/shared-util';
import { useCreateRole, useGetRoles, useUpdateRole } from '../hooks/useRoleQueries';
import type { Role, RoleCreateDatas, RoleUpdateDatas } from '../types/iam.types';

/**
 * RoleDrawer ref 타입
 * @property open - 드로어를 여는 함수
 * @property close - 드로어를 닫는 함수
 */
export interface RoleDrawerRef {
  open: (params: { mode: 'create' } | { mode: 'edit'; role: Role }) => void;
  close: () => void;
}

/**
 * 드로어 내부 상태 타입
 */
interface DrawerState {
  open: boolean;
  mode: 'create' | 'edit';
  role?: Role;
}

/**
 * Role 등록/수정 Drawer
 * - ref.open({ mode: 'create' }) : 추가 모드로 열기
 * - ref.open({ mode: 'edit', role }) : 수정 모드로 열기
 * - ref.close() : 드로어 닫기
 */
const RoleDrawer = forwardRef<RoleDrawerRef>((_, ref) => {
  const queryClient = useQueryClient();
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: 'create',
  });

  const { open, mode, role } = drawerState;
  const isEditMode = mode === 'edit';

  // 역할 목록 조회 (중복 체크용)
  const { data: roles = [] } = useGetRoles();
  const createMutation = useCreateRole({});
  const updateMutation = useUpdateRole({});

  useImperativeHandle(ref, () => ({
    open: (params) => {
      if (params.mode === 'create') {
        setDrawerState({ open: true, mode: 'create' });
      } else {
        setDrawerState({ open: true, mode: 'edit', role: params.role });
      }
    },
    close: () => {
      setDrawerState((prev) => ({ ...prev, open: false }));
    },
  }));

  const handleClose = () => {
    setDrawerState((prev) => ({ ...prev, open: false }));
  };

  const [form] = Form.useForm<RoleUpdateDatas>();
  const { TextArea } = Input;

  useEffect(() => {
    if (!open) return;

    if (isEditMode && role) {
      form.setFieldsValue({
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description || '',
        sortOrder: role.sortOrder || 0,
        isUse: role.isUse,
      });
    } else {
      form.setFieldsValue({
        roleCode: '',
        roleName: '',
        description: '',
        sortOrder: 0,
        isUse: true,
      });
    }

    return () => {
      form.resetFields();
    };
  }, [form, open, isEditMode, role]);

  // 역할 코드 중복 체크 validator (생성 모드에서만 사용)
  const validateRoleCode = useCallback(
    async (_: unknown, value: string) => {
      if (!value || isEditMode) return Promise.resolve();

      const isDuplicate = roles.some((r) => r.roleCode === value);

      if (isDuplicate) {
        return Promise.reject(new Error('이미 존재하는 역할 코드입니다.'));
      }
      return Promise.resolve();
    },
    [roles, isEditMode],
  );

  // 역할 이름 중복 체크 validator
  const validateRoleName = useCallback(
    async (_: unknown, value: string) => {
      if (!value) return Promise.resolve();

      const isDuplicate = roles.some((r) => r.roleName === value && r.roleId !== role?.roleId);

      if (isDuplicate) {
        return Promise.reject(new Error('이미 존재하는 역할 이름입니다.'));
      }
      return Promise.resolve();
    },
    [roles, role?.roleId],
  );

  const onFinish: FormProps<RoleUpdateDatas>['onFinish'] = async (values) => {
    if (!isEditMode) {
      // 생성 모드
      try {
        const createRequest: RoleCreateDatas = {
          roleCode: values.roleCode,
          roleName: values.roleName,
          description: values.description,
          sortOrder: values.sortOrder,
          isUse: values.isUse,
        };
        await createMutation.mutateAsync(createRequest);
        toast.success('역할이 추가되었습니다.');
        handleClose();
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRoles().queryKey });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '역할 추가에 실패했습니다.';
        toast.error(errorMessage);
      }
      return;
    }

    // 수정 모드
    if (!role) return;

    try {
      await updateMutation.mutateAsync({
        params: { roleId: role.roleId },
        data: values,
      });
      toast.success('역할이 수정되었습니다.');
      handleClose();
      queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRoles().queryKey });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '역할 수정에 실패했습니다.';
      toast.error(errorMessage);
    }
  };

  const onFinishFailed: FormProps<RoleUpdateDatas>['onFinishFailed'] = (errorInfo) => {
    console.warn('onFinishFailed', errorInfo);
  };

  const handleSubmitBtn = () => {
    form.submit();
  };

  const footer = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="solid" onClick={handleClose}>
        취소
      </Button>
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={createMutation.isPending || updateMutation.isPending}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={isEditMode ? '역할 수정' : '역할 추가'} closable={{ placement: 'end' }} size={480} footer={footer} destroyOnHidden>
      <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="roleCode"
              label="역할 코드"
              required
              hasFeedback
              rules={[
                { required: true, message: '역할 코드를 입력하세요.' },
                { pattern: /^[A-Z][A-Z0-9_]*$/, message: '대문자로 시작, 대문자/숫자/언더스코어만 허용' },
                { max: 100, message: '100자 이하로 입력하세요.' },
                { validator: validateRoleCode },
              ]}
              tooltip="예: ADMIN, MANAGER, OPERATOR"
            >
              <Input placeholder="ROLE_CODE" disabled={isEditMode} style={{ textTransform: 'uppercase' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="roleName"
              label="역할 이름"
              required
              hasFeedback
              rules={[{ required: true, message: '역할 이름을 입력하세요.' }, { max: 100, message: '100자 이하로 입력하세요.' }, { validator: validateRoleName }]}
            >
              <Input placeholder="역할 이름을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Form.Item name="description" label="설명" rules={[{ max: 500, message: '500자 이하로 입력하세요.' }]}>
              <TextArea rows={3} placeholder="역할에 대한 설명을 입력하세요." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="sortOrder" label="정렬 순서" tooltip="낮은 숫자가 먼저 표시됩니다">
              <InputNumber min={0} max={9999} className="!w-full" placeholder="0" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="isUse" label="사용 여부" valuePropName="checked">
              <Switch checkedChildren="사용" unCheckedChildren="미사용" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
});

RoleDrawer.displayName = 'RoleDrawer';

export default RoleDrawer;
