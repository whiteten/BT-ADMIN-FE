import {
  AlertTriangle,
  BookOpen,
  Bot,
  CircleDot,
  Code,
  Database,
  ExternalLink,
  FileCode,
  FileText,
  GitMerge,
  Globe,
  type LucideIcon,
  MessageCircle,
  MessageSquare,
  Repeat,
  Share2,
  Shield,
  SplitSquareVertical,
  Workflow,
} from 'lucide-react';

export type NodeGroup = 'system' | 'ai' | 'logic' | 'transform' | 'utility' | 'error';

export interface NodeKindMeta {
  kind: string;
  label: string;
  group: NodeGroup;
  icon: LucideIcon;
  description?: string;
  color: string;
  /** 현재 사용 가능한 노드인지 여부. false 이면 팔레트에서 회색·드래그 불가로 표시. */
  enabled: boolean;
}

export const NODE_GROUP_LABELS: Record<NodeGroup, string> = {
  system: '시스템',
  ai: 'AI',
  logic: '논리',
  transform: '변환',
  utility: '유틸리티',
  error: '오류',
};

export const NODE_GROUP_ORDER: NodeGroup[] = ['system', 'ai', 'logic', 'transform', 'utility', 'error'];

export const NODE_KINDS: NodeKindMeta[] = [
  { kind: 'start', label: '시작', group: 'system', icon: CircleDot, description: '워크플로우 시작', color: '#3B82F6', enabled: false },
  { kind: 'answer', label: '답변', group: 'system', icon: MessageCircle, description: '응답 출력', color: '#10B981', enabled: false },

  { kind: 'llm', label: 'LLM', group: 'ai', icon: Bot, description: 'AI 모델 처리', color: '#3B82F6', enabled: true },
  { kind: 'a2a_agent', label: 'A2A', group: 'ai', icon: Share2, description: 'Agent to Agent 통신', color: '#3B82F6', enabled: true },
  { kind: 'knowledgeSearch', label: '지식검색', group: 'ai', icon: BookOpen, description: '지식 베이스 검색', color: '#3B82F6', enabled: true },
  { kind: 'guardrail', label: '가드레일', group: 'ai', icon: Shield, description: '입력/출력 가드레일', color: '#3B82F6', enabled: true },

  { kind: 'condition', label: '조건', group: 'logic', icon: SplitSquareVertical, description: '조건부 분기', color: '#10B981', enabled: true },
  { kind: 'ifNode', label: 'If', group: 'logic', icon: Workflow, description: 'If 분기', color: '#10B981', enabled: false },
  { kind: 'recursive', label: '반복', group: 'logic', icon: Repeat, description: '반복 실행', color: '#10B981', enabled: false },
  { kind: 'merge', label: '병합', group: 'logic', icon: GitMerge, description: '병합 실행', color: '#10B981', enabled: false },

  { kind: 'code', label: 'Code', group: 'transform', icon: Code, description: '코드 실행', color: '#F59E0B', enabled: true },
  { kind: 'convertFile', label: '파일 변환', group: 'transform', icon: FileText, description: '파일 변환', color: '#F59E0B', enabled: false },
  { kind: 'docExtract', label: 'DOC 추출', group: 'transform', icon: FileCode, description: '문서 추출', color: '#F59E0B', enabled: false },

  { kind: 'databaseSearch', label: '데이터베이스', group: 'utility', icon: Database, description: '데이터베이스 검색', color: '#0EA5A2', enabled: true },
  { kind: 'http', label: 'HTTP', group: 'utility', icon: Globe, description: 'HTTP 요청', color: '#8B5CF6', enabled: true },
  { kind: 'subNode', label: 'Sub Node', group: 'utility', icon: ExternalLink, description: '서브 노드 실행', color: '#8B5CF6', enabled: false },
  { kind: 'memo', label: '메모', group: 'utility', icon: MessageSquare, description: '메모', color: '#F59E0B', enabled: true },

  { kind: 'error', label: '오류', group: 'error', icon: AlertTriangle, description: '오류 처리', color: '#F06548', enabled: true },
];

export const NODE_KINDS_BY_GROUP: Record<NodeGroup, NodeKindMeta[]> = NODE_GROUP_ORDER.reduce(
  (acc, group) => {
    acc[group] = NODE_KINDS.filter((nk) => nk.group === group);
    return acc;
  },
  {} as Record<NodeGroup, NodeKindMeta[]>,
);

export const NODE_KIND_MAP: Record<string, NodeKindMeta> = NODE_KINDS.reduce(
  (acc, meta) => {
    acc[meta.kind] = meta;
    return acc;
  },
  {} as Record<string, NodeKindMeta>,
);

export const DEFAULT_NODE_KIND: NodeKindMeta = {
  kind: 'unknown',
  label: '알 수 없음',
  group: 'utility',
  icon: Workflow,
  color: '#9CA3AF',
  enabled: false,
};

export const NODE_DRAG_MIME = 'application/aoe-node-kind';
