import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LOG } from '@/log';

import { sharedApi } from '@/shared-api';
import { useAuthStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { usePageVariantsLoader } from './hooks/usePageVariantsLoader';
import { useRemoteRoutesLoader } from './hooks/useRemoteRoutesLoader';
import { useGetUserInfo, useGetWsTicket } from '../auth/hooks/useAuthQueries';
import { useGetNavigation } from '../common/hooks/useNavigationQueries';
import { useSessionSocket } from '../common/hooks/useSessionSocket';
import { useMenuLoader } from '../layout/hooks/useMenuLoader';
import { usePageMappingsLoader } from '../layout/hooks/usePageMappingsLoader';
import { useGetRoles } from '../management/hooks/useRoleQueries';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SharedInfoProvider');

export default function SharedInfoProvider({ children }: { children?: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { setRoleList, setUserInfo, setIsLoading, passwordExpiringWarning, setPasswordExpiringWarning } = useAuthStore();
  const { setNavigation } = useNavigationStore();
  const { data: userInfo, isLoading: isUserInfoLoading, error: userInfoError } = useGetUserInfo();
  const { data: roles, isLoading: isRolesLoading, error: rolesError } = useGetRoles();
  const { data: navigation, isLoading: isNavigationLoading, error: navigationError } = useGetNavigation();
  const { data: ticketResponse, isLoading: isWsTicketLoading, error: wsTicketError, refetch: refetchWsTicket } = useGetWsTicket();
  const { load: loadMenuConfigs } = useMenuLoader();
  const { load: loadRemoteRoutes } = useRemoteRoutesLoader();
  const { load: loadPageVariants } = usePageVariantsLoader();
  usePageMappingsLoader();

  const handleWsError = () => {
    const RETRY_DELAY = 5000;
    Log.error('Refetching WS ticket. retry delay: ', RETRY_DELAY);
    setTimeout(() => {
      refetchWsTicket();
    }, RETRY_DELAY);
  };

  useSessionSocket({
    ticket: ticketResponse?.ticket ?? null,
    onError: () => {
      handleWsError();
    },
  });

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
    loadMenuConfigs();
  }, [loadMenuConfigs]);

  useEffect(() => {
    loadRemoteRoutes();
  }, [loadRemoteRoutes]);

  useEffect(() => {
    loadPageVariants();
  }, [loadPageVariants]);

  useEffect(() => {
    setIsLoading(isRolesLoading || isUserInfoLoading);
  }, [isRolesLoading, isUserInfoLoading, setIsLoading]);

  useEffect(() => {
    if (ticketResponse) {
      Log.debug('Ws ticket fetched successfully. response: ', ticketResponse);
    }
  }, [ticketResponse]);

  // 에러 시 빈 데이터를 캐시에 설정하여 자식 컴포넌트의 무한 refetch 방지
  useEffect(() => {
    if (rolesError) {
      Log.error('Failed to fetch roles', rolesError);
      queryClient.setQueryData(sharedApi.role.queryKeys.getRoles().queryKey, []);
      setRoleList([]);
    }
  }, [rolesError, queryClient, setRoleList]);

  useEffect(() => {
    if (userInfoError) Log.error('Failed to fetch user info', userInfoError);
  }, [userInfoError]);

  useEffect(() => {
    if (navigationError) Log.error('Failed to fetch navigation', navigationError);
  }, [navigationError]);

  useEffect(() => {
    if (wsTicketError) Log.error('Failed to fetch ws ticket', wsTicketError);
  }, [wsTicketError]);

  // 비밀번호 만료 경고 토스트 표시 (로그인 후 메인 화면 진입 시)
  useEffect(() => {
    if (passwordExpiringWarning?.show && passwordExpiringWarning.daysUntilExpiration !== null) {
      toast.warning(`비밀번호가 ${passwordExpiringWarning.daysUntilExpiration}일 후 만료됩니다. 비밀번호를 변경해주세요.`);
      setPasswordExpiringWarning(null);
    }
  }, [passwordExpiringWarning, setPasswordExpiringWarning]);

  if (isRolesLoading || isUserInfoLoading || isNavigationLoading || isWsTicketLoading) {
    return <FallbackSpinner useFullScreen />;
  }

  return children ?? <Outlet />;
}
