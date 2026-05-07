import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import FcaWsSessionEventHandler from './features/router/FcaWsSessionEventHandler';
import { NotFound } from '@/components/custom/NotFound';

const Main = React.lazy(() => import('./pages/main/Main'));
const BotList = React.lazy(() => import('./pages/bot-config/BotList'));
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
const IntentStatistics = React.lazy(() => import('./pages/statistics/nlu/IntentStatistics'));
const EntityStatistics = React.lazy(() => import('./pages/statistics/nlu/EntityStatistics'));
const KeywordStatistics = React.lazy(() => import('./pages/statistics/nlu/KeywordStatistics'));
const BotDashboard = React.lazy(() => import('./pages/dashboard/BotDashboard'));
const BotDialogHistory = React.lazy(() => import('./pages/tracking/BotDialogHistory'));
const BotRealtime = React.lazy(() => import('./pages/tracking/BotRealtime'));
const DecryptLog = React.lazy(() => import('./pages/tracking/DecryptLog'));

const sharedModelRoutes = [
  { index: true, element: <Navigate to="list" replace /> },
  { path: 'list', element: <ModelList /> },
  { path: 'create', element: <ModelCreate /> },
  {
    path: ':modelId',
    element: <ModelDetailLayout />,
    children: [
      { index: true, element: <ModelDetail /> },
      {
        path: 'intent',
        children: [
          { index: true, element: <Navigate to=".." replace /> },
          { path: ':intentId', element: <IntentDetail /> },
        ],
      },
      {
        path: 'entity',
        children: [
          { index: true, element: <Navigate to=".." replace /> },
          { path: ':entityId', element: <EntityDetail /> },
        ],
      },
      {
        path: 'evaluation',
        children: [
          { index: true, element: <Navigate to=".." replace /> },
          { path: ':evalId', element: <EvaluationDetail /> },
        ],
      },
    ],
  },
];

export const routes = [
  {
    path: '/',
    element: <FcaWsSessionEventHandler />,
    children: [
      { index: true, element: <Navigate to="main" replace /> },
      { path: 'main', element: <Main /> },
      {
        path: 'bot-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="bot" replace /> },
          {
            path: 'bot',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <BotList /> },
              { path: 'create', element: <BotCreate /> },
              { path: ':serviceId', element: <BotDetail /> },
            ],
          },
          {
            path: 'model',
            children: [...sharedModelRoutes],
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
            children: [...sharedModelRoutes],
          },
          {
            path: 'env',
            element: <GlobalEnvList />,
          },
          {
            path: 'aoe',
            children: [
              { index: true, element: <Navigate to="config" replace /> },
              {
                path: 'config',
                children: [
                  { index: true, element: <AoeConfig /> },
                  { path: ':agentId/faq', element: <FaqDetail /> },
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
          { path: 'bot-dialog-history', element: <BotDialogHistory /> },
          { path: 'bot-realtime', element: <BotRealtime /> },
          { path: 'decrypt-log', element: <DecryptLog /> },
        ],
      },
      {
        path: 'dashboard',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="call-bot" replace /> },
          { path: 'call-bot', element: <BotDashboard /> },
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
              { path: 'service', element: <ServiceStatistics /> },
              { path: 'dialog', element: <DialogStatistics /> },
              { path: 'slot', element: <SlotStatistics /> },
            ],
          },
          {
            path: 'nlu',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="intent" replace /> },
              { path: 'intent', element: <IntentStatistics /> },
              { path: 'entity', element: <EntityStatistics /> },
              { path: 'keyword', element: <KeywordStatistics /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/fca" /> },
];
