import { useNavigate } from 'react-router-dom';
import { ChevronUp } from 'lucide-react';
import { useLayoutStore } from './hooks/useLayoutStore';
import UserMenuSelector from '../../components/UserMenuSelector';
import GlobalSearch from '../search/components/GlobalSearch';

export const TOP_HEADER_HEIGHT = 56;

export default function TopHeader() {
  const navigate = useNavigate();
  const toggleChrome = useLayoutStore((s) => s.toggleChrome);

  return (
    <div style={{ height: TOP_HEADER_HEIGHT }} className="relative shrink-0 bg-[var(--color-bt-primary)] text-white border-b border-white/10">
      {/* 좌측: 로고 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
        <img src="/assets/images/ci-white.svg" alt="CI" className="h-8 w-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
      </div>

      {/* 정중앙: 통합 검색 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(400px,calc(100%-440px))]">
        <GlobalSearch />
      </div>

      {/* 우측: 유저 메뉴 + 헤더 접기 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <UserMenuSelector />
        <span aria-hidden className="h-5 w-px bg-white/20" />
        <button
          type="button"
          onClick={toggleChrome}
          className="inline-flex items-center justify-center size-8 rounded-md text-white/85 hover:bg-white/15 hover:text-white cursor-pointer transition-colors"
          aria-label="헤더 접기"
          title="헤더 접기"
        >
          <ChevronUp className="size-4" />
        </button>
      </div>
    </div>
  );
}
