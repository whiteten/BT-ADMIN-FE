import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const CampaignDashboard = React.lazy(() => import('./pages/dashboard/CampaignDashboard'));
const CampaignResultStatistics = React.lazy(() => import('./pages/statistics/CampaignResultStatistics'));
const CampaignIndividualResultStatistics = React.lazy(() => import('./pages/statistics/CampaignIndividualResultStatistics'));
const CampaignAchievementStatistics = React.lazy(() => import('./pages/statistics/CampaignAchievementStatistics'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      {
        path: 'dashboard',
        children: [{ index: true, element: <CampaignDashboard /> }],
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
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
