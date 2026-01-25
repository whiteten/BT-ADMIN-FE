/**
 * 로그인 페이지 - 디자인 스위처
 * 다양한 디자인 버전을 스위치 버튼으로 전환
 *
 * 카테고리:
 * - Original (10개): Default, Glassmorphism, Editorial, Brutalist, Corporate Blue, Emerald Business, Slate Professional, Rose Enterprise, Amber Commerce, Violet Innovation
 * - Minimal (3개): Swiss, Zen, Scandinavian
 * - Tech (3개): Neural, Matrix, Hologram
 * - Illustration (10개): Geometric, Network, Circuit, Cosmos, Serene Peaks, Architectural, Golden Hour, Deep Ocean, Northern Lights, Desert Dunes
 * - Dark (3개): Luxury, Cyberpunk, Space
 */

import { Suspense, lazy, useState } from 'react';
import { Palette } from 'lucide-react';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

// Lazy load all login variants
const LoginOriginal = lazy(() => import('../Login'));

// Original variants
const LoginOriginal2 = lazy(() => import('./LoginOriginal2'));
const LoginOriginal3 = lazy(() => import('./LoginOriginal3'));
const LoginOriginal4 = lazy(() => import('./LoginOriginal4'));
const LoginOriginal5 = lazy(() => import('./LoginOriginal5'));
const LoginOriginal6 = lazy(() => import('./LoginOriginal6'));
const LoginOriginal7 = lazy(() => import('./LoginOriginal7'));
const LoginOriginal8 = lazy(() => import('./LoginOriginal8'));
const LoginOriginal9 = lazy(() => import('./LoginOriginal9'));
const LoginOriginal10 = lazy(() => import('./LoginOriginal10'));

// Minimal variants
const LoginMinimal = lazy(() => import('./LoginMinimal'));
const LoginMinimal2 = lazy(() => import('./LoginMinimal2'));
const LoginMinimal3 = lazy(() => import('./LoginMinimal3'));

// Tech variants
const LoginTech = lazy(() => import('./LoginTech'));
const LoginTech2 = lazy(() => import('./LoginTech2'));
const LoginTech3 = lazy(() => import('./LoginTech3'));

// Illustration variants
const LoginIllustration1 = lazy(() => import('./LoginIllustration1'));
const LoginIllustration2 = lazy(() => import('./LoginIllustration2'));
const LoginIllustration3 = lazy(() => import('./LoginIllustration3'));
const LoginIllustration4 = lazy(() => import('./LoginIllustration4'));
const LoginIllustration5 = lazy(() => import('./LoginIllustration5'));
const LoginIllustration6 = lazy(() => import('./LoginIllustration6'));
const LoginIllustration7 = lazy(() => import('./LoginIllustration7'));
const LoginIllustration8 = lazy(() => import('./LoginIllustration8'));
const LoginIllustration9 = lazy(() => import('./LoginIllustration9'));
const LoginIllustration10 = lazy(() => import('./LoginIllustration10'));

// Dark variants
const LoginDark = lazy(() => import('./LoginDark'));
const LoginDark2 = lazy(() => import('./LoginDark2'));
const LoginDark3 = lazy(() => import('./LoginDark3'));

type LoginVariant =
  | 'original'
  | 'original2'
  | 'original3'
  | 'original4'
  | 'original5'
  | 'original6'
  | 'original7'
  | 'original8'
  | 'original9'
  | 'original10'
  | 'minimal'
  | 'minimal2'
  | 'minimal3'
  | 'tech'
  | 'tech2'
  | 'tech3'
  | 'illustration1'
  | 'illustration2'
  | 'illustration3'
  | 'illustration4'
  | 'illustration5'
  | 'illustration6'
  | 'illustration7'
  | 'illustration8'
  | 'illustration9'
  | 'illustration10'
  | 'dark'
  | 'dark2'
  | 'dark3';

interface VariantOption {
  id: LoginVariant;
  label: string;
  subtitle: string;
  color: string;
  category: 'original' | 'minimal' | 'tech' | 'illustration' | 'dark';
}

const variants: VariantOption[] = [
  // Original
  { id: 'original', label: 'Original', subtitle: 'Default', color: '#3B82F6', category: 'original' },
  { id: 'original2', label: 'Original 2', subtitle: 'Glassmorphism', color: '#2563EB', category: 'original' },
  { id: 'original3', label: 'Original 3', subtitle: 'Editorial', color: '#1E40AF', category: 'original' },
  { id: 'original4', label: 'Original 4', subtitle: 'Brutalist', color: '#1E3A8A', category: 'original' },
  { id: 'original5', label: 'Original 5', subtitle: 'Corporate Blue', color: '#1E3A8A', category: 'original' },
  { id: 'original6', label: 'Original 6', subtitle: 'Emerald Business', color: '#059669', category: 'original' },
  { id: 'original7', label: 'Original 7', subtitle: 'Slate Pro', color: '#475569', category: 'original' },
  { id: 'original8', label: 'Original 8', subtitle: 'Rose Enterprise', color: '#E11D48', category: 'original' },
  { id: 'original9', label: 'Original 9', subtitle: 'Amber Commerce', color: '#D97706', category: 'original' },
  { id: 'original10', label: 'Original 10', subtitle: 'Violet Innovation', color: '#7C3AED', category: 'original' },

  // Minimal
  { id: 'minimal', label: 'Minimal 1', subtitle: 'Swiss Design', color: '#6B7280', category: 'minimal' },
  { id: 'minimal2', label: 'Minimal 2', subtitle: 'Zen / 禅', color: '#78716C', category: 'minimal' },
  { id: 'minimal3', label: 'Minimal 3', subtitle: 'Scandinavian', color: '#A8A29E', category: 'minimal' },

  // Tech
  { id: 'tech', label: 'Tech 1', subtitle: 'Neural Network', color: '#6366F1', category: 'tech' },
  { id: 'tech2', label: 'Tech 2', subtitle: 'Matrix Rain', color: '#22C55E', category: 'tech' },
  { id: 'tech3', label: 'Tech 3', subtitle: 'Hologram', color: '#06B6D4', category: 'tech' },

  // Illustration
  { id: 'illustration1', label: 'Illust 1', subtitle: 'Geometric', color: '#1E40AF', category: 'illustration' },
  { id: 'illustration2', label: 'Illust 2', subtitle: 'Network', color: '#0C1222', category: 'illustration' },
  { id: 'illustration3', label: 'Illust 3', subtitle: 'Circuit', color: '#0D9488', category: 'illustration' },
  { id: 'illustration4', label: 'Illust 4', subtitle: 'Cosmos', color: '#6366F1', category: 'illustration' },
  { id: 'illustration5', label: 'Illust 5', subtitle: 'Serene Peaks', color: '#0D9488', category: 'illustration' },
  { id: 'illustration6', label: 'Illust 6', subtitle: 'Architectural', color: '#171717', category: 'illustration' },
  { id: 'illustration7', label: 'Illust 7', subtitle: 'Golden Hour', color: '#D97706', category: 'illustration' },
  { id: 'illustration8', label: 'Illust 8', subtitle: 'Deep Ocean', color: '#06B6D4', category: 'illustration' },
  { id: 'illustration9', label: 'Illust 9', subtitle: 'Northern Lights', color: '#8B5CF6', category: 'illustration' },
  { id: 'illustration10', label: 'Illust 10', subtitle: 'Desert Dunes', color: '#D97706', category: 'illustration' },

  // Dark
  { id: 'dark', label: 'Dark 1', subtitle: 'Luxury Noir', color: '#A855F7', category: 'dark' },
  { id: 'dark2', label: 'Dark 2', subtitle: 'Cyberpunk', color: '#FF00FF', category: 'dark' },
  { id: 'dark3', label: 'Dark 3', subtitle: 'Space', color: '#818CF8', category: 'dark' },
];

const categoryColors = {
  original: '#3B82F6',
  minimal: '#78716C',
  tech: '#6366F1',
  illustration: '#0D9488',
  dark: '#A855F7',
};

export default function LoginSwitcher() {
  const [currentVariant, setCurrentVariant] = useState<LoginVariant>('original');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const currentOption = variants.find((v) => v.id === currentVariant) ?? variants[0];

  const renderLoginComponent = () => {
    switch (currentVariant) {
      // Original variants
      case 'original2':
        return <LoginOriginal2 />;
      case 'original3':
        return <LoginOriginal3 />;
      case 'original4':
        return <LoginOriginal4 />;
      case 'original5':
        return <LoginOriginal5 />;
      case 'original6':
        return <LoginOriginal6 />;
      case 'original7':
        return <LoginOriginal7 />;
      case 'original8':
        return <LoginOriginal8 />;
      case 'original9':
        return <LoginOriginal9 />;
      case 'original10':
        return <LoginOriginal10 />;

      // Minimal
      case 'minimal':
        return <LoginMinimal />;
      case 'minimal2':
        return <LoginMinimal2 />;
      case 'minimal3':
        return <LoginMinimal3 />;

      // Tech
      case 'tech':
        return <LoginTech />;
      case 'tech2':
        return <LoginTech2 />;
      case 'tech3':
        return <LoginTech3 />;

      // Illustration
      case 'illustration1':
        return <LoginIllustration1 />;
      case 'illustration2':
        return <LoginIllustration2 />;
      case 'illustration3':
        return <LoginIllustration3 />;
      case 'illustration4':
        return <LoginIllustration4 />;
      case 'illustration5':
        return <LoginIllustration5 />;
      case 'illustration6':
        return <LoginIllustration6 />;
      case 'illustration7':
        return <LoginIllustration7 />;
      case 'illustration8':
        return <LoginIllustration8 />;
      case 'illustration9':
        return <LoginIllustration9 />;
      case 'illustration10':
        return <LoginIllustration10 />;

      // Dark
      case 'dark':
        return <LoginDark />;
      case 'dark2':
        return <LoginDark2 />;
      case 'dark3':
        return <LoginDark3 />;

      // Original
      default:
        return <LoginOriginal />;
    }
  };

  // Determine if we need light or dark icons based on variant
  const isDarkVariant = [
    'tech',
    'tech2',
    'tech3',
    'dark',
    'dark2',
    'dark3',
    'illustration2',
    'illustration3',
    'illustration4',
    'illustration8',
    'illustration9',
    'original5',
    'original6',
    'original7',
    'original8',
    'original9',
    'original10',
  ].includes(currentVariant);

  // Group variants by category for display
  const groupedVariants = {
    original: variants.filter((v) => v.category === 'original'),
    minimal: variants.filter((v) => v.category === 'minimal'),
    tech: variants.filter((v) => v.category === 'tech'),
    illustration: variants.filter((v) => v.category === 'illustration'),
    dark: variants.filter((v) => v.category === 'dark'),
  };

  return (
    <div className="relative w-full h-full">
      {/* Login component */}
      <Suspense fallback={<FallbackSpinner useFullScreen />}>{renderLoginComponent()}</Suspense>

      {/* Theme switcher button - fixed position */}
      <div className="fixed top-4 right-4 z-50">
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
                  absolute top-full right-0 mt-2 w-64 rounded-xl overflow-hidden z-50
                  shadow-2xl border max-h-[80vh] overflow-y-auto
                  ${isDarkVariant ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'}
                `}
              >
                {/* Original */}
                <CategorySection title="Original" color={categoryColors.original} isDark={isDarkVariant}>
                  {groupedVariants.original.map((variant) => (
                    <VariantButton
                      key={variant.id}
                      variant={variant}
                      isSelected={currentVariant === variant.id}
                      isDark={isDarkVariant}
                      onClick={() => {
                        setCurrentVariant(variant.id);
                        setIsMenuOpen(false);
                      }}
                    />
                  ))}
                </CategorySection>

                {/* Minimal */}
                <CategorySection title="Minimal" color={categoryColors.minimal} isDark={isDarkVariant}>
                  {groupedVariants.minimal.map((variant) => (
                    <VariantButton
                      key={variant.id}
                      variant={variant}
                      isSelected={currentVariant === variant.id}
                      isDark={isDarkVariant}
                      onClick={() => {
                        setCurrentVariant(variant.id);
                        setIsMenuOpen(false);
                      }}
                    />
                  ))}
                </CategorySection>

                {/* Tech */}
                <CategorySection title="Tech / AI" color={categoryColors.tech} isDark={isDarkVariant}>
                  {groupedVariants.tech.map((variant) => (
                    <VariantButton
                      key={variant.id}
                      variant={variant}
                      isSelected={currentVariant === variant.id}
                      isDark={isDarkVariant}
                      onClick={() => {
                        setCurrentVariant(variant.id);
                        setIsMenuOpen(false);
                      }}
                    />
                  ))}
                </CategorySection>

                {/* Illustration */}
                <CategorySection title="Illustration" color={categoryColors.illustration} isDark={isDarkVariant}>
                  {groupedVariants.illustration.map((variant) => (
                    <VariantButton
                      key={variant.id}
                      variant={variant}
                      isSelected={currentVariant === variant.id}
                      isDark={isDarkVariant}
                      onClick={() => {
                        setCurrentVariant(variant.id);
                        setIsMenuOpen(false);
                      }}
                    />
                  ))}
                </CategorySection>

                {/* Dark */}
                <CategorySection title="Dark Mode" color={categoryColors.dark} isDark={isDarkVariant}>
                  {groupedVariants.dark.map((variant) => (
                    <VariantButton
                      key={variant.id}
                      variant={variant}
                      isSelected={currentVariant === variant.id}
                      isDark={isDarkVariant}
                      onClick={() => {
                        setCurrentVariant(variant.id);
                        setIsMenuOpen(false);
                      }}
                    />
                  ))}
                </CategorySection>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Category section component
function CategorySection({ title, color, isDark, children }: { title: string; color: string; isDark: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-t ${isDark ? 'border-zinc-700 text-zinc-500' : 'border-gray-100 text-gray-400'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          {title}
        </div>
      </div>
      <div className="p-2 pt-0">{children}</div>
    </div>
  );
}

// Variant button component
function VariantButton({ variant, isSelected, isDark, onClick }: { variant: VariantOption; isSelected: boolean; isDark: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
        ${isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-gray-50 text-gray-700'}
        ${isSelected ? (isDark ? 'bg-zinc-800' : 'bg-gray-50') : ''}
      `}
    >
      {/* Color indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{
          backgroundColor: variant.color,
          boxShadow: isSelected ? `0 0 0 2px ${isDark ? '#18181B' : 'white'}, 0 0 0 4px ${variant.color}` : 'none',
        }}
      />

      {/* Label and subtitle */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{variant.label}</div>
        <div className={`text-xs truncate ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{variant.subtitle}</div>
      </div>

      {/* Check mark */}
      {isSelected && (
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
