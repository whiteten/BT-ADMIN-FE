import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useGetRoles } from 'core/RoleHooks';
import { LOG } from '@/log';
import { useAuthStore } from '@/shared-store';
import { useGetUserInfo } from '../../features/auth/hooks/useAuthQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('RouteGuard');

export default function RouteGuard() {
  // Zustand 셀렉터 사용: setter 함수만 구독하여 불필요한 재렌더링 방지
  const setUserInfo = useAuthStore((state) => state.setUserInfo);
  const setRoleList = useAuthStore((state) => state.setRoleList);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  const {
    data: userInfo,
    isFetching: isFetchingUser,
    isError: isUserError,
    error: userError,
  } = useGetUserInfo({
    queryOptions: {
      refetchInterval: 5 * 60 * 1000, // 5분마다 재조회
    },
  });

  const { data: roles, isFetching: isFetchingRoles } = useGetRoles({
    queryOptions: {
      staleTime: Infinity, // 역할 목록은 세션 동안 변경되지 않으므로 항상 fresh 유지
      gcTime: Infinity, // gcTime: 0 전역 설정 오버라이드 - 캐시 유지
    },
  });

  const isLoading = isFetchingUser || isFetchingRoles;

  // 사용자 정보를 스토어에 저장
  useEffect(() => {
    if (userInfo) {
      Log.debug('User info fetched successfully. userInfo: ', userInfo);
      setUserInfo({
        userAccount: userInfo.userAccount,
        username: userInfo.username,
        userId: userInfo.userId,
        tenant: userInfo.tenant,
        roles: userInfo.roles,
      });
    }
  }, [userInfo, setUserInfo]);

  // 역할 목록을 스토어에 저장 (최초 1회만)
  useEffect(() => {
    if (roles) {
      const currentRoleList = useAuthStore.getState().roleList;
      // 이미 역할 목록이 있으면 업데이트하지 않음 (무한 루프 방지)
      if (currentRoleList.length > 0) return;
      Log.debug('Roles fetched successfully. roles: ', roles);
      setRoleList(
        roles.map((role) => ({
          roleId: role.roleId,
          roleCode: role.roleCode,
          roleName: role.roleName,
        })),
      );
    }
  }, [roles, setRoleList]);

  // 로딩 상태를 스토어에 저장
  useEffect(() => {
    setIsLoading(isLoading);
  }, [isLoading, setIsLoading]);

  if (isLoading) {
    return <FallbackSpinner useFullScreen />;
  }
  if (isUserError) {
    Log.error('Failed to get user info', userError);
    return <Navigate to="/login" />;
  }
  return <Outlet />;
}
