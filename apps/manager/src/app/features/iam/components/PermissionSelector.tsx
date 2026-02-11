/**
 * 권한 선택기 컴포넌트 (매트릭스 방식)
 * - 행 = 메뉴 (트리 구조 들여쓰기)
 * - 열 = 권한 타입 (read, write, delete 고정)
 * - 앱별 섹션 구분
 * - 행/열 전체선택 체크박스
 */

import { useMemo, useState } from 'react';
import { Checkbox, Input } from 'antd';
import { ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import type { MenuWithPermissions, PermissionGroup, PermissionSummary } from '../types/iam.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface PermissionSelectorProps {
  value?: Set<number>;
  onChange?: (authIds: Set<number>) => void;
  className?: string;
}

/** 고정 권한 타입 열 */
const ACTION_COLUMNS = ['read', 'write', 'delete'] as const;
type ActionType = (typeof ACTION_COLUMNS)[number];

/** 권한 타입별 스타일 */
const actionStyles: Record<ActionType, { header: string; cell: string; text: string }> = {
  read: {
    header: 'text-blue-600 bg-blue-50/50',
    cell: 'hover:bg-blue-50',
    text: 'text-blue-600',
  },
  write: {
    header: 'text-emerald-600 bg-emerald-50/50',
    cell: 'hover:bg-emerald-50',
    text: 'text-emerald-600',
  },
  delete: {
    header: 'text-rose-600 bg-rose-50/50',
    cell: 'hover:bg-rose-50',
    text: 'text-rose-600',
  },
};

/**
 * 플랫 메뉴 아이템 (depth 정보 포함)
 */
interface FlatMenuItem {
  menu: MenuWithPermissions;
  menuLabel: string;
  depth: number;
  hasPermissions: boolean;
  hasChildrenWithPermissions: boolean;
  /** 권한 타입별 authId 맵 */
  permissionsByAction: Map<string, PermissionSummary>;
}

/**
 * 메뉴 트리에서 권한이 있는 메뉴가 있는지 확인
 */
function hasPermissionsInTree(menu: MenuWithPermissions): boolean {
  if ((menu.permissions || []).length > 0) return true;
  for (const child of menu.children || []) {
    if (hasPermissionsInTree(child)) return true;
  }
  return false;
}

/**
 * 트리를 플랫 리스트로 변환
 */
function flattenMenuTree(menu: MenuWithPermissions, depth = 0): FlatMenuItem[] {
  const result: FlatMenuItem[] = [];
  const hasPerms = (menu.permissions || []).length > 0;
  const hasChildPerms = (menu.children || []).some((child) => hasPermissionsInTree(child));

  // 권한 타입별 맵 생성
  const permissionsByAction = new Map<string, PermissionSummary>();
  (menu.permissions || []).forEach((p) => {
    permissionsByAction.set(p.action, p);
  });

  if (hasPerms || hasChildPerms) {
    result.push({
      menu,
      menuLabel: menu.menuLabel,
      depth,
      hasPermissions: hasPerms,
      hasChildrenWithPermissions: hasChildPerms,
      permissionsByAction,
    });
  }

  for (const child of menu.children || []) {
    result.push(...flattenMenuTree(child, depth + 1));
  }

  return result;
}

/**
 * 그룹에서 모든 권한 수집
 */
function collectAllPermissionsFromGroup(group: PermissionGroup): PermissionSummary[] {
  const collectFromMenu = (menu: MenuWithPermissions): PermissionSummary[] => {
    const perms = [...(menu.permissions || [])];
    for (const child of menu.children || []) {
      perms.push(...collectFromMenu(child));
    }
    return perms;
  };
  return group.menus.flatMap((menu) => collectFromMenu(menu));
}

/**
 * 메뉴와 하위 메뉴의 모든 권한 수집
 */
function collectPermissionsFromMenu(menu: MenuWithPermissions): PermissionSummary[] {
  const perms = [...(menu.permissions || [])];
  for (const child of menu.children || []) {
    perms.push(...collectPermissionsFromMenu(child));
  }
  return perms;
}

/**
 * 특정 액션 타입의 권한만 수집
 */
function collectPermissionsByAction(group: PermissionGroup, action: string): PermissionSummary[] {
  return collectAllPermissionsFromGroup(group).filter((p) => p.action === action);
}

export default function PermissionSelector({ value = new Set(), onChange, className }: PermissionSelectorProps) {
  const [searchText, setSearchText] = useState('');
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set());

  const { data: permissionGroups = [], isLoading } = useGetGroupedPermissions();

  // 앱별로 메뉴를 플랫하게 변환
  const flatMenusByApp = useMemo(() => {
    return permissionGroups.map((group) => ({
      ...group,
      flatMenus: group.menus.flatMap((menu) => flattenMenuTree(menu, 0)),
    }));
  }, [permissionGroups]);

  // 검색 필터링
  const filteredGroups = useMemo(() => {
    if (!searchText) return flatMenusByApp;

    const lowerSearch = searchText.toLowerCase();
    return flatMenusByApp
      .map((group) => ({
        ...group,
        flatMenus: group.flatMenus.filter((item) => {
          if (item.menuLabel.toLowerCase().includes(lowerSearch)) return true;
          return (item.menu.permissions ?? []).some((p) => p.description?.toLowerCase().includes(lowerSearch) ?? p.authKey.toLowerCase().includes(lowerSearch));
        }),
      }))
      .filter((g) => g.flatMenus.length > 0);
  }, [flatMenusByApp, searchText]);

  // 권한 토글
  const handlePermissionToggle = (authId: number) => {
    const next = new Set(value);
    if (next.has(authId)) {
      next.delete(authId);
    } else {
      next.add(authId);
    }
    onChange?.(next);
  };

  // 메뉴(행) 전체 선택/해제
  const handleRowToggle = (menu: MenuWithPermissions, checked: boolean) => {
    const allPerms = collectPermissionsFromMenu(menu);
    const next = new Set(value);
    allPerms.forEach((p) => {
      if (checked) {
        next.add(p.authId);
      } else {
        next.delete(p.authId);
      }
    });
    onChange?.(next);
  };

  // 열(액션 타입) 전체 선택/해제
  const handleColumnToggle = (group: PermissionGroup, action: string, checked: boolean) => {
    const actionPerms = collectPermissionsByAction(group, action);
    const next = new Set(value);
    actionPerms.forEach((p) => {
      if (checked) {
        next.add(p.authId);
      } else {
        next.delete(p.authId);
      }
    });
    onChange?.(next);
  };

  // 앱 전체 선택/해제
  const handleAppToggle = (group: PermissionGroup, checked: boolean) => {
    const allPerms = collectAllPermissionsFromGroup(group);
    const next = new Set(value);
    allPerms.forEach((p) => {
      if (checked) {
        next.add(p.authId);
      } else {
        next.delete(p.authId);
      }
    });
    onChange?.(next);
  };

  // 앱 접기/펼치기
  const toggleAppCollapse = (appId: string) => {
    const next = new Set(collapsedApps);
    if (next.has(appId)) {
      next.delete(appId);
    } else {
      next.add(appId);
    }
    setCollapsedApps(next);
  };

  // 행(메뉴) 선택 상태
  const getRowCheckState = (menu: MenuWithPermissions) => {
    const allPerms = collectPermissionsFromMenu(menu);
    if (allPerms.length === 0) return { checked: false, indeterminate: false };
    const selectedCount = allPerms.filter((p) => value.has(p.authId)).length;
    return {
      checked: selectedCount === allPerms.length,
      indeterminate: selectedCount > 0 && selectedCount < allPerms.length,
    };
  };

  // 열(액션 타입) 선택 상태
  const getColumnCheckState = (group: PermissionGroup, action: string) => {
    const actionPerms = collectPermissionsByAction(group, action);
    if (actionPerms.length === 0) return { checked: false, indeterminate: false, disabled: true };
    const selectedCount = actionPerms.filter((p) => value.has(p.authId)).length;
    return {
      checked: selectedCount === actionPerms.length,
      indeterminate: selectedCount > 0 && selectedCount < actionPerms.length,
      disabled: false,
    };
  };

  // 앱 선택 상태
  const getAppCheckState = (group: PermissionGroup) => {
    const allPerms = collectAllPermissionsFromGroup(group);
    if (allPerms.length === 0) return { checked: false, indeterminate: false };
    const selectedCount = allPerms.filter((p) => value.has(p.authId)).length;
    return {
      checked: selectedCount === allPerms.length,
      indeterminate: selectedCount > 0 && selectedCount < allPerms.length,
    };
  };

  const getAppPermissionCount = (group: PermissionGroup) => {
    return collectAllPermissionsFromGroup(group).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <FallbackSpinner />
      </div>
    );
  }

  if (permissionGroups.length === 0) {
    return (
      <div className="py-8">
        <NoData message="등록된 권한이 없습니다." />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* 검색 */}
      <Input
        placeholder="권한 검색 (메뉴명, 권한명, 권한키)"
        prefix={<Search className="size-4 text-gray-400" />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
        className="max-w-md shrink-0"
      />

      {/* 매트릭스 테이블 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0 overflow-y-auto">
        {filteredGroups.map((group) => {
          const appState = getAppCheckState(group);
          const isCollapsed = collapsedApps.has(group.appId);

          return (
            <div key={group.appId} className="border-b border-gray-200 last:border-b-0">
              {/* 앱 헤더 */}
              <div
                className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-4 py-2.5 flex justify-between items-center cursor-pointer select-none"
                onClick={() => toggleAppCollapse(group.appId)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={appState.checked}
                    indeterminate={appState.indeterminate}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleAppToggle(group, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="[&_.ant-checkbox-inner]:!bg-white/20 [&_.ant-checkbox-inner]:!border-white/40 [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-white [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-white [&_.ant-checkbox-checked_.ant-checkbox-inner::after]:!border-slate-700"
                  />
                  <span className="font-semibold tracking-wide">{group.appName}</span>
                  <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full font-medium">{getAppPermissionCount(group)}</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">{isCollapsed ? <ChevronRight className="size-5" /> : <ChevronDown className="size-5" />}</div>
              </div>

              {/* 매트릭스 테이블 */}
              {!isCollapsed && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-semibold text-gray-700 border-b border-gray-200 w-[60%]">메뉴</th>
                      {ACTION_COLUMNS.map((action) => {
                        const colState = getColumnCheckState(group, action);
                        const style = actionStyles[action];
                        return (
                          <th key={action} className={cn('py-2.5 px-3 text-center font-semibold border-b border-gray-200 w-[13.33%]', style.header)}>
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn('uppercase text-xs tracking-wider', style.text)}>{action}</span>
                              <Checkbox
                                checked={colState.checked}
                                indeterminate={colState.indeterminate}
                                disabled={colState.disabled}
                                onChange={(e) => handleColumnToggle(group, action, e.target.checked)}
                                className={cn(colState.disabled && 'opacity-30')}
                              />
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {group.flatMenus.map((item, idx) => {
                      const rowState = getRowCheckState(item.menu);
                      const isFolder = !item.hasPermissions && item.hasChildrenWithPermissions;
                      const isEven = idx % 2 === 0;

                      return (
                        <tr key={item.menu.menuId} className={cn('transition-colors', isEven ? 'bg-white' : 'bg-gray-50/50', isFolder && 'bg-amber-50/30')}>
                          {/* 메뉴명 셀 */}
                          <td className="py-2 px-4 border-b border-gray-100">
                            <div className="flex items-center gap-2" style={{ paddingLeft: `${item.depth * 20}px` }}>
                              <Checkbox checked={rowState.checked} indeterminate={rowState.indeterminate} onChange={(e) => handleRowToggle(item.menu, e.target.checked)} />
                              {isFolder ? (
                                <>
                                  <Folder className="size-4 text-amber-500 flex-shrink-0" />
                                  <span className="font-medium text-gray-700">{item.menuLabel}</span>
                                </>
                              ) : (
                                <>
                                  {item.depth > 0 && <span className="text-gray-300 flex-shrink-0">└</span>}
                                  <span className="text-gray-700">{item.menuLabel}</span>
                                </>
                              )}
                            </div>
                          </td>

                          {/* 권한 체크박스 셀 */}
                          {ACTION_COLUMNS.map((action) => {
                            const perm = item.permissionsByAction.get(action);
                            const style = actionStyles[action];

                            if (!perm) {
                              // 해당 권한 없음
                              return (
                                <td key={action} className="py-2 px-3 text-center border-b border-gray-100">
                                  <span className="text-gray-300 text-xs">—</span>
                                </td>
                              );
                            }

                            const isSelected = value.has(perm.authId);
                            return (
                              <td
                                key={action}
                                className={cn('py-2 px-3 text-center border-b border-gray-100 transition-colors cursor-pointer', style.cell)}
                                onClick={() => handlePermissionToggle(perm.authId)}
                              >
                                <Checkbox checked={isSelected} onChange={() => handlePermissionToggle(perm.authId)} onClick={(e) => e.stopPropagation()} />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* 검색 결과 없음 */}
      {searchText && filteredGroups.length === 0 && (
        <div className="text-center py-8 text-gray-400 border rounded-lg bg-gray-50">
          <Search className="size-8 mx-auto mb-2 opacity-50" />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
