/**
 * 메인 화면 - Hero Style 5 (Minimal White)
 * 미니멀 화이트 스타일
 * 깔끔한 타이포그래피 중심 + 섬세한 디테일
 */

import { ArrowRight, Bot, Brain, ChartLine, Check, MessageSquare, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const features = [{ text: '자연어 이해 모델 관리' }, { text: '인텐트 및 엔티티 분석' }, { text: '대화 흐름 설계' }, { text: '실시간 성능 모니터링' }];

const capabilities = [
  { icon: Bot, title: '봇 관리', desc: '생성, 설정, 배포' },
  { icon: Brain, title: 'NLU 학습', desc: '모델 훈련 및 최적화' },
  { icon: MessageSquare, title: '대화 분석', desc: '패턴 및 인사이트' },
  { icon: ChartLine, title: '성능 추적', desc: '지표 및 리포트' },
];

export default function MainHero5() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full bg-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            {/* Badge */}
            <Badge variant="outline" className="mb-8 px-4 py-2 text-sm font-medium border-slate-200 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-blue-500" />
              AI-Powered Platform
            </Badge>

            {/* Heading */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mb-6 tracking-tight">
              대화 AI의
              <br />
              <span className="text-blue-600">핵심을 관리하다</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-slate-600 leading-relaxed mb-8 max-w-md">
              NLU Bot Admin과 함께 자연어 이해 모델을 쉽고 효과적으로 관리하세요. 복잡한 AI를 단순하게 다룹니다.
            </p>

            {/* Feature List */}
            <ul className="space-y-3 mb-10">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-slate-700">{feature.text}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="flex items-center gap-4">
              <Button size="lg" className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white">
                시작하기
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="ghost" className="h-12 px-6 text-slate-600">
                자세히 알아보기
              </Button>
            </div>
          </div>

          {/* Right - Image with Overlay */}
          <div className="relative">
            {/* Main Image Container */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200">
              <img src="https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&q=80" alt="AI Assistant" className="w-full aspect-[4/3] object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

              {/* Overlay Content */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">NLU 모델 준비 완료</div>
                      <div className="text-sm text-slate-500">99.7% 정확도로 대화를 이해합니다</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-2xl -z-10" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-slate-100 rounded-2xl -z-10" />
          </div>
        </div>
      </div>

      {/* Capabilities Section */}
      <div className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {capabilities.map((cap, index) => (
              <div key={index} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <cap.icon className="w-6 h-6 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{cap.title}</h3>
                <p className="text-sm text-slate-500">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Banner */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-slate-900 rounded-3xl p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">지금 바로 시작하세요</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">무료 체험으로 NLU Bot Admin의 모든 기능을 경험해보세요.</p>
          <Button size="lg" className="h-12 px-8 bg-white text-slate-900 hover:bg-slate-100">
            무료로 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
