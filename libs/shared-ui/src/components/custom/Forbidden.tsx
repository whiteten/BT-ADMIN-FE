import { useNavigate } from 'react-router-dom';
import { Result } from 'antd';
import { cn } from '../../lib/utils';
import { Button } from '../shadcn/button';

interface ForbiddenProps {
  useFullScreen?: boolean;
  homePath?: string;
}

export function Forbidden({ useFullScreen = false, homePath = '/' }: ForbiddenProps) {
  const navigate = useNavigate();
  const handleHome = () => {
    navigate(homePath);
  };
  return (
    <div className={cn('w-full h-full flex items-center justify-center bg-white bt-shadow', useFullScreen && 'h-screen')}>
      <Result
        status="403"
        title="403"
        subTitle="접근 권한이 없습니다."
        extra={
          <Button type="button" onClick={handleHome}>
            Home
          </Button>
        }
      />
    </div>
  );
}
