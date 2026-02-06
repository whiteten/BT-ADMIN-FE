import { useNavigate } from 'react-router-dom';
import { Activity, Clock, LayoutDashboard, Settings } from 'lucide-react';
import PageHeader from '@/components/custom/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

const cards = [
  {
    icon: LayoutDashboard,
    title: '대시보드',
    description: '배치 집계 현황 모니터링',
    path: '/sd/monitoring/dashboard',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Clock,
    title: '이력 조회',
    description: '체크포인트 및 에러 이력',
    path: '/sd/monitoring/history',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: Settings,
    title: '스케줄러 제어',
    description: '배치 스케줄러 관리',
    path: '/sd/monitoring/scheduler',
    color: 'from-emerald-500 to-teal-500',
  },
];

export default function Main() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeader breadcrumb={[{ title: 'SD' }, { title: '메인' }]} />

      <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-slate-50 to-blue-50/50 p-6 dark:from-slate-900 dark:to-blue-950/30">
        <Activity className="h-8 w-8 text-blue-500" />
        <div>
          <h2 className="text-lg font-semibold">BT-ADMIN 통계 집계 모니터링</h2>
          <p className="text-sm text-muted-foreground">배치 집계 상태, 이력, 스케줄러를 통합 관리합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(card.path)}>
            <CardContent className="flex items-start gap-4 p-5">
              <div className={`rounded-lg bg-gradient-to-br ${card.color} p-2.5`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
