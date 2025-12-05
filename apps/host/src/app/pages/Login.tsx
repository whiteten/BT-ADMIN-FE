import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Form, type FormProps, Input } from 'antd';
import { Lock, User, Users } from 'lucide-react';
import styles from './Login.module.scss';
import { useLogin } from '../features/auth/hooks/useAuthQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Log } from '@/libs/shared-util/src/lib/log';

export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { mutate: login } = useLogin();

  const onFinish: FormProps<{ userId: string; password: string }>['onFinish'] = (values) => {
    Log.debug('onFinish', values);
    // login({ username: values.userId, password: values.password });
    navigate('/');
  };

  const onFinishFailed: FormProps<{ userId: string; password: string }>['onFinishFailed'] = (errorInfo) => {
    Log.warn('onFinishFailed', errorInfo);
  };

  return (
    <div className="w-screen min-h-svh flex flex-col items-center justify-center gap-3 bg-[#f3f3f9]">
      <div
        className="absolute top-0 left-0 right-0 w-full h-[557px]"
        style={{
          background: 'url(/assets/images/login-bg.png) no-repeat 50% center',
          backgroundSize: 'cover',
          backgroundColor: '#f3f3f9',
        }}
      >
        <div className="absolute top-0 left-0 w-full h-full z-10" style={{ backgroundColor: '#1B28364D' }}></div>
        <div className="absolute bottom-0 left-0 w-full z-20">
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1440 120">
            <path fill="#f3f3f9" d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
          </svg>
        </div>
      </div>
      <div className="w-full h-full z-30 flex flex-col items-center justify-center relative">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('w-full', styles['login-wrapper'])}>
              <Form form={form} layout="vertical" onFinish={onFinish} onFinishFailed={onFinishFailed} autoComplete="off" initialValues={{ userId: 'admin', password: 'admin1234' }}>
                <Form.Item name="userId" label="아이디" rules={[{ required: true, message: '아이디를 입력해주세요' }]} className="!mb-4">
                  <Input size="large" placeholder="아이디" prefix={<User className="h-4 w-4 text-gray-400" />} />
                </Form.Item>

                <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력해주세요' }]} className="!mb-4">
                  <Input.Password size="large" placeholder="비밀번호" prefix={<Lock className="h-4 w-4 text-gray-400" />} />
                </Form.Item>

                <Form.Item label="테넌트명" className="!mb-4">
                  <Input size="large" placeholder="테넌트명" prefix={<Users className="h-4 w-4 text-gray-400" />} />
                </Form.Item>

                <Form.Item className="!mb-5">
                  <Checkbox>로그인 정보 저장</Checkbox>
                </Form.Item>

                <Form.Item className="!mb-0">
                  <Button type="primary" size="large" htmlType="submit" block className="!bg-[var(--color-bt-primary)]">
                    로그인
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </CardContent>
        </Card>
        <div className="absolute bottom-[-30px] flex justify-center p-1 z-10">
          <img src="/assets/images/copyright.svg" alt="Copyright" />
        </div>
      </div>
    </div>
  );
}
