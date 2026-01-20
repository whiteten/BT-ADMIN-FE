import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Radio, Select, Typography } from 'antd';
import { Award, Combine, Database, Info, Settings, Variable } from 'lucide-react';
import { toast } from '@/shared-util';
import { useChangePassword, useDeleteUser, useGetUser, useLockUser, useUnlockUser, useUpdateUser } from '../../features/user/hooks/useUserQueries';
import type { UserRequest } from '../../features/user/types/user.types';
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

  // API 호출
  const { data: user, isLoading } = useGetUser({
    userId: userId ? Number(userId) : undefined,
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
        </Tabs>
      </Form>
    </div>
  );
}
