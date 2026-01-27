/**
 * 메인 화면 - Hero Style 2 (Split Editorial)
 * 에디토리얼 매거진 스타일 분할 레이아웃
 * 왼쪽: 브랜딩 텍스트, 오른쪽: AI 이미지
 */

import { ArrowRight, Bot, Cpu, MessagesSquare, Network, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const capabilities = [
  { icon: Bot, label: '챗봇 관리' },
  { icon: Cpu, label: 'NLU 엔진' },
  { icon: MessagesSquare, label: '대화 분석' },
  { icon: Network, label: '모델 배포' },
];

export default function MainHero2() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex">
      {/* Left Side - Content */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 py-16 bg-white">
        <div className="max-w-xl">
          {/* Brand Tag */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-500 tracking-widest uppercase">NLU Bot Admin</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 leading-[1.1] mb-6">
            대화의 미래를
            <br />
            <span className="text-blue-600">설계합니다</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            자연어 이해 기술로 사람처럼 대화하는 AI를 만드세요. 인텐트 분석부터 엔티티 추출, 대화 흐름 설계까지 모든 것을 하나의 플랫폼에서.
          </p>

          {/* Capability Pills */}
          <div className="flex flex-wrap gap-3 mb-10">
            {capabilities.map((cap, index) => (
              <Badge key={index} variant="secondary" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-default">
                <cap.icon className="w-4 h-4 mr-2 text-blue-600" />
                {cap.label}
              </Badge>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Button size="lg" className="h-14 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-full">
              플랫폼 시작하기
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="ghost" className="h-14 px-6 text-slate-600 hover:text-slate-900">
              데모 보기
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 pt-8 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-4">신뢰할 수 있는 엔터프라이즈 솔루션</p>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">150+</div>
                <div className="text-xs text-slate-500">기업 고객</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">10M+</div>
                <div className="text-xs text-slate-500">월간 대화</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">99.9%</div>
                <div className="text-xs text-slate-500">가동률</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        {/* Main Image */}
        <img src="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80" alt="AI Robot" className="absolute inset-0 w-full h-full object-cover" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-transparent to-blue-900/20" />

        {/* Floating Cards */}
        <div className="absolute bottom-12 left-12 right-12 space-y-4">
          {/* Status Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl max-w-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">NLU 모델 활성</div>
                <div className="text-xs text-slate-500">3개 봇 운영 중</div>
              </div>
              <div className="ml-auto">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Analytics Preview */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl max-w-xs ml-auto">
            <div className="text-xs text-slate-500 mb-2">오늘의 대화 분석</div>
            <div className="flex items-end gap-1 h-12">
              {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="text-lg font-bold text-slate-900 mt-2">2,847 대화</div>
          </div>
        </div>

        {/* Corner Badge */}
        <div className="absolute top-8 right-8">
          <Badge className="bg-blue-600 text-white px-4 py-2 text-sm font-medium shadow-lg">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Powered
          </Badge>
        </div>
      </div>
    </div>
  );
}
