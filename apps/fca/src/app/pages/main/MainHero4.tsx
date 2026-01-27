/**
 * 메인 화면 - Hero Style 4 (Immersive Fullscreen)
 * 몰입형 풀스크린 스타일
 * 대형 배경 이미지 + 중앙 오버레이 텍스트
 */

import { ArrowRight, Bot, ChevronDown, Cpu, MessageSquare, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const highlights = [
  { icon: Bot, label: '스마트 챗봇', value: '50+' },
  { icon: Cpu, label: 'AI 모델', value: '12종' },
  { icon: MessageSquare, label: '일간 대화', value: '1M+' },
  { icon: TrendingUp, label: '성공률', value: '98%' },
];

export default function MainHero4() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full relative flex flex-col">
      {/* Full Screen Background */}
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1800&q=80" alt="AI Neural Network" className="w-full h-full object-cover" />
        {/* Multi-layer Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 via-slate-900/80 to-slate-900/95" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]" />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Floating Badge */}
        <div className="mb-8 animate-pulse">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Next-Gen NLU Platform</span>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-center text-white mb-8 leading-[1.1]">
          <span className="block">Intelligent</span>
          <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Conversations</span>
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-slate-300 text-center max-w-3xl mb-12 leading-relaxed">
          자연어의 본질을 이해하는 AI로
          <br className="hidden md:block" />
          비즈니스 커뮤니케이션의 새 시대를 열어갑니다
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Button size="lg" className="h-14 px-10 bg-white text-slate-900 hover:bg-slate-100 font-semibold text-lg rounded-full shadow-2xl shadow-white/20">
            시작하기
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-10 border-white/30 text-white hover:bg-white/10 font-medium text-lg rounded-full backdrop-blur-sm">
            데모 영상 보기
          </Button>
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
          {highlights.map((item, index) => (
            <div key={index} className="text-center px-6 py-4 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <item.icon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-bold text-white">{item.value}</div>
              <div className="text-sm text-slate-400">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="relative pb-8 flex justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400 animate-bounce">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-violet-500/20 rounded-full blur-[100px]" />

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 to-transparent" />
    </div>
  );
}
