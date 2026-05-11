import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { BarChart2 } from 'lucide-react';
import PageHeader from '@/components/custom/PageHeader';

const breadcrumb = [{ label: '통계' }, { label: '대시보드' }];

function StatDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <PageHeader breadcrumb={breadcrumb} />
      <div className="flex flex-col gap-5 w-full h-full bg-white bt-shadow p-5">
        <header className="flex items-center justify-between w-full">
          <span className="text-base font-medium">통계 대시보드</span>
          <Button icon={<BarChart2 size={16} />} onClick={() => navigate('/insight/stat/widget')}>
            위젯 관리
          </Button>
        </header>
        <p className="text-gray-400 text-sm">대시보드 영역 (준비 중)</p>
      </div>
    </div>
  );
}

export default StatDashboardPage;
