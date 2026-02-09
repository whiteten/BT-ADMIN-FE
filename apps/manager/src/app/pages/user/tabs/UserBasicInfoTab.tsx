/**
 * 사용자 상세 - 기본정보 탭
 * - 비밀번호 정책 패턴 적용: Form.useWatch로 폼 값 변경 시 Context에 실시간 반영
 * - UserCreate Step 1과 동일한 필드 구성
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Select, Switch } from 'antd';
import { useAuthStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { useDeleteUser, useResetPasswordToAccount, useUpdateUser, userQueryKeys } from '../../../features/user/hooks/useUserQueries';
import type { AccountStatus, UserUpdateDatas } from '../../../features/user/types/user.types';
import { useUserDetailContext } from '../context/UserDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

// 날짜 포맷 유틸
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

interface UserBasicFormValues {
  username: string;
  userAccount: string;
  description?: string;
  roleId?: number;
  accountStatus: AccountStatus;
  allowConcurrentLogin: boolean;
}

export default function UserBasicInfoTab() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const modal = useModal();
  const [form] = Form.useForm<UserBasicFormValues>();
  const numericUserId = userId ? Number(userId) : undefined;

  // Context에서 사용자 데이터 및 폼 값 setter 가져오기
  const { user, isUserFetching, setBasicFormValues } = useUserDetailContext();

  // Form.useWatch로 폼 값 변경 감지 (비밀번호 정책 패턴)
  const formValues = Form.useWatch([], form);

  // 폼 값 변경 시 Context에 실시간 반영
  useEffect(() => {
    if (formValues) {
      setBasicFormValues({
        username: formValues.username,
        userAccount: formValues.userAccount,
        roleId: formValues.roleId ?? null,
        accountStatus: formValues.accountStatus,
        description: formValues.description,
      });
    }
  }, [formValues, setBasicFormValues]);

  // 역할 목록은 RouteGuard에서 이미 로드되어 Zustand에 저장됨
  const { roleList, canResetPassword } = useAuthStore();
  const roleOptions = roleList.map((role) => ({ label: role.roleName, value: role.roleId }));
  const hasResetPasswordPermission = canResetPassword();

  // 폼 초기화
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        username: user.username,
        userAccount: user.userAccount,
        description: user.description,
        roleId: user.roleId,
        accountStatus: user.accountStatus,
        allowConcurrentLogin: user.allowConcurrentLogin !== false,
      });
    }
  }, [user, form]);

  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자 기본 정보가 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: userQueryKeys.getUser({ userId: numericUserId }).queryKey });
      },
    },
  });

  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 삭제되었습니다.');
        navigate('../list');
      },
    },
  });

  const { mutate: resetPassword, isPending: isResetting } = useResetPasswordToAccount({
    mutationOptions: {
      onSuccess: () => {
        toast.success('비밀번호가 계정명으로 초기화되었습니다. 다음 로그인 시 비밀번호 변경이 필요합니다.');
      },
    },
  });

  const onFinish: FormProps<UserBasicFormValues>['onFinish'] = (values) => {
    if (!numericUserId) return;

    const requestData: UserUpdateDatas = {
      username: values.username,
      userAccount: values.userAccount,
      description: values.description,
      roleId: values.roleId,
      accountStatus: values.accountStatus ?? 'ACTIVE',
      allowConcurrentLogin: values.allowConcurrentLogin,
    };
    updateUser({
      params: { userId: numericUserId },
      data: requestData,
    });
  };

  const onFinishFailed: FormProps<UserBasicFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  const handleClickDeleteBtn = () => {
    modal.confirm.delete({
      onOk: () => {
        if (numericUserId) {
          deleteUser({ userId: numericUserId });
        }
      },
    });
  };

  const handleClickResetPasswordBtn = () => {
    modal.confirm.execute({
      onOk: () => {
        if (numericUserId) {
          resetPassword({ userId: numericUserId });
        }
      },
      options: {
        title: '비밀번호 초기화',
        content: `비밀번호를 계정명(${user?.userAccount})으로 초기화합니다. 다음 로그인 시 비밀번호 변경이 강제됩니다.`,
        okText: '초기화',
        okType: 'danger',
      },
    });
  };

  return (
    <Form form={form} onFinish={onFinish} onFinishFailed={onFinishFailed} layout="vertical">
      {isUserFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item
                name="userAccount"
                label="계정 (로그인 ID)"
                required
                hasFeedback
                rules={[
                  { required: true, message: '계정을 입력해 주세요.' },
                  { min: 3, message: '최소 3자 이상 입력해주세요.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                  { pattern: /^[a-zA-Z0-9_]+$/, message: '영문, 숫자, 언더스코어(_)만 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="로그인에 사용할 계정을 입력하세요." disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="username"
                label="사용자명"
                required
                hasFeedback
                rules={[
                  { required: true, message: '사용자명을 입력해 주세요.' },
                  { min: 2, message: '최소 2자 이상 입력해주세요.' },
                  { max: 50, message: '최대 50자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="사용자 이름을 입력하세요." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item name="roleId" label="역할" required hasFeedback rules={[{ required: true, message: '역할을 선택해 주세요.' }]}>
                <Select options={roleOptions} showSearch optionFilterProp="label" placeholder="역할을 선택하세요." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="accountStatus" label="계정 상태">
                <Select
                  options={[
                    { label: '활성', value: 'ACTIVE' },
                    { label: '휴면', value: 'DORMANT' },
                    { label: '비활성', value: 'DISABLED' },
                  ]}
                  placeholder="계정 상태를 선택하세요."
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              <Form.Item name="description" label="설명" rules={[{ max: 500, message: '최대 500자까지 입력 가능합니다.' }]}>
                <Input.TextArea placeholder="사용자에 대한 설명을 입력하세요." rows={3} showCount maxLength={500} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item
                name="allowConcurrentLogin"
                label="중복 로그인 허용"
                valuePropName="checked"
                tooltip="허용하지 않으면 동시에 하나의 세션만 유지됩니다. 테넌트 정책에 따라 기존 세션이 종료되거나 새 로그인이 차단됩니다."
              >
                <Switch checkedChildren="허용" unCheckedChildren="금지" />
              </Form.Item>
            </Col>
            {hasResetPasswordPermission && (
              <Col span={12}>
                <Form.Item label="비밀번호 관리" tooltip="비밀번호를 계정명과 동일하게 초기화합니다. 초기화 후 다음 로그인 시 비밀번호 변경이 필요합니다.">
                  <Button color="orange" variant="solid" loading={isResetting} onClick={handleClickResetPasswordBtn}>
                    초기화
                  </Button>
                </Form.Item>
              </Col>
            )}
          </Row>
          {user && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium">생성일:</span> {formatDateTime(user.createdAt)}
              </div>
              <div>
                <span className="font-medium">수정일:</span> {formatDateTime(user.updatedAt)}
              </div>
              <div>
                <span className="font-medium">최근 로그인:</span> {formatDateTime(user.lastLoginAt)}
              </div>
              <div>
                <span className="font-medium">비밀번호 변경일:</span> {formatDateTime(user.passwordChangedAt)}
              </div>
            </div>
          )}
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
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating || isDeleting || isResetting}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
