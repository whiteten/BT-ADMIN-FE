/**
 * 사용자 개별 권한 선택기 컴포넌트
 * - PermissionSelector와 동일한 체크박스 트리 UI
 * - 기본값: 역할에 포함된 권한이 체크됨
 * - 체크 추가: 역할에 없던 권한 → ALLOW로 저장
 * - 체크 해제: 역할에 있던 권한 → DENY로 저장
 */

import { useMemo, useState } from 'react';
import { Checkbox, Collapse, Input, Space, Spin, Tag, Tooltip } from 'antd';
import { CheckCircle, Lock, Search, XCircle } from 'lucide-react';
import { useGetGroupedPermissions } from '../hooks/usePermissionQueries';
import type { Permission, UserAuthMap } from '../types/iam.types';
import NoData from '@/components/custom/NoData';

interface UserPermissionSelectorProps {
  /** 역할에 포함된 권한 ID 목록 */
  roleAuthIds: Set<number>;
  /** 현재 선택된 권한 ID 목록 (역할 기본 + 개별 설정 반영) */
  selectedAuthIds: Set<number>;
  /** DB에 저장된 기존 매핑 목록 (ALLOW/DENY 표시용) */
  existingMaps?: UserAuthMap[];
  /** 권한 선택 변경 콜백 */
  onChange: (authIds: Set<number>) => void;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}

const actionColorMap: Record<string, string> = {
  read: 'blue',
  write: 'green',
  delete: 'red',
  execute: 'purple',
};

export default function UserPermissionSelector({ roleAuthIds, selectedAuthIds, existingMaps = [], onChange, readOnly = false }: UserPermissionSelectorProps) {
  const [searchText, setSearchText] = useState('');

  // 기존 매핑을 authId 기준으로 맵으로 변환 (빠른 조회)
  const existingMapByAuthId = useMemo(() => {
    const map = new Map<number, UserAuthMap>();
    existingMaps.forEach((m) => map.set(m.authId, m));
    return map;
  }, [existingMaps]);

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
            permissions: d.permissions.filter((p) => p.description?.toLowerCase().includes(lowerSearch) ?? p.authKey.toLowerCase().includes(lowerSearch)),
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
    if (readOnly) return;
    const next = new Set(selectedAuthIds);
    if (next.has(authId)) {
      next.delete(authId);
    } else {
      next.add(authId);
    }
    onChange(next);
  };

  // 도메인 전체 선택/해제
  const handleDomainToggle = (permissions: Permission[], checked: boolean) => {
    if (readOnly) return;
    const next = new Set(selectedAuthIds);
    permissions.forEach((p) => {
      if (checked) {
        next.add(p.authId);
      } else {
        next.delete(p.authId);
      }
    });
    onChange(next);
  };

  // 앱 전체 선택/해제
  const handleAppToggle = (appId: string, checked: boolean) => {
    if (readOnly) return;
    const appPerms = allPermissions.filter((p) => p.appId === appId);
    handleDomainToggle(appPerms, checked);
  };

  // 도메인별 선택 상태 계산
  const getDomainCheckState = (permissions: Permission[]) => {
    const selectedCount = permissions.filter((p) => selectedAuthIds.has(p.authId)).length;
    return {
      checked: selectedCount === permissions.length && permissions.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < permissions.length,
    };
  };

  // 앱별 선택 상태 계산
  const getAppCheckState = (appId: string) => {
    const appPerms = allPermissions.filter((p) => p.appId === appId);
    const selectedCount = appPerms.filter((p) => selectedAuthIds.has(p.authId)).length;
    return {
      checked: selectedCount === appPerms.length && appPerms.length > 0,
      indeterminate: selectedCount > 0 && selectedCount < appPerms.length,
    };
  };

  // 권한 상태 표시 (역할 기본 vs 추가 vs 제거)
  // existingMaps에서 DB에 저장된 ALLOW/DENY 상태도 고려
  const getPermissionStatus = (authId: number) => {
    const isRolePermission = roleAuthIds.has(authId);
    const isSelected = selectedAuthIds.has(authId);
    const existingMap = existingMapByAuthId.get(authId);

    if (isRolePermission && isSelected) {
      return 'role'; // 역할 기본 권한 (변경 없음)
    } else if (!isRolePermission && isSelected) {
      return 'added'; // 추가됨 (ALLOW)
    } else if (isRolePermission && !isSelected) {
      return 'removed'; // 제거됨 (DENY)
    } else if (!isRolePermission && !isSelected && existingMap?.effect === 'DENY') {
      // 역할에도 없고 선택도 안됐지만 DB에 DENY로 저장된 경우 (역할 변경 등으로 발생 가능)
      return 'removed';
    }
    return 'none'; // 권한 없음
  };

  // DB에 저장된 상태 표시용 (페이지 로드 후에도 유지)
  const getSavedStatus = (authId: number): 'ALLOW' | 'DENY' | null => {
    const existingMap = existingMapByAuthId.get(authId);
    return existingMap?.effect ?? null;
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
                      disabled={readOnly}
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
                          <Checkbox
                            checked={domainState.checked}
                            indeterminate={domainState.indeterminate}
                            disabled={readOnly}
                            onChange={(e) => handleDomainToggle(permissions, e.target.checked)}
                          >
                            {domain}
                          </Checkbox>
                        </div>
                        <Space direction="vertical" size="small" className="w-full">
                          {permissions.map((perm) => {
                            const status = getPermissionStatus(perm.authId);
                            const savedStatus = getSavedStatus(perm.authId);
                            const isRolePermission = roleAuthIds.has(perm.authId);

                            return (
                              <Checkbox
                                key={perm.authId}
                                checked={selectedAuthIds.has(perm.authId)}
                                disabled={readOnly}
                                onChange={() => handlePermissionToggle(perm.authId)}
                                className={
                                  status === 'added'
                                    ? '[&_.ant-checkbox-inner]:!border-green-500 [&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-green-500'
                                    : status === 'removed'
                                      ? '[&_.ant-checkbox-inner]:!border-red-500'
                                      : ''
                                }
                              >
                                <div className="flex items-center gap-2">
                                  <Tag color={actionColorMap[perm.action]} className="text-xs m-0">
                                    {perm.action}
                                  </Tag>
                                  <span className="text-sm text-gray-800">{perm.description}</span>
                                  {isRolePermission && (
                                    <Tooltip title="역할에 포함된 기본 권한">
                                      <Lock className="size-3 text-gray-400" />
                                    </Tooltip>
                                  )}
                                  {/* DB에 저장된 상태 표시 (항상 표시) */}
                                  {savedStatus === 'ALLOW' && (
                                    <Tooltip title="개별 부여됨 (DB 저장)">
                                      <Tag color="green" className="text-xs m-0 flex items-center gap-0.5">
                                        <CheckCircle className="size-3" />
                                        ALLOW
                                      </Tag>
                                    </Tooltip>
                                  )}
                                  {savedStatus === 'DENY' && (
                                    <Tooltip title="개별 차단됨 (DB 저장)">
                                      <Tag color="red" className="text-xs m-0 flex items-center gap-0.5">
                                        <XCircle className="size-3" />
                                        DENY
                                      </Tag>
                                    </Tooltip>
                                  )}
                                </div>
                              </Checkbox>
                            );
                          })}
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
