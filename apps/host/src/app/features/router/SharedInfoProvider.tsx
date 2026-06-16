import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { LOG } from '@/log';

import { useAuthStore, useNavigationStore } from '@/shared-store';
import { toast } from '@/shared-util';
import { usePageVariantManifestLoader } from './hooks/usePageVariantManifestLoader';
import { useQuerySelectorsLoader } from './hooks/useQuerySelectorsLoader';
import { useRemoteRoutesLoader } from './hooks/useRemoteRoutesLoader';
import { useSiteCustomLoader } from './hooks/useSiteCustomLoader';
import { useGetUserInfo, useGetWsTicket } from '../auth/hooks/useAuthQueries';
import { useGetNavigation } from '../common/hooks/useNavigationQueries';
import { useSessionSocket } from '../common/hooks/useSessionSocket';
import { useMenuLoader } from '../layout/hooks/useMenuLoader';
import { usePageVariantsLoader } from '../layout/hooks/usePageVariantsLoader';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';

const Log = new LOG('SharedInfoProvider');

export default function SharedInfoProvider({ children }: { children?: React.ReactNode }) {
  const { setUserInfo, setIsLoading, passwordExpiringWarning, setPasswordExpiringWarning } = useAuthStore();
  const { setNavigation } = useNavigationStore();
  const { data: userInfo, isLoading: isUserInfoLoading, error: userInfoError } = useGetUserInfo();
  const { data: navigation, isLoading: isNavigationLoading, error: navigationError } = useGetNavigation();
  const { data: ticketResponse, isLoading: isWsTicketLoading, error: wsTicketError, refetch: refetchWsTicket } = useGetWsTicket();
  const { load: loadMenuConfigs } = useMenuLoader();
  const { load: loadRemoteRoutes } = useRemoteRoutesLoader();
  const { load: loadPageVariantManifest } = usePageVariantManifestLoader();
  const { load: loadQuerySelectors } = useQuerySelectorsLoader();
  const { load: loadSiteCustom } = useSiteCustomLoader();
  usePageVariantsLoader();

  const handleWsClose = () => {
    if (window.location.pathname === '/login') {
      Log.warn('WS closed on login page. Skip ticket refetch.');
      return;
    }
    const RETRY_DELAY = 5000;
    Log.warn('WS closed. Refetching WS ticket. retry delay: ', RETRY_DELAY);
    setTimeout(() => {
      refetchWsTicket();
    }, RETRY_DELAY);
  };

  useSessionSocket({
    ticket: ticketResponse?.ticket ?? null,
    onClose: () => {
      handleWsClose();
    },
  });

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
    loadPageVariantManifest();
  }, [loadPageVariantManifest]);

  useEffect(() => {
    loadQuerySelectors();
  }, [loadQuerySelectors]);

  useEffect(() => {
    loadSiteCustom();
  }, [loadSiteCustom]);

  useEffect(() => {
    setIsLoading(isUserInfoLoading);
  }, [isUserInfoLoading, setIsLoading]);

  useEffect(() => {
    if (ticketResponse) {
      Log.debug('Ws ticket fetched successfully. response: ', ticketResponse);
    }
  }, [ticketResponse]);

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

  if (isUserInfoLoading || isNavigationLoading || isWsTicketLoading) {
    return <FallbackSpinner useFullScreen />;
  }

  return children ?? <Outlet />;
}
