/**
 * 역할 상세 - 기본정보 탭
 * - 비밀번호 정책 패턴 적용: Form.useWatch로 폼 값 변경 시 Context에 실시간 반영
 * - 역할코드, 역할이름, 설명, 정렬순서, 사용여부 필드
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, InputNumber, Row, Switch } from 'antd';
import { sharedApi } from '@/shared-api';
import { toast } from '@/shared-util';
import { useDeleteRole, useGetRole, useGetRoles, useUpdateRole } from '../../../features/iam/hooks/useRoleQueries';
import type { RoleUpdateDatas } from '../../../features/iam/types/iam.types';
import { type RoleBasicFormValues, useRoleDetailContext } from '../context/RoleDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

export default function RoleBasicInfoTab() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm<RoleBasicFormValues>();
  const numericRoleId = roleId ? Number(roleId) : 0;

  // Context에서 폼 값 setter 가져오기
  const { setBasicFormValues } = useRoleDetailContext();

  // Form.useWatch로 폼 값 변경 감지 (비밀번호 정책 패턴)
  const formValues = Form.useWatch([], form);

  // 폼 값 변경 시 Context에 실시간 반영
  useEffect(() => {
    if (formValues) {
      setBasicFormValues(formValues);
    }
  }, [formValues, setBasicFormValues]);

  // 역할 목록 조회 (중복 체크용)
  const { data: existingRoles = [] } = useGetRoles();

  // 역할 조회
  const { data: role, isFetching } = useGetRole({
    params: { roleId: numericRoleId },
    queryOptions: { enabled: !!numericRoleId },
  });

  // 폼 초기화
  useEffect(() => {
    if (role) {
      form.setFieldsValue({
        roleCode: role.roleCode,
        roleName: role.roleName,
        description: role.description ?? '',
        sortOrder: role.sortOrder,
        isUse: role.isUse,
        canResetPassword: role.canResetPassword,
      });
    }
  }, [role, form]);

  const { mutate: updateRole, isPending: isUpdating } = useUpdateRole({
    mutationOptions: {
      onSuccess: () => {
        toast.success('역할 기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRole({ roleId: numericRoleId }).queryKey });
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRoles().queryKey });
      },
    },
  });

  const { mutate: deleteRole, isPending: isDeleting } = useDeleteRole({
    mutationOptions: {
      onSuccess: () => {
        toast.success('역할이 삭제되었습니다.');
        queryClient.invalidateQueries({ queryKey: sharedApi.role.queryKeys.getRoles().queryKey });
        navigate('/manager/resource/auth-group/list');
      },
    },
  });

  // 역할 이름 중복 체크 Validator (현재 역할 제외)
  const validateRoleName = async (_: unknown, value: string) => {
    if (!value) return Promise.resolve();
    const isDuplicate = existingRoles.some((r) => r.roleName.toLowerCase() === value.toLowerCase() && r.roleId !== numericRoleId);
    if (isDuplicate) {
      return Promise.reject(new Error('이미 사용 중인 역할 이름입니다.'));
    }
    return Promise.resolve();
  };

  const onFinish: FormProps<RoleBasicFormValues>['onFinish'] = (values) => {
    if (!numericRoleId || !role) return;

    const request: RoleUpdateDatas = {
      roleCode: role.roleCode, // roleCode는 변경 불가
      roleName: values.roleName,
      description: values.description,
      sortOrder: values.sortOrder,
      isUse: values.isUse,
      canResetPassword: values.canResetPassword,
      // authIds는 변경하지 않음 (권한 매핑 탭에서 처리)
    };
    updateRole({ params: { roleId: numericRoleId }, data: request });
  };

  const onFinishFailed: FormProps<RoleBasicFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => {
        if (numericRoleId) {
          deleteRole({ roleId: numericRoleId });
        }
      },
    });
  };

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="roleCode" label="역할 코드" required hasFeedback>
                <Input placeholder="역할 코드" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="roleName"
                label="역할 이름"
                required
                hasFeedback
                rules={[{ required: true, message: '역할 이름을 입력해 주세요.' }, { validator: validateRoleName }]}
              >
                <Input placeholder="역할 이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="description" label="설명">
                <Input.TextArea rows={3} placeholder="역할에 대한 설명을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="sortOrder" label="정렬 순서">
                <InputNumber min={0} className="!w-full" placeholder="정렬 순서를 입력하세요." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isUse" label="사용 여부" valuePropName="checked">
                <Switch checkedChildren="사용" unCheckedChildren="미사용" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="canResetPassword"
                label="비밀번호 초기화 권한"
                valuePropName="checked"
                tooltip="이 역할을 가진 사용자가 다른 사용자의 비밀번호를 초기화할 수 있습니다."
              >
                <Switch checkedChildren="허용" unCheckedChildren="불가" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-7 pt-4 mt-6 border-t border-gray-100">
            <Col>
              <Button variant="solid" onClick={() => navigate('../')}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="red" variant="solid" loading={isDeleting} onClick={handleClickDeleteBtn}>
                삭제
              </Button>
            </Col>
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
