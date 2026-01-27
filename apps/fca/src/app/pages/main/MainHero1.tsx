/**
 * 메인 화면 - Hero Style 1 (Corporate Tech)
 * 전문적이고 신뢰감 있는 기업용 스타일
 * 블루 그라데이션 + AI 테크 이미지 + 기능 카드
 */

import { Bot, Brain, LineChart, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Bot,
    title: '봇 관리',
    description: '챗봇 생성, 설정, 배포를 한 곳에서',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Brain,
    title: 'NLU 모델',
    description: '자연어 이해 모델 학습 및 관리',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: MessageSquare,
    title: '대화 분석',
    description: '인텐트, 엔티티 분석 및 최적화',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: LineChart,
    title: '성능 모니터링',
    description: '실시간 성능 지표 및 인사이트',
    color: 'from-orange-500 to-amber-500',
  },
];

export default function MainHero1() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80" alt="AI Technology" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white" />
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm font-medium border-blue-200 bg-blue-50/80 text-blue-700 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              AI-Powered NLU Platform
            </Badge>

            {/* Heading */}
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              <span className="block">자연어 이해의</span>
              <span className="block mt-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">새로운 기준</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              NLU Bot Admin과 함께 더 스마트한 대화 경험을 설계하세요.
              <br />
              AI 기반 자연어 처리로 고객과의 소통을 혁신합니다.
            </p>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-4 mb-16">
              <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25">
                <Zap className="w-4 h-4 mr-2" />
                시작하기
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 border-slate-300 hover:bg-slate-50">
                더 알아보기
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-12 text-center">
              <div>
                <div className="text-3xl font-bold text-slate-900">99.7%</div>
                <div className="text-sm text-slate-500 mt-1">인텐트 정확도</div>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div>
                <div className="text-3xl font-bold text-slate-900">50ms</div>
                <div className="text-sm text-slate-500 mt-1">평균 응답 속도</div>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div>
                <div className="text-3xl font-bold text-slate-900">24/7</div>
                <div className="text-sm text-slate-500 mt-1">무중단 운영</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">핵심 기능</h2>
          <p className="text-slate-600">엔터프라이즈급 NLU 관리를 위한 모든 도구</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-0 bg-white shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </CardContent>
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-600 p-12 text-center">
          <div className="absolute inset-0 opacity-10">
            <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1600&q=80" alt="AI Background" className="w-full h-full object-cover" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold text-white mb-4">지금 바로 시작하세요</h2>
            <p className="text-blue-100 mb-8 max-w-xl mx-auto">
              NLU Bot Admin으로 AI 기반 대화 서비스를 구축하고
              <br />
              고객 경험을 한 단계 업그레이드하세요.
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
              무료로 시작하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
