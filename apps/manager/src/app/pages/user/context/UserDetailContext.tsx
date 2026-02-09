/**
 * 사용자 상세 페이지 Context
 * - 비밀번호 정책 패턴 적용: 폼 값 실시간 공유로 요약 정보 즉시 반영
 * - 탭 간 폼 상태 공유 (기본 정보 + 부가사항)
 * - 탭 전환 시 DB 값으로 리셋 지원
 */

import { type ReactNode, createContext, useContext } from 'react';
import type { User } from '../../../features/user/types/user.types';

/**
 * 사용자 기본 정보 폼 값
 */
export interface UserBasicFormValues {
  username: string;
  userAccount: string;
  roleId: number | null;
  accountStatus: string;
  description?: string;
}

/**
 * 사용자 부가사항 폼 값
 */
export interface UserAdditionalFormValues {
  phone?: string;
  email?: string;
  allowedIps?: string[];
}

/**
 * 개별 권한 통계 (Replacement 모델)
 */
export interface PermissionStats {
  roleAuthCount: number; // 역할 기본 권한 수
  selectedCount: number; // 현재 선택된 권한 수 (최종)
  savedAllowCount: number; // DB 저장된 개별 권한 수
  savedDenyCount: number; // 항상 0 (Replacement 모델에서는 DENY 개념 없음)
}

/**
 * 리소스 접근 통계
 */
export interface ResourceStats {
  botCount: number; // 할당된 봇 수
  modelCount: number; // 할당된 모델 수
}

/**
 * Context 값 타입
 */
interface UserDetailContextValue {
  // 사용자 데이터 (부모에서 조회, 탭에서 공유)
  user: User | undefined;
  isUserFetching: boolean;

  // 기본 정보 폼 값 (실시간)
  basicFormValues: Partial<UserBasicFormValues>;
  setBasicFormValues: (values: Partial<UserBasicFormValues>) => void;

  // 부가사항 폼 값 (실시간)
  additionalFormValues: Partial<UserAdditionalFormValues>;
  setAdditionalFormValues: (values: Partial<UserAdditionalFormValues>) => void;

  // 개별 권한 통계 (실시간)
  permissionStats: PermissionStats | null;
  setPermissionStats: (stats: PermissionStats | null) => void;

  // 리소스 접근 통계 (실시간)
  resourceStats: ResourceStats | null;
  setResourceStats: (stats: ResourceStats | null) => void;

  // DB 원본 데이터로 리셋 (탭 전환 시 사용)
  resetToServerData: () => void;
}

const UserDetailContext = createContext<UserDetailContextValue | null>(null);

export function UserDetailProvider({ children, value }: { children: ReactNode; value: UserDetailContextValue }) {
  return <UserDetailContext.Provider value={value}>{children}</UserDetailContext.Provider>;
}

export function useUserDetailContext() {
  const context = useContext(UserDetailContext);
  if (!context) {
    throw new Error('useUserDetailContext must be used within UserDetailProvider');
  }
  return context;
}
