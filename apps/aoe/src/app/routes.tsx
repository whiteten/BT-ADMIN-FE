import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Chromeless from '@/components/custom/Chromeless';
import { createPageVariantSocket } from '@/components/custom/DynamicElement';
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
const ToolGroupCreate = React.lazy(() => import('./pages/agent-config/ToolGroupCreate'));
const ToolGroupDetail = React.lazy(() => import('./pages/agent-config/ToolGroupDetail'));
const A2AList = React.lazy(() => import('./pages/agent-config/A2AList'));
const A2ACreate = React.lazy(() => import('./pages/agent-config/A2ACreate'));
const A2ADetail = React.lazy(() => import('./pages/agent-config/A2ADetail'));
const McpList = React.lazy(() => import('./pages/agent-config/McpList'));
const McpCreate = React.lazy(() => import('./pages/agent-config/McpCreate'));
const McpDetail = React.lazy(() => import('./pages/agent-config/McpDetail'));
const MonitoringDashboard = React.lazy(() => import('./pages/monitoring/MonitoringDashboard'));
const Chat = React.lazy(() => import('./pages/analysis/Chat'));
const WorkflowEdit = React.lazy(() => import('./pages/workflow/WorkflowEdit'));

// 변형 소켓 — path 인자는 화면 식별 키(라우트 경로 그대로, 동적 세그먼트 포함)
const pv = createPageVariantSocket('aoe');

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
              { path: 'list', element: pv('agent-config/agent/list', AgentList) },
              { path: 'create', element: pv('agent-config/agent/create', AgentCreate) },
              { path: ':agentId', element: pv('agent-config/agent/:agentId', AgentDetail) },
            ],
          },
          {
            path: 'model',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('agent-config/model/list', ModelList) },
              { path: 'create', element: pv('agent-config/model/create', ModelCreate) },
              { path: ':modelId', element: pv('agent-config/model/:modelId', ModelDetail) },
            ],
          },
          {
            path: 'knowledge',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('agent-config/knowledge/list', KnowledgeList) },
              { path: 'create', element: pv('agent-config/knowledge/create', KnowledgeCreate) },
              { path: ':documentId', element: pv('agent-config/knowledge/:documentId', KnowledgeDetail) },
              { path: ':documentId/eval/create', element: pv('agent-config/knowledge/:documentId/eval/create', EvalCreate) },
              { path: ':documentId/eval/:evalId', element: pv('agent-config/knowledge/:documentId/eval/:evalId', EvalDetail) },
            ],
          },
          {
            path: 'tool',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('agent-config/tool/list', ToolList) },
              { path: 'create', element: pv('agent-config/tool/create', ToolGroupCreate) },
              { path: ':groupId', element: pv('agent-config/tool/:groupId', ToolGroupDetail) },
            ],
          },
          {
            path: 'a2a',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('agent-config/a2a/list', A2AList) },
              { path: 'create', element: pv('agent-config/a2a/create', A2ACreate) },
              { path: ':a2aId', element: pv('agent-config/a2a/:a2aId', A2ADetail) },
            ],
          },
          {
            path: 'mcp',
            element: <Outlet />,
            children: [
              { index: true, element: <Navigate to="list" replace /> },
              { path: 'list', element: pv('agent-config/mcp/list', McpList) },
              { path: 'create', element: pv('agent-config/mcp/create', McpCreate) },
              { path: ':mcpId', element: pv('agent-config/mcp/:mcpId', McpDetail) },
            ],
          },
        ],
      },
      {
        path: 'monitoring',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="agent" replace /> },
          { path: 'agent', element: pv('monitoring/agent', MonitoringDashboard) },
        ],
      },
      {
        path: 'analysis',
        element: <Outlet />,
        children: [
          { index: true, element: <Navigate to="chat" replace /> },
          { path: 'chat', element: pv('analysis/chat', Chat) },
        ],
      },
      // 워크플로우 편집기 — 새창 chromeless 팝업. Layout 통과(antd 컨텍스트 확보) + Chromeless 래퍼가 chrome 제거.
      // pv 소켓으로 화면 키 유지(custom remote 오버라이드 가능), Chromeless 가 pv element 를 감싸 깜빡임 차단.
      { path: 'workflow/:agentId', element: <Chromeless>{pv('workflow/:agentId', WorkflowEdit)}</Chromeless> },
    ],
  },
  {
    path: '*',
    element: <NotFound homePath="/" />,
  },
];
