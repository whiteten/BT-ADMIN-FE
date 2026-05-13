import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';
const Main = React.lazy(() => import('./pages/main/Main'));
const EmergProfilePage = React.lazy(() => import('./features/emerg-profile/pages/EmergProfilePage'));
const SipProfileListPage = React.lazy(() => import('./features/sip-profile/pages/SipProfileListPage'));
const SipProfileFormPage = React.lazy(() => import('./features/sip-profile/pages/SipProfileFormPage'));
const SipHeaderManagePage = React.lazy(() => import('./features/sip-profile/pages/SipHeaderManagePage'));
const EndpointListPage = React.lazy(() => import('./features/endpoint/pages/EndpointListPage'));
const EndpointFormPage = React.lazy(() => import('./features/endpoint/pages/EndpointFormPage'));
const EndpointDetailPage = React.lazy(() => import('./features/endpoint/pages/EndpointDetailPage'));
const RouteListPage = React.lazy(() => import('./features/route/pages/RouteListPage'));
const RouteFormPage = React.lazy(() => import('./features/route/pages/RouteFormPage'));
const MsGroupListPage = React.lazy(() => import('./features/ms-group/pages/MsGroupListPage'));
const MediaDeliveryListPage = React.lazy(() => import('./features/media-delivery/pages/MediaDeliveryListPage'));
const MediaDeliveryFormPage = React.lazy(() => import('./features/media-delivery/pages/MediaDeliveryFormPage'));
const AclListPage = React.lazy(() => import('./features/acl/pages/AclListPage'));
const DidTransListPage = React.lazy(() => import('./features/did-trans/pages/DidTransListPage'));
const PreNumTransListPage = React.lazy(() => import('./features/pre-num-trans/pages/PreNumTransListPage'));
const DidRouteListPage = React.lazy(() => import('./features/did-route/pages/DidRouteListPage'));
const DidRouteFormPage = React.lazy(() => import('./features/did-route/pages/DidRouteFormPage'));
const DodTransListPage = React.lazy(() => import('./features/dod-trans/pages/DodTransListPage'));
const CallScreenListPage = React.lazy(() => import('./features/call-screen/pages/CallScreenListPage'));
const McsDnisPage = React.lazy(() => import('./features/mcs-dnis/components/McsDnisPage'));
const DevfuncProfilePage = React.lazy(() => import('./features/devfunc-profile/pages/DevfuncProfilePage'));
const AccessProfilePage = React.lazy(() => import('./features/access-profile/pages/AccessProfilePage'));
const DnProfilePage = React.lazy(() => import('./features/dn-profile/pages/DnProfilePage'));
const DnProfileFormPage = React.lazy(() => import('./features/dn-profile/pages/DnProfileFormPage'));
const CosListPage = React.lazy(() => import('./features/cos/pages/CosListPage'));
const CosFormPage = React.lazy(() => import('./features/cos/pages/CosFormPage'));
const DnListPage = React.lazy(() => import('./features/dn/pages/DnListPage'));
const DnFormPage = React.lazy(() => import('./features/dn/pages/DnFormPage'));
const AdnListPage = React.lazy(() => import('./features/adn/pages/AdnListPage'));
const AdnFormPage = React.lazy(() => import('./features/adn/pages/AdnFormPage'));
const TrackingSearchPage = React.lazy(() => import('./features/tracking/components/TrackingSearchPage'));
const CallDetailPage = React.lazy(() => import('./features/tracking/components/CallDetailPage'));
export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="main" replace />,
      },
      {
        path: 'main',
        element: <Main />,
      },
      {
        path: 'profile/emerg-profile',
        element: <EmergProfilePage />,
      },
      {
        path: 'profile/sip-profile',
        element: <SipProfileListPage />,
      },
      {
        path: 'profile/sip-profile/create',
        element: <SipProfileFormPage />,
      },
      {
        path: 'profile/sip-profile/:id',
        element: <SipProfileFormPage />,
      },
      {
        path: 'profile/sip-profile/header-manage',
        element: <SipHeaderManagePage />,
      },
      {
        path: 'profile/devfunc-profile',
        element: <DevfuncProfilePage />,
      },
      {
        path: 'profile/access-profile',
        element: <AccessProfilePage />,
      },
      {
        path: 'profile/dn-profile',
        element: <DnProfilePage />,
      },
      {
        path: 'profile/dn-profile/create',
        element: <DnProfileFormPage />,
      },
      {
        path: 'profile/dn-profile/:id/edit',
        element: <DnProfileFormPage />,
      },
      {
        path: 'line/endpoint',
        element: <EndpointListPage />,
      },
      {
        path: 'line/endpoint/create',
        element: <EndpointFormPage />,
      },
      {
        path: 'line/endpoint/:id',
        element: <EndpointFormPage />,
      },
      {
        path: 'line/endpoint/:id/detail',
        element: <EndpointDetailPage />,
      },
      {
        path: 'line/route',
        element: <RouteListPage />,
      },
      {
        path: 'line/route/create',
        element: <RouteFormPage />,
      },
      {
        path: 'line/route/:id',
        element: <RouteFormPage />,
      },
      {
        path: 'line/ms-group',
        element: <MsGroupListPage />,
      },
      {
        path: 'line/media-delivery',
        element: <MediaDeliveryListPage />,
      },
      {
        path: 'line/media-delivery/form',
        element: <MediaDeliveryFormPage />,
      },
      {
        path: 'line/acl',
        element: <AclListPage />,
      },
      {
        path: 'line/did-trans',
        element: <DidTransListPage />,
      },
      {
        path: 'line/pre-num-trans',
        element: <PreNumTransListPage />,
      },
      {
        path: 'line/did-route',
        element: <DidRouteListPage />,
      },
      {
        path: 'line/did-route/form',
        element: <DidRouteFormPage />,
      },
      {
        path: 'line/did-route/form/:id',
        element: <DidRouteFormPage />,
      },
      {
        path: 'line/dod-trans',
        element: <DodTransListPage />,
      },
      {
        path: 'line/call-screen',
        element: <CallScreenListPage />,
      },
      {
        path: 'line/mcs-dnis',
        element: <McsDnisPage />,
      },
      {
        path: 'cos',
        element: <CosListPage />,
      },
      {
        path: 'cos/create',
        element: <CosFormPage />,
      },
      {
        path: 'cos/:cosId/edit',
        element: <CosFormPage />,
      },
      {
        path: 'dn',
        element: <DnListPage />,
      },
      {
        path: 'dn/create',
        element: <DnFormPage />,
      },
      {
        path: 'dn/:id/edit',
        element: <DnFormPage />,
      },
      {
        path: 'adn',
        element: <AdnListPage />,
      },
      {
        path: 'adn/create',
        element: <AdnFormPage />,
      },
      {
        path: 'adn/:id/edit',
        element: <AdnFormPage />,
      },
      {
        path: 'tracking',
        element: <TrackingSearchPage />,
      },
      {
        path: 'tracking/call/:ucid',
        element: <CallDetailPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/ipron" />,
  },
];
