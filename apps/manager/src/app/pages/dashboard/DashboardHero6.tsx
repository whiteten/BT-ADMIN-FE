/**
 * 대시보드 - Night Shift (다크 모드)
 * 어두운 테마의 업무용 대시보드
 * B2B 엔터프라이즈 관리자용 - 마케팅 문구 없음
 */

import { Activity, BarChart3, Bell, Bot, Brain, ChevronRight, Circle, Clock, MessageSquare, Settings, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const quickActions = [
  { icon: Bot, label: '봇 관리', href: '/fca', color: 'from-blue-500 to-blue-600' },
  { icon: Brain, label: '모델 학습', href: '/model', color: 'from-violet-500 to-violet-600' },
  { icon: MessageSquare, label: '대화 분석', href: '/analysis', color: 'from-emerald-500 to-emerald-600' },
  { icon: BarChart3, label: '통계', href: '/stats', color: 'from-amber-500 to-amber-600' },
];

const recentActivities = [
  { action: '모델 학습 완료', target: 'CS봇 v2.1', time: '10분 전', status: 'success' },
  { action: '봇 배포', target: '상담봇 Production', time: '1시간 전', status: 'success' },
  { action: '학습 진행 중', target: 'FAQ 모델', time: '진행중', status: 'pending' },
];

const systemStatus = {
  status: 'operational',
  services: [
    { name: 'NLU 엔진', status: 'online' },
    { name: 'API', status: 'online' },
    { name: '학습 서버', status: 'online' },
  ],
};

export default function DashboardHero6() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? '좋은 아침입니다' : currentHour < 18 ? '좋은 오후입니다' : '좋은 저녁입니다';

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-zinc-950">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/20 via-transparent to-violet-950/20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-sm font-medium text-zinc-500 tracking-wide uppercase mb-2">NLU Bot Admin</p>
            <h1 className="text-2xl font-light text-zinc-100 tracking-tight">
              {greeting}, <span className="font-medium">관리자</span>님
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* System Status Banner */}
        <Card className="mb-8 bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-zinc-300">모든 시스템 정상 운영 중</span>
              </div>
              <div className="flex items-center gap-6">
                {systemStatus.services.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-500">
                    <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
                    {service.name}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {quickActions.map((action, idx) => (
            <a key={idx} href={action.href} className="group block">
              <Card className="h-full bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-medium text-zinc-200 group-hover:text-white transition-colors">{action.label}</h3>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="md:col-span-2 bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${activity.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <div>
                        <p className="text-sm text-zinc-300">{activity.action}</p>
                        <p className="text-xs text-zinc-500">{activity.target}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-600">{activity.time}</span>
                  </div>
                ))}
              </div>
              <a href="/activity" className="flex items-center justify-center gap-1 mt-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                전체 보기
                <ChevronRight className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-zinc-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-zinc-500" />
                빠른 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">활성 봇</p>
                <p className="text-2xl font-semibold text-zinc-100">5</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">오늘 대화</p>
                <p className="text-2xl font-semibold text-zinc-100">1,247</p>
              </div>
              <div className="p-4 rounded-lg bg-zinc-800/50">
                <p className="text-xs text-zinc-500 mb-1">인텐트 정확도</p>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-semibold text-zinc-100">94.2%</p>
                  <span className="text-xs text-emerald-500 mb-1">+1.2%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-zinc-800">
          <p className="text-xs text-zinc-600">NLU Bot Admin v2.0 &middot; 마지막 접속: 오늘 09:15</p>
        </div>
      </div>
    </div>
  );
}
