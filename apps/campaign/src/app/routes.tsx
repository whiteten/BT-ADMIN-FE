import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const CampaignDashboard = React.lazy(() => import('./pages/dashboard/CampaignDashboard'));
const CampaignResultStatistics = React.lazy(() => import('./pages/statistics/CampaignResultStatistics'));
const CampaignIndividualResultStatistics = React.lazy(() => import('./pages/statistics/CampaignIndividualResultStatistics'));
const CampaignAchievementStatistics = React.lazy(() => import('./pages/statistics/CampaignAchievementStatistics'));
const CampaignList = React.lazy(() => import('./pages/management/CampaignList'));
const CampaignCreate = React.lazy(() => import('./pages/management/CampaignCreate'));
const CampaignDetail = React.lazy(() => import('./pages/management/CampaignDetail'));
const ScheduleManagement = React.lazy(() => import('./pages/schedule/ScheduleManagement'));
const ScheduleList = React.lazy(() => import('./pages/schedule/ScheduleList'));
const ReceiveFileList = React.lazy(() => import('./pages/execution/ReceiveFileList'));
const ExecutionManagement = React.lazy(() => import('./pages/execution/ExecutionManagement'));
const CampaignScenario = React.lazy(() => import('./pages/management/CampaignScenario'));
const CampaignScenarioDetail = React.lazy(() => import('./pages/management/CampaignScenarioDetail'));
const CampaignScenarioCreate = React.lazy(() => import('./pages/management/CampaignScenarioCreate'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="campaign-current" replace /> },
          { path: 'campaign-current', element: <CampaignDashboard /> },
        ],
      },
      {
        path: 'statistics',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="campaign-result" replace /> },
          { path: 'campaign-result', element: <CampaignResultStatistics /> },
          { path: 'campaign-individual-result', element: <CampaignIndividualResultStatistics /> },
          { path: 'achievement-result', element: <CampaignAchievementStatistics /> },
        ],
      },
      {
        path: 'management',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="basic-info" replace /> },
          { path: 'basic-info', element: <CampaignList /> },
          { path: 'create', element: <CampaignCreate /> },
          { path: ':campaignId', element: <CampaignDetail /> },
          { path: 'campaign-scenario', element: <CampaignScenario /> },
          { path: 'campaign-scenario/create', element: <CampaignScenarioCreate /> },
          { path: 'campaign-scenario/:scenarioId', element: <CampaignScenarioDetail /> },
        ],
      },
      {
        path: 'schedule',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="schedule-management" replace /> },
          { path: 'schedule-management', element: <ScheduleManagement /> },
          { path: 'schedule-list', element: <ScheduleList /> },
        ],
      },
      {
        path: 'execution',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="receive-file" replace /> },
          { path: 'receive-file', element: <ReceiveFileList /> },
          { path: 'execution-management', element: <ExecutionManagement /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
