/**
 * 대시보드 - Warm Professional
 * 따뜻한 톤의 전문적 카드 레이아웃
 * B2B 엔터프라이즈 관리자용 - 마케팅 문구 없음
 */

import { ArrowRight, BarChart3, Bot, Brain, CheckCircle2, FileText, MessageSquare, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mainActions = [
  {
    icon: Bot,
    label: '봇 관리',
    desc: '등록된 봇 관리',
    count: 5,
    href: '/fca',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
  },
  {
    icon: Brain,
    label: '모델 학습',
    desc: 'NLU 모델 훈련',
    count: 3,
    href: '/model',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    icon: MessageSquare,
    label: '대화 로그',
    desc: '대화 기록 분석',
    count: 128,
    href: '/logs',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  },
  {
    icon: BarChart3,
    label: '통계',
    desc: '성능 리포트',
    count: null,
    href: '/stats',
    color: 'bg-violet-50 text-violet-600 border-violet-200',
  },
];

const recentItems = [
  { type: 'bot', name: '고객상담 봇', status: '운영중', time: '방금 전' },
  { type: 'model', name: 'CS 모델 v2.3', status: '학습완료', time: '2시간 전' },
  { type: 'bot', name: '주문조회 봇', status: '테스트', time: '어제' },
];

const todoItems = [
  { text: 'FAQ 인텐트 검수 (12건)', done: false },
  { text: '신규 엔티티 등록', done: false },
  { text: '월간 리포트 확인', done: true },
];

export default function DashboardHero2() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-orange-50/50 via-white to-amber-50/30">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Welcome Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-slate-800 mb-1">안녕하세요, 관리자님</h1>
          <p className="text-slate-500">오늘의 업무를 확인하세요</p>
        </div>

        {/* Main Action Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {mainActions.map((action, idx) => (
            <a key={idx} href={action.href} className="group">
              <Card className="h-full border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all duration-200 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-xl ${action.color} border flex items-center justify-center mb-4`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="font-medium text-slate-800 group-hover:text-slate-900">{action.label}</h3>
                      <p className="text-sm text-slate-500 mt-0.5">{action.desc}</p>
                    </div>
                    {action.count !== null && <span className="text-2xl font-light text-slate-400">{action.count}</span>}
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Items */}
          <Card className="lg:col-span-2 border-slate-200/60 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-slate-800">최근 작업</CardTitle>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 -mr-2">
                  전체 보기
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-slate-100">
                {recentItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.type === 'bot' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                      {item.type === 'bot' ? <Bot className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        item.status === '운영중' ? 'bg-emerald-100 text-emerald-700' : item.status === '학습완료' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Todo / Quick Tasks */}
          <Card className="border-slate-200/60 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-slate-800">할 일</CardTitle>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-500 hover:text-slate-700 -mr-2">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {todoItems.map((item, idx) => (
                  <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-slate-400'
                      }`}
                    >
                      {item.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.text}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links Footer */}
        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500">
          <a href="/settings" className="flex items-center gap-1.5 hover:text-slate-700 transition-colors">
            <Settings className="w-4 h-4" />
            설정
          </a>
          <span className="text-slate-300">|</span>
          <a href="/docs" className="flex items-center gap-1.5 hover:text-slate-700 transition-colors">
            <FileText className="w-4 h-4" />
            매뉴얼
          </a>
        </div>
      </div>
    </div>
  );
}
