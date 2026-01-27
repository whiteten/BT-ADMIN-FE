/**
 * 대시보드 - Focus Mode
 * 단일 주요 액션 강조 + 보조 링크 스타일
 * B2B 엔터프라이즈 관리자용 - 마케팅 문구 없음
 */

import { ArrowRight, Bot, Brain, FileText, HelpCircle, MessageSquare, Play, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const secondaryActions = [
  { icon: Brain, label: '모델 학습', desc: 'NLU 모델 훈련 및 개선', href: '/model' },
  { icon: MessageSquare, label: '대화 분석', desc: '대화 로그 검토', href: '/analysis' },
  { icon: Settings, label: '설정', desc: '시스템 환경 설정', href: '/settings' },
];

const helpLinks = [
  { icon: FileText, label: '사용 가이드', href: '/docs' },
  { icon: HelpCircle, label: '도움말', href: '/help' },
];

export default function DashboardHero5() {
  const currentHour = new Date().getHours();
  const timeOfDay = currentHour < 12 ? '아침' : currentHour < 18 ? '오후' : '저녁';

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-white flex flex-col">
      {/* Main Content - Centered */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Greeting */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              좋은 {timeOfDay}입니다
            </div>
            <h1 className="text-3xl md:text-4xl font-light text-slate-800 tracking-tight">무엇을 도와드릴까요?</h1>
          </div>

          {/* Primary Action */}
          <Card className="mb-8 border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white hover:border-blue-200 transition-colors cursor-pointer group">
            <CardContent className="p-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-105 transition-transform">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">봇 관리</h2>
              <p className="text-slate-500 mb-6">챗봇을 생성하고 관리하세요</p>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Play className="w-4 h-4 mr-2" />
                봇 관리로 이동
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            {secondaryActions.map((action, idx) => (
              <a key={idx} href={action.href} className="group p-5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-center">
                <action.icon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 mx-auto mb-3 transition-colors" />
                <h3 className="text-sm font-medium text-slate-700 mb-1">{action.label}</h3>
                <p className="text-xs text-slate-500">{action.desc}</p>
              </a>
            ))}
          </div>

          {/* Help Links */}
          <div className="flex items-center justify-center gap-6 text-sm">
            {helpLinks.map((link, idx) => (
              <a key={idx} href={link.href} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors">
                <link.icon className="w-4 h-4" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-slate-400">
          <span>NLU Bot Admin v2.0</span>
          <span>마지막 접속: 오늘 09:15</span>
        </div>
      </footer>
    </div>
  );
}
