import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Pagination, Radio, Select, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Award, Clock, Combine, Database, History, Info, Monitor, Settings, Variable } from 'lucide-react';
import { toast } from '@/shared-util';
import { useGetLoginHistoryByUserId } from '../../features/user/hooks/useLoginHistoryQueries';
import { useChangePassword, useDeleteUser, useGetUser, useLockUser, useUnlockUser, useUpdateUser } from '../../features/user/hooks/useUserQueries';
import { useGetActiveSessions, useGetSessionHistory, useTerminateAllSessions, useTerminateSession } from '../../features/user/hooks/useUserSessionQueries';
import { LOGIN_TYPE_COLORS, LOGIN_TYPE_LABELS, type LoginHistory } from '../../features/user/types/loginHistory.types';
import type { UserRequest } from '../../features/user/types/user.types';
import { LOGOUT_REASON_LABELS, type UserSession } from '../../features/user/types/userSession.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const { Title, Text } = Typography;

const styles = {
  tabTrigger: 'flex items-center gap-1 px-3 py-2 hover:cursor-pointer border-2 border-transparent data-[state=active]:border-blue-600 whitespace-nowrap',
  cardContentContainer: 'grid grid-cols-1 lg:grid-cols-2 gap-x-6',
  cardTitle: 'flex items-center gap-2 text-xl',
};

export default function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const numericUserId = userId ? Number(userId) : undefined;

  // 페이지네이션 상태
  const [loginHistoryPage, setLoginHistoryPage] = useState(0);
  const [sessionHistoryPage, setSessionHistoryPage] = useState(0);
  const pageSize = 10;

  // API 호출
  const { data: user, isLoading } = useGetUser({
    userId: numericUserId,
  });

  // 로그인 이력 조회
  const { data: loginHistoryData, isLoading: isLoginHistoryLoading } = useGetLoginHistoryByUserId({
    userId: numericUserId,
    params: { page: loginHistoryPage, size: pageSize },
  });

  // 활성 세션 조회
  const { data: activeSessions, isLoading: isActiveSessionsLoading } = useGetActiveSessions({
    userId: numericUserId,
  });

  // 세션 이력 조회
  const { data: sessionHistoryData, isLoading: isSessionHistoryLoading } = useGetSessionHistory({
    userId: numericUserId,
    params: { page: sessionHistoryPage, size: pageSize },
  });

  const updateUserMutation = useUpdateUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자 정보가 수정되었습니다');
      },
      onError: () => {
        toast.error('사용자 정보 수정에 실패했습니다');
      },
    },
  });

  const deleteUserMutation = useDeleteUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('사용자가 삭제되었습니다');
        navigate('../user');
      },
      onError: () => {
        toast.error('사용자 삭제에 실패했습니다');
      },
    },
  });

  const changePasswordMutation = useChangePassword({
    mutationOptions: {
      onSuccess: () => {
        toast.success('비밀번호가 변경되었습니다');
        form.setFieldsValue({ password: '', passwordConfirm: '' });
      },
      onError: () => {
        toast.error('비밀번호 변경에 실패했습니다');
      },
    },
  });

  const unlockUserMutation = useUnlockUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('계정 잠금이 해제되었습니다');
      },
      onError: () => {
        toast.error('계정 잠금 해제에 실패했습니다');
      },
    },
  });

  const lockUserMutation = useLockUser({
    mutationOptions: {
      onSuccess: () => {
        toast.success('계정이 잠금되었습니다');
      },
      onError: () => {
        toast.error('계정 잠금에 실패했습니다');
      },
    },
  });

  // 세션 종료 mutation
  const terminateSessionMutation = useTerminateSession({
    userId: numericUserId,
    mutationOptions: {
      onSuccess: () => {
        toast.success('세션이 종료되었습니다');
      },
      onError: () => {
        toast.error('세션 종료에 실패했습니다');
      },
    },
  });

  const terminateAllSessionsMutation = useTerminateAllSessions({
    userId: numericUserId,
    mutationOptions: {
      onSuccess: (count) => {
        toast.success(`${count}개의 세션이 종료되었습니다`);
      },
      onError: () => {
        toast.error('세션 종료에 실패했습니다');
      },
    },
  });

  // 폼 초기화
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        userUniqueId: user.userId,
        userSabun: user.userSabun,
        userName: user.userName,
        position: user.position,
        tenantId: user.tenantId,
        nodeId: user.nodeId,
        grantId: user.grantId,
        multiLogin: user.multiLogin === 'Y',
        noticeAutority: user.noticeAutority === 1,
        approvalAuthority: user.approvalAuthority === 1,
        userStatus: user.userStatus,
        loginLock: user.loginLock,
        userTelNo: user.userTelNo,
        oscomName: user.oscomName,
        ipStart: user.ipStart,
        ipFinsh: user.ipFinsh,
      });
    }
  }, [user, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const requestData: UserRequest = {
        tenantId: values.tenantId,
        userSabun: values.userSabun,
        userName: values.userName,
        position: values.position,
        nodeId: values.nodeId,
        grantId: values.grantId,
        userTelNo: values.userTelNo,
        userStatus: values.userStatus,
        loginLock: values.loginLock,
        multiLogin: values.multiLogin ? 'Y' : 'N',
        oscomName: values.oscomName,
        ipStart: values.ipStart,
        ipFinsh: values.ipFinsh,
        noticeAutority: values.noticeAutority ? 1 : 0,
        approvalAuthority: values.approvalAuthority ? 1 : 0,
      };

      updateUserMutation.mutate({
        userId: Number(userId),
        data: requestData,
      });
    } catch {
      toast.error('필수 항목을 확인해주세요');
    }
  };

  const handleDelete = () => {
    if (userId) {
      deleteUserMutation.mutate(Number(userId));
    }
  };

  const handlePasswordChange = async () => {
    try {
      const values = await form.validateFields(['password', 'passwordConfirm']);
      if (values.password !== values.passwordConfirm) {
        toast.error('비밀번호가 일치하지 않습니다');
        return;
      }
      if (userId && values.password) {
        changePasswordMutation.mutate({
          userId: Number(userId),
          data: { newPassword: values.password },
        });
      }
    } catch {
      toast.error('비밀번호를 입력해주세요');
    }
  };

  const handleUnlock = () => {
    if (userId) {
      unlockUserMutation.mutate(Number(userId));
    }
  };

  const handleLock = () => {
    if (userId) {
      lockUserMutation.mutate(Number(userId));
    }
  };

  const handleTerminateSession = (sessionId: string) => {
    terminateSessionMutation.mutate(sessionId);
  };

  const handleTerminateAllSessions = () => {
    if (numericUserId) {
      terminateAllSessionsMutation.mutate(numericUserId);
    }
  };

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

  // 로그인 이력 테이블 컬럼
  const loginHistoryColumns: ColumnsType<LoginHistory> = [
    {
      title: '일시',
      dataIndex: 'loginAt',
      key: 'loginAt',
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: '유형',
      dataIndex: 'loginType',
      key: 'loginType',
      width: 100,
      render: (value: keyof typeof LOGIN_TYPE_LABELS) => (
        <span className={cn('px-2 py-1 rounded text-xs font-medium', LOGIN_TYPE_COLORS[value])}>{LOGIN_TYPE_LABELS[value] || value}</span>
      ),
    },
    {
      title: '결과',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (value) => <Badge variant={value ? 'default' : 'destructive'}>{value ? '성공' : '실패'}</Badge>,
    },
    {
      title: 'IP 주소',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
    {
      title: '기기 유형',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
    },
    {
      title: '실패 사유',
      dataIndex: 'failureReason',
      key: 'failureReason',
      ellipsis: true,
      render: (value) => value || '-',
    },
  ];

  // 활성 세션 테이블 컬럼
  const activeSessionColumns: ColumnsType<UserSession> = [
    {
      title: '로그인 시각',
      dataIndex: 'loginAt',
      key: 'loginAt',
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: '마지막 활동',
      dataIndex: 'lastActivityAt',
      key: 'lastActivityAt',
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: 'IP 주소',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
    {
      title: '기기 유형',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
    },
    {
      title: '만료 시각',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button danger size="small" loading={terminateSessionMutation.isPending}>
              종료
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>세션을 종료하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription>해당 세션이 강제 종료됩니다. 사용자는 다시 로그인해야 합니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleTerminateSession(record.sessionId)}>종료</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ),
    },
  ];

  // 세션 이력 테이블 컬럼
  const sessionHistoryColumns: ColumnsType<UserSession> = [
    {
      title: '로그인 시각',
      dataIndex: 'loginAt',
      key: 'loginAt',
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: '로그아웃 시각',
      dataIndex: 'logoutAt',
      key: 'logoutAt',
      width: 160,
      render: (value) => formatDateTime(value),
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (value) => <Badge variant={value ? 'default' : 'secondary'}>{value ? '활성' : '종료'}</Badge>,
    },
    {
      title: 'IP 주소',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 140,
    },
    {
      title: '기기 유형',
      dataIndex: 'deviceType',
      key: 'deviceType',
      width: 100,
    },
    {
      title: '종료 사유',
      dataIndex: 'logoutReason',
      key: 'logoutReason',
      render: (value) => (value ? LOGOUT_REASON_LABELS[value] || value : '-'),
    },
  ];

  if (isLoading) {
    return <FallbackSpinner />;
  }

  if (!user) {
    return <div className="p-6">사용자를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="max-w-6xl h-full mx-auto px-6 py-3">
      <div className="flex justify-between items-end mb-3">
        <div>
          <Title level={3}>사용자 수정</Title>
          <Text type="secondary">사용자 계정 정보를 수정 또는 삭제합니다.</Text>
        </div>
        <div className="flex gap-2">
          <Button type="primary" onClick={handleSubmit} size="large" loading={updateUserMutation.isPending}>
            저장
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button danger size="large">
                삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>이 작업은 되돌릴 수 없습니다. 사용자 계정이 영구적으로 삭제됩니다.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Form form={form} layout="vertical">
        <Tabs defaultValue="basic" className="w-full gap-4">
          <TabsList className="flex flex-wrap w-full h-full bg-white">
            <TabsTrigger value="basic" className={cn(styles.tabTrigger)}>
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm">기본정보</span>
            </TabsTrigger>

            <TabsTrigger value="additional" className={cn(styles.tabTrigger)}>
              <Settings className="h-4 w-4 text-green-600" />
              <span className="text-sm">부가정보</span>
            </TabsTrigger>

            <TabsTrigger value="dataAccess" className={cn(styles.tabTrigger)}>
              <Database className="h-4 w-4 text-purple-600" />
              <span className="text-sm">데이터 접근범위</span>
            </TabsTrigger>

            <TabsTrigger value="scenario" className={cn(styles.tabTrigger)}>
              <Variable className="h-4 w-4 text-orange-600" />
              <span className="text-sm">시나리오 환경변수 접근제어</span>
            </TabsTrigger>

            <TabsTrigger value="skill" className={cn(styles.tabTrigger)}>
              <Award className="h-4 w-4 text-pink-600" />
              <span className="text-sm">스킬 접근제어</span>
            </TabsTrigger>

            <TabsTrigger value="ctiQueue" className={cn(styles.tabTrigger)}>
              <Combine className="h-4 w-4 text-indigo-600" />
              <span className="text-sm">CTI 큐 접근제어</span>
            </TabsTrigger>

            <TabsTrigger value="loginHistory" className={cn(styles.tabTrigger)}>
              <History className="h-4 w-4 text-cyan-600" />
              <span className="text-sm">로그인 이력</span>
            </TabsTrigger>

            <TabsTrigger value="sessionManagement" className={cn(styles.tabTrigger)}>
              <Monitor className="h-4 w-4 text-teal-600" />
              <span className="text-sm">세션 관리</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Info className="h-6 w-6 text-blue-600" />
                  <span>기본 정보</span>
                </CardTitle>
                <Text type="secondary">사용자의 기본 정보를 입력해주세요.</Text>
              </CardHeader>
              <CardContent>
                <div className={cn(styles.cardContentContainer)}>
                  <Form.Item label="사용자 고유ID" name="userUniqueId">
                    <Input size="large" disabled />
                  </Form.Item>
                  <Form.Item label="사용자 ID (사번)" name="userSabun" required rules={[{ required: true, message: '사용자 ID를 입력해주세요' }]}>
                    <Input size="large" placeholder="사용자 ID 입력" disabled />
                  </Form.Item>
                  <Form.Item label="비밀번호" name="password">
                    <Input.Password size="large" placeholder="변경할 비밀번호 입력" />
                  </Form.Item>
                  <Form.Item
                    label="비밀번호 확인"
                    name="passwordConfirm"
                    rules={[
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('비밀번호가 일치하지 않습니다'));
                        },
                      }),
                    ]}
                  >
                    <div className="flex gap-2">
                      <Input.Password size="large" placeholder="비밀번호 재입력" className="flex-1" />
                      <Button onClick={handlePasswordChange} loading={changePasswordMutation.isPending}>
                        비밀번호 변경
                      </Button>
                    </div>
                  </Form.Item>
                  <Form.Item label="사용자명" name="userName" required rules={[{ required: true, message: '사용자명을 입력해주세요' }]}>
                    <Input size="large" placeholder="사용자명 입력" />
                  </Form.Item>
                  <Form.Item label="직책" name="position">
                    <Input size="large" placeholder="직책 입력" />
                  </Form.Item>
                  <Form.Item label="테넌트 ID" name="tenantId">
                    <InputNumber size="large" className="w-full" disabled />
                  </Form.Item>
                  <Form.Item label="노드 ID" name="nodeId">
                    <InputNumber size="large" className="w-full" />
                  </Form.Item>
                  <Form.Item label="권한그룹 ID" name="grantId">
                    <InputNumber size="large" className="w-full" />
                  </Form.Item>
                  <Form.Item label="중복로그인" name="multiLogin" valuePropName="checked">
                    <Radio.Group>
                      <Radio value={true}>허용</Radio>
                      <Radio value={false}>금지</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="공지작성" name="noticeAutority" valuePropName="checked">
                    <Radio.Group>
                      <Radio value={true}>허용</Radio>
                      <Radio value={false}>금지</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="승인권한" name="approvalAuthority" valuePropName="checked">
                    <Radio.Group>
                      <Radio value={true}>가능</Radio>
                      <Radio value={false}>불가</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="계정 잠금 상태" name="loginLock">
                    <div className="flex items-center gap-4">
                      <span className={user.loginLock === 'Y' ? 'text-red-500 font-bold' : 'text-green-500'}>{user.loginLock === 'Y' ? '잠김' : '정상'}</span>
                      {user.loginLock === 'Y' ? (
                        <Button onClick={handleUnlock} loading={unlockUserMutation.isPending}>
                          잠금 해제
                        </Button>
                      ) : (
                        <Button danger onClick={handleLock} loading={lockUserMutation.isPending}>
                          잠금
                        </Button>
                      )}
                    </div>
                  </Form.Item>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="additional">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Settings className="h-6 w-6 text-green-600" />
                  <span>부가정보</span>
                </CardTitle>
                <Text type="secondary">사용자의 부가정보를 입력해주세요.</Text>
              </CardHeader>
              <CardContent>
                <div className={cn(styles.cardContentContainer)}>
                  <Form.Item label="사용자 상태" name="userStatus">
                    <Select
                      allowClear
                      size="large"
                      placeholder="상태 선택"
                      options={[
                        { label: '활성', value: 'ACTIVE' },
                        { label: '비활성', value: 'INACTIVE' },
                        { label: '대기', value: 'PENDING' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label="전화번호" name="userTelNo">
                    <Input size="large" placeholder="전화번호 입력" />
                  </Form.Item>

                  <Form.Item label="아웃소싱업체" name="oscomName">
                    <Input size="large" placeholder="아웃소싱업체 입력" />
                  </Form.Item>

                  <Form.Item label="시작 IP" name="ipStart">
                    <Input size="large" placeholder="시작 IP 입력" />
                  </Form.Item>

                  <Form.Item label="종료 IP" name="ipFinsh">
                    <Input size="large" placeholder="종료 IP 입력" />
                  </Form.Item>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dataAccess">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Database className="h-6 w-6 text-purple-600" />
                  <span>데이터 접근범위</span>
                </CardTitle>
                <Text type="secondary">사용자의 데이터 접근범위를 설정합니다.</Text>
              </CardHeader>
              <CardContent>
                <div className={cn(styles.cardContentContainer)}></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scenario">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Variable className="h-6 w-6 text-orange-600" />
                  <span>시나리오 환경변수 접근제어</span>
                </CardTitle>
                <Text type="secondary">사용자의 시나리오 환경변수 접근제어를 설정합니다.</Text>
              </CardHeader>
              <CardContent></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skill">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Award className="h-6 w-6 text-pink-600" />
                  <span>스킬 접근제어</span>
                </CardTitle>
                <Text type="secondary">사용자의 스킬 접근제어를 설정합니다.</Text>
              </CardHeader>
              <CardContent>
                <div className={cn(styles.cardContentContainer)}></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ctiQueue">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Combine className="h-6 w-6 text-indigo-600" />
                  <span>CTI 큐 접근제어</span>
                </CardTitle>
                <Text type="secondary">사용자의 CTI 큐 접근제어를 설정합니다.</Text>
              </CardHeader>
              <CardContent>
                <div className={cn(styles.cardContentContainer)}></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loginHistory">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <History className="h-6 w-6 text-cyan-600" />
                  <span>로그인 이력</span>
                </CardTitle>
                <Text type="secondary">사용자의 로그인/로그아웃 이력을 조회합니다.</Text>
              </CardHeader>
              <CardContent>
                <Table
                  columns={loginHistoryColumns}
                  dataSource={loginHistoryData?.items || []}
                  rowKey="id"
                  loading={isLoginHistoryLoading}
                  pagination={false}
                  size="small"
                  scroll={{ x: 800 }}
                />
                {loginHistoryData && loginHistoryData.total > 0 && (
                  <div className="flex justify-end mt-4">
                    <Pagination
                      current={loginHistoryPage + 1}
                      pageSize={pageSize}
                      total={loginHistoryData.total}
                      onChange={(page) => setLoginHistoryPage(page - 1)}
                      showSizeChanger={false}
                      showTotal={(total) => `총 ${total}건`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessionManagement">
            <div className="space-y-4">
              <Card className="gap-3">
                <CardHeader className="gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className={cn(styles.cardTitle)}>
                      <Monitor className="h-6 w-6 text-teal-600" />
                      <span>활성 세션</span>
                      {activeSessions && activeSessions.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {activeSessions.length}개
                        </Badge>
                      )}
                    </CardTitle>
                    {activeSessions && activeSessions.length > 1 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button danger loading={terminateAllSessionsMutation.isPending}>
                            전체 세션 종료
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>모든 세션을 종료하시겠습니까?</AlertDialogTitle>
                            <AlertDialogDescription>사용자의 모든 활성 세션이 강제 종료됩니다. 사용자는 다시 로그인해야 합니다.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction onClick={handleTerminateAllSessions}>전체 종료</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <Text type="secondary">현재 로그인된 세션을 관리합니다.</Text>
                </CardHeader>
                <CardContent>
                  {isActiveSessionsLoading ? (
                    <FallbackSpinner />
                  ) : activeSessions && activeSessions.length > 0 ? (
                    <Table columns={activeSessionColumns} dataSource={activeSessions} rowKey="id" pagination={false} size="small" scroll={{ x: 900 }} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">현재 활성 세션이 없습니다.</div>
                  )}
                </CardContent>
              </Card>

              <Card className="gap-3">
                <CardHeader className="gap-3">
                  <CardTitle className={cn(styles.cardTitle)}>
                    <Clock className="h-6 w-6 text-slate-600" />
                    <span>세션 이력</span>
                  </CardTitle>
                  <Text type="secondary">과거 세션 기록을 조회합니다.</Text>
                </CardHeader>
                <CardContent>
                  <Table
                    columns={sessionHistoryColumns}
                    dataSource={sessionHistoryData?.items || []}
                    rowKey="id"
                    loading={isSessionHistoryLoading}
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                  />
                  {sessionHistoryData && sessionHistoryData.total > 0 && (
                    <div className="flex justify-end mt-4">
                      <Pagination
                        current={sessionHistoryPage + 1}
                        pageSize={pageSize}
                        total={sessionHistoryData.total}
                        onChange={(page) => setSessionHistoryPage(page - 1)}
                        showSizeChanger={false}
                        showTotal={(total) => `총 ${total}건`}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Form>
    </div>
  );
}
