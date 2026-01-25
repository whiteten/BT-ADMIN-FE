/**
 * 권한 선택기 컴포넌트
 * - 권한을 App > Domain > Permission 계층 구조로 표시
 * - 다중 선택 (Checkbox) 지원
 * - 검색 필터링 지원
 * - 앱/도메인 단위 전체 선택/해제 지원
 */

import { useMemo, useState } from 'react';
import { Checkbox, Collapse, Input, Space, Spin, Tag } from 'antd';
import { Search, Shield } from 'lucide-react';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import type { Permission, PermissionGroup } from '../types/iam.types';
import NoData from '@/components/custom/NoData';

interface PermissionSelectorProps {
  value?: Set<number>;
  onChange?: (authIds: Set<number>) => void;
}

const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

export default function PermissionSelector({ value = new Set(), onChange }: PermissionSelectorProps) {
  const [searchText, setSearchText] = useState('');

  // API에서 그룹화된 권한 목록 조회
  const { data: permissionGroups = [], isLoading } = useGetGroupedPermissions();

  // 전체 권한 목록 (flat)
  const allPermissions = useMemo(() => {
    return permissionGroups.flatMap((group) => group.domains.flatMap((d) => d.permissions));
  }, [permissionGroups]);

  // 검색 필터링
  const filteredGroups = useMemo(() => {
    if (!searchText) return permissionGroups;

    const lowerSearch = searchText.toLowerCase();
    return permissionGroups
      .map((group) => ({
        ...group,
        domains: group.domains
          .map((d) => ({
            ...d,
            permissions: d.permissions.filter((p) => p.description?.toLowerCase().includes(lowerSearch) || p.authKey.toLowerCase().includes(lowerSearch)),
          }))
          .filter((d) => d.permissions.length > 0),
      }))
      .filter((g) => g.domains.length > 0);
  }, [permissionGroups, searchText]);

  // 권한 수 계산
  const totalCount = allPermissions.length;
  const filteredCount = filteredGroups.reduce((sum, g) => sum + g.domains.reduce((s, d) => s + d.permissions.length, 0), 0);

  // 권한 선택 토글
  const handlePermissionToggle = (authId: number) => {
    const next = new Set(value);
    if (next.has(authId)) {
      next.delete(authId);
    } else {
      next.add(authId);
    }
    onChange?.(next);
  };

  // 도메인 전체 선택/해제
  const handleDomainToggle = (permissions: Permission[], checked: boolean) => {
    const next = new Set(value);
    permissions.forEach((p) => {
      if (checked) {
        next.add(p.authId);
      } else {
        next.delete(p.authId);
      }
    });
    onChange?.(next);
  };

  // 앱 전체 선택/해제
  const handleAppToggle = (appId: string, checked: boolean) => {
    const appPerms = allPermissions.filter((p) => p.appId === appId);
    handleDomainToggle(appPerms, checked);
  };

  // 도메인별 선택 상태 계산
  const getDomainCheckState = (permissions: Permission[]) => {
    const selectedCount = permissions.filter((p) => value.has(p.authId)).length;
    return {
      checked: selectedCount === permissions.length && permissions.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < permissions.length,
    };
  };

  // 앱별 선택 상태 계산
  const getAppCheckState = (appId: string) => {
    const appPerms = allPermissions.filter((p) => p.appId === appId);
    const selectedCount = appPerms.filter((p) => value.has(p.authId)).length;
    return {
      checked: selectedCount === appPerms.length && appPerms.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < appPerms.length,
    };
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin tip="권한 목록을 불러오는 중..." />
      </div>
    );
  }

  // 데이터 없음
  if (permissionGroups.length === 0) {
    return (
      <div className="py-8">
        <NoData message="등록된 권한이 없습니다." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 검색 */}
      <Input
        placeholder="권한 검색 (권한명, 권한키)"
        prefix={<Search className="size-4 text-gray-400" />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        allowClear
      />

      {/* 검색 결과 카운트 */}
      <div className="text-xs text-gray-500">
        {searchText ? (
          <>
            검색결과 <span className="font-semibold text-gray-700">{filteredCount}</span>개 / 전체 {totalCount}개
          </>
        ) : (
          <>
            전체 <span className="font-semibold text-gray-700">{totalCount}</span>개
          </>
        )}
        {value.size > 0 && (
          <span className="ml-2 text-blue-600">
            (<span className="font-semibold">{value.size}</span>개 선택)
          </span>
        )}
      </div>

      {/* 권한 트리 */}
      <div className="border rounded-lg max-h-[420px] overflow-y-auto">
        <Collapse defaultActiveKey={permissionGroups.slice(0, 2).map((g) => g.appId)} ghost className="bg-white permission-collapse">
          {filteredGroups.map((group) => {
            const appState = getAppCheckState(group.appId);
            return (
              <Collapse.Panel
                key={group.appId}
                header={
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={appState.checked}
                      indeterminate={appState.indeterminate}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleAppToggle(group.appId, e.target.checked);
                      }}
                    />
                    <Tag color="cyan" className="m-0">
                      {group.appId}
                    </Tag>
                    <span className="font-medium">{group.appName}</span>
                    <span className="text-gray-400 text-xs">({group.domains.reduce((s, d) => s + d.permissions.length, 0)})</span>
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
                  {group.domains.map(({ domain, permissions }) => {
                    const domainState = getDomainCheckState(permissions);
                    return (
                      <div key={domain} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="font-medium text-sm mb-2 pb-2 border-b border-gray-200 capitalize text-gray-700 flex items-center gap-2">
                          <Checkbox checked={domainState.checked} indeterminate={domainState.indeterminate} onChange={(e) => handleDomainToggle(permissions, e.target.checked)}>
                            {domain}
                          </Checkbox>
                        </div>
                        <Space direction="vertical" size="small" className="w-full">
                          {permissions.map((perm) => (
                            <Checkbox key={perm.authId} checked={value.has(perm.authId)} onChange={() => handlePermissionToggle(perm.authId)}>
                              <div className="flex items-center gap-2">
                                <Tag color={actionColorMap[perm.action]} className="text-xs m-0">
                                  {perm.action}
                                </Tag>
                                <span className="text-sm text-gray-800">{perm.description}</span>
                              </div>
                            </Checkbox>
                          ))}
                        </Space>
                      </div>
                    );
                  })}
                </div>
              </Collapse.Panel>
            );
          })}
        </Collapse>
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
