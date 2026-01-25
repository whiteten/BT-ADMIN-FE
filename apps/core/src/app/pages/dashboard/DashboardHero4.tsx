/**
 * 대시보드 - Widget Dashboard
 * 모듈형 위젯 배치 스타일
 * B2B 엔터프라이즈 관리자용 - 마케팅 문구 없음
 */

import { Activity, AlertCircle, ArrowUpRight, Bot, Brain, CheckCircle, Clock, MessageSquare, MoreHorizontal, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statWidgets = [
  { label: '활성 봇', value: '5', change: '+1', trend: 'up', icon: Bot },
  { label: '오늘 대화', value: '1,247', change: '+12%', trend: 'up', icon: MessageSquare },
  { label: '학습 중 모델', value: '2', change: '', trend: 'neutral', icon: Brain },
  { label: '평균 응답시간', value: '0.8s', change: '-0.1s', trend: 'up', icon: Activity },
];

const recentTasks = [
  { title: '고객상담 봇 배포', status: 'completed', time: '14:30' },
  { title: 'FAQ 모델 학습', status: 'in-progress', time: '진행중' },
  { title: '주문조회 인텐트 추가', status: 'pending', time: '대기' },
];

const systemAlerts = [
  { type: 'info', message: 'NLU 엔진 v3.2 업데이트 가능', time: '1시간 전' },
  { type: 'warning', message: '모델 학습 큐 대기 중 (2건)', time: '30분 전' },
];

const quickStats = [
  { label: '이번 주 인텐트 정확도', value: '94.2%' },
  { label: '처리된 대화', value: '8,472건' },
  { label: '신규 학습 데이터', value: '156건' },
];

export default function DashboardHero4() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">대시보드</h1>
            <p className="text-sm text-slate-500 mt-0.5">시스템 현황을 한눈에 확인하세요</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>마지막 업데이트: 방금 전</span>
          </div>
        </div>

        {/* Stat Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statWidgets.map((stat, idx) => (
            <Card key={idx} className="bg-white border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-slate-600" />
                  </div>
                  {stat.change && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${stat.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-semibold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Tasks */}
          <Card className="lg:col-span-2 bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">최근 작업</CardTitle>
                <Button variant="ghost" size="icon" className="w-8 h-8 -mr-2">
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {recentTasks.map((task, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        task.status === 'completed' ? 'bg-emerald-100' : task.status === 'in-progress' ? 'bg-blue-100' : 'bg-slate-200'
                      }`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                      ) : task.status === 'in-progress' ? (
                        <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700">{task.title}</p>
                    </div>
                    <span className="text-xs text-slate-500">{task.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Alerts */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                알림
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {systemAlerts.map((alert, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${alert.type === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-sm ${alert.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>{alert.message}</p>
                    <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Bar */}
        <Card className="mt-6 bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between divide-x divide-slate-200">
              {quickStats.map((stat, idx) => (
                <div key={idx} className="flex-1 text-center px-4 first:pl-0 last:pr-0">
                  <p className="text-lg font-semibold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
              <div className="pl-4">
                <Button variant="outline" size="sm" className="text-slate-600">
                  상세 보기
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
