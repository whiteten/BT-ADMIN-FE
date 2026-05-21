/**
 * 사용자 상세 - 부가사항 탭
 * - 비밀번호 정책 패턴 적용: Form.useWatch로 폼 값 변경 시 Context에 실시간 반영
 * - UserCreate Step 2와 동일한 필드 구성
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Tag } from 'antd';
import { Plus } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { emailRule, phoneRule, toast } from '@/shared-util';
import { useUserDetailContext } from '../context/UserDetailContext';
import { useUpdateUser, userQueryKeys } from '../hooks/useUserQueries';
import type { UserUpdateDatas } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface UserAdditionalFormValues {
  phone?: string;
  email?: string;
  allowedIps?: string[];
}

export default function UserAdditionalInfoTab() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserAdditionalFormValues>();
  const [newIp, setNewIp] = useState('');
  const [ipError, setIpError] = useState('');
  const numericUserId = userId ? Number(userId) : undefined;

  // Context에서 사용자 데이터 및 폼 값 setter 가져오기
  const { user, isUserFetching, setAdditionalFormValues } = useUserDetailContext();

  // allowedIps를 최상위에서 watch (훅 규칙 준수)
  const watchedAllowedIps: string[] = Form.useWatch('allowedIps', form) ?? [];

  // Form.useWatch로 전체 폼 값 변경 감지 (비밀번호 정책 패턴)
  const formValues = Form.useWatch([], form);

  // 폼 값 변경 시 Context에 실시간 반영
  useEffect(() => {
    if (formValues) {
      setAdditionalFormValues({
        phone: formValues.phone,
        email: formValues.email,
        allowedIps: formValues.allowedIps,
      });
    }
  }, [formValues, setAdditionalFormValues]);

  // 폼 초기화
  useEffect(() => {
    if (user) {
      // allowedIps JSON 파싱
      let parsedAllowedIps: string[] = [];
      if (user.allowedIps) {
        try {
          parsedAllowedIps = JSON.parse(user.allowedIps);
        } catch {
          parsedAllowedIps = [];
        }
      }

      form.setFieldsValue({
        phone: user.phone,
        email: user.email,
        allowedIps: parsedAllowedIps,
      });
    }
  }, [user, form]);

  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('부가사항이 저장되었습니다.');
        queryClient.invalidateQueries({ queryKey: userQueryKeys.getUser({ userId: numericUserId }).queryKey });
      },
    },
  });

  const onFinish: FormProps<UserAdditionalFormValues>['onFinish'] = (values) => {
    if (!numericUserId || !user) return;

    const requestData: UserUpdateDatas = {
      // 기존 기본 정보 유지
      username: user.username,
      userAccount: user.userAccount ?? '',
      description: user.description,
      roleId: user.roleId,
      accountStatus: user.accountStatus,
      // 부가사항 업데이트
      phone: values.phone,
      email: values.email,
      allowedIps: values.allowedIps?.length ? JSON.stringify(values.allowedIps) : undefined,
    };
    updateUser({
      params: { userId: numericUserId },
      data: requestData,
    });
  };

  const onFinishFailed: FormProps<UserAdditionalFormValues>['onFinishFailed'] = (errorInfo) => {
    const firstError = errorInfo.errorFields?.[0]?.errors?.[0];
    toast.error(firstError ?? '입력 항목을 확인해주세요.');
  };

  // IP 유효성 검사 (IPv4)
  const validateIp = (ip: string): string | null => {
    const parts = ip.split('.');
    if (parts.length !== 4) return '올바른 IP 주소 형식이 아닙니다. (예: 192.168.1.1)';
    for (const part of parts) {
      if (!/^\d+$/.test(part)) return '올바른 IP 주소 형식이 아닙니다. (예: 192.168.1.1)';
      const num = Number(part);
      if (num < 0 || num > 255) return 'IP 주소의 각 자리는 0~255 사이의 숫자여야 합니다.';
    }
    return null;
  };

  // IP 추가 핸들러
  const handleAddIp = () => {
    const trimmedIp = newIp.trim();
    if (!trimmedIp) return;
    const validationError = validateIp(trimmedIp);
    if (validationError) {
      setIpError(validationError);
      return;
    }
    if (watchedAllowedIps.includes(trimmedIp)) {
      setIpError('이미 추가된 IP 주소입니다.');
      return;
    }
    form.setFieldValue('allowedIps', [...watchedAllowedIps, trimmedIp]);
    setNewIp('');
    setIpError('');
  };

  // IP 입력값 필터 (숫자, 점, 별표만 허용)
  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.replace(/[^0-9.*]/g, '');
    setNewIp(filtered);
    setIpError('');
  };

  // IP 제거 핸들러
  const handleRemoveIp = (ip: string) => {
    form.setFieldValue(
      'allowedIps',
      watchedAllowedIps.filter((item: string) => item !== ip),
    );
  };

  // IP 입력 키다운 핸들러
  const handleIpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIp();
    }
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
              <Form.Item name="phone" label="핸드폰번호" rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }, phoneRule]}>
                <Input placeholder="예: 010-1234-5678" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="이메일" rules={[{ max: 50, message: '최대 50자까지 입력 가능합니다.' }, emailRule]}>
                <Input placeholder="예: user@example.com" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              {/* allowedIps는 hidden Form.Item으로 관리하고 UI는 별도로 렌더링 */}
              <Form.Item name="allowedIps" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="접근 허용 IP" tooltip="사용자가 로그인할 수 있는 IP 주소를 설정합니다. 설정하지 않으면 모든 IP에서 접근 가능합니다.">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={newIp}
                      onChange={handleIpChange}
                      onKeyDown={handleIpKeyDown}
                      placeholder="IP 주소 입력 (예: 192.168.1.1)"
                      className="flex-1"
                      maxLength={15}
                      status={ipError ? 'error' : undefined}
                    />
                    <Button type="primary" onClick={handleAddIp}>
                      <Plus className="w-4 h-4" />
                      추가
                    </Button>
                  </div>
                  {ipError && <div className="text-red-500 text-sm">{ipError}</div>}
                  {watchedAllowedIps.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                      {watchedAllowedIps.map((ip: string) => (
                        <Tag key={ip} closable onClose={() => handleRemoveIp(ip)} className="flex items-center gap-1 text-sm py-1 px-2">
                          {ip}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {watchedAllowedIps.length === 0 && <div className="text-gray-400 text-sm">등록된 IP가 없습니다. 모든 IP에서 접근 가능합니다.</div>}
                </div>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-7 pt-4 mt-6 border-t border-gray-100">
            <Col>
              <Button variant="solid" onClick={() => navigate('../list')}>
                취소
              </Button>
            </Col>
            <Col>
              <Button color="primary" variant="solid" htmlType="submit" loading={isUpdating}>
                저장
              </Button>
            </Col>
          </Row>
        </>
      )}
    </Form>
  );
}
