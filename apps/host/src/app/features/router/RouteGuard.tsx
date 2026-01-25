import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useGetRoles } from 'core/RoleHooks';
import { LOG } from '@/log';
import { useAuthStore } from '@/shared-store';
import { useGetUserInfo } from '../../features/auth/hooks/useAuthQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('RouteGuard');

export default function RouteGuard() {
  const { setUserInfo, setRoleList, setIsLoading } = useAuthStore();

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

  const { data: roles, isFetching: isFetchingRoles } = useGetRoles();

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

  // 역할 목록을 스토어에 저장
  useEffect(() => {
    if (roles) {
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
