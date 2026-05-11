import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { MenuActionButtons } from './MenuActionButtons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { MenuItem as MenuItemType } from '@/libs/shared-store/src/types/menu.types';

interface MenuItemProps {
  item: MenuItemType;
  appId: string;
}

type LocationLike = { pathname: string; search: string };

/**
 * 메뉴 path가 현재 URL과 매치되는지 판단한다.
 *
 * - '/list'로 끝나는 메뉴: base path(list 제외) 하위 경로 전체와 매치
 *   예) 'resource/user/list' → '/manager/resource/user/*' 전체 매치
 * - 그 외: 해당 경로의 정확 매치 또는 하위 경로 매치
 * - menuPath에 query가 있으면(`path?key=value`): 현재 URL의 searchParams가
 *   menuPath의 모든 (k, v)를 포함해야 활성. 같은 path를 공유하는
 *   queryString 분기 메뉴를 정확히 한 개만 active로 잡기 위함이다.
 */
const isMenuActive = (menuPath: string, location: LocationLike, appId: string): boolean => {
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

/** 메뉴 트리에서 현재 위치와 매칭되는 활성 리프 노드가 있는지 재귀 검사한다. */
const hasActiveDescendant = (item: MenuItemType, location: LocationLike, appId: string): boolean => {
  if (item.path) return isMenuActive(item.path, location, appId);
  return item.children?.some((child) => hasActiveDescendant(child, location, appId)) ?? false;
};

/**
 * Collapsible 부모 메뉴 컴포넌트.
 * 활성 하위 항목이 있으면 자동으로 열리지만, 사용자가 수동으로 닫는 것도 허용한다.
 * URL 변경으로 활성 하위 항목이 생기면 다시 자동으로 열린다.
 */
const CollapsibleMenuItem = ({ item, appId }: MenuItemProps) => {
  const location = useLocation();
  const isDescendantActive = hasActiveDescendant(item, location, appId);
  const [isOpen, setIsOpen] = useState(isDescendantActive);

  useEffect(() => {
    if (isDescendantActive) {
      setIsOpen(true);
    }
  }, [isDescendantActive]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className={cn(isDescendantActive && '!text-lime-300')}>
            {item.icon && <item.icon className="!size-5" />}
            <span className={cn(!item.icon && "before:content-['-'] before:mr-2")}>{item.label}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0">
            {item.children?.map((child) => (
              <MenuItem key={child.menuKey} item={child} appId={appId} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

CollapsibleMenuItem.displayName = 'CollapsibleMenuItem';

/**
 * 재귀적 메뉴 컴포넌트
 *
 * 메뉴 구조:
 * - children O + path X → Collapsible (부모 메뉴)
 * - children X + path O → 링크 (리프 노드)
 * - children X + path X → 텍스트만 표시 (비활성 라벨)
 */
export const MenuItem = React.memo(({ item, appId }: MenuItemProps) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;

  // children이 있으면 Collapsible (path는 없음)
  if (hasChildren) {
    return <CollapsibleMenuItem item={item} appId={appId} />;
  }

  // children이 없으면 Link (path 필수)
  if (item.path) {
    const absolutePath = `/${appId}/${item.path}`;
    const isActive = isMenuActive(item.path, location, appId);
    return (
      <SidebarMenuItem>
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger asChild>
            <SidebarMenuSubButton asChild isActive={isActive} className={cn(isActive && '!text-lime-300')}>
              <Link to={absolutePath}>
                {item.icon && <item.icon className={cn('!size-5', isActive && '!text-lime-300')} />}
                <span className={cn('w-full', !item.icon && "before:content-['-'] before:mr-2")}>{item.label}</span>
              </Link>
            </SidebarMenuSubButton>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="center" sideOffset={0} className="w-full p-1">
            <MenuActionButtons menuKey={item.menuKey} label={item.label} path={item.path} appId={appId} />
          </HoverCardContent>
        </HoverCard>
      </SidebarMenuItem>
    );
  }

  // children도 path도 없으면 텍스트만 표시 (비활성 라벨)
  return (
    <SidebarMenuItem>
      <SidebarMenuSubButton className="cursor-default opacity-60 hover:bg-transparent hover:text-current">
        {item.icon && <item.icon className="!size-5" />}
        <span className={cn('w-full', !item.icon && "before:content-['-'] before:mr-2")}>{item.label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuItem>
  );
});

MenuItem.displayName = 'MenuItem';
