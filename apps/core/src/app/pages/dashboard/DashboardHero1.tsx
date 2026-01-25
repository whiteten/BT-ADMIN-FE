/**
 * 대시보드 - Swiss Precision
 * 스위스 그래픽 디자인 영감의 그리드 기반 미니멀 업무 허브
 * B2B 엔터프라이즈 관리자용 - 마케팅 문구 없음
 */

import { Activity, Bell, Bot, Brain, ChevronRight, Clock, MessageSquare, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const quickActions = [
  { icon: Bot, label: '봇 관리', desc: '챗봇 생성 및 설정', href: '/bot' },
  { icon: Brain, label: '모델 학습', desc: 'NLU 모델 훈련', href: '/model' },
  { icon: MessageSquare, label: '대화 분석', desc: '대화 로그 분석', href: '/analysis' },
  { icon: Settings, label: '시스템 설정', desc: '환경 설정 관리', href: '/settings' },
];

const recentActivities = [
  { action: '모델 학습 완료', target: 'CS봇 v2.1', time: '10분 전' },
  { action: '봇 배포', target: '상담봇 Production', time: '1시간 전' },
  { action: '인텐트 추가', target: '주문조회 인텐트', time: '3시간 전' },
];

const notices = [
  { title: '시스템 정기 점검 안내', date: '2025-01-27', isNew: true },
  { title: 'NLU 엔진 v3.2 업데이트', date: '2025-01-25', isNew: false },
];

export default function DashboardHero1() {
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? '좋은 아침입니다' : currentHour < 18 ? '좋은 오후입니다' : '좋은 저녁입니다';

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-stone-50">
      {/* Header Section */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500 tracking-wide uppercase mb-2">NLU Bot Admin</p>
              <h1 className="text-3xl font-light text-stone-900 tracking-tight">
                {greeting}, <span className="font-medium">관리자</span>님
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>시스템 정상</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        {/* Quick Actions Grid */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-6">바로가기</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => (
              <a key={idx} href={action.href} className="group block p-6 bg-white border border-stone-200 hover:border-stone-300 hover:shadow-sm transition-all duration-200">
                <action.icon className="w-6 h-6 text-stone-400 group-hover:text-blue-600 transition-colors mb-4" />
                <h3 className="font-medium text-stone-900 mb-1">{action.label}</h3>
                <p className="text-sm text-stone-500">{action.desc}</p>
              </a>
            ))}
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <section className="md:col-span-2">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              최근 활동
            </h2>
            <Card className="border-stone-200 shadow-none">
              <CardContent className="p-0 divide-y divide-stone-100">
                {recentActivities.map((activity, idx) => (
                  <div key={idx} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors">
                    <div>
                      <p className="text-sm text-stone-900">{activity.action}</p>
                      <p className="text-sm text-stone-500">{activity.target}</p>
                    </div>
                    <span className="text-xs text-stone-400">{activity.time}</span>
                  </div>
                ))}
                <a href="/activity" className="flex items-center justify-center gap-1 px-6 py-3 text-sm text-stone-500 hover:text-stone-700 hover:bg-stone-50 transition-colors">
                  전체 보기
                  <ChevronRight className="w-4 h-4" />
                </a>
              </CardContent>
            </Card>
          </section>

          {/* Notices */}
          <section>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              공지사항
            </h2>
            <Card className="border-stone-200 shadow-none">
              <CardContent className="p-0 divide-y divide-stone-100">
                {notices.map((notice, idx) => (
                  <a key={idx} href="/notices" className="block px-6 py-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-start gap-2">
                      {notice.isNew && <span className="mt-1 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />}
                      <div className={notice.isNew ? '' : 'ml-3.5'}>
                        <p className="text-sm text-stone-900 line-clamp-1">{notice.title}</p>
                        <p className="text-xs text-stone-400 mt-1">{notice.date}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-stone-200 mt-auto">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <p className="text-xs text-stone-400">NLU Bot Admin v2.0 &middot; 마지막 접속: 오늘 09:15</p>
        </div>
      </div>
    </div>
  );
}
