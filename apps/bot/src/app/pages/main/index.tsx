/**
 * 메인 화면 - 디자인 스위처
 * 다양한 메인 화면 디자인 변형을 스위치 버튼으로 전환
 *
 * 디자인 변형:
 * 1. Corporate Tech - 전문적인 기업용 스타일
 * 2. Split Editorial - 에디토리얼 분할 레이아웃
 * 3. Card Grid Modern - 모던 카드 그리드
 * 4. Immersive Fullscreen - 몰입형 풀스크린
 * 5. Minimal White - 미니멀 화이트
 * 6. Dark Cyber - 다크 사이버/테크
 */

import { Suspense, lazy, useState } from 'react';
import { Palette } from 'lucide-react';

// Lazy load all main hero variants
const MainHero1 = lazy(() => import('./MainHero1'));
const MainHero2 = lazy(() => import('./MainHero2'));
const MainHero3 = lazy(() => import('./MainHero3'));
const MainHero4 = lazy(() => import('./MainHero4'));
const MainHero5 = lazy(() => import('./MainHero5'));
const MainHero6 = lazy(() => import('./MainHero6'));

type MainVariant = 'hero1' | 'hero2' | 'hero3' | 'hero4' | 'hero5' | 'hero6';

interface VariantOption {
  id: MainVariant;
  label: string;
  subtitle: string;
  color: string;
}

const variants: VariantOption[] = [
  { id: 'hero1', label: 'Corporate Tech', subtitle: '전문적 기업용', color: '#3B82F6' },
  { id: 'hero2', label: 'Split Editorial', subtitle: '에디토리얼 분할', color: '#6366F1' },
  { id: 'hero3', label: 'Card Grid', subtitle: '모던 카드 그리드', color: '#0EA5E9' },
  { id: 'hero4', label: 'Fullscreen', subtitle: '몰입형 풀스크린', color: '#8B5CF6' },
  { id: 'hero5', label: 'Minimal White', subtitle: '미니멀 화이트', color: '#64748B' },
  { id: 'hero6', label: 'Dark Cyber', subtitle: '다크 사이버', color: '#06B6D4' },
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

export default function MainSwitcher() {
  const [currentVariant, setCurrentVariant] = useState<MainVariant>('hero1');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentOption = variants.find((v) => v.id === currentVariant) || variants[0];

  const renderMainComponent = () => {
    switch (currentVariant) {
      case 'hero1':
        return <MainHero1 />;
      case 'hero2':
        return <MainHero2 />;
      case 'hero3':
        return <MainHero3 />;
      case 'hero4':
        return <MainHero4 />;
      case 'hero5':
        return <MainHero5 />;
      case 'hero6':
        return <MainHero6 />;
      default:
        return <MainHero1 />;
    }
  };

  // Determine if we need light or dark icons based on variant
  const isDarkVariant = ['hero3', 'hero4', 'hero6'].includes(currentVariant);

  return (
    <div className="relative w-full h-full">
      {/* Main component */}
      <Suspense fallback={<LoadingSpinner />}>{renderMainComponent()}</Suspense>

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
                  메인 화면 디자인
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
