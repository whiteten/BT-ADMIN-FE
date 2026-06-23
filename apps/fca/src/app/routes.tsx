import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import FcaWsSessionEventHandler from './features/router/FcaWsSessionEventHandler';
import { botListVariants } from './pages/bot-config/BotList.variants';
import DynamicElement, { createPageVariantSocket } from '@/components/custom/DynamicElement';
import { NotFound } from '@/components/custom/NotFound';

const BotCreate = React.lazy(() => import('./pages/bot-config/BotCreate'));
const BotDetail = React.lazy(() => import('./pages/bot-config/BotDetail'));
const ModelCreate = React.lazy(() => import('./pages/bot-config/ModelCreate'));
const ModelDetail = React.lazy(() => import('./pages/bot-config/ModelDetail'));
const ModelDetailLayout = React.lazy(() => import('./pages/bot-config/ModelDetailLayout'));
const ModelList = React.lazy(() => import('./pages/bot-config/ModelList'));
const IntentDetail = React.lazy(() => import('./pages/bot-config/IntentDetail'));
const EntityDetail = React.lazy(() => import('./pages/bot-config/EntityDetail'));
const EvaluationDetail = React.lazy(() => import('./pages/bot-config/EvaluationDetail'));
const AoeConfig = React.lazy(() => import('./pages/global/AoeConfig'));
const FaqDetail = React.lazy(() => import('./pages/global/FaqDetail'));
const GlobalEnvList = React.lazy(() => import('./pages/global/GlobalEnvList'));
const ServiceStatistics = React.lazy(() => import('./pages/statistics/call-bot/ServiceStatistics'));
const DialogStatistics = React.lazy(() => import('./pages/statistics/call-bot/DialogStatistics'));
const SlotStatistics = React.lazy(() => import('./pages/statistics/call-bot/SlotStatistics'));
const UserDefStatistics = React.lazy(() => import('./pages/statistics/call-bot/UserDefStatistics'));
const IntentStatistics = React.lazy(() => import('./pages/statistics/nlu/IntentStatistics'));
const EntityStatistics = React.lazy(() => import('./pages/statistics/nlu/EntityStatistics'));
const KeywordStatistics = React.lazy(() => import('./pages/statistics/nlu/KeywordStatistics'));
const CampaignAchievementStatistics = React.lazy(() => import('./pages/statistics/campaign/CampaignAchievementStatistics'));
const CampaignResultStatistics = React.lazy(() => import('./pages/statistics/campaign/CampaignResultStatistics'));
const CampaignIndividualResultStatistics = React.lazy(() => import('./pages/statistics/campaign/CampaignIndividualResultStatistics'));
const BotDashboard = React.lazy(() => import('./pages/dashboard/BotDashboard'));
const CampaignDashboard = React.lazy(() => import('./pages/dashboard/CampaignDashboard'));
const BotDialogHistory = React.lazy(() => import('./pages/tracking/BotDialogHistory'));
const BotRealtime = React.lazy(() => import('./pages/tracking/BotRealtime'));
const DecryptLog = React.lazy(() => import('./pages/tracking/DecryptLog'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('fca');

export const routes = [
  {
    path: '/',
    element: <FcaWsSessionEventHandler />,
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      {
        path: 'bot-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="bot" replace /> },
          {
            path: 'bot',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <DynamicElement variants={botListVariants} /> },
              { path: 'create', element: pv('bot-config/bot/create', BotCreate) },
              { path: ':serviceId', element: pv('bot-config/bot/:serviceId', BotDetail) },
            ],
          },
          {
            path: 'model',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('bot-config/model/list', ModelList) },
              { path: 'create', element: pv('bot-config/model/create', ModelCreate) },
              {
                path: ':modelId',
                element: <ModelDetailLayout />,
                children: [
                  { index: true, element: pv('bot-config/model/:modelId', ModelDetail) },
                  {
                    path: 'intent',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':intentId', element: pv('bot-config/model/:modelId/intent/:intentId', IntentDetail) },
                    ],
                  },
                  {
                    path: 'entity',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':entityId', element: pv('bot-config/model/:modelId/entity/:entityId', EntityDetail) },
                    ],
                  },
                  {
                    path: 'evaluation',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':evalId', element: pv('bot-config/model/:modelId/evaluation/:evalId', EvaluationDetail) },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'global',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="model" replace /> },
          {
            path: 'model',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('global/model/list', ModelList) },
              { path: 'create', element: pv('global/model/create', ModelCreate) },
              {
                path: ':modelId',
                element: <ModelDetailLayout />,
                children: [
                  { index: true, element: pv('global/model/:modelId', ModelDetail) },
                  {
                    path: 'intent',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':intentId', element: pv('global/model/:modelId/intent/:intentId', IntentDetail) },
                    ],
                  },
                  {
                    path: 'entity',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':entityId', element: pv('global/model/:modelId/entity/:entityId', EntityDetail) },
                    ],
                  },
                  {
                    path: 'evaluation',
                    children: [
                      { index: true, element: <Navigate to=".." replace /> },
                      { path: ':evalId', element: pv('global/model/:modelId/evaluation/:evalId', EvaluationDetail) },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: 'env',
            element: pv('global/env', GlobalEnvList),
          },
          {
            path: 'aoe',
            children: [
              { index: true, element: <Navigate to="config" replace /> },
              {
                path: 'config',
                children: [
                  { index: true, element: pv('global/aoe/config', AoeConfig) },
                  { path: ':agentId/faq', element: pv('global/aoe/config/:agentId/faq', FaqDetail) },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'tracking',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="bot-realtime" replace /> },
          { path: 'bot-dialog-history', element: pv('tracking/bot-dialog-history', BotDialogHistory) },
          { path: 'bot-realtime', element: pv('tracking/bot-realtime', BotRealtime) },
          { path: 'decrypt-log', element: pv('tracking/decrypt-log', DecryptLog) },
        ],
      },
      {
        path: 'dashboard',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="call-bot" replace /> },
          { path: 'call-bot', element: pv('dashboard/call-bot', BotDashboard) },
          { path: 'call-campaign', element: pv('dashboard/call-campaign', CampaignDashboard) },
        ],
      },
      {
        path: 'statistics',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="call-bot/service" replace /> },
          {
            path: 'call-bot',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="service" replace /> },
              { path: 'service', element: pv('statistics/call-bot/service', ServiceStatistics) },
              { path: 'dialog', element: pv('statistics/call-bot/dialog', DialogStatistics) },
              { path: 'slot', element: pv('statistics/call-bot/slot', SlotStatistics) },
              { path: 'user-def', element: pv('statistics/call-bot/user-def', UserDefStatistics) },
            ],
          },
          {
            path: 'nlu',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="intent" replace /> },
              { path: 'intent', element: pv('statistics/nlu/intent', IntentStatistics) },
              { path: 'entity', element: pv('statistics/nlu/entity', EntityStatistics) },
              { path: 'keyword', element: pv('statistics/nlu/keyword', KeywordStatistics) },
            ],
          },
          {
            path: 'campaign',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="campaign-result" replace /> },
              { path: 'campaign-result', element: pv('statistics/campaign/campaign-result', CampaignResultStatistics) },
              { path: 'campaign-individual-result', element: pv('statistics/campaign/campaign-individual-result', CampaignIndividualResultStatistics) },
              { path: 'achievement-result', element: pv('statistics/campaign/achievement-result', CampaignAchievementStatistics) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
