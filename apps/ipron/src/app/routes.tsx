import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

// profile
const EmergProfileManage = React.lazy(() => import('./pages/profile/EmergProfileManage'));
const SipProfileList = React.lazy(() => import('./pages/profile/SipProfileList'));
const SipProfileForm = React.lazy(() => import('./pages/profile/SipProfileForm'));
const SipHeaderManage = React.lazy(() => import('./pages/profile/SipHeaderManage'));
const DevfuncProfileManage = React.lazy(() => import('./pages/profile/DevfuncProfileManage'));
const AccessProfileManage = React.lazy(() => import('./pages/profile/AccessProfileManage'));
const DnProfileList = React.lazy(() => import('./pages/profile/DnProfileList'));
const DnProfileForm = React.lazy(() => import('./pages/profile/DnProfileForm'));

// line
const EndpointList = React.lazy(() => import('./pages/line/EndpointList'));
const EndpointForm = React.lazy(() => import('./pages/line/EndpointForm'));
const RouteList = React.lazy(() => import('./pages/line/RouteList'));
const RouteForm = React.lazy(() => import('./pages/line/RouteForm'));
const MsGroupList = React.lazy(() => import('./pages/line/MsGroupList'));
const MediaDeliveryList = React.lazy(() => import('./pages/line/MediaDeliveryList'));
const MediaDeliveryForm = React.lazy(() => import('./pages/line/MediaDeliveryForm'));
const AclList = React.lazy(() => import('./pages/line/AclList'));
const DidTransList = React.lazy(() => import('./pages/line/DidTransList'));
const PreNumTransList = React.lazy(() => import('./pages/line/PreNumTransList'));
const DidRouteList = React.lazy(() => import('./pages/line/DidRouteList'));
const DidRouteForm = React.lazy(() => import('./pages/line/DidRouteForm'));
const DodTransList = React.lazy(() => import('./pages/line/DodTransList'));
const CallScreenList = React.lazy(() => import('./pages/line/CallScreenList'));
const McsDnis = React.lazy(() => import('./pages/line/McsDnis'));
const SipTrunkList = React.lazy(() => import('./pages/line/SipTrunkList'));
const CommonTrunkList = React.lazy(() => import('./pages/line/CommonTrunkList'));
const CtiQueueList = React.lazy(() => import('./pages/line/CtiQueueList'));
const MentMgmtList = React.lazy(() => import('./pages/line/MentMgmtList'));

// acd-gdn (ACD 그룹DN 관리 — SWAT IPR20S3010 + IPR20S3030, GDN_TYPE=16)
const AcdGdnList = React.lazy(() => import('./pages/acd-gdn/AcdGdnList'));

// cos
const CosList = React.lazy(() => import('./pages/cos/CosList'));
const CosForm = React.lazy(() => import('./pages/cos/CosForm'));

// dn
const DnList = React.lazy(() => import('./pages/dn/DnList'));
const DnForm = React.lazy(() => import('./pages/dn/DnForm'));

// adn
const AdnList = React.lazy(() => import('./pages/adn/AdnList'));
const AdnForm = React.lazy(() => import('./pages/adn/AdnForm'));

// agent-adn (상담사 로그인번호 관리 — SWAT IPR20S3011)
const AgentAdnList = React.lazy(() => import('./pages/agent-adn/AgentAdnList'));

// gdn (그룹DN 통합 관리 — ACD + CTI Queue + SIP TRUNK 3 메뉴 통폐합)
const GdnList = React.lazy(() => import('./pages/gdn/GdnList'));

// agent-master
const AgentMasterList = React.lazy(() => import('./pages/agent-master/AgentMasterList'));

// cti-code-mgmt (휴식/ACW 사유 — SWAT IPR20S4040 마이그레이션, 상담사 관리 폴더 하위)
const CtiCodeList = React.lazy(() => import('./pages/cti-code/CtiCodeList'));

// media-type (미디어타입 관리 — SWAT IPR10S6060, 상담사 관리 > 코드 관리 하위)
const MediaTypeList = React.lazy(() => import('./pages/media-type/MediaTypeList'));

// skill-assign (스킬배정)
const SkillAssignList = React.lazy(() => import('./pages/skill-assign/SkillAssignList'));

// skillset-master (스킬셋 관리 — SWAT IPR20S5010)
const SkillsetMasterList = React.lazy(() => import('./pages/skillset-master/SkillsetMasterList'));

// device (단말기관리 — SWAT IPR20S2110 + IPR20S2130, 단말모델관리 — IPR20S2120)
const DeviceList = React.lazy(() => import('./pages/device/DeviceList'));
const DeviceHistoryList = React.lazy(() => import('./pages/device/DeviceHistoryList'));
const DeviceModelList = React.lazy(() => import('./pages/device/DeviceModelList'));

// bsr-group (BSR 그룹 관리 — SWAT IPR20S3040)
const BsrGroupList = React.lazy(() => import('./pages/bsr-group/BsrGroupList'));

// bsr-ctiq-mapping (BSR 그룹별 CTI큐 배정 — SWAT IPR20S3060)
const BsrCtiqMappingList = React.lazy(() => import('./pages/bsr-ctiq-mapping/BsrCtiqMappingList'));

// tracking
const TrackingSearch = React.lazy(() => import('./pages/tracking/TrackingSearch'));
const CallDetail = React.lazy(() => import('./pages/tracking/CallDetail'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      {
        path: 'profile',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="emerg-profile" replace /> },
          { path: 'emerg-profile', element: <EmergProfileManage /> },
          {
            path: 'sip-profile',
            element: <Outlet />,
            children: [
              { index: true, element: <SipProfileList /> },
              { path: 'create', element: <SipProfileForm /> },
              { path: 'header-manage', element: <SipHeaderManage /> },
              { path: ':id', element: <SipProfileForm /> },
            ],
          },
          { path: 'devfunc-profile', element: <DevfuncProfileManage /> },
          { path: 'access-profile', element: <AccessProfileManage /> },
          {
            path: 'dn-profile',
            element: <Outlet />,
            children: [
              { index: true, element: <DnProfileList /> },
              { path: 'create', element: <DnProfileForm /> },
              { path: ':id/edit', element: <DnProfileForm /> },
            ],
          },
        ],
      },
      {
        path: 'line',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="endpoint" replace /> },
          {
            path: 'endpoint',
            element: <Outlet />,
            children: [
              { index: true, element: <EndpointList /> },
              { path: 'create', element: <EndpointForm /> },
              { path: ':id', element: <EndpointForm /> },
            ],
          },
          {
            path: 'route',
            element: <Outlet />,
            children: [
              { index: true, element: <RouteList /> },
              { path: 'create', element: <RouteForm /> },
              { path: ':id', element: <RouteForm /> },
            ],
          },
          { path: 'ms-group', element: <MsGroupList /> },
          {
            path: 'media-delivery',
            element: <Outlet />,
            children: [
              { index: true, element: <MediaDeliveryList /> },
              { path: 'form', element: <MediaDeliveryForm /> },
            ],
          },
          { path: 'acl', element: <AclList /> },
          { path: 'did-trans', element: <DidTransList /> },
          { path: 'pre-num-trans', element: <PreNumTransList /> },
          {
            path: 'did-route',
            element: <Outlet />,
            children: [
              { index: true, element: <DidRouteList /> },
              {
                path: 'form',
                element: <Outlet />,
                children: [
                  { index: true, element: <DidRouteForm /> },
                  { path: ':id', element: <DidRouteForm /> },
                ],
              },
            ],
          },
          { path: 'dod-trans', element: <DodTransList /> },
          { path: 'call-screen', element: <CallScreenList /> },
          { path: 'mcs-dnis', element: <McsDnis /> },
        ],
      },
      {
        path: 'cos',
        element: <Outlet />,
        children: [
          { index: true, element: <CosList /> },
          { path: 'create', element: <CosForm /> },
          { path: ':cosId/edit', element: <CosForm /> },
        ],
      },
      {
        path: 'dn',
        element: <Outlet />,
        children: [
          { index: true, element: <DnList /> },
          { path: 'create', element: <DnForm /> },
          { path: ':id/edit', element: <DnForm /> },
        ],
      },
      {
        path: 'adn',
        element: <Outlet />,
        children: [
          { index: true, element: <AdnList /> },
          { path: 'create', element: <AdnForm /> },
          { path: ':id/edit', element: <AdnForm /> },
        ],
      },
      {
        path: 'gdn',
        element: <GdnList />,
      },
      {
        path: 'acd-gdn',
        element: <AcdGdnList />,
      },
      {
        path: 'sip-trunk',
        element: <SipTrunkList />,
      },
      {
        path: 'common-trunk',
        element: <CommonTrunkList />,
      },
      {
        path: 'cti-queue',
        element: <CtiQueueList />,
      },
      {
        path: 'ment-mgmt',
        element: <MentMgmtList />,
      },
      {
        path: 'agent-master',
        element: <Outlet />,
        children: [{ index: true, element: <AgentMasterList /> }],
      },
      {
        path: 'cti-code-mgmt',
        element: <CtiCodeList />,
      },
      {
        path: 'media-type',
        element: <MediaTypeList />,
      },
      {
        path: 'skill-assign',
        element: <SkillAssignList />,
      },
      {
        path: 'agent-adn',
        element: <AgentAdnList />,
      },
      {
        path: 'skillset-master',
        element: <SkillsetMasterList />,
      },
      {
        path: 'device',
        element: <Outlet />,
        children: [
          { index: true, element: <DeviceList /> },
          { path: 'list', element: <DeviceList /> },
          { path: 'history', element: <DeviceHistoryList /> },
          { path: 'model', element: <DeviceModelList /> },
        ],
      },
      {
        path: 'bsr-group',
        element: <BsrGroupList />,
      },
      {
        path: 'bsr-ctiq-mapping',
        element: <BsrCtiqMappingList />,
      },
      {
        path: 'tracking',
        element: <Outlet />,
        children: [
          { index: true, element: <TrackingSearch /> },
          { path: 'call/:ucid', element: <CallDetail /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
