import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Form, Input } from 'antd';
import { Lock, User, Users } from 'lucide-react';
import { useAuth } from '@/shared-store';
import styles from './Login.module.scss';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleLogin = () => {
    login(() => {
      navigate('/');
    });
  };
  return (
    <div className="bg-muted w-screen min-h-svh flex flex-col items-center justify-center gap-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome</CardTitle>
          <CardDescription>Login in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn('w-full', styles['login-wrapper'])}>
            <Form layout="vertical" form={form} onFinish={handleLogin} autoComplete="off">
              <Form.Item name="userId" label="아이디" rules={[{ required: false, message: '아이디를 입력해주세요' }]} className="!mb-4">
                <Input size="large" placeholder="아이디" prefix={<User className="h-4 w-4 text-gray-400" />} />
              </Form.Item>

              <Form.Item name="password" label="비밀번호" rules={[{ required: false, message: '비밀번호를 입력해주세요' }]} className="!mb-4">
                <Input.Password size="large" placeholder="비밀번호" prefix={<Lock className="h-4 w-4 text-gray-400" />} />
              </Form.Item>

              <Form.Item name="tenant" label="테넌트명" rules={[{ required: false, message: '테넌트명을 입력해주세요' }]} className="!mb-4">
                <Input size="large" placeholder="테넌트명" prefix={<Users className="h-4 w-4 text-gray-400" />} />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked" className="!mb-5">
                <Checkbox>로그인 정보 저장</Checkbox>
              </Form.Item>

              <Form.Item className="!mb-0">
                <Button type="primary" size="large" htmlType="submit" block>
                  로그인
                </Button>
              </Form.Item>
            </Form>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center p-1">
        <img src="/assets/images/copyright.svg" alt="Copyright" />
      </div>
    </div>
  );
}
