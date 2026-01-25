/**
 * 대시보드 - 디자인 스위처
 * B2B 엔터프라이즈 관리자용 업무 허브 디자인 변형
 *
 * 디자인 변형:
 * 1. Swiss Precision - 스위스 그래픽 디자인 영감의 미니멀 업무 허브
 * 2. Warm Professional - 따뜻한 톤의 전문적 카드 레이아웃
 * 3. Command Center - 좌측 패널 + 우측 작업 영역
 * 4. Widget Dashboard - 모듈형 위젯 배치 스타일
 * 5. Focus Mode - 단일 주요 액션 강조
 * 6. Night Shift - 다크 모드 업무용
 * 7. Monitoring - 기존 모니터링 대시보드
 */

import { Suspense, lazy, useState } from 'react';
import { Palette } from 'lucide-react';

// Lazy load all dashboard variants
const DashboardHero1 = lazy(() => import('./DashboardHero1'));
const DashboardHero2 = lazy(() => import('./DashboardHero2'));
const DashboardHero3 = lazy(() => import('./DashboardHero3'));
const DashboardHero4 = lazy(() => import('./DashboardHero4'));
const DashboardHero5 = lazy(() => import('./DashboardHero5'));
const DashboardHero6 = lazy(() => import('./DashboardHero6'));
const DashboardMonitoring = lazy(() => import('./Dashboard'));

type DashboardVariant = 'hero1' | 'hero2' | 'hero3' | 'hero4' | 'hero5' | 'hero6' | 'monitoring';

interface VariantOption {
  id: DashboardVariant;
  label: string;
  subtitle: string;
  color: string;
}

const variants: VariantOption[] = [
  { id: 'hero1', label: 'Swiss Precision', subtitle: '미니멀 업무 허브', color: '#78716C' },
  { id: 'hero2', label: 'Warm Professional', subtitle: '따뜻한 카드 레이아웃', color: '#F59E0B' },
  { id: 'hero3', label: 'Command Center', subtitle: '사이드바 스타일', color: '#1E293B' },
  { id: 'hero4', label: 'Widget Dashboard', subtitle: '위젯 대시보드', color: '#3B82F6' },
  { id: 'hero5', label: 'Focus Mode', subtitle: '중앙 집중형', color: '#6366F1' },
  { id: 'hero6', label: 'Night Shift', subtitle: '다크 모드', color: '#18181B' },
  { id: 'monitoring', label: 'Monitoring', subtitle: '시스템 모니터링', color: '#10B981' },
];

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-sm text-slate-500">로딩 중...</span>
      </div>
    </div>
  );
}

export default function DashboardSwitcher() {
  const [currentVariant, setCurrentVariant] = useState<DashboardVariant>('hero1');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentOption = variants.find((v) => v.id === currentVariant) || variants[0];

  const renderDashboardComponent = () => {
    switch (currentVariant) {
      case 'hero1':
        return <DashboardHero1 />;
      case 'hero2':
        return <DashboardHero2 />;
      case 'hero3':
        return <DashboardHero3 />;
      case 'hero4':
        return <DashboardHero4 />;
      case 'hero5':
        return <DashboardHero5 />;
      case 'hero6':
        return <DashboardHero6 />;
      case 'monitoring':
        return <DashboardMonitoring />;
      default:
        return <DashboardHero1 />;
    }
  };

  // Determine if we need light or dark icons based on variant
  const isDarkVariant = ['hero3', 'hero6'].includes(currentVariant);

  return (
    <div className="relative w-full h-full">
      {/* Dashboard component */}
      <Suspense fallback={<LoadingSpinner />}>{renderDashboardComponent()}</Suspense>

      {/* Theme switcher button - fixed position */}
      <div className="fixed top-20 right-4 z-50">
        <div className="relative">
          {/* Toggle button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl
              backdrop-blur-md transition-all duration-200
              ${isDarkVariant ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-black/5 hover:bg-black/10 text-gray-700 border border-black/10'}
              shadow-lg hover:shadow-xl
            `}
            title="디자인 변경"
          >
            <Palette className="w-4 h-4" />
            <span className="text-sm font-medium">{currentOption.label}</span>
            <svg className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

              {/* Menu */}
              <div
                className={`
                  absolute top-full right-0 mt-2 w-56 rounded-xl overflow-hidden z-50
                  shadow-2xl border
                  ${isDarkVariant ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}
                `}
              >
                <div
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b ${
                    isDarkVariant ? 'border-zinc-700 text-zinc-500' : 'border-gray-100 text-gray-400'
                  }`}
                >
                  대시보드 디자인
                </div>

                <div className="p-2">
                  {variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setCurrentVariant(variant.id);
                        setIsMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                        ${isDarkVariant ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-50 text-gray-700'}
                        ${currentVariant === variant.id ? (isDarkVariant ? 'bg-zinc-800' : 'bg-gray-50') : ''}
                      `}
                    >
                      {/* Color indicator */}
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: variant.color,
                          boxShadow: currentVariant === variant.id ? `0 0 0 2px ${isDarkVariant ? '#18181B' : 'white'}, 0 0 0 4px ${variant.color}` : 'none',
                        }}
                      />

                      {/* Label and subtitle */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{variant.label}</div>
                        <div className={`text-xs truncate ${isDarkVariant ? 'text-zinc-500' : 'text-gray-400'}`}>{variant.subtitle}</div>
                      </div>

                      {/* Check mark */}
                      {currentVariant === variant.id && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
