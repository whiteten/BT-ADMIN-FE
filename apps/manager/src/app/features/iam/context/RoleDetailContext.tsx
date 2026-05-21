/**
 * 역할 상세 페이지 Context
 * - 비밀번호 정책 패턴 적용: 폼 값 실시간 공유로 요약 정보 즉시 반영
 * - 탭 간 폼 상태 공유 (기본 정보 + 권한 매핑)
 * - 탭 전환 시 DB 값으로 리셋 지원
 */

import { type ReactNode, createContext, useContext } from 'react';
import { useBreadcrumbStore } from '@/shared-store';

/**
 * 역할 기본 정보 폼 값
 */
export interface RoleBasicFormValues {
  roleCode: string;
  roleName: string;
  description?: string;
  sortOrder?: number;
  isUse: boolean;
  canResetPassword: boolean;
  canManageResourceAccess: boolean;
}

/**
 * Context 값 타입
 */
interface RoleDetailContextValue {
  // 기본 정보 폼 값 (실시간)
  basicFormValues: Partial<RoleBasicFormValues>;
  setBasicFormValues: (values: Partial<RoleBasicFormValues>) => void;

  // 권한 선택 상태 (실시간)
  selectedPermissions: Set<string>;
  setSelectedPermissions: (permissions: Set<string>) => void;

  // DB 원본 데이터로 리셋 (탭 전환 시 사용)
  resetToServerData: () => void;
}

const RoleDetailContext = createContext<RoleDetailContextValue | null>(null);

export function RoleDetailProvider({ children, value }: { children: ReactNode; value: RoleDetailContextValue }) {
  return <RoleDetailContext.Provider value={value}>{children}</RoleDetailContext.Provider>;
}

export function useRoleDetailContext() {
  const context = useContext(RoleDetailContext);
  if (!context) {
    throw new Error('useRoleDetailContext must be used within RoleDetailProvider');
  }
  return context;
}
