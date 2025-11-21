import { useState } from 'react';
import { Button, Form, Input, InputNumber, Radio, Select, Typography } from 'antd';
import { Award, Combine, Database, Info, Settings, Variable } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface UserFormData {
  userUniqueId: string;
  userId: string;
  password: string;
  passwordConfirm: string;
  userName: string;
  position: string;
  tenantId: string;
  customerId: string;
  nodeId: string;
  authGroupId: string;
  multiLogin: boolean;
  noticeAuth: boolean;
  approvalAuth: boolean;
  iccUse: boolean;
  // 부가사항
  currentStatus: string;
  accountStatus: string;
  phoneNumber: string;
  mobileNumber: string;
  email: string;
  remarks: string;
  ipMask: string;
  ipRangeStart: number | null;
  ipRangeEnd: number | null;
}

const { Title, Text } = Typography;

const tenantOptions = [
  { label: '테넌트A', value: '테넌트A' },
  { label: '테넌트B', value: '테넌트B' },
  { label: '테넌트C', value: '테넌트C' },
];

const customerOptions = [
  { label: '삼성전자', value: '삼성전자' },
  { label: 'LG전자', value: 'LG전자' },
  { label: 'SK텔레콤', value: 'SK텔레콤' },
  { label: 'KT', value: 'KT' },
  { label: '네이버', value: '네이버' },
  { label: '카카오', value: '카카오' },
];

const nodeOptions = [
  { label: '서울-1', value: '서울-1' },
  { label: '서울-2', value: '서울-2' },
  { label: '부산-1', value: '부산-1' },
  { label: '대구-1', value: '대구-1' },
];

const authGroupOptions = [
  { label: '시스템관리자', value: '시스템관리자' },
  { label: '운영자', value: '운영자' },
  { label: '일반사용자', value: '일반사용자' },
  { label: '읽기전용', value: '읽기전용' },
];

const currentStatusOptions = [
  { label: '활성', value: 'active' },
  { label: '비활성', value: 'inactive' },
  { label: '대기', value: 'pending' },
];

const accountStatusOptions = [
  { label: '정상', value: 'normal' },
  { label: '잠김', value: 'locked' },
  { label: '만료', value: 'expired' },
  { label: '정지', value: 'suspended' },
];

const styles = {
  tabTrigger: 'flex items-center gap-1 px-3 py-2 hover:cursor-pointer border-2 border-transparent data-[state=active]:border-blue-600 whitespace-nowrap',
  cardContentContainer: 'grid grid-cols-1 lg:grid-cols-2 gap-x-6',
  cardTitle: 'flex items-center gap-2 text-xl',
};

export default function UserDetail() {
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<UserFormData>({
    // 기본정보
    userUniqueId: '2000000001',
    userId: 'test',
    password: '',
    passwordConfirm: '',
    userName: '테스트',
    position: '',
    tenantId: '테넌트A',
    customerId: '삼성전자',
    nodeId: '서울-1',
    authGroupId: '시스템관리자',
    multiLogin: true,
    noticeAuth: true,
    approvalAuth: true,
    iccUse: true,
    // 부가사항
    currentStatus: '활성',
    accountStatus: '정상',
    phoneNumber: '02-1234-5678',
    mobileNumber: '010-1234-5678',
    email: 'test@test.com',
    remarks: '테스트 사용자',
    ipMask: '192.168.1.0/24',
    ipRangeStart: 1,
    ipRangeEnd: 255,
  });

  const handleInputChange = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    console.log('Submit:', formData);
  };

  return (
    <div className="max-w-6xl h-full mx-auto px-6 py-3">
      <div className="flex justify-between items-end mb-3">
        <div>
          <Title level={3}>사용자 수정</Title>
          <Text type="secondary">사용자 계정 정보를 수정 또는 삭제합니다.</Text>
        </div>
        <div className="flex gap-2">
          <Button type="primary" onClick={handleSubmit} size="large">
            저장
          </Button>
          <Button danger onClick={() => console.log('Delete')} size="large">
            삭제
          </Button>
        </div>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={formData}>
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
                    <Input size="large" disabled value={formData.userUniqueId} />
                  </Form.Item>
                  <Form.Item label="사용자 ID" name="userId" required rules={[{ required: true, message: '사용자 ID를 입력해주세요' }]}>
                    <Input size="large" placeholder="사용자 ID 입력" value={formData.userId} onChange={(e) => handleInputChange('userId', e.target.value)} />
                  </Form.Item>
                  <Form.Item label="비밀번호" name="password" required rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}>
                    <Input.Password size="large" placeholder="비밀번호 입력" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
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
                    <Input.Password
                      size="large"
                      placeholder="비밀번호 재입력"
                      value={formData.passwordConfirm}
                      onChange={(e) => handleInputChange('passwordConfirm', e.target.value)}
                    />
                  </Form.Item>
                  <Form.Item label="사용자명" name="userName" required rules={[{ required: true, message: '사용자명을 입력해주세요' }]}>
                    <Input size="large" placeholder="사용자명 입력" value={formData.userName} onChange={(e) => handleInputChange('userName', e.target.value)} />
                  </Form.Item>
                  <Form.Item label="직책" name="position">
                    <Input size="large" placeholder="직책 입력" value={formData.position} onChange={(e) => handleInputChange('position', e.target.value)} />
                  </Form.Item>
                  <Form.Item label="테넌트 선택" name="tenantId" required rules={[{ required: true, message: '테넌트를 선택해주세요' }]}>
                    <Select
                      allowClear
                      size="large"
                      placeholder="테넌트 선택"
                      options={tenantOptions}
                      value={formData.tenantId}
                      onChange={(value) => handleInputChange('tenantId', value)}
                    />
                  </Form.Item>
                  <Form.Item label="고객사 선택" name="customerId" required rules={[{ required: true, message: '고객사를 선택해주세요' }]}>
                    <Select
                      allowClear
                      size="large"
                      placeholder="고객사 선택"
                      options={customerOptions}
                      value={formData.customerId}
                      onChange={(value) => handleInputChange('customerId', value)}
                    />
                  </Form.Item>
                  <Form.Item label="노드 선택" name="nodeId" required rules={[{ required: true, message: '노드를 선택해주세요' }]}>
                    <Select
                      allowClear
                      size="large"
                      placeholder="노드 선택"
                      options={nodeOptions}
                      value={formData.nodeId}
                      onChange={(value) => handleInputChange('nodeId', value)}
                    />
                  </Form.Item>
                  <Form.Item label="권한그룹 선택" name="authGroupId">
                    <Select
                      allowClear
                      size="large"
                      placeholder="권한그룹 선택"
                      options={authGroupOptions}
                      value={formData.authGroupId}
                      onChange={(value) => handleInputChange('authGroupId', value)}
                    />
                  </Form.Item>
                  <Form.Item label="중복로그인" name="multiLogin">
                    <Radio.Group value={formData.multiLogin} onChange={(e) => handleInputChange('multiLogin', e.target.value)}>
                      <Radio value={true}>허용</Radio>
                      <Radio value={false}>금지</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="공지작성" name="noticeAuth">
                    <Radio.Group value={formData.noticeAuth} onChange={(e) => handleInputChange('noticeAuth', e.target.value)}>
                      <Radio value={true}>허용</Radio>
                      <Radio value={false}>금지</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="승인권한" name="approvalAuth">
                    <Radio.Group value={formData.approvalAuth} onChange={(e) => handleInputChange('approvalAuth', e.target.value)}>
                      <Radio value={true}>가능</Radio>
                      <Radio value={false}>불가</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="ICC 사용 여부" name="iccUse">
                    <Radio.Group value={formData.iccUse} onChange={(e) => handleInputChange('iccUse', e.target.value)}>
                      <Radio value={true}>사용</Radio>
                      <Radio value={false}>미사용</Radio>
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
                  <Form.Item label="현재상태" name="currentStatus">
                    <Select
                      allowClear
                      size="large"
                      placeholder="현재상태 선택"
                      options={currentStatusOptions}
                      value={formData.currentStatus}
                      onChange={(value) => handleInputChange('currentStatus', value)}
                    />
                  </Form.Item>

                  <Form.Item label="계정상태" name="accountStatus">
                    <Select
                      allowClear
                      size="large"
                      placeholder="계정상태 선택"
                      options={accountStatusOptions}
                      value={formData.accountStatus}
                      onChange={(value) => handleInputChange('accountStatus', value)}
                    />
                  </Form.Item>

                  <Form.Item label="전화번호" name="phoneNumber">
                    <Input size="large" placeholder="전화번호 입력" value={formData.phoneNumber} onChange={(e) => handleInputChange('phoneNumber', e.target.value)} />
                  </Form.Item>

                  <Form.Item label="핸드폰번호" name="mobileNumber">
                    <Input size="large" placeholder="핸드폰번호 입력" value={formData.mobileNumber} onChange={(e) => handleInputChange('mobileNumber', e.target.value)} />
                  </Form.Item>

                  <Form.Item label="E-mail주소" name="email" className="lg:col-span-2">
                    <Input size="large" placeholder="이메일 주소 입력" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                  </Form.Item>

                  <Form.Item label="특이사항" name="remarks" className="lg:col-span-2">
                    <Input.TextArea size="large" rows={4} placeholder="특이사항 입력" value={formData.remarks} onChange={(e) => handleInputChange('remarks', e.target.value)} />
                  </Form.Item>

                  <Form.Item label="IP 마스크" name="ipMask" className="lg:col-span-2">
                    <Input size="large" placeholder="예: 192.168.1.0/24" value={formData.ipMask} onChange={(e) => handleInputChange('ipMask', e.target.value)} />
                  </Form.Item>

                  <Form.Item label="IP 범위" className="lg:col-span-2">
                    <div className="flex items-center gap-2">
                      <InputNumber
                        size="large"
                        min={1}
                        max={255}
                        placeholder="시작"
                        value={formData.ipRangeStart}
                        onChange={(value) => handleInputChange('ipRangeStart', value)}
                        className="flex-1"
                      />
                      <span className="text-gray-500">~</span>
                      <InputNumber
                        size="large"
                        min={1}
                        max={255}
                        placeholder="종료"
                        value={formData.ipRangeEnd}
                        onChange={(value) => handleInputChange('ipRangeEnd', value)}
                        className="flex-1"
                      />
                    </div>
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
