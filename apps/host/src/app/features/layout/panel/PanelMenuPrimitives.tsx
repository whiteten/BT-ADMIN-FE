import { useLocation } from 'react-router-dom';
import { SquareDashed } from 'lucide-react';
import { BookmarkButton } from '../components/BookmarkButton';
import { useMenuPanelStore } from '../hooks/useMenuPanelStore';
import type { MenuItem } from '@/libs/shared-store/src/types/menu.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

type LocationLike = { pathname: string; search: string };

/**
 * 메뉴 path가 현재 URL과 매치되는지 판단한다.
 * 기존 LNB MenuItem.tsx의 로직과 동일.
 */
export const isMenuActive = (menuPath: string, location: LocationLike, appId: string): boolean => {
  const prefix = `/${appId}/`;
  if (!location.pathname.startsWith(prefix)) return false;
  const relativePath = location.pathname.slice(prefix.length);

  const qIndex = menuPath.indexOf('?');
  const menuPathname = qIndex < 0 ? menuPath : menuPath.slice(0, qIndex);
  const menuSearch = qIndex < 0 ? '' : menuPath.slice(qIndex + 1);

  const pathnameMatched = menuPathname.endsWith('/list')
    ? relativePath === menuPathname.slice(0, -'/list'.length) || relativePath.startsWith(menuPathname.slice(0, -'/list'.length) + '/')
    : relativePath === menuPathname || relativePath.startsWith(menuPathname + '/');

  if (!pathnameMatched) return false;
  if (!menuSearch) return true;

  const menuParams = new URLSearchParams(menuSearch);
  const currentParams = new URLSearchParams(location.search);
  return [...menuParams].every(([k, v]) => currentParams.get(k) === v);
};

export const hasActiveDescendant = (item: MenuItem, location: LocationLike, appId: string): boolean => {
  if (item.path) return isMenuActive(item.path, location, appId);
  return item.children?.some((child) => hasActiveDescendant(child, location, appId)) ?? false;
};

/** 재귀적으로 검색어 매칭 여부 */
export const hasMatch = (menu: MenuItem, q: string): boolean => {
  if (menu.hide) return false;
  const lower = q.toLowerCase();
  if (menu.label.toLowerCase().includes(lower)) return true;
  return menu.children?.some((c) => hasMatch(c, lower)) ?? false;
};

/** 메뉴의 서브그룹(children이 있는 직계 자식) 수 — 카드 col-span 계산용 */
export const countSubgroups = (menu: MenuItem): number => {
  if (!menu.children?.length) return 1;
  const subs = menu.children.filter((c) => !c.hide && c.children?.length && !c.path);
  return subs.length > 1 ? subs.length : 1;
};

/** 검색 매칭 부분 하이라이트 */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-200/70 text-inherit rounded-sm px-px">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

interface MenuLinkProps {
  item: MenuItem;
  appId: string;
  query?: string;
  onNavigate: (path: string) => void;
  showDesc?: boolean;
}

/** 리프 메뉴 링크 — 패널 안에서 사용. 활성 상태 강조 + 북마크 버튼 노출 */
export function MenuLink({ item, appId, query = '', onNavigate, showDesc = false }: MenuLinkProps) {
  const location = useLocation();
  const isActive = item.path ? isMenuActive(item.path, location, appId) : false;
  const showDescRow = showDesc && !!item.desc;

  return (
    <div
      className={cn(
        'group/row relative flex items-center gap-2 rounded-lg px-2.5 py-2 -mx-1 cursor-pointer transition-colors',
        'hover:bg-[#f1f3f5]',
        isActive && 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-[var(--color-bt-primary)]',
      )}
      onClick={() => item.path && onNavigate(`/${appId}/${item.path}`)}
    >
      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <BookmarkButton menuKey={item.menuKey} label={item.label} path={item.path ?? ''} appId={appId} />
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[14px] truncate transition-colors', isActive ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-[#495057]')}>
          <Highlight text={item.label} query={query} />
        </p>
        {showDescRow && (
          <p className="text-[12px] text-[#868e96] mt-0.5 line-clamp-2">
            <Highlight text={item.desc as string} query={query} />
          </p>
        )}
      </div>
    </div>
  );
}

interface ChildListProps {
  items: MenuItem[];
  appId: string;
  query?: string;
  onNavigate: (path: string) => void;
  asGrid?: boolean;
  showDesc?: boolean;
}

/**
 * 자식 메뉴 재귀 렌더링.
 * - 모든 visible 자식이 children을 가진 서브그룹이면 grid 수평 배치(asGrid)
 * - leaf는 MenuLink, 하위 그룹은 라벨+ChildList 재귀
 */
export function ChildList({ items, appId, query = '', onNavigate, asGrid, showDesc = false }: ChildListProps) {
  const visible = items.filter((i) => !i.hide && (!query || hasMatch(i, query)));
  if (!visible.length) return null;

  const allSubgroups = visible.every((i) => i.children?.length && !i.path);

  if (asGrid && allSubgroups && visible.length > 1) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {visible.map((item) => (
          <div key={item.menuKey}>
            <p className="text-sm text-[#878a99] tracking-wider mb-1.5 mt-1">
              <Highlight text={item.label} query={query} />
            </p>
            <ChildList items={item.children ?? []} appId={appId} query={query} onNavigate={onNavigate} showDesc={showDesc} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {visible.map((item) => {
        if (item.path && !item.children?.length) {
          return <MenuLink key={item.menuKey} item={item} appId={appId} query={query} onNavigate={onNavigate} showDesc={showDesc} />;
        }
        if (item.children?.length) {
          return (
            <div key={item.menuKey} className="mt-2.5 first:mt-0">
              <p className="text-sm text-[#878a99] tracking-wider mb-1.5">
                <Highlight text={item.label} query={query} />
              </p>
              <ChildList items={item.children} appId={appId} query={query} onNavigate={onNavigate} showDesc={showDesc} />
            </div>
          );
        }
        // path도 children도 없는 항목 — 비활성 라벨 (북마크 비활성 + 전체 흐림)
        return (
          <div key={item.menuKey} className="flex items-center gap-2 rounded-lg px-2.5 py-2 -mx-1 cursor-default opacity-50">
            <span className="shrink-0">
              <BookmarkButton menuKey={item.menuKey} label={item.label} path="" appId={appId} disabled />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-[#495057] truncate">
                <Highlight text={item.label} query={query} />
              </p>
              {showDesc && item.desc && (
                <p className="text-[12px] text-[#868e96] mt-0.5 line-clamp-2">
                  <Highlight text={item.desc} query={query} />
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 패널 좌측의 1단계 메뉴 행.
 * - 폴더(children 있음): 클릭 시 activeMenuKey로 설정 → PanelDetail이 자식 표시
 * - leaf(path만 있음): 클릭 시 navigate
 */
interface PanelMenuRowProps {
  item: MenuItem;
  appId: string;
  onNavigate: (path: string) => void;
}

export function PanelMenuRow({ item, appId, onNavigate }: PanelMenuRowProps) {
  const location = useLocation();
  const { activeMenuKey, mode, setActiveMenuKey, setMode } = useMenuPanelStore();
  const Icon = item.icon;
  const isFolder = !!item.children?.length;
  const isLeaf = !!item.path && !isFolder;
  const isActive = activeMenuKey === item.menuKey;
  const isActiveBranch = hasActiveDescendant(item, location, appId);

  const handleClick = () => {
    if (isLeaf) {
      onNavigate(`/${appId}/${item.path}`);
    } else if (isFolder) {
      setActiveMenuKey(item.menuKey);
      if (mode === 'mega') setMode('compact');
    }
  };

  // 폴더 hover 시 cascade로 자식 detail 자동 노출 (leaf는 직전 detail 유지)
  const handleMouseEnter = () => {
    if (!isFolder) return;
    setActiveMenuKey(item.menuKey);
    if (mode === 'mega') setMode('compact');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className={cn(
        'group/row relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors',
        isLeaf ? 'cursor-pointer' : 'cursor-default',
        'hover:bg-[#f1f3f5]',
        isActive && 'bg-[var(--color-bt-primary)]/[0.08]',
        isActiveBranch && 'before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-[var(--color-bt-primary)]',
        isActiveBranch ? 'text-[var(--color-bt-primary)] font-semibold' : 'text-[#495057]',
      )}
    >
      <span className={cn('flex items-center justify-center size-5 shrink-0', isActiveBranch ? 'text-[var(--color-bt-primary)]' : 'text-[#868e96]')}>
        {Icon ? <Icon className="!size-5" /> : <SquareDashed className="!size-5" />}
      </span>
      <span className="flex-1 min-w-0 truncate text-sm">{item.label}</span>
      {isFolder && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn('size-4 shrink-0 opacity-60 transition-transform', isActive && 'translate-x-0.5 opacity-100')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}
