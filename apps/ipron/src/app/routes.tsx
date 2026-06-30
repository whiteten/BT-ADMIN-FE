import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
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

// dn-status (교환기 번호자원 현황 — 서버 카드 위상도)
const DnResourceStatus = React.lazy(() => import('./pages/dn-status/DnResourceStatus'));

// adn (등록/수정은 우측 Drawer 로 전환 — 전체페이지 라우트 폐지, 목록 라우트만 유지)
const AdnList = React.lazy(() => import('./pages/adn/AdnList'));

// agent-adn (상담사 로그인번호 관리 — SWAT IPR20S3011)
const AgentAdnList = React.lazy(() => import('./pages/agent-adn/AgentAdnList'));

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

// agent-schedule (상담사/상담그룹 스케줄 관리 — SWAT IPR20S4010/IPR20S4020 스케줄 탭 통합)
const AgentScheduleList = React.lazy(() => import('./pages/agent-schedule/AgentScheduleList'));

// device (단말기관리 — SWAT IPR20S2110 + IPR20S2130, 단말모델관리 — IPR20S2120)
const DeviceList = React.lazy(() => import('./pages/device/DeviceList'));
const DeviceHistoryList = React.lazy(() => import('./pages/device/DeviceHistoryList'));
const DeviceModelList = React.lazy(() => import('./pages/device/DeviceModelList'));

// bsr-group-manage (BSR 그룹 관리 통합 — v3 신규, 구 bsr-group + bsr-ctiq-mapping 폐기)
const BsrGroupManage = React.lazy(() => import('./pages/bsr-group/BsrGroupManage'));

// tracking
const TrackingSearch = React.lazy(() => import('./pages/tracking/TrackingSearch'));
const CallDetail = React.lazy(() => import('./pages/tracking/CallDetail'));
const TrackingAuditPage = React.lazy(() => import('./features/tracking-audit/components/TrackingAuditPage'));

// agent-state-log (상담사 상태 로그 보기 — ipron-tracking-agent-journey)
const AgentStateLog = React.lazy(() => import('./pages/agent-state-log/AgentStateLog'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('ipron');

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
          { path: 'emerg-profile', element: pv('profile/emerg-profile', EmergProfileManage) },
          {
            path: 'sip-profile',
            element: <Outlet />,
            children: [
              { index: true, element: pv('profile/sip-profile', SipProfileList) },
              { path: 'create', element: pv('profile/sip-profile/create', SipProfileForm) },
              { path: 'header-manage', element: pv('profile/sip-profile/header-manage', SipHeaderManage) },
              { path: ':id', element: pv('profile/sip-profile/:id', SipProfileForm) },
            ],
          },
          { path: 'devfunc-profile', element: pv('profile/devfunc-profile', DevfuncProfileManage) },
          { path: 'access-profile', element: pv('profile/access-profile', AccessProfileManage) },
          {
            path: 'dn-profile',
            element: <Outlet />,
            children: [
              { index: true, element: pv('profile/dn-profile', DnProfileList) },
              { path: 'create', element: pv('profile/dn-profile/create', DnProfileForm) },
              { path: ':id/edit', element: pv('profile/dn-profile/:id/edit', DnProfileForm) },
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
              { index: true, element: pv('line/endpoint', EndpointList) },
              { path: 'create', element: pv('line/endpoint/create', EndpointForm) },
              { path: ':id', element: pv('line/endpoint/:id', EndpointForm) },
            ],
          },
          {
            path: 'route',
            element: <Outlet />,
            children: [
              { index: true, element: pv('line/route', RouteList) },
              { path: 'create', element: pv('line/route/create', RouteForm) },
              { path: ':id', element: pv('line/route/:id', RouteForm) },
            ],
          },
          { path: 'ms-group', element: pv('line/ms-group', MsGroupList) },
          {
            path: 'media-delivery',
            element: <Outlet />,
            children: [
              { index: true, element: pv('line/media-delivery', MediaDeliveryList) },
              { path: 'form', element: pv('line/media-delivery/form', MediaDeliveryForm) },
            ],
          },
          { path: 'acl', element: pv('line/acl', AclList) },
          { path: 'did-trans', element: pv('line/did-trans', DidTransList) },
          { path: 'pre-num-trans', element: pv('line/pre-num-trans', PreNumTransList) },
          {
            path: 'did-route',
            element: <Outlet />,
            children: [
              { index: true, element: pv('line/did-route', DidRouteList) },
              {
                path: 'form',
                element: <Outlet />,
                children: [
                  { index: true, element: pv('line/did-route/form', DidRouteForm) },
                  { path: ':id', element: pv('line/did-route/form/:id', DidRouteForm) },
                ],
              },
            ],
          },
          { path: 'dod-trans', element: pv('line/dod-trans', DodTransList) },
          { path: 'call-screen', element: pv('line/call-screen', CallScreenList) },
          { path: 'mcs-dnis', element: pv('line/mcs-dnis', McsDnis) },
        ],
      },
      {
        path: 'cos',
        element: <Outlet />,
        children: [
          { index: true, element: pv('cos', CosList) },
          { path: 'create', element: pv('cos/create', CosForm) },
          { path: ':cosId/edit', element: pv('cos/:cosId/edit', CosForm) },
        ],
      },
      {
        path: 'dn',
        element: <Outlet />,
        children: [
          { index: true, element: pv('dn', DnList) },
          { path: 'create', element: pv('dn/create', DnForm) },
          { path: ':id/edit', element: pv('dn/:id/edit', DnForm) },
        ],
      },
      {
        path: 'dn-status',
        element: pv('dn-status', DnResourceStatus),
      },
      {
        path: 'adn',
        element: pv('adn', AdnList),
      },
      {
        path: 'acd-gdn',
        element: pv('acd-gdn', AcdGdnList),
      },
      {
        path: 'sip-trunk',
        element: pv('sip-trunk', SipTrunkList),
      },
      {
        path: 'common-trunk',
        element: pv('common-trunk', CommonTrunkList),
      },
      {
        path: 'cti-queue',
        element: pv('cti-queue', CtiQueueList),
      },
      {
        path: 'ment-mgmt',
        element: pv('ment-mgmt', MentMgmtList),
      },
      {
        path: 'agent-master',
        element: <Outlet />,
        children: [{ index: true, element: pv('agent-master', AgentMasterList) }],
      },
      {
        path: 'cti-code-mgmt',
        element: pv('cti-code-mgmt', CtiCodeList),
      },
      {
        path: 'media-type',
        element: pv('media-type', MediaTypeList),
      },
      {
        path: 'skill-assign',
        element: pv('skill-assign', SkillAssignList),
      },
      {
        path: 'agent-adn',
        element: pv('agent-adn', AgentAdnList),
      },
      {
        path: 'skillset-master',
        element: pv('skillset-master', SkillsetMasterList),
      },
      {
        path: 'agent-schedule',
        element: pv('agent-schedule', AgentScheduleList),
      },
      {
        path: 'device',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="device-config/list" replace /> },
          {
            path: 'device-config',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('device/device-config/list', DeviceList) },
            ],
          },
          {
            path: 'device-history',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('device/device-history/list', DeviceHistoryList) },
            ],
          },
          {
            path: 'device-model',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('device/device-model/list', DeviceModelList) },
            ],
          },
        ],
      },
      {
        path: 'bsr-group-mgmt',
        element: pv('bsr-group-mgmt', BsrGroupManage),
      },
      {
        path: 'tracking',
        element: <Outlet />,
        children: [
          { index: true, element: pv('tracking', TrackingSearch) },
          { path: 'call/:ucid', element: pv('tracking/call/:ucid', CallDetail) },
          { path: 'agent-state-log', element: pv('tracking/agent-state-log', AgentStateLog) },
        ],
      },
      {
        path: 'tracking-audit',
        element: <TrackingAuditPage />,
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
