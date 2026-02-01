import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LOG } from '@/log';

import { useAuthStore, useNavigationStore } from '@/shared-store';
import { useGetUserInfo, useGetWsTicket } from '../auth/hooks/useAuthQueries';
import { useGetNavigation } from '../common/hooks/useNavigationQueries';
import { useGetRoles } from '../management/hooks/useRoleQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SharedInfoProvider');

export default function SharedInfoProvider() {
  const { setRoleList, setUserInfo, setIsLoading } = useAuthStore();
  const { setNavigation } = useNavigationStore();
  const { data: userInfo, isLoading: isUserInfoLoading, error: userInfoError } = useGetUserInfo();
  const { data: roles, isLoading: isRolesLoading, error: rolesError } = useGetRoles();
  const { data: navigation, isLoading: isNavigationLoading, error: navigationError } = useGetNavigation();
  const { data: wsTicket, isLoading: isWsTicketLoading, error: wsTicketError } = useGetWsTicket();

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
    if (navigation) {
      Log.debug('Navigation fetched successfully. navigation: ', navigation);
      setNavigation(navigation);
    }
  }, [navigation, setNavigation]);

  useEffect(() => {
    setIsLoading(isRolesLoading || isUserInfoLoading);
  }, [isRolesLoading, isUserInfoLoading, setIsLoading]);

  useEffect(() => {
    if (wsTicket) {
      Log.debug('Ws ticket fetched successfully. wsTicket: ', wsTicket);
    }
  }, [wsTicket]);

  useEffect(() => {
    if (rolesError) Log.error('Failed to fetch roles', rolesError);
  }, [rolesError]);

  useEffect(() => {
    if (userInfoError) Log.error('Failed to fetch user info', userInfoError);
  }, [userInfoError]);

  useEffect(() => {
    if (navigationError) Log.error('Failed to fetch navigation', navigationError);
  }, [navigationError]);

  useEffect(() => {
    if (wsTicketError) Log.error('Failed to fetch ws ticket', wsTicketError);
  }, [wsTicketError]);

  if (isRolesLoading || isUserInfoLoading || isNavigationLoading || isWsTicketLoading) {
    return <FallbackSpinner useFullScreen />;
  }

  return <Outlet />;
}
