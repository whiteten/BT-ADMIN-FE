import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LOG } from '@/log';

import { useAuthStore } from '@/shared-store';
import { useGetUserInfo } from '../auth/hooks/useAuthQueries';
import { useGetRoles } from '../management/hooks/useRoleQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SharedInfoProvider');

export default function SharedInfoProvider() {
  const { setRoleList, setUserInfo, setIsLoading } = useAuthStore();
  const { data: userInfo, isLoading: isUserInfoLoading, isError: isUserInfoError, error: userInfoError } = useGetUserInfo();
  const { data: roles, isLoading: isRolesLoading, isError: isRolesError, error: rolesError } = useGetRoles();

  useEffect(() => {
    if (roles) {
      Log.debug('Roles fetched successfully. roles: ', roles);
      setRoleList(roles);
    }
  }, [roles, setRoleList]);

  useEffect(() => {
    if (userInfo) {
      Log.debug('User info fetched successfully. userInfo: ', userInfo);
      setUserInfo(userInfo);
    }
  }, [userInfo, setUserInfo]);

  useEffect(() => {
    setIsLoading(isRolesLoading || isUserInfoLoading);
  }, [isRolesLoading, isUserInfoLoading, setIsLoading]);

  if (isRolesLoading || isUserInfoLoading) {
    return <FallbackSpinner useFullScreen />;
  }

  if (isRolesError || isUserInfoError) {
    if (rolesError) Log.error('Failed to fetch roles', rolesError);
    if (userInfoError) Log.error('Failed to fetch user info', userInfoError);
  }

  return <Outlet />;
}
