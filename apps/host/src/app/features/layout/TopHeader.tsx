import { useNavigate } from 'react-router-dom';
import UserMenuSelector from '../../components/UserMenuSelector';
import GlobalSearch from '../search/components/GlobalSearch';

export const TOP_HEADER_HEIGHT = 56;

export default function TopHeader() {
  const navigate = useNavigate();

  return (
    <div style={{ height: TOP_HEADER_HEIGHT }} className="relative shrink-0 bg-[var(--color-bt-primary)] text-white border-b border-white/10">
      {/* 좌측: 로고 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center">
        <img src="/assets/images/ci-white-en.svg" alt="CI" className="h-8 w-auto object-contain cursor-pointer" onClick={() => navigate('/')} />
      </div>

      {/* 정중앙: 통합 검색 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(480px,calc(100%-440px))]">
        <GlobalSearch />
      </div>

      {/* 우측: 유저 메뉴 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        <UserMenuSelector />
      </div>
    </div>
  );
}
