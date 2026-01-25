/**
 * 메인 화면 - Hero Style 3 (Card Grid Modern)
 * 모던 카드 그리드 스타일
 * 배경 이미지 + 기능별 카드 그리드
 */

import { ArrowUpRight, Bot, Brain, ChartBar, Code2, MessageCircle, Settings2, Workflow, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const featureCards = [
  {
    icon: Bot,
    title: '봇 빌더',
    description: '드래그 앤 드롭으로 쉽게 챗봇을 설계하고 배포하세요.',
    gradient: 'from-blue-500 to-blue-600',
    size: 'large',
  },
  {
    icon: Brain,
    title: 'NLU 엔진',
    description: '최신 AI로 자연어를 이해합니다.',
    gradient: 'from-violet-500 to-purple-600',
    size: 'small',
  },
  {
    icon: MessageCircle,
    title: '인텐트 분석',
    description: '사용자 의도를 정확히 파악합니다.',
    gradient: 'from-cyan-500 to-teal-600',
    size: 'small',
  },
  {
    icon: Code2,
    title: '엔티티 추출',
    description: '핵심 정보를 자동으로 추출하고 분류합니다.',
    gradient: 'from-orange-500 to-red-500',
    size: 'small',
  },
  {
    icon: Workflow,
    title: '대화 흐름',
    description: '복잡한 대화 시나리오도 직관적으로 설계하세요.',
    gradient: 'from-emerald-500 to-green-600',
    size: 'small',
  },
  {
    icon: ChartBar,
    title: '분석 대시보드',
    description: '실시간 성능 지표와 사용자 인사이트를 한눈에.',
    gradient: 'from-pink-500 to-rose-600',
    size: 'large',
  },
];

export default function MainHero3() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80" alt="Technology Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-900/95" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-blue-500/20 text-blue-300 border-blue-500/30 px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 mr-2" />
            Enterprise NLU Platform
          </Badge>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            AI가 대화를 이해하는 방식을
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">재정의합니다</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">NLU Bot Admin은 자연어 처리의 모든 것을 제공합니다. 직관적인 인터페이스로 복잡한 AI를 쉽게 다루세요.</p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((feature, index) => (
            <Card
              key={index}
              className={`
                group relative overflow-hidden bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20
                transition-all duration-300 hover:-translate-y-1
                ${feature.size === 'large' ? 'md:col-span-2 lg:col-span-1' : ''}
              `}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-lg text-white mb-2">{feature.title}</CardTitle>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </CardContent>

              {/* Hover Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-2 pl-6">
            <span className="text-white font-medium">지금 바로 시작하세요</span>
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/25">
              무료 체험
            </button>
          </div>
        </div>

        {/* Decorative Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '99.7%', label: '정확도' },
            { value: '<50ms', label: '응답속도' },
            { value: '10M+', label: '월간 대화' },
            { value: '24/7', label: '운영 시간' },
          ].map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
