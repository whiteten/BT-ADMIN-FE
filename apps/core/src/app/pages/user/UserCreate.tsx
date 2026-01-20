import { useNavigate } from 'react-router-dom';
import { Button, Form, Input, InputNumber, Radio, Select, Typography } from 'antd';
import { Award, Combine, Database, Info, Settings, Variable } from 'lucide-react';
import { toast } from '@/shared-util';
import { useCreateUser } from '../../features/user/hooks/useUserQueries';
import type { UserRequest } from '../../features/user/types/user.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const { Title, Text } = Typography;

const styles = {
  tabTrigger: 'flex items-center gap-1 px-3 py-2 hover:cursor-pointer border-2 border-transparent data-[state=active]:border-blue-600 whitespace-nowrap',
  cardContentContainer: 'grid grid-cols-1 lg:grid-cols-2 gap-x-6',
  cardTitle: 'flex items-center gap-2 text-xl',
};

export default function UserCreate() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const createUserMutation = useCreateUser({
    mutationOptions: {
      onSuccess: (data) => {
        toast.success('사용자가 생성되었습니다');
        navigate(`../user/${data.userId}`);
      },
      onError: () => {
        toast.error('사용자 생성에 실패했습니다');
      },
    },
  });

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const requestData: UserRequest = {
        tenantId: values.tenantId,
        userSabun: values.userSabun,
        userName: values.userName,
        userPassword: values.password,
        position: values.position,
        nodeId: values.nodeId,
        grantId: values.grantId,
        userTelNo: values.userTelNo,
        userStatus: values.userStatus || 'ACTIVE',
        loginLock: 'N',
        multiLogin: values.multiLogin ? 'Y' : 'N',
        oscomName: values.oscomName,
        ipStart: values.ipStart,
        ipFinsh: values.ipFinsh,
        noticeAutority: values.noticeAutority ? 1 : 0,
        approvalAuthority: values.approvalAuthority ? 1 : 0,
        isUse: true,
      };

      createUserMutation.mutate(requestData);
    } catch {
      toast.error('필수 항목을 확인해주세요');
    }
  };

  return (
    <div className="max-w-6xl h-full mx-auto px-6 py-3">
      <div className="flex justify-between items-end mb-3">
        <div>
          <Title level={3}>사용자 등록</Title>
          <Text type="secondary">신규 사용자 계정을 생성하고 권한을 설정합니다.</Text>
        </div>
        <Button type="primary" onClick={handleSubmit} size="large" loading={createUserMutation.isPending}>
          저장
        </Button>
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          multiLogin: true,
          noticeAutority: false,
          approvalAuthority: false,
        }}
      >
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
                  <Form.Item label="사용자 ID (사번)" name="userSabun" required rules={[{ required: true, message: '사용자 ID를 입력해주세요' }]} className="lg:col-span-2">
                    <Input size="large" placeholder="사용자 ID 입력" />
                  </Form.Item>
                  <Form.Item label="비밀번호" name="password" required rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}>
                    <Input.Password size="large" placeholder="비밀번호 입력" />
                  </Form.Item>
                  <Form.Item
                    label="비밀번호 확인"
                    name="passwordConfirm"
                    required
                    rules={[
                      { required: true, message: '비밀번호 확인을 입력해주세요' },
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
                    <Input.Password size="large" placeholder="비밀번호 재입력" />
                  </Form.Item>
                  <Form.Item label="사용자명" name="userName" required rules={[{ required: true, message: '사용자명을 입력해주세요' }]}>
                    <Input size="large" placeholder="사용자명 입력" />
                  </Form.Item>
                  <Form.Item label="직책" name="position">
                    <Input size="large" placeholder="직책 입력" />
                  </Form.Item>
                  <Form.Item label="테넌트 ID" name="tenantId">
                    <InputNumber size="large" className="w-full" placeholder="테넌트 ID 입력" />
                  </Form.Item>
                  <Form.Item label="노드 ID" name="nodeId">
                    <InputNumber size="large" className="w-full" placeholder="노드 ID 입력" />
                  </Form.Item>
                  <Form.Item label="권한그룹 ID" name="grantId">
                    <InputNumber size="large" className="w-full" placeholder="권한그룹 ID 입력" />
                  </Form.Item>
                  <Form.Item label="중복로그인" name="multiLogin">
                    <Radio.Group>
                      <Radio value={true}>허용</Radio>
                      <Radio value={false}>금지</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="공지작성" name="noticeAutority">
                    <Radio.Group>
                      <Radio value={true}>허용</Radio>
                      <Radio value={false}>금지</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="승인권한" name="approvalAuthority">
                    <Radio.Group>
                      <Radio value={true}>가능</Radio>
                      <Radio value={false}>불가</Radio>
                    </Radio.Group>
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
