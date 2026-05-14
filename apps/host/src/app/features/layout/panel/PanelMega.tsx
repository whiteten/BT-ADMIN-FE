import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Input } from 'antd';
import { Search, SquareDashed } from 'lucide-react';
import { useMenuStore, useNavigationStore } from '@/shared-store';
import PanelControls from './PanelControls';
import { Highlight, hasMatch, isMenuActive } from './PanelMenuPrimitives';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { BookmarkButton } from '../components/BookmarkButton';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const LINE = '#dee2e6';

/** 깊이별 노드 점 — 2단계: 앰버, 3단계 이상: 아웃라인 블루. 첫 줄 높이(h-5)에 수직 중앙 정렬 */
const Dot = ({ depth }: { depth: number }) => (
  <span className="ml-1 flex h-5 shrink-0 items-center">
    {depth === 2 ? <span className="size-2.5 rounded-full bg-[#f59e0b]" /> : <span className="size-[9px] rounded-full border-[1.5px] border-[var(--color-bt-primary)] bg-white" />}
  </span>
);

/** 이동 가능한 메뉴 우측의 북마크 토글 — 첫 줄 높이(h-5)에 수직 중앙 정렬. hover 시 노출, 북마크된 항목은 상시 표시 */
const BookmarkSlot = ({ item, appId }: { item: MenuItem; appId: string }) => {
  const isBookmarked = useNavigationStore((s) => s.favorites.some((f) => f.menuKey === item.menuKey));

  return (
    <span
      className={cn('flex h-5 shrink-0 items-center transition-opacity', isBookmarked ? 'opacity-100' : 'opacity-0 group-hover/row:opacity-100')}
      onClick={(e) => e.stopPropagation()}
    >
      <BookmarkButton menuKey={item.menuKey} label={item.label} path={item.path ?? ''} appId={appId} />
    </span>
  );
};

interface TreeNodeProps {
  item: MenuItem;
  depth: number;
  isLast: boolean;
  appId: string;
  query: string;
  onNavigate: (path: string) => void;
}

/** 2단계 이하 메뉴 — 커넥터 선(세로 spine + 가로 tick) + 점 + 라벨. 재귀 */
const TreeNode = ({ item, depth, isLast, appId, query, onNavigate }: TreeNodeProps) => {
  const location = useLocation();
  const childItems = (item.children ?? []).filter((c) => !c.hide && (!query || hasMatch(c, query)));
  const hasChildren = childItems.length > 0;
  const isLeaf = !!item.path && !item.children?.length;
  const isEmpty = !isLeaf && !hasChildren; // path도 children도 없는 항목
  const isActive = item.path ? isMenuActive(item.path, location, appId) : false;

  return (
    <li className="relative pl-5 pb-1">
      {/* 세로 spine — 마지막 항목은 점까지만 */}
      <span className={cn('absolute left-0 top-0 w-px', isLast ? 'h-[14px]' : 'h-full')} style={{ backgroundColor: LINE }} />
      {/* 가로 tick */}
      <span className="absolute left-0 top-[14px] h-px w-4" style={{ backgroundColor: LINE }} />
      {/* 행 */}
      <div
        className={cn(
          'group/row flex items-start gap-2 rounded-md py-1 pr-1.5 transition-colors',
          isLeaf ? 'cursor-pointer hover:bg-[#f5f6f8]' : 'cursor-default',
          isEmpty && 'opacity-50',
          isActive && 'bg-[var(--color-bt-primary)]/[0.08]',
        )}
        onClick={() => isLeaf && item.path && onNavigate(`/${appId}/${item.path}`)}
      >
        <Dot depth={depth} />
        <span
          className={cn(
            'min-w-0 flex-1 text-[14px] leading-snug transition-colors',
            isActive
              ? 'font-semibold text-[var(--color-bt-primary)]'
              : hasChildren
                ? 'font-semibold text-[#343a40]'
                : isLeaf
                  ? 'text-[#495057] group-hover/row:text-[#212529]'
                  : 'text-[#868e96]',
          )}
        >
          <Highlight text={item.label} query={query} />
        </span>
        {isLeaf && <BookmarkSlot item={item} appId={appId} />}
      </div>
      {/* 자식 */}
      {hasChildren && (
        <ul className="relative ml-1">
          {childItems.map((child, i) => (
            <TreeNode key={child.menuKey} item={child} depth={depth + 1} isLast={i === childItems.length - 1} appId={appId} query={query} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </li>
  );
};

interface FirstLevelColumnProps {
  menu: MenuItem;
  appId: string;
  query: string;
  onNavigate: (path: string) => void;
}

/** 1단계 메뉴 — 원형 아이콘 노드 + 하위 트리 컬럼 */
const FirstLevelColumn = ({ menu, appId, query, onNavigate }: FirstLevelColumnProps) => {
  const location = useLocation();
  const Icon = menu.icon;
  const childItems = (menu.children ?? []).filter((c) => !c.hide && (!query || hasMatch(c, query)));
  const isLeafNode = !!menu.path && !menu.children?.length;
  const isEmpty = !menu.path && !menu.children?.length; // path도 children도 없는 항목
  const isActive = menu.path ? isMenuActive(menu.path, location, appId) : false;

  return (
    <div className="min-w-0 px-3">
      {/* 노드 */}
      <div className={cn('group/row flex items-center gap-1', isEmpty && 'opacity-50')}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-bt-primary)] shadow-sm">
          {Icon ? <Icon className="size-6 text-white" /> : <SquareDashed className="size-6 text-white" />}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-[15px] font-bold leading-tight transition-colors',
            isLeafNode && 'cursor-pointer hover:bg-[#f5f6f8]',
            isActive ? 'bg-[var(--color-bt-primary)]/[0.08] text-[var(--color-bt-primary)]' : isEmpty ? 'text-[#868e96]' : 'text-[#212529]',
          )}
          onClick={() => isLeafNode && menu.path && onNavigate(`/${appId}/${menu.path}`)}
        >
          <Highlight text={menu.label} query={query} />
        </span>
        {isLeafNode && <BookmarkSlot item={menu} appId={appId} />}
      </div>
      {/* 하위 트리 */}
      {childItems.length > 0 && (
        <ul className="relative ml-[22px] mt-2">
          {childItems.map((child, i) => (
            <TreeNode key={child.menuKey} item={child} depth={2} isLast={i === childItems.length - 1} appId={appId} query={query} onNavigate={onNavigate} />
          ))}
        </ul>
      )}
    </div>
  );
};

interface RemoteSitemapProps {
  config: MenuConfig;
  query: string;
  onNavigate: (path: string) => void;
}

/** 한 리모트 = 사이트맵 카드 하나. 앱 타이틀 + 1단계 노드 컬럼들 */
const RemoteSitemap = ({ config, query, onNavigate }: RemoteSitemapProps) => {
  const AppIcon = config.icon;
  const visibleMenus = config.menus.filter((m) => !m.hide && (!query || hasMatch(m, query)));
  if (!visibleMenus.length) return null;

  return (
    <section className="rounded-xl border border-[#eef0f2] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* 앱 타이틀 */}
      <div className="mb-6 flex items-center gap-2.5">
        {AppIcon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-bt-primary)]/[0.08]">
            <AppIcon className="size-[22px] text-[var(--color-bt-primary)]" />
          </span>
        )}
        <h2 className="text-lg font-bold tracking-tight text-[#212529]">{config.appName}</h2>
      </div>
      {/* 1단계 컬럼들 — 한 줄에 최대 4개, 화면 좁아지면 3·2·1개로 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start gap-y-8">
        {visibleMenus.map((menu) => (
          <FirstLevelColumn key={menu.menuKey} menu={menu} appId={config.appId} query={query} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
};

interface PanelMegaProps {
  onNavigate: (path: string) => void;
}

const PanelMega = ({ onNavigate }: PanelMegaProps) => {
  const { menuConfigs } = useMenuStore();
  const { selectedRemote } = useRemoteSelector();
  const [search, setSearch] = useState('');

  // 현재 보고 있는 앱이 가장 위로 오도록 정렬
  const orderedConfigs = useMemo(() => {
    const selectedAppId = selectedRemote?.appId;
    if (!selectedAppId) return menuConfigs;
    const idx = menuConfigs.findIndex((c) => c.appId === selectedAppId);
    if (idx <= 0) return menuConfigs;
    const reordered = [...menuConfigs];
    const [chosen] = reordered.splice(idx, 1);
    reordered.unshift(chosen);
    return reordered;
  }, [menuConfigs, selectedRemote?.appId]);

  const visibleConfigs = useMemo(() => orderedConfigs.filter((c) => c.menus.some((m) => !m.hide && (!search || hasMatch(m, search)))), [orderedConfigs, search]);
  const hasResults = visibleConfigs.length > 0;

  return (
    <div className="flex flex-col h-full">
      <header className="shrink-0 flex items-center justify-between gap-3 px-6 pt-5 pb-4 min-h-[72px]">
        <Input
          placeholder="메뉴 검색"
          prefix={<Search className="size-4 text-gray-400" />}
          className="!w-full !max-w-[320px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
        <PanelControls />
      </header>
      <div className="mx-6 border-t border-[#e9ecef]" />

      <div className="flex-1 overflow-y-auto bg-[#f8f9fb] px-6 py-5">
        {hasResults ? (
          <div className="space-y-6">
            {visibleConfigs.map((config) => (
              <RemoteSitemap key={config.appId} config={config} query={search} onNavigate={onNavigate} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#adb5bd]">
            <Search className="size-16 mb-4 opacity-40 stroke-1" />
            <p className="text-sm">
              &apos;<span className="font-medium text-[#868e96]">{search}</span>&apos;에 대한 검색 결과가 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelMega;
