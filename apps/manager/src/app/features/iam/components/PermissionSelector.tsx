/**
 * 권한 선택기 컴포넌트 (매트릭스 방식)
 * - 행 = 메뉴 (트리 구조 들여쓰기)
 * - 열 = 권한 타입 (read, write, delete, apply, export)
 * - 앱별 섹션 구분
 * - 행/열 전체선택 체크박스
 */

import { useMemo, useState } from 'react';
import { Checkbox, Input } from 'antd';
import { ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import type { ActionAuthKeys, MenuWithPermissions, PermissionGroup } from '../types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import NoData from '@/components/custom/NoData';
import { cn } from '@/libs/shared-ui/src/lib/utils';

interface PermissionSelectorProps {
  value?: Set<string>;
  onChange?: (authKeys: Set<string>) => void;
  className?: string;
}

/** 고정 권한 타입 열 */
const ACTION_COLUMNS = ['read', 'write', 'delete', 'apply', 'export'] as const;
type ActionType = (typeof ACTION_COLUMNS)[number];

/** 권한 타입별 스타일 — 본문 행의 hover 셀 색만 컬러 톤. 헤더는 모두 흰색 라벨로 통일 */
const actionStyles: Record<ActionType, { cell: string }> = {
  read: { cell: 'hover:bg-blue-50' },
  write: { cell: 'hover:bg-emerald-50' },
  delete: { cell: 'hover:bg-rose-50' },
  apply: { cell: 'hover:bg-violet-50' },
  export: { cell: 'hover:bg-slate-100' },
};

const EMPTY_AUTH_KEYS: ActionAuthKeys = { read: null, write: null, delete: null, apply: null, export: null };

/**
 * ActionAuthKeys에서 non-null authKey 목록 반환
 */
function getAuthKeys(perms: ActionAuthKeys): string[] {
  return Object.values(perms).filter((v): v is string => v !== null);
}

/**
 * ActionAuthKeys에서 특정 액션의 authKey 반환
 */
function getAuthKey(perms: ActionAuthKeys, action: string): string | null {
  return perms[action as keyof ActionAuthKeys] ?? null;
}

/**
 * 메뉴 트리에서 권한이 있는지 확인 (어떤 액션이든 non-null이면 true)
 */
function hasPermissionsInTree(menu: MenuWithPermissions): boolean {
  if (getAuthKeys(menu.permissions ?? EMPTY_AUTH_KEYS).length > 0) return true;
  for (const child of menu.children ?? []) {
    if (hasPermissionsInTree(child)) return true;
  }
  return false;
}

/**
 * 메뉴와 하위 메뉴의 모든 authKey 수집
 */
function collectAuthKeysFromMenu(menu: MenuWithPermissions): string[] {
  const keys = getAuthKeys(menu.permissions ?? EMPTY_AUTH_KEYS);
  for (const child of menu.children ?? []) {
    keys.push(...collectAuthKeysFromMenu(child));
  }
  return keys;
}

/**
 * 그룹에서 모든 authKey 수집
 */
function collectAllAuthKeysFromGroup(group: PermissionGroup): string[] {
  return group.menus.flatMap((menu) => collectAuthKeysFromMenu(menu));
}

/**
 * 특정 액션 타입의 authKey만 수집
 */
function collectAuthKeysByAction(group: PermissionGroup, action: string): string[] {
  const collect = (menu: MenuWithPermissions): string[] => {
    const key = getAuthKey(menu.permissions ?? EMPTY_AUTH_KEYS, action);
    const keys: string[] = key !== null ? [key] : [];
    for (const child of menu.children ?? []) {
      keys.push(...collect(child));
    }
    return keys;
  };
  return group.menus.flatMap((menu) => collect(menu));
}

/**
 * 플랫 메뉴 아이템 (depth 정보 포함)
 */
interface FlatMenuItem {
  menu: MenuWithPermissions;
  menuLabel: string;
  depth: number;
  hasPermissions: boolean;
  hasChildrenWithPermissions: boolean;
}

/**
 * 트리를 플랫 리스트로 변환
 */
function flattenMenuTree(menu: MenuWithPermissions, depth = 0): FlatMenuItem[] {
  const result: FlatMenuItem[] = [];
  const hasPerms = getAuthKeys(menu.permissions ?? EMPTY_AUTH_KEYS).length > 0;
  const hasChildPerms = (menu.children ?? []).some((child) => hasPermissionsInTree(child));

  if (hasPerms || hasChildPerms) {
    result.push({ menu, menuLabel: menu.menuLabel, depth, hasPermissions: hasPerms, hasChildrenWithPermissions: hasChildPerms });
  }

  for (const child of menu.children ?? []) {
    result.push(...flattenMenuTree(child, depth + 1));
  }

  return result;
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
        flatMenus: group.flatMenus.filter((item) => item.menuLabel.toLowerCase().includes(lowerSearch)),
      }))
      .filter((g) => g.flatMenus.length > 0);
  }, [flatMenusByApp, searchText]);

  // 권한 토글
  const handlePermissionToggle = (authKey: string) => {
    const next = new Set(value);
    if (next.has(authKey)) {
      next.delete(authKey);
    } else {
      next.add(authKey);
    }
    onChange?.(next);
  };

  // 메뉴(행) 전체 선택/해제
  const handleRowToggle = (menu: MenuWithPermissions, checked: boolean) => {
    const allKeys = collectAuthKeysFromMenu(menu);
    const next = new Set(value);
    allKeys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
    onChange?.(next);
  };

  // 열(액션 타입) 전체 선택/해제
  const handleColumnToggle = (group: PermissionGroup, action: string, checked: boolean) => {
    const actionKeys = collectAuthKeysByAction(group, action);
    const next = new Set(value);
    actionKeys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
    onChange?.(next);
  };

  // 앱 전체 선택/해제
  const handleAppToggle = (group: PermissionGroup, checked: boolean) => {
    const allKeys = collectAllAuthKeysFromGroup(group);
    const next = new Set(value);
    allKeys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
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
    const allKeys = collectAuthKeysFromMenu(menu);
    if (allKeys.length === 0) return { checked: false, indeterminate: false };
    const selectedCount = allKeys.filter((key) => value.has(key)).length;
    return { checked: selectedCount === allKeys.length, indeterminate: selectedCount > 0 && selectedCount < allKeys.length };
  };

  // 열(액션 타입) 선택 상태
  const getColumnCheckState = (group: PermissionGroup, action: string) => {
    const actionKeys = collectAuthKeysByAction(group, action);
    if (actionKeys.length === 0) return { checked: false, indeterminate: false, disabled: true };
    const selectedCount = actionKeys.filter((key) => value.has(key)).length;
    return { checked: selectedCount === actionKeys.length, indeterminate: selectedCount > 0 && selectedCount < actionKeys.length, disabled: false };
  };

  // 앱 선택 상태
  const getAppCheckState = (group: PermissionGroup) => {
    const allKeys = collectAllAuthKeysFromGroup(group);
    if (allKeys.length === 0) return { checked: false, indeterminate: false };
    const selectedCount = allKeys.filter((key) => value.has(key)).length;
    return { checked: selectedCount === allKeys.length, indeterminate: selectedCount > 0 && selectedCount < allKeys.length };
  };

  const getAppPermissionCount = (group: PermissionGroup) => collectAllAuthKeysFromGroup(group).length;

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

  // 모든 행이 동일 grid columns 공유 → 헤더 라벨/체크박스와 본문 셀이 일직선 정렬
  // [메뉴 minmax(260,1.6fr)] [권한 5개 minmax(96,1fr)] [접기 36px]
  const gridCols = 'grid-cols-[minmax(260px,1.6fr)_repeat(5,minmax(96px,1fr))_36px]';

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      <div className="border border-gray-200 rounded-lg flex-1 min-h-0 overflow-y-auto bg-white">
        {/* 검색 toolbar — sticky top-0 */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <Input
              placeholder="메뉴명 검색"
              prefix={<Search className="size-3.5 text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="small"
              className="!max-w-[320px] flex-1"
            />
          </div>
        </div>

        {filteredGroups.map((group) => {
          const appState = getAppCheckState(group);
          const isCollapsed = collapsedApps.has(group.appId);

          return (
            <div key={group.appId} className="border-b border-gray-200 last:border-b-0">
              {/* 앱 헤더 — 원본 슬레이트 그라데이션 유지. 메뉴 + 권한 5개 라벨/체크박스 통합 (별도 thead 제거) */}
              <div
                className={cn('sticky top-[46px] z-20 grid items-stretch bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm cursor-pointer select-none', gridCols)}
                onClick={() => toggleAppCollapse(group.appId)}
              >
                {/* 메뉴 컬럼 — 앱 체크박스 + 앱 이름 + 카운트 (원본 디자인) */}
                <div className="flex items-center gap-3 px-4 py-2.5 min-w-0">
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
                  <span className="font-semibold tracking-wide truncate">{group.appName}</span>
                  <span className="text-xs bg-white/15 px-2 py-0.5 rounded-full font-medium shrink-0">{getAppPermissionCount(group)}</span>
                </div>

                {/* 5개 권한 — 단순 흰색 라벨 + 체크박스 (컬러 chip/dot 모두 제거) */}
                {ACTION_COLUMNS.map((action) => {
                  const colState = getColumnCheckState(group, action);
                  return (
                    <div key={action} className="flex items-center justify-center gap-2 px-2 py-2.5 border-l border-white/15">
                      <span className="uppercase text-[11px] tracking-wider text-white/90 font-semibold">{action}</span>
                      <Checkbox
                        checked={colState.checked}
                        indeterminate={colState.indeterminate}
                        disabled={colState.disabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleColumnToggle(group, action, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          '[&_.ant-checkbox-inner]:!bg-white/20 [&_.ant-checkbox-inner]:!border-white/40 [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-white [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-white [&_.ant-checkbox-checked_.ant-checkbox-inner::after]:!border-slate-700',
                          colState.disabled && 'opacity-30',
                        )}
                      />
                    </div>
                  );
                })}

                {/* 접기/펼치기 */}
                <div className="flex items-center justify-center text-white/80 border-l border-white/15">
                  {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              </div>

              {/* 매트릭스 본문 — 앱 헤더와 동일 grid. 원본 행 스타일 유지 */}
              {!isCollapsed &&
                group.flatMenus.map((item, idx) => {
                  const rowState = getRowCheckState(item.menu);
                  const isFolder = item.menu.menuType === 'FOLDER';
                  const isEven = idx % 2 === 0;

                  return (
                    <div
                      key={item.menu.menuKey}
                      className={cn(
                        'grid items-center text-sm border-b border-gray-100 last:border-b-0 transition-colors',
                        gridCols,
                        isEven ? 'bg-white' : 'bg-gray-50/50',
                        isFolder && 'bg-amber-50/30',
                      )}
                    >
                      {/* 메뉴명 셀 */}
                      <div className="flex items-center gap-2 py-2 min-w-0" style={{ paddingLeft: `${16 + item.depth * 20}px`, paddingRight: '12px' }}>
                        <Checkbox checked={rowState.checked} indeterminate={rowState.indeterminate} onChange={(e) => handleRowToggle(item.menu, e.target.checked)} />
                        {isFolder ? (
                          <>
                            <Folder className="size-4 text-amber-500 flex-shrink-0" />
                            <span className="font-medium text-gray-700 truncate">{item.menuLabel}</span>
                          </>
                        ) : (
                          <>
                            {item.depth > 0 && <span className="text-gray-300 flex-shrink-0">└</span>}
                            <span className="text-gray-700 truncate">{item.menuLabel}</span>
                          </>
                        )}
                      </div>

                      {/* 권한 체크박스 셀 — 원본 hover 컬러만 유지 */}
                      {ACTION_COLUMNS.map((action) => {
                        const authKey = getAuthKey(item.menu.permissions ?? EMPTY_AUTH_KEYS, action);
                        const style = actionStyles[action];

                        if (authKey === null) {
                          return (
                            <div key={action} className="flex items-center justify-center py-2">
                              <span className="text-gray-300 text-xs">—</span>
                            </div>
                          );
                        }

                        const isSelected = value.has(authKey);
                        return (
                          <div
                            key={action}
                            className={cn('flex items-center justify-center py-2 cursor-pointer transition-colors', style.cell)}
                            onClick={() => handlePermissionToggle(authKey)}
                          >
                            <Checkbox checked={isSelected} onChange={() => handlePermissionToggle(authKey)} onClick={(e) => e.stopPropagation()} />
                          </div>
                        );
                      })}

                      {/* 접기 컬럼 공간 (헤더와 정렬) */}
                      <div />
                    </div>
                  );
                })}
            </div>
          );
        })}

        {/* 검색 결과 없음 */}
        {searchText && filteredGroups.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Search className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
