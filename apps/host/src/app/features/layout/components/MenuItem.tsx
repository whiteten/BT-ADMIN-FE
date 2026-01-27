import React from 'react';
import { Link } from 'react-router-dom';
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

/**
 * 재귀적 메뉴 컴포넌트
 *
 * 메뉴 구조:
 * - children O + path X → Collapsible (부모 메뉴)
 * - children X + path O → 링크 (리프 노드)
 * - children X + path X → 경고 (데이터 오류)
 */
export const MenuItem = React.memo(({ item, appId }: MenuItemProps) => {
  const hasChildren = item.children && item.children.length > 0;

  // children이 있으면 Collapsible (path는 없음)
  if (hasChildren) {
    return (
      <Collapsible className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
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
  }

  // children이 없으면 Link (path 필수)
  if (item.path) {
    const absolutePath = `/${appId}/${item.path}`;
    return (
      <SidebarMenuItem>
        <HoverCard openDelay={0} closeDelay={0}>
          <HoverCardTrigger asChild>
            <SidebarMenuSubButton asChild>
              <Link to={absolutePath}>
                {item.icon && <item.icon className="!size-5" />}
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

  return null;
});

MenuItem.displayName = 'MenuItem';
