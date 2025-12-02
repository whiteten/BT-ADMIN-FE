import { useNavigate } from 'react-router-dom';
import { Result } from 'antd';
import { cn } from '../../lib/utils';
import { Button } from '../shadcn/button';

interface NotFoundProps {
  useFullScreen?: boolean;
  homePath?: string;
}

export function NotFound({ useFullScreen = false, homePath = '/' }: NotFoundProps) {
  const navigate = useNavigate();
  const handleHome = () => {
    navigate(homePath);
  };
  return (
    <div className={cn('w-full h-full flex items-center justify-center bg-white bt-shadow', useFullScreen && 'h-screen')}>
      <Result
        status="404"
        title="404"
        subTitle="페이지를 찾을 수 없습니다."
        extra={
          <Button type="button" onClick={handleHome}>
            Home
          </Button>
        }
      />
    </div>
  );
}
