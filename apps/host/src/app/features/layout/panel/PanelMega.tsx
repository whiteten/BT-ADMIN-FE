import { useMemo, useState } from 'react';
import { Input } from 'antd';
import { Search } from 'lucide-react';
import { useMenuStore } from '@/shared-store';
import PanelControls from './PanelControls';
import { ChildList, Highlight, MenuLink, countSubgroups, hasMatch } from './PanelMenuPrimitives';
import useRemoteSelector from '../../../hooks/useRemoteSelector';
import { Separator } from '@/components/ui/separator';
import type { MenuConfig, MenuItem } from '@/libs/shared-store/src/types/menu.types';

/** 메뉴 트리에서 visible leaf 수 — 앱 헤더에 'N menus' 표시용 */
const countLeaves = (menus: MenuItem[]): number => {
  let n = 0;
  for (const m of menus) {
    if (m.hide) continue;
    if (m.path && !m.children?.length) n++;
    if (m.children?.length) n += countLeaves(m.children);
  }
  return n;
};

interface MenuCardProps {
  menu: MenuItem;
  appId: string;
  query: string;
  onNavigate: (path: string) => void;
}

/** 1단계 메뉴 → 배경 카드 컬럼. 3뎁스 메뉴는 서브그룹 수만큼 col-span */
const MenuCard = ({ menu, appId, query, onNavigate }: MenuCardProps) => {
  const Icon = menu.icon;
  const colSpan = countSubgroups(menu);

  return (
    <div className="rounded-xl bg-[#f8f9fb] p-5 min-w-0" style={colSpan > 1 ? { gridColumn: `span ${colSpan}` } : undefined}>
      <div className="flex items-center gap-1.5 mb-3">
        {Icon && (
          <span className="flex items-center justify-center size-6">
            <Icon className="size-6 text-[var(--color-bt-primary)]" />
          </span>
        )}
        <span className="text-[14px] font-bold text-[#343a40] truncate">
          <Highlight text={menu.label} query={query} />
        </span>
      </div>

      {menu.path && !menu.children?.length && <MenuLink item={menu} appId={appId} query={query} onNavigate={onNavigate} />}
      {!!menu.children?.length && <ChildList items={menu.children} appId={appId} query={query} onNavigate={onNavigate} asGrid />}
    </div>
  );
};

interface AppSectionProps {
  config: MenuConfig;
  query: string;
  onNavigate: (path: string) => void;
}

/** 한 앱 단위 섹션 — 앱 헤더 + 1단계 메뉴 카드 그리드 */
const AppSection = ({ config, query, onNavigate }: AppSectionProps) => {
  const AppIcon = config.icon;
  const visibleMenus = config.menus.filter((m) => !m.hide && (!query || hasMatch(m, query)));
  if (!visibleMenus.length) return null;

  const leafCount = countLeaves(config.menus);

  return (
    <section className="border-l-4 border-[var(--color-bt-primary)]/60 pl-5">
      <div className="flex items-center gap-3 mb-4">
        {AppIcon && (
          <span className="flex items-center justify-center size-6">
            <AppIcon className="size-6 text-[var(--color-bt-primary)]" />
          </span>
        )}
        <h2 className="text-base font-bold tracking-tight text-[#212529]">{config.appName}</h2>
        <span className="text-xs text-[#adb5bd] font-medium tabular-nums">{leafCount} menus</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleMenus.map((menu) => (
          <MenuCard key={menu.menuKey} menu={menu} appId={config.appId} query={query} onNavigate={onNavigate} />
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
      <header className="shrink-0 flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-[#e9ecef]">
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

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {hasResults ? (
          <div>
            {visibleConfigs.map((config, idx) => (
              <div key={config.appId}>
                {idx > 0 && <Separator className="my-8" />}
                <AppSection config={config} query={search} onNavigate={onNavigate} />
              </div>
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
