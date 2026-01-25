/**
 * 메인 화면 - Hero Style 6 (Dark Cyber)
 * 다크 사이버/테크 스타일
 * 네온 악센트 + AI/사이버 이미지
 */

import { Activity, ArrowRight, Bot, BrainCircuit, Cpu, MessageSquare, Network, Sparkles, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const stats = [
  { icon: Bot, value: '150+', label: '활성 봇' },
  { icon: MessageSquare, value: '10M+', label: '처리 대화' },
  { icon: Cpu, value: '99.9%', label: '가동률' },
  { icon: Activity, value: '<30ms', label: '응답속도' },
];

const features = [
  {
    icon: BrainCircuit,
    title: '딥러닝 NLU',
    description: '최신 트랜스포머 기반 자연어 이해',
    glow: 'shadow-cyan-500/50',
  },
  {
    icon: Network,
    title: '분산 처리',
    description: '엔터프라이즈급 확장성',
    glow: 'shadow-violet-500/50',
  },
  {
    icon: Zap,
    title: '실시간 분석',
    description: '즉각적인 인사이트 제공',
    glow: 'shadow-emerald-500/50',
  },
];

export default function MainHero6() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-[#0a0a0f] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Background Image */}
        <img src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&q=80" alt="Data Center" className="absolute inset-0 w-full h-full object-cover opacity-20" />

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f]" />

        {/* Glow Effects */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          {/* Animated Badge */}
          <Badge className="mb-8 px-4 py-2 bg-cyan-500/10 text-cyan-400 border-cyan-500/30 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            <span className="relative">
              NEXT-GEN AI PLATFORM
              <span className="absolute -right-2 top-0 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
            </span>
          </Badge>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-white">The Future of</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">NLU Intelligence</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            차세대 자연어 이해 플랫폼으로 AI 대화의 한계를 넘어서세요.
            <br />
            엔터프라이즈급 성능, 무한한 확장성.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="h-14 px-10 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25"
            >
              <Zap className="w-4 h-4 mr-2" />
              시작하기
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 border-slate-700 text-slate-300 hover:bg-slate-800/50 rounded-xl backdrop-blur-sm">
              라이브 데모
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="relative group p-6 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm hover:border-cyan-500/50 transition-colors">
                <stat.icon className="w-6 h-6 text-cyan-400 mb-3 mx-auto" />
                <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>

                {/* Hover Glow */}
                <div className="absolute inset-0 rounded-2xl bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          {features.map((feature, index) => (
            <Card
              key={index}
              className={`
                relative overflow-hidden bg-slate-900/80 border-slate-800 backdrop-blur-md
                hover:border-slate-700 transition-all duration-300 hover:-translate-y-1
                shadow-xl ${feature.glow}
              `}
            >
              <CardContent className="p-8">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </CardContent>

              {/* Corner Accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/10 to-transparent" />
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-sm text-slate-400">시스템 정상 운영 중</span>
            <span className="text-slate-600">|</span>
            <span className="text-sm text-cyan-400 font-medium">지금 바로 연결하기 →</span>
          </div>
        </div>
      </div>

      {/* Animated Particles Effect (CSS only) */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-15px) translateX(3px); }
        }
      `}</style>
    </div>
  );
}
