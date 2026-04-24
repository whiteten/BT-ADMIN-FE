import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, Input } from 'antd';
import { Search } from 'lucide-react';
import { type MenuConfig, type MenuItem, useMenuStore } from '@/shared-store';
import { ReactComponent as IconSitemap } from '../../assets/images/icon/icon-sitemap.svg';
import { BookmarkButton } from '../features/layout/components/BookmarkButton';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/libs/shared-ui/src/lib/utils';

/* ────────────────────────── helpers ────────────────────────── */

function hasMatch(menu: MenuItem, q: string): boolean {
  if (menu.hide) return false;
  const lower = q.toLowerCase();
  if (menu.label.toLowerCase().includes(lower)) return true;
  return menu.children?.some((c) => hasMatch(c, lower)) ?? false;
}

function countLeaves(menus: MenuItem[]): number {
  let n = 0;
  for (const m of menus) {
    if (m.hide) continue;
    if (m.path && !m.children?.length) n++;
    if (m.children?.length) n += countLeaves(m.children);
  }
  return n;
}

/** 메뉴의 서브그룹(children이 있는 직계 자식) 수를 반환 — 카드 col-span 계산용 */
function countSubgroups(menu: MenuItem): number {
  if (!menu.children?.length) return 1;
  const subs = menu.children.filter((c) => !c.hide && c.children?.length && !c.path);
  return subs.length > 1 ? subs.length : 1;
}

/* ────────────────────────── atoms ────────────────────────── */

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-amber-200/70 text-inherit rounded-sm px-px">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/** 리프 메뉴 링크 — BookmarkButton 항상 표시 */
function MenuLink({ item, appId, query, onNavigate }: { item: MenuItem; appId: string; query: string; onNavigate: (path: string) => void }) {
  return (
    <div
      className="group/row flex items-center gap-2 rounded-lg px-2.5 py-[6px] -mx-1 cursor-pointer transition-colors hover:bg-[var(--color-bt-primary)]/[0.06]"
      onClick={() => onNavigate(`/${appId}/${item.path}`)}
    >
      {/* dot */}
      <span className="size-[5px] shrink-0 rounded-full bg-[var(--color-bt-primary)] transition-colors" />
      {/* label */}
      <span className="flex-1 min-w-0 text-[14px] text-[#495057] truncate transition-colors group-hover/row:text-[var(--color-bt-primary)]">
        <Highlight text={item.label} query={query} />
      </span>
      {/* bookmark — 항상 표시 */}
      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <BookmarkButton menuKey={item.menuKey} label={item.label} path={item.path ?? ''} appId={appId} />
      </span>
    </div>
  );
}

/* ────────────────────────── recursive list ────────────────────────── */

/** 자식 메뉴 재귀 렌더링 — 서브그룹이 여럿이면 grid 수평 배치 */
function ChildList({ items, appId, query, onNavigate, asGrid }: { items: MenuItem[]; appId: string; query: string; onNavigate: (path: string) => void; asGrid?: boolean }) {
  const visible = items.filter((i) => !i.hide && (!query || hasMatch(i, query)));
  if (!visible.length) return null;

  // 모든 visible이 children을 가진 서브그룹인 경우 → grid로 수평 배치
  const allSubgroups = visible.every((i) => i.children?.length && !i.path);

  if (asGrid && allSubgroups && visible.length > 1) {
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {visible.map((item) => (
          <div key={item.menuKey}>
            <p className="text-sm text-[#878a99] tracking-wider mb-1.5 mt-1">
              <Highlight text={item.label} query={query} />
            </p>
            <ChildList items={item.children ?? []} appId={appId} query={query} onNavigate={onNavigate} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-px">
      {visible.map((item) => {
        if (item.path && !item.children?.length) {
          return <MenuLink key={item.menuKey} item={item} appId={appId} query={query} onNavigate={onNavigate} />;
        }
        if (item.children?.length) {
          return (
            <div key={item.menuKey} className="mt-2.5 first:mt-0">
              <p className="text-sm text-[#878a99] tracking-wider mb-1.5">
                <Highlight text={item.label} query={query} />
              </p>
              <ChildList items={item.children} appId={appId} query={query} onNavigate={onNavigate} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ────────────────────────── column card ────────────────────────── */

/** 1단계 메뉴 → 배경 카드 컬럼 (3뎁스 메뉴는 서브그룹 수만큼 col-span) */
function MenuCard({ menu, appId, query, onNavigate }: { menu: MenuItem; appId: string; query: string; onNavigate: (path: string) => void }) {
  const Icon = menu.icon;
  const colSpan = countSubgroups(menu);

  return (
    <div className="rounded-xl bg-[#f8f9fb] p-5 min-w-0" style={colSpan > 1 ? { gridColumn: `span ${colSpan}` } : undefined}>
      {/* 카드 헤더 */}
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

      {/* 리프 메뉴 (자기 자신이 링크) */}
      {menu.path && !menu.children?.length && <MenuLink item={menu} appId={appId} query={query} onNavigate={onNavigate} />}

      {/* 자식 메뉴 */}
      {!!menu.children?.length && <ChildList items={menu.children} appId={appId} query={query} onNavigate={onNavigate} asGrid />}
    </div>
  );
}

/* ────────────────────────── app section ────────────────────────── */

function AppSection({ config, query, onNavigate }: { config: MenuConfig; query: string; onNavigate: (path: string) => void }) {
  const AppIcon = config.icon;
  const visibleMenus = config.menus.filter((m) => !m.hide && (!query || hasMatch(m, query)));
  if (!visibleMenus.length) return null;

  const leafCount = countLeaves(config.menus);

  return (
    <section className="border-l-4 border-[var(--color-bt-primary)]/60 pl-5">
      {/* 앱 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        {AppIcon && (
          <span className="flex items-center justify-center size-6">
            <AppIcon className="size-6 text-[var(--color-bt-primary)]" />
          </span>
        )}
        <h2 className="text-base font-bold tracking-tight text-[#212529]">{config.appName}</h2>
        <span className="text-xs text-[#adb5bd] font-medium tabular-nums">{leafCount} menus</span>
      </div>

      {/* 메가 메뉴 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleMenus.map((menu) => (
          <MenuCard key={menu.menuKey} menu={menu} appId={config.appId} query={query} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────── main ────────────────────────── */

export default function Sitemap({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { menuConfigs } = useMenuStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const onClose = () => {
    setOpen(false);
    setSearch('');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const hasResults = menuConfigs.some((c) => c.menus.some((m) => !m.hide && (!search || hasMatch(m, search))));

  return (
    <>
      <Button variant="ghost" className={cn('size-7', className)} aria-label="Open sitemap" {...props} onClick={() => setOpen(true)}>
        <IconSitemap className="size-6 text-[#495057]" />
        <span className="sr-only">sitemap</span>
      </Button>

      <Drawer open={open} onClose={onClose} title="Sitemap" closable={{ placement: 'end' }} size={1128} className="!overflow-hidden">
        <div className="flex flex-col h-full">
          {/* 검색 */}
          <div className="shrink-0 pb-5">
            <Input
              placeholder="메뉴 검색"
              prefix={<Search className="size-[18px] text-gray-400" />}
              className="!w-full !max-w-[420px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              size="large"
            />
          </div>

          {/* 콘텐츠 */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-8">
            {hasResults ? (
              <div>
                {menuConfigs.map((config, idx) => {
                  const vis = config.menus.filter((m) => !m.hide && (!search || hasMatch(m, search)));
                  if (!vis.length) return null;
                  return (
                    <div key={config.appId}>
                      {idx > 0 && <Separator className="my-8" />}
                      <AppSection config={config} query={search} onNavigate={handleNavigate} />
                    </div>
                  );
                })}
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
      </Drawer>
    </>
  );
}
