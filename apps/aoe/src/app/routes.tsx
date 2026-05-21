import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { NotFound } from '@/components/custom/NotFound';

const AgentList = React.lazy(() => import('./pages/agent-config/AgentList'));
const AgentCreate = React.lazy(() => import('./pages/agent-config/AgentCreate'));
const AgentDetail = React.lazy(() => import('./pages/agent-config/AgentDetail'));
const ModelList = React.lazy(() => import('./pages/agent-config/ModelList'));
const ModelCreate = React.lazy(() => import('./pages/agent-config/ModelCreate'));
const ModelDetail = React.lazy(() => import('./pages/agent-config/ModelDetail'));
const KnowledgeList = React.lazy(() => import('./pages/agent-config/KnowledgeList'));
const KnowledgeCreate = React.lazy(() => import('./pages/agent-config/KnowledgeCreate'));
const KnowledgeDetail = React.lazy(() => import('./pages/agent-config/KnowledgeDetail'));
const EvalCreate = React.lazy(() => import('./pages/agent-config/EvalCreate'));
const EvalDetail = React.lazy(() => import('./pages/agent-config/EvalDetail'));
const ToolList = React.lazy(() => import('./pages/agent-config/ToolList'));
const ToolGroupDetail = React.lazy(() => import('./pages/agent-config/ToolGroupDetail'));
const A2AList = React.lazy(() => import('./pages/agent-config/A2AList'));
const A2ACreate = React.lazy(() => import('./pages/agent-config/A2ACreate'));
const A2ADetail = React.lazy(() => import('./pages/agent-config/A2ADetail'));
const McpList = React.lazy(() => import('./pages/agent-config/McpList'));
const McpCreate = React.lazy(() => import('./pages/agent-config/McpCreate'));
const McpDetail = React.lazy(() => import('./pages/agent-config/McpDetail'));

export const routes = [
  {
    path: '/',
    element: <Outlet />,
    children: [
      {
        index: true,
        element: <Navigate to="/" replace />,
      },
      {
        path: 'agent-config',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="agent" replace /> },
          {
            path: 'agent',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <AgentList /> },
              { path: 'create', element: <AgentCreate /> },
              { path: ':agentId', element: <AgentDetail /> },
            ],
          },
          {
            path: 'model',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ModelList /> },
              { path: 'create', element: <ModelCreate /> },
              { path: ':modelId', element: <ModelDetail /> },
            ],
          },
          {
            path: 'knowledge',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <KnowledgeList /> },
              { path: 'create', element: <KnowledgeCreate /> },
              { path: ':documentId', element: <KnowledgeDetail /> },
              { path: ':documentId/eval/create', element: <EvalCreate /> },
              { path: ':documentId/eval/:evalId', element: <EvalDetail /> },
            ],
          },
          {
            path: 'tool',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <ToolList /> },
              { path: ':groupId', element: <ToolGroupDetail /> },
            ],
          },
          {
            path: 'a2a',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <A2AList /> },
              { path: 'create', element: <A2ACreate /> },
              { path: ':a2aId', element: <A2ADetail /> },
            ],
          },
          {
            path: 'mcp',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: <McpList /> },
              { path: 'create', element: <McpCreate /> },
              { path: ':mcpId', element: <McpDetail /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
