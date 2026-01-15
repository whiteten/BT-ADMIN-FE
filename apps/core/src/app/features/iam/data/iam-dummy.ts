/**
 * RBAC 권한 관리 시스템 더미 데이터
 */

import type { App, Permission, Role, UserAuth, UserRole } from '../types/iam.types';

// 앱 마스터 더미 데이터
export const appDummyData: App[] = [
  { appId: 'BOT', appName: '챗봇 관리', description: '챗봇 시나리오 및 대화 관리 시스템', sortOrder: 1, useYn: 'Y' },
  { appId: 'IC', appName: '인바운드 콜', description: '인바운드 콜센터 관리 시스템', sortOrder: 2, useYn: 'Y' },
  { appId: 'IR', appName: 'IVR 관리', description: 'IVR 시나리오 관리 시스템', sortOrder: 3, useYn: 'Y' },
  { appId: 'CM', appName: '공통 관리', description: '공통 설정 및 권한 관리', sortOrder: 4, useYn: 'Y' },
];

// 역할 마스터 더미 데이터
export const roleDummyData: Role[] = [
  {
    roleId: 1,
    roleCode: 'ADMIN',
    roleName: '시스템 관리자',
    description: '전체 시스템 관리 권한',
    sortOrder: 1,
    isUse: true,
    permissionCount: 35,
    userCount: 2,
    createdAt: '2025-01-01 00:00:00',
    createdBy: 'system',
  },
  {
    roleId: 2,
    roleCode: 'MANAGER',
    roleName: '운영 관리자',
    description: '운영 관련 전체 권한',
    sortOrder: 2,
    isUse: true,
    permissionCount: 20,
    userCount: 5,
    createdAt: '2025-01-01 00:00:00',
    createdBy: 'system',
  },
  {
    roleId: 3,
    roleCode: 'OPERATOR',
    roleName: '운영자',
    description: '일반 운영 권한',
    sortOrder: 3,
    isUse: true,
    permissionCount: 12,
    userCount: 15,
    createdAt: '2025-01-01 00:00:00',
    createdBy: 'system',
  },
  {
    roleId: 4,
    roleCode: 'VIEWER',
    roleName: '조회자',
    description: '조회 전용 권한',
    sortOrder: 4,
    isUse: true,
    permissionCount: 8,
    userCount: 30,
    createdAt: '2025-01-01 00:00:00',
    createdBy: 'system',
  },
];

// 권한 마스터 더미 데이터
export const permissionDummyData: Permission[] = [
  // BOT 앱 - 시나리오
  { authId: 1, appId: 'BOT', domain: 'scenario', resource: 'intent', action: 'read', authKey: 'BOT:scenario:intent:read', description: '인텐트 조회' },
  { authId: 2, appId: 'BOT', domain: 'scenario', resource: 'intent', action: 'write', authKey: 'BOT:scenario:intent:write', description: '인텐트 등록/수정' },
  { authId: 3, appId: 'BOT', domain: 'scenario', resource: 'intent', action: 'delete', authKey: 'BOT:scenario:intent:delete', description: '인텐트 삭제' },
  { authId: 4, appId: 'BOT', domain: 'scenario', resource: 'entity', action: 'read', authKey: 'BOT:scenario:entity:read', description: '엔티티 조회' },
  { authId: 5, appId: 'BOT', domain: 'scenario', resource: 'entity', action: 'write', authKey: 'BOT:scenario:entity:write', description: '엔티티 등록/수정' },
  { authId: 6, appId: 'BOT', domain: 'scenario', resource: 'entity', action: 'delete', authKey: 'BOT:scenario:entity:delete', description: '엔티티 삭제' },
  { authId: 7, appId: 'BOT', domain: 'scenario', resource: 'flow', action: 'read', authKey: 'BOT:scenario:flow:read', description: '대화흐름 조회' },
  { authId: 8, appId: 'BOT', domain: 'scenario', resource: 'flow', action: 'write', authKey: 'BOT:scenario:flow:write', description: '대화흐름 등록/수정' },
  { authId: 9, appId: 'BOT', domain: 'scenario', resource: 'flow', action: 'delete', authKey: 'BOT:scenario:flow:delete', description: '대화흐름 삭제' },
  // BOT 앱 - 통계
  { authId: 10, appId: 'BOT', domain: 'stat', resource: 'chat', action: 'read', authKey: 'BOT:stat:chat:read', description: '대화 통계 조회' },
  { authId: 11, appId: 'BOT', domain: 'stat', resource: 'perf', action: 'read', authKey: 'BOT:stat:perf:read', description: '성능 통계 조회' },
  { authId: 12, appId: 'BOT', domain: 'stat', resource: 'export', action: 'execute', authKey: 'BOT:stat:export:execute', description: '통계 내보내기' },
  // BOT 앱 - 설정
  { authId: 13, appId: 'BOT', domain: 'setting', resource: 'config', action: 'read', authKey: 'BOT:setting:config:read', description: '설정 조회' },
  { authId: 14, appId: 'BOT', domain: 'setting', resource: 'config', action: 'write', authKey: 'BOT:setting:config:write', description: '설정 수정' },
  // IC 앱 - 상담원
  { authId: 20, appId: 'IC', domain: 'agent', resource: 'list', action: 'read', authKey: 'IC:agent:list:read', description: '상담원 목록 조회' },
  { authId: 21, appId: 'IC', domain: 'agent', resource: 'list', action: 'write', authKey: 'IC:agent:list:write', description: '상담원 등록/수정' },
  { authId: 22, appId: 'IC', domain: 'agent', resource: 'status', action: 'read', authKey: 'IC:agent:status:read', description: '상담원 상태 조회' },
  { authId: 23, appId: 'IC', domain: 'agent', resource: 'status', action: 'write', authKey: 'IC:agent:status:write', description: '상담원 상태 변경' },
  // IC 앱 - 통화
  { authId: 24, appId: 'IC', domain: 'call', resource: 'history', action: 'read', authKey: 'IC:call:history:read', description: '통화 이력 조회' },
  { authId: 25, appId: 'IC', domain: 'call', resource: 'record', action: 'read', authKey: 'IC:call:record:read', description: '녹취 청취' },
  // CM 앱 - 사용자/역할 관리
  { authId: 30, appId: 'CM', domain: 'user', resource: 'list', action: 'read', authKey: 'CM:user:list:read', description: '사용자 목록 조회' },
  { authId: 31, appId: 'CM', domain: 'user', resource: 'list', action: 'write', authKey: 'CM:user:list:write', description: '사용자 등록/수정' },
  { authId: 32, appId: 'CM', domain: 'role', resource: 'list', action: 'read', authKey: 'CM:role:list:read', description: '역할 목록 조회' },
  { authId: 33, appId: 'CM', domain: 'role', resource: 'list', action: 'write', authKey: 'CM:role:list:write', description: '역할 등록/수정' },
  { authId: 34, appId: 'CM', domain: 'auth', resource: 'assign', action: 'execute', authKey: 'CM:auth:assign:execute', description: '권한 할당' },
];

// 사용자-역할 매핑 더미 데이터
export const userRoleDummyData: UserRole[] = [
  { userId: 'admin', roleId: 1, roleName: '시스템 관리자', roleCode: 'ADMIN', createdBy: 'system', createdAt: '2025-01-01' },
  { userId: 'hong.gildong', roleId: 2, roleName: '운영 관리자', roleCode: 'MANAGER', createdBy: 'admin', createdAt: '2025-01-15' },
  { userId: 'kim.chulsoo', roleId: 3, roleName: '운영자', roleCode: 'OPERATOR', createdBy: 'admin', createdAt: '2025-02-01' },
  { userId: 'lee.younghee', roleId: 3, roleName: '운영자', roleCode: 'OPERATOR', createdBy: 'admin', createdAt: '2025-02-01' },
  { userId: 'park.minsu', roleId: 4, roleName: '조회자', roleCode: 'VIEWER', createdBy: 'admin', createdAt: '2025-03-01' },
  { userId: 'choi.jisoo', roleId: 4, roleName: '조회자', roleCode: 'VIEWER', createdBy: 'admin', createdAt: '2025-03-01' },
];

// 사용자-권한 직접 매핑 더미 데이터 (User Override)
export const userAuthDummyData: UserAuth[] = [
  {
    id: 1,
    userId: 'hong.gildong',
    authId: 14,
    grantType: 'GRANT',
    reason: '프로젝트 기간 중 설정 권한 필요',
    effectiveFrom: '2025-01-01 00:00:00',
    effectiveTo: '2025-12-31 23:59:59',
    createdBy: 'admin',
    createdAt: '2025-01-01 10:00:00',
    authKey: 'BOT:setting:config:write',
    permDescription: '설정 수정',
    appId: 'BOT',
  },
  {
    id: 2,
    userId: 'kim.chulsoo',
    authId: 2,
    grantType: 'DENY',
    reason: '교육 완료 전까지 수정 권한 제한',
    effectiveFrom: undefined, // 즉시 적용
    effectiveTo: '2025-06-30 23:59:59',
    createdBy: 'admin',
    createdAt: '2025-05-01 10:00:00',
    authKey: 'BOT:scenario:intent:write',
    permDescription: '인텐트 등록/수정',
    appId: 'BOT',
  },
  {
    id: 3,
    userId: 'park.minsu',
    authId: 12,
    grantType: 'GRANT',
    reason: '월간 리포트 작성 업무',
    effectiveFrom: undefined, // 즉시 적용
    effectiveTo: undefined, // 무기한
    createdBy: 'admin',
    createdAt: '2025-04-01 10:00:00',
    authKey: 'BOT:stat:export:execute',
    permDescription: '통계 내보내기',
    appId: 'BOT',
  },
  {
    id: 4,
    userId: 'lee.younghee',
    authId: 25,
    grantType: 'DENY',
    reason: '개인정보 교육 미이수',
    effectiveFrom: undefined,
    effectiveTo: undefined,
    createdBy: 'admin',
    createdAt: '2025-04-15 10:00:00',
    authKey: 'IC:call:record:read',
    permDescription: '녹취 청취',
    appId: 'IC',
  },
  {
    id: 5,
    userId: 'choi.jisoo',
    authId: 8,
    grantType: 'GRANT',
    reason: '2월 프로젝트 투입 예정',
    effectiveFrom: '2026-02-01 00:00:00', // 예정된 권한
    effectiveTo: '2026-03-31 23:59:59',
    createdBy: 'admin',
    createdAt: '2025-01-20 10:00:00',
    authKey: 'BOT:scenario:flow:write',
    permDescription: '대화흐름 등록/수정',
    appId: 'BOT',
  },
  {
    id: 6,
    userId: 'hong.gildong',
    authId: 25,
    grantType: 'DENY',
    reason: '휴가 기간 녹취 접근 제한',
    effectiveFrom: '2024-12-20 00:00:00', // 만료된 권한
    effectiveTo: '2024-12-31 23:59:59',
    createdBy: 'admin',
    createdAt: '2024-12-15 10:00:00',
    authKey: 'IC:call:record:read',
    permDescription: '녹취 청취',
    appId: 'IC',
  },
];

// 역할별 권한 매핑 (roleId -> authId[])
export const rolePermissionMap: Record<number, number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 30, 31, 32, 33, 34], // ADMIN: 전체
  2: [1, 2, 4, 5, 7, 8, 10, 11, 12, 13, 20, 21, 22, 23, 24, 25, 30, 32], // MANAGER
  3: [1, 2, 4, 5, 7, 10, 11, 20, 22, 24], // OPERATOR
  4: [1, 4, 7, 10, 11, 20, 22, 24], // VIEWER
};

// 앱별 권한 그룹화 유틸리티
export function groupPermissionsByApp(permissions: Permission[]) {
  const grouped = permissions.reduce(
    (acc, perm) => {
      if (!acc[perm.appId]) {
        acc[perm.appId] = {};
      }
      if (!acc[perm.appId][perm.domain]) {
        acc[perm.appId][perm.domain] = [];
      }
      acc[perm.appId][perm.domain].push(perm);
      return acc;
    },
    {} as Record<string, Record<string, Permission[]>>,
  );

  return Object.entries(grouped).map(([appId, domains]) => ({
    appId,
    appName: appDummyData.find((a) => a.appId === appId)?.appName || appId,
    domains: Object.entries(domains).map(([domain, perms]) => ({
      domain,
      permissions: perms,
    })),
  }));
}
