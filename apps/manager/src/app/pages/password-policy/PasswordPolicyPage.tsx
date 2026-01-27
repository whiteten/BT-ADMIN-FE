/**
 * 비밀번호 정책 관리 페이지
 * Industrial-Administrative Clarity Design
 * - 보안 설정을 위한 명확하고 직관적인 인터페이스
 * - 탭 기반 섹션 분리 + 실시간 정책 요약 사이드패널
 */

import React, { useEffect, useState } from 'react';
import { type BreadcrumbProps, Button, Divider, Form, InputNumber, Switch, Typography } from 'antd';
import { AlertTriangle, Check, Clock, Hash, KeyRound, Lock, RefreshCw, Save, Timer, UserX } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetPasswordPolicy, useUpdatePasswordPolicy } from '../../features/password-policy/hooks/usePasswordPolicyQueries';
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicyUpdateDatas } from '../../features/password-policy/types/passwordPolicy.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import PageHeader from '@/components/custom/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const { Text } = Typography;

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '권한 관리', path: '/manager/iam' },
  { title: '비밀번호 정책', path: '/manager/iam/password-policy' },
];

/**
 * 탭 스타일 (PageTabs/UserDetail.tsx 패턴 적용)
 */
const styles = {
  tabTrigger:
    'w-auto hover:cursor-pointer !shadow-none border-1 border-transparent !rounded-none border-r-[#E9EBEC] text-[#495057] data-[state=active]:border-b-2 data-[state=active]:border-b-[var(--color-bt-primary)] data-[state=active]:text-[var(--color-bt-primary)]',
};

/**
 * 설정 항목 컴포넌트
 */
interface SettingItemProps {
  name: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function SettingItem({ name, label, description, icon, children, className }: SettingItemProps) {
  const isSwitch = React.isValidElement(children) && children.type === Switch;

  return (
    <div className={cn('group relative rounded-lg border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-gray-200 hover:bg-white', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-0.5">{label}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{description}</div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Form.Item name={name} valuePropName={isSwitch ? 'checked' : 'value'} className="!mb-0">
            {children}
          </Form.Item>
        </div>
      </div>
    </div>
  );
}

/**
 * 숫자 입력 설정 컴포넌트
 */
interface NumberSettingProps {
  name: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
  min: number;
  max: number;
  unit?: string;
}

function NumberSetting({ name, label, description, icon, min, max, unit }: NumberSettingProps) {
  return (
    <div className={cn('group relative rounded-lg border border-gray-100 bg-gray-50/50 p-4 transition-all hover:border-gray-200 hover:bg-white')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {icon && (
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 group-hover:border-blue-200 group-hover:text-blue-600 transition-colors">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 mb-0.5">{label}</div>
            <div className="text-sm text-gray-500 leading-relaxed">{description}</div>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <Form.Item name={name} className="!mb-0">
            <InputNumber min={min} max={max} className="!w-24" size="middle" />
          </Form.Item>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * 스위치 설정 컴포넌트
 */
interface SwitchSettingProps {
  name: string;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

function SwitchSetting({ name, label, description, icon }: SwitchSettingProps) {
  return (
    <SettingItem name={name} label={label} description={description} icon={icon}>
      <Switch />
    </SettingItem>
  );
}

/**
 * 요약 항목 컴포넌트
 */
interface SummaryItemProps {
  label: string;
  value: React.ReactNode;
  active?: boolean;
}

function SummaryItem({ label, value, active }: SummaryItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={cn('text-sm font-medium', active ? 'text-emerald-600' : 'text-gray-400')}>
        {active !== undefined ? (
          <span className="flex items-center gap-1.5">
            {active ? <Check className="w-3.5 h-3.5" /> : null}
            {value}
          </span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}

export default function PasswordPolicyPage() {
  const [form] = Form.useForm<PasswordPolicyUpdateDatas>();
  const formValues = Form.useWatch([], form);
  const [activeTab, setActiveTab] = useState('complexity');

  // 데이터 조회
  const { data: policy, isLoading } = useGetPasswordPolicy();

  /**
   * 탭 전환 시 폼을 DB 값으로 리셋
   * - 저장하지 않은 변경사항은 폐기됨
   * - "탭마다 따로 저장" 원칙에 따라 탭 이동 시 DB 값으로 재설정
   */
  const handleTabChange = (newTab: string) => {
    // 이미 로드된 policy 데이터로 폼 리셋 (네트워크 요청 없음)
    if (policy) {
      form.setFieldsValue(policy);
    }
    setActiveTab(newTab);
  };

  // 뮤테이션
  const { mutate: updatePolicy, isPending: isUpdating } = useUpdatePasswordPolicy({
    mutationOptions: {
      onSuccess: () => {
        toast.success('비밀번호 정책이 저장되었습니다.');
      },
    },
  });

  // 폼 초기값 설정
  useEffect(() => {
    if (policy) {
      form.setFieldsValue(policy);
    }
  }, [policy, form]);

  // 저장 핸들러
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      updatePolicy(values);
    } catch {
      toast.error('입력값을 확인해주세요.');
    }
  };

  // 현재 폼 값
  const currentValues = formValues || DEFAULT_PASSWORD_POLICY;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 w-full h-full">
        <PageHeader title="비밀번호 정책" breadcrumb={breadcrumb} />
        <div className="flex items-center justify-center w-full h-full">
          <FallbackSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader title="비밀번호 정책" breadcrumb={breadcrumb} />

      <div className="flex flex-1 min-h-0 gap-4">
        {/* 메인 폼 영역 */}
        <div className="flex-1 min-w-0 bg-white bt-shadow flex flex-col">
          <Form form={form} initialValues={DEFAULT_PASSWORD_POLICY} className="flex flex-col h-full">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
              {/* 탭 헤더 - PageTabs/UserDetail 스타일 완전 적용 */}
              <div className="flex w-full h-[58px] min-h-[58px] bg-white border-b border-[#E9EBEC]">
                <TabsList className="h-full p-0 bg-white">
                  <TabsTrigger value="complexity" className={cn(styles.tabTrigger)}>
                    <div className="flex items-center justify-center gap-2 min-w-[184px]">
                      <KeyRound className="h-5 w-5" />
                      <span>비밀번호 복잡도</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="lockout" className={cn(styles.tabTrigger)}>
                    <div className="flex items-center justify-center gap-2 min-w-[184px]">
                      <Lock className="h-5 w-5" />
                      <span>계정 잠금</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="expiration" className={cn(styles.tabTrigger)}>
                    <div className="flex items-center justify-center gap-2 min-w-[184px]">
                      <Timer className="h-5 w-5" />
                      <span>만료 정책</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* 탭 콘텐츠 */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* 복잡도 탭 */}
                <TabsContent value="complexity" forceMount className="m-0 h-full data-[state=inactive]:hidden">
                  <div className="space-y-6">
                    {/* 길이 설정 */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">길이 제한</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <NumberSetting
                          name="minLength"
                          label="최소 길이"
                          description="비밀번호에 필요한 최소 문자 수"
                          icon={<Hash className="w-4 h-4" />}
                          min={4}
                          max={128}
                          unit="자"
                        />
                        <NumberSetting name="maxLength" label="최대 길이" description="허용되는 최대 문자 수" icon={<Hash className="w-4 h-4" />} min={8} max={256} unit="자" />
                      </div>
                    </div>

                    {/* 필수 문자 */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">필수 문자 유형</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <SwitchSetting name="requireUppercase" label="대문자 필수" description="A-Z 중 최소 1자" icon={<span className="font-bold text-sm">A</span>} />
                        <SwitchSetting name="requireLowercase" label="소문자 필수" description="a-z 중 최소 1자" icon={<span className="font-bold text-sm">a</span>} />
                        <SwitchSetting name="requireDigit" label="숫자 필수" description="0-9 중 최소 1자" icon={<span className="font-bold text-sm">1</span>} />
                      </div>
                    </div>

                    {/* 금지 패턴 */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">금지 패턴</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <SwitchSetting
                          name="rejectConsecutiveChars"
                          label="연속 문자 금지"
                          description="abc, 123 등 연속 패턴 차단"
                          icon={<span className="font-mono text-xs">abc</span>}
                        />
                        <SwitchSetting
                          name="rejectRepeatedChars"
                          label="반복 문자 금지"
                          description="aaa, 111 등 반복 패턴 차단"
                          icon={<span className="font-mono text-xs">aaa</span>}
                        />
                        <SwitchSetting name="rejectUserId" label="사용자 ID 포함 금지" description="비밀번호에 ID 사용 차단" icon={<UserX className="w-4 h-4" />} />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* 잠금 정책 탭 */}
                <TabsContent value="lockout" forceMount className="m-0 h-full data-[state=inactive]:hidden">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">로그인 실패 정책</h3>
                      <Text type="secondary" className="block mb-4">
                        무차별 대입 공격으로부터 계정을 보호하기 위한 잠금 정책을 설정합니다.
                      </Text>
                      <div className="grid grid-cols-1 gap-3">
                        <NumberSetting
                          name="maxFailedAttempts"
                          label="최대 로그인 실패 횟수"
                          description="이 횟수를 초과하면 계정이 자동으로 잠깁니다"
                          icon={<AlertTriangle className="w-4 h-4" />}
                          min={1}
                          max={10}
                          unit="회"
                        />
                        <NumberSetting
                          name="lockoutDurationMinutes"
                          label="계정 잠금 지속 시간"
                          description="계정 잠금이 자동 해제되기까지의 시간"
                          icon={<Lock className="w-4 h-4" />}
                          min={1}
                          max={1440}
                          unit="분"
                        />
                        <NumberSetting
                          name="failedAttemptResetMinutes"
                          label="실패 횟수 초기화 시간"
                          description="이 시간이 지나면 실패 횟수가 0으로 리셋됩니다"
                          icon={<RefreshCw className="w-4 h-4" />}
                          min={1}
                          max={1440}
                          unit="분"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* 만료 정책 탭 */}
                <TabsContent value="expiration" forceMount className="m-0 h-full data-[state=inactive]:hidden">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">비밀번호 수명 관리</h3>
                      <Text type="secondary" className="block mb-4">
                        주기적인 비밀번호 변경을 통해 보안을 강화합니다.
                      </Text>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <NumberSetting
                          name="maxAgeDays"
                          label="비밀번호 유효 기간"
                          description="0으로 설정하면 만료되지 않습니다"
                          icon={<Clock className="w-4 h-4" />}
                          min={0}
                          max={365}
                          unit="일"
                        />
                        <NumberSetting
                          name="expirationWarningDays"
                          label="만료 경고 시작일"
                          description="만료 전 사용자에게 경고를 표시할 기간"
                          icon={<AlertTriangle className="w-4 h-4" />}
                          min={0}
                          max={90}
                          unit="일 전"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">재사용 제한</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <NumberSetting
                          name="historyCount"
                          label="이전 비밀번호 재사용 금지"
                          description="최근 N개의 비밀번호는 재사용할 수 없습니다"
                          icon={<RefreshCw className="w-4 h-4" />}
                          min={0}
                          max={24}
                          unit="개"
                        />
                      </div>
                      {/* 최초 로그인 시 비밀번호 변경은 무조건 적용됨 (정책 설정 불필요) */}
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-700">
                          <KeyRound className="w-4 h-4" />
                          <span className="text-sm font-medium">최초 로그인 시 비밀번호 변경</span>
                        </div>
                        <p className="mt-1 text-sm text-blue-600">신규 사용자는 첫 로그인 시 반드시 비밀번호를 변경해야 합니다. (필수 적용)</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>

              {/* 하단 버튼 */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex justify-end">
                  <Button type="primary" icon={<Save className="w-4 h-4" />} onClick={handleSave} loading={isUpdating} size="large">
                    변경사항 저장
                  </Button>
                </div>
              </div>
            </Tabs>
          </Form>
        </div>

        {/* 우측 사이드 패널 - 설정 요약 */}
        <div className="hidden xl:flex w-[320px] min-w-[320px] flex-col">
          <Card className="bt-shadow flex-1 overflow-hidden flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">설정 요약</CardTitle>
              <CardDescription>현재 적용된 정책</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {/* 복잡도 요약 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">복잡도</span>
                  </div>
                  <div className="space-y-0 divide-y divide-gray-100">
                    <SummaryItem label="길이 제한" value={`${currentValues.minLength || 8} ~ ${currentValues.maxLength || 128}자`} />
                    <SummaryItem label="대문자 필수" value="필수" active={currentValues.requireUppercase} />
                    <SummaryItem label="소문자 필수" value="필수" active={currentValues.requireLowercase} />
                    <SummaryItem label="숫자 필수" value="필수" active={currentValues.requireDigit} />
                    <SummaryItem label="연속 문자 금지" value="적용" active={currentValues.rejectConsecutiveChars} />
                    <SummaryItem label="반복 문자 금지" value="적용" active={currentValues.rejectRepeatedChars} />
                    <SummaryItem label="ID 포함 금지" value="적용" active={currentValues.rejectUserId} />
                  </div>
                </div>

                <Divider className="!my-3" />

                {/* 잠금 요약 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">계정 잠금</span>
                  </div>
                  <div className="space-y-0 divide-y divide-gray-100">
                    <SummaryItem label="최대 실패 횟수" value={`${currentValues.maxFailedAttempts || 5}회`} />
                    <SummaryItem label="잠금 시간" value={`${currentValues.lockoutDurationMinutes || 30}분`} />
                    <SummaryItem label="카운터 리셋" value={`${currentValues.failedAttemptResetMinutes || 30}분`} />
                  </div>
                </div>

                <Divider className="!my-3" />

                {/* 만료 요약 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">만료 정책</span>
                  </div>
                  <div className="space-y-0 divide-y divide-gray-100">
                    <SummaryItem label="유효 기간" value={currentValues.maxAgeDays ? `${currentValues.maxAgeDays}일` : '무제한'} />
                    <SummaryItem label="경고 시작" value={`${currentValues.expirationWarningDays || 14}일 전`} />
                    <SummaryItem label="재사용 금지" value={`최근 ${currentValues.historyCount || 5}개`} />
                    <SummaryItem label="최초 로그인 변경" value="필수" active={true} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
