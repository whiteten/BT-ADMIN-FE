/**
 * 사용자 상세 - 부가사항 탭
 * - 비밀번호 정책 패턴 적용: Form.useWatch로 폼 값 변경 시 Context에 실시간 반영
 * - UserCreate Step 2와 동일한 필드 구성
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Col, Form, type FormProps, Input, Row, Tag } from 'antd';
import { Plus } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetUser, useUpdateUser, userQueryKeys } from '../../../features/user/hooks/useUserQueries';
import type { UserRequest } from '../../../features/user/types/user.types';
import { useUserDetailContext } from '../context/UserDetailContext';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

interface UserAdditionalFormValues {
  phone?: string;
  email?: string;
  allowedIps?: string[];
}

export default function UserAdditionalInfoTab() {
  const { userId } = useParams();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UserAdditionalFormValues>();
  const [newIp, setNewIp] = useState('');
  const [ipError, setIpError] = useState('');
  const numericUserId = userId ? Number(userId) : undefined;

  // Context에서 폼 값 setter 가져오기
  const { setAdditionalFormValues } = useUserDetailContext();

  // 사용자 조회
  const { data: user, isFetching } = useGetUser({
    id: numericUserId,
  });

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
        queryClient.invalidateQueries({ queryKey: userQueryKeys.getUser(numericUserId).queryKey });
      },
    },
  });

  const onFinish: FormProps<UserAdditionalFormValues>['onFinish'] = (values) => {
    if (!numericUserId || !user) return;

    const requestData: UserRequest = {
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
      userId: numericUserId,
      data: requestData,
    });
  };

  const onFinishFailed: FormProps<UserAdditionalFormValues>['onFinishFailed'] = () => {
    toast.error('필수 항목을 확인해주세요.');
  };

  // IP 유효성 검사
  const validateIp = (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
  };

  // IP 추가 핸들러
  const handleAddIp = () => {
    const trimmedIp = newIp.trim();
    if (!trimmedIp) {
      setIpError('IP 주소를 입력하세요.');
      return;
    }
    if (!validateIp(trimmedIp)) {
      setIpError('올바른 IP 주소 형식이 아닙니다. (예: 192.168.1.1)');
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
      {isFetching ? (
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      ) : (
        <>
          <Row gutter={20}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="핸드폰번호"
                rules={[
                  { max: 50, message: '최대 50자까지 입력 가능합니다.' },
                  { pattern: /^[0-9-]*$/, message: '숫자와 하이픈(-)만 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 010-1234-5678" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="이메일"
                rules={[
                  { max: 200, message: '최대 200자까지 입력 가능합니다.' },
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
                ]}
              >
                <Input placeholder="예: user@example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={20}>
            <Col span={24}>
              {/* allowedIps는 hidden Form.Item으로 관리하고 UI는 별도로 렌더링 */}
              <Form.Item name="allowedIps" hidden>
                <Input />
              </Form.Item>
              <div className="ant-form-item">
                <div className="ant-form-item-label">
                  <label title="접근 허용 IP">
                    접근 허용 IP
                    <span
                      className="ant-form-item-tooltip ml-1 text-gray-400 cursor-help"
                      title="사용자가 로그인할 수 있는 IP 주소를 설정합니다. 설정하지 않으면 모든 IP에서 접근 가능합니다."
                    >
                      ?
                    </span>
                  </label>
                </div>
                <div className="ant-form-item-control">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={newIp}
                        onChange={(e) => {
                          setNewIp(e.target.value);
                          setIpError('');
                        }}
                        onKeyDown={handleIpKeyDown}
                        placeholder="IP 주소 입력 (예: 192.168.1.1)"
                        className="flex-1"
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
                </div>
              </div>
            </Col>
          </Row>
          <Row gutter={20} justify="center" className="sticky bottom-0 bg-white z-10 pb-7 pt-4 mt-6 border-t border-gray-100">
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
