import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Drawer, Form, type FormProps, Input, InputNumber, Row, Switch } from 'antd';
import { toast } from '@/shared-util';
import type { Role, RoleUpsertRequest } from '../types/iam.types';

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
  const [drawerState, setDrawerState] = useState<DrawerState>({
    open: false,
    mode: 'create',
  });

  const { open, mode, role } = drawerState;
  const isEditMode = mode === 'edit';

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

  const [form] = Form.useForm<RoleUpsertRequest>();
  const { TextArea } = Input;
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (isEditMode && role) {
      form.setFieldsValue({
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description || '',
        sortOrder: role.sortOrder || 0,
      });
    } else {
      form.setFieldsValue({
        roleCode: '',
        roleName: '',
        description: '',
        sortOrder: 0,
      });
    }

    return () => {
      form.resetFields();
    };
  }, [form, open, isEditMode, role]);

  const onFinish: FormProps<RoleUpsertRequest>['onFinish'] = async (values) => {
    setIsSubmitting(true);
    try {
      // TODO: 실제 API 연동 시 아래 주석 해제
      // if (isEditMode && role) {
      //   await updateRole(role.roleId, values);
      //   toast.success('역할이 수정되었습니다.');
      // } else {
      //   await createRole(values);
      //   toast.success('역할이 추가되었습니다.');
      // }
      // queryClient.invalidateQueries({ queryKey: ['roles'] });

      // 임시: 더미 데이터 처리
      toast.success(isEditMode ? '역할이 수정되었습니다.' : '역할이 추가되었습니다.');
      handleClose();
    } catch (error) {
      toast.error(isEditMode ? '역할 수정에 실패했습니다.' : '역할 추가에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFinishFailed: FormProps<RoleUpsertRequest>['onFinishFailed'] = (errorInfo) => {
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
      <Button variant="solid" type="primary" onClick={handleSubmitBtn} loading={isSubmitting}>
        저장
      </Button>
    </div>
  );

  return (
    <Drawer open={open} onClose={handleClose} title={isEditMode ? '역할 수정' : '역할 추가'} closable={{ placement: 'end' }} width={480} footer={footer} destroyOnClose>
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
              rules={[
                { required: true, message: '역할 이름을 입력하세요.' },
                { max: 100, message: '100자 이하로 입력하세요.' },
              ]}
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
        </Row>
      </Form>
    </Drawer>
  );
});

RoleDrawer.displayName = 'RoleDrawer';

export default RoleDrawer;
