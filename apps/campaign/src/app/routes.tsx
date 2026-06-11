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
      {
        path: 'management',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="campaign" replace /> },
          {
            path: 'campaign',
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <CampaignList /> },
              { path: 'create', element: <CampaignCreate /> },
              { path: ':campaignId', element: <CampaignDetail /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound homePath="/" /> },
];
