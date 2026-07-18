import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import TaskboardTenantBar from '../../features/board/components/TaskboardTenantBar';
import TenantBadge from '../../features/board/components/TenantBadge';
import { taskboardQueryKeys, useCreateTaskboardBg, useDeleteTaskboardBg, useGetTaskboardBg } from '../../features/board/hooks/useTaskboardQueries';
import { useTaskboardWriteGuard } from '../../features/board/hooks/useTaskboardWriteGuard';
import type { LayoutTemplate, LayoutZone, TaskboardBg } from '../../features/board/types/taskboard.types';
import { FallbackSpinner } from '@/components/custom/FallbackSpinner';
import { IconEdit, IconTrash } from '@/components/custom/Icons';

// ─── 20종 기본 레이아웃 템플릿 ───────────────────────────────────────────────
const PRESET_LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'dashboard',
    name: '대시보드형',
    description: '헤더 + 4카드 + 콘텐츠',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'c1', label: '카드1', x: 0, y: 14, width: 23, height: 22, color: '#1e3a5f' },
      { id: 'c2', label: '카드2', x: 25, y: 14, width: 23, height: 22, color: '#1e3a5f' },
      { id: 'c3', label: '카드3', x: 50, y: 14, width: 23, height: 22, color: '#1e3a5f' },
      { id: 'c4', label: '카드4', x: 75, y: 14, width: 25, height: 22, color: '#1e3a5f' },
      { id: 'content', label: '콘텐츠', x: 0, y: 38, width: 100, height: 60, color: '#172554' },
    ],
  },
  {
    id: 'status-board',
    name: '현황판형',
    description: '헤더 + 좌측 리스트 + 우측 지표',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 14, color: '#0f5b9e' },
      { id: 'sidebar', label: '좌측', x: 0, y: 16, width: 38, height: 82, color: '#1e3a5f' },
      { id: 'main', label: '우측', x: 40, y: 16, width: 60, height: 82, color: '#172554' },
    ],
  },
  {
    id: 'stats',
    name: '통계형',
    description: '헤더 + 차트 + 테이블',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'chart', label: '차트', x: 0, y: 14, width: 100, height: 45, color: '#1e3a5f' },
      { id: 'table', label: '테이블', x: 0, y: 61, width: 100, height: 37, color: '#172554' },
    ],
  },
  {
    id: 'notice',
    name: '알림판형',
    description: '헤더 + 좌우 분할',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 20, color: '#0f5b9e' },
      { id: 'left', label: '좌측', x: 0, y: 22, width: 49, height: 76, color: '#1e3a5f' },
      { id: 'right', label: '우측', x: 51, y: 22, width: 49, height: 76, color: '#172554' },
    ],
  },
  { id: 'fullscreen', name: '풀스크린형', description: '전체 단일 패널', zones: [{ id: 'full', label: '전체', x: 0, y: 0, width: 100, height: 100, color: '#172554' }] },
  {
    id: 'three-col',
    name: '3분할형',
    description: '헤더 + 3컬럼',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 14, color: '#0f5b9e' },
      { id: 'col1', label: '컬럼1', x: 0, y: 16, width: 32, height: 82, color: '#1e3a5f' },
      { id: 'col2', label: '컬럼2', x: 34, y: 16, width: 32, height: 82, color: '#1e3a5f' },
      { id: 'col3', label: '컬럼3', x: 68, y: 16, width: 32, height: 82, color: '#172554' },
    ],
  },
  {
    id: 'six-cards',
    name: '6카드형',
    description: '헤더 + 6카드 (2×3)',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'c1', label: '카드1', x: 0, y: 14, width: 32, height: 40, color: '#1e3a5f' },
      { id: 'c2', label: '카드2', x: 34, y: 14, width: 32, height: 40, color: '#1e3a5f' },
      { id: 'c3', label: '카드3', x: 68, y: 14, width: 32, height: 40, color: '#1e3a5f' },
      { id: 'c4', label: '카드4', x: 0, y: 56, width: 32, height: 42, color: '#172554' },
      { id: 'c5', label: '카드5', x: 34, y: 56, width: 32, height: 42, color: '#172554' },
      { id: 'c6', label: '카드6', x: 68, y: 56, width: 32, height: 42, color: '#172554' },
    ],
  },
  {
    id: 'side-cards',
    name: '사이드카드형',
    description: '헤더 + 좌측 메인 + 우측 4카드',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'main', label: '메인', x: 0, y: 14, width: 60, height: 84, color: '#172554' },
      { id: 'rc1', label: '우측1', x: 62, y: 14, width: 38, height: 19, color: '#1e3a5f' },
      { id: 'rc2', label: '우측2', x: 62, y: 35, width: 38, height: 19, color: '#1e3a5f' },
      { id: 'rc3', label: '우측3', x: 62, y: 56, width: 38, height: 19, color: '#1e3a5f' },
      { id: 'rc4', label: '우측4', x: 62, y: 77, width: 38, height: 21, color: '#1e3a5f' },
    ],
  },
  {
    id: 'top-bottom',
    name: '상하분할형',
    description: '상단 + 하단 3카드',
    zones: [
      { id: 'top', label: '상단', x: 0, y: 0, width: 100, height: 55, color: '#172554' },
      { id: 'b1', label: '하단1', x: 0, y: 57, width: 32, height: 41, color: '#1e3a5f' },
      { id: 'b2', label: '하단2', x: 34, y: 57, width: 32, height: 41, color: '#1e3a5f' },
      { id: 'b3', label: '하단3', x: 68, y: 57, width: 32, height: 41, color: '#1e3a5f' },
    ],
  },
  {
    id: 'double-header',
    name: '이중헤더형',
    description: '큰 헤더 + 서브헤더 + 콘텐츠',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 18, color: '#0f5b9e' },
      { id: 'sub', label: '서브헤더', x: 0, y: 20, width: 100, height: 10, color: '#1e3a5f' },
      { id: 'content', label: '콘텐츠', x: 0, y: 32, width: 100, height: 66, color: '#172554' },
    ],
  },
  {
    id: 'grid-3x3',
    name: '그리드형 3×3',
    description: '헤더 + 9셀 그리드',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'g1', label: '셀1', x: 0, y: 14, width: 32, height: 28, color: '#1e3a5f' },
      { id: 'g2', label: '셀2', x: 34, y: 14, width: 32, height: 28, color: '#1e3a5f' },
      { id: 'g3', label: '셀3', x: 68, y: 14, width: 32, height: 28, color: '#1e3a5f' },
      { id: 'g4', label: '셀4', x: 0, y: 44, width: 32, height: 28, color: '#172554' },
      { id: 'g5', label: '셀5', x: 34, y: 44, width: 32, height: 28, color: '#172554' },
      { id: 'g6', label: '셀6', x: 68, y: 44, width: 32, height: 28, color: '#172554' },
      { id: 'g7', label: '셀7', x: 0, y: 74, width: 32, height: 24, color: '#1e3a5f' },
      { id: 'g8', label: '셀8', x: 34, y: 74, width: 32, height: 24, color: '#1e3a5f' },
      { id: 'g9', label: '셀9', x: 68, y: 74, width: 32, height: 24, color: '#1e3a5f' },
    ],
  },
  {
    id: 'right-sidebar',
    name: '우측사이드형',
    description: '헤더 + 메인 + 우측 사이드바',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 14, color: '#0f5b9e' },
      { id: 'main', label: '메인', x: 0, y: 16, width: 60, height: 82, color: '#172554' },
      { id: 'sidebar', label: '사이드바', x: 62, y: 16, width: 38, height: 82, color: '#1e3a5f' },
    ],
  },
  {
    id: 'agent-status',
    name: '에이전트현황형',
    description: '헤더 + 에이전트 목록 + 3지표',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 14, color: '#0f5b9e' },
      { id: 'agents', label: '에이전트', x: 0, y: 16, width: 55, height: 82, color: '#172554' },
      { id: 'm1', label: '지표1', x: 57, y: 16, width: 43, height: 25, color: '#1e3a5f' },
      { id: 'm2', label: '지표2', x: 57, y: 43, width: 43, height: 25, color: '#1e3a5f' },
      { id: 'm3', label: '지표3', x: 57, y: 70, width: 43, height: 28, color: '#1e3a5f' },
    ],
  },
  {
    id: 'feature-main',
    name: '2+1형',
    description: '헤더 + 큰 영역 + 작은 패널 2개',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 14, color: '#0f5b9e' },
      { id: 'main', label: '메인', x: 0, y: 16, width: 68, height: 82, color: '#172554' },
      { id: 'p1', label: '패널(상)', x: 70, y: 16, width: 30, height: 40, color: '#1e3a5f' },
      { id: 'p2', label: '패널(하)', x: 70, y: 58, width: 30, height: 40, color: '#1e3a5f' },
    ],
  },
  {
    id: 'quad',
    name: '4분할형',
    description: '4개 동일 영역',
    zones: [
      { id: 'q1', label: '영역1', x: 0, y: 0, width: 49, height: 49, color: '#1e3a5f' },
      { id: 'q2', label: '영역2', x: 51, y: 0, width: 49, height: 49, color: '#172554' },
      { id: 'q3', label: '영역3', x: 0, y: 51, width: 49, height: 49, color: '#172554' },
      { id: 'q4', label: '영역4', x: 51, y: 51, width: 49, height: 49, color: '#1e3a5f' },
    ],
  },
  {
    id: 't-shape',
    name: 'T자형',
    description: '상단 넓은 영역 + 하단 2분할',
    zones: [
      { id: 'top', label: '상단', x: 0, y: 0, width: 100, height: 50, color: '#172554' },
      { id: 'bl', label: '하단 좌', x: 0, y: 52, width: 49, height: 46, color: '#1e3a5f' },
      { id: 'br', label: '하단 우', x: 51, y: 52, width: 49, height: 46, color: '#1e3a5f' },
    ],
  },
  {
    id: 'banner',
    name: '배너형',
    description: '큰 배너 + 콘텐츠 영역',
    zones: [
      { id: 'banner', label: '배너', x: 0, y: 0, width: 100, height: 35, color: '#0f5b9e' },
      { id: 'content', label: '콘텐츠', x: 0, y: 37, width: 100, height: 61, color: '#172554' },
    ],
  },
  {
    id: 'center-focus',
    name: '센터포커스형',
    description: '헤더 + 중앙 강조 + 양 사이드',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'left', label: '좌측', x: 0, y: 14, width: 20, height: 84, color: '#1e3a5f' },
      { id: 'center', label: '중앙', x: 22, y: 14, width: 56, height: 84, color: '#172554' },
      { id: 'right', label: '우측', x: 80, y: 14, width: 20, height: 84, color: '#1e3a5f' },
    ],
  },
  {
    id: 'five-cards',
    name: '5카드+푸터형',
    description: '헤더 + 5카드 + 하단 바',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'c1', label: '카드1', x: 0, y: 14, width: 19, height: 70, color: '#1e3a5f' },
      { id: 'c2', label: '카드2', x: 20, y: 14, width: 19, height: 70, color: '#1e3a5f' },
      { id: 'c3', label: '카드3', x: 40, y: 14, width: 19, height: 70, color: '#1e3a5f' },
      { id: 'c4', label: '카드4', x: 60, y: 14, width: 19, height: 70, color: '#1e3a5f' },
      { id: 'c5', label: '카드5', x: 80, y: 14, width: 20, height: 70, color: '#1e3a5f' },
      { id: 'footer', label: '푸터', x: 0, y: 86, width: 100, height: 12, color: '#172554' },
    ],
  },
  {
    id: 'call-center',
    name: '콜센터종합형',
    description: '헤더 + 대기큐 + 에이전트 + 4지표',
    zones: [
      { id: 'header', label: '헤더', x: 0, y: 0, width: 100, height: 12, color: '#0f5b9e' },
      { id: 'queue', label: '대기큐', x: 0, y: 14, width: 35, height: 55, color: '#172554' },
      { id: 'agents', label: '에이전트', x: 37, y: 14, width: 63, height: 55, color: '#1e3a5f' },
      { id: 'mt1', label: '지표1', x: 0, y: 71, width: 24, height: 27, color: '#1e3a5f' },
      { id: 'mt2', label: '지표2', x: 26, y: 71, width: 24, height: 27, color: '#1e3a5f' },
      { id: 'mt3', label: '지표3', x: 52, y: 71, width: 24, height: 27, color: '#1e3a5f' },
      { id: 'mt4', label: '지표4', x: 78, y: 71, width: 22, height: 27, color: '#1e3a5f' },
    ],
  },
];

const RESOLUTIONS = {
  HD: { width: 1280, height: 720, label: 'HD (1280x720)' },
  FHD: { width: 1920, height: 1080, label: 'FHD (1920x1080)' },
  QHD: { width: 2560, height: 1440, label: 'QHD (2560x1440)' },
};
type ResolutionKey = keyof typeof RESOLUTIONS;

interface PreviewImage {
  id: number;
  url: string;
  previewUrl?: string;
  res: ResolutionKey;
}
interface CiPos {
  xPct: number;
  yPct: number;
  sizePct: number;
  opacity: number;
}

const ZONE_COLORS = ['#0f5b9e', '#1e3a5f', '#172554', '#1e293b', '#0891b2', '#059669', '#7c3aed', '#dc2626', '#d97706'];

// CI 색상 HSL 변환 헬퍼 (배경 테마 동적 생성용)
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [rn, gn, bn] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((rn + m) * 255), Math.round((gn + m) * 255), Math.round((bn + m) * 255)];
};

const dataURLtoFile = (dataurl: string, filename: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};

// ─── 셀 트리 구조 (비대칭 분할 지원) ─────────────────────────────────────────
interface CellNode {
  id: string;
  label: string;
  color: string;
  split?: {
    dir: 'h' | 'v';
    pos: number; // 0–100: 이 셀 내에서의 비율
    a: CellNode;
    b: CellNode;
  };
}

interface DividerInfo {
  nodeId: string; // split 을 소유한 노드 id
  dir: 'h' | 'v';
  absPos: number; // 캔버스 전체 기준 % 위치
  lineStart: number; // 선의 시작 % (가로선→x%, 세로선→y%)
  lineEnd: number; // 선의 끝 %
  cellX: number;
  cellY: number;
  cellW: number;
  cellH: number; // 부모 셀 bounds (%)
}

const getLeafCells = (node: CellNode, x: number, y: number, w: number, h: number): Array<LayoutZone & { nodeId: string }> => {
  if (!node.split) return [{ id: node.id, nodeId: node.id, label: node.label, x, y, width: w, height: h, color: node.color }];
  const { dir, pos, a, b } = node.split;
  if (dir === 'h') {
    const sp = (pos / 100) * h;
    return [...getLeafCells(a, x, y, w, sp), ...getLeafCells(b, x, y + sp, w, h - sp)];
  }
  const sp = (pos / 100) * w;
  return [...getLeafCells(a, x, y, sp, h), ...getLeafCells(b, x + sp, y, w - sp, h)];
};

const getNodeDividers = (node: CellNode, x: number, y: number, w: number, h: number): DividerInfo[] => {
  if (!node.split) return [];
  const { dir, pos, a, b } = node.split;
  const result: DividerInfo[] = [
    {
      nodeId: node.id,
      dir,
      absPos: dir === 'h' ? y + (pos / 100) * h : x + (pos / 100) * w,
      lineStart: dir === 'h' ? x : y,
      lineEnd: dir === 'h' ? x + w : y + h,
      cellX: x,
      cellY: y,
      cellW: w,
      cellH: h,
    },
  ];
  if (dir === 'h') {
    const sp = (pos / 100) * h;
    return [...result, ...getNodeDividers(a, x, y, w, sp), ...getNodeDividers(b, x, y + sp, w, h - sp)];
  }
  const sp = (pos / 100) * w;
  return [...result, ...getNodeDividers(a, x, y, sp, h), ...getNodeDividers(b, x + sp, y, w - sp, h)];
};

const splitCellNode = (node: CellNode, targetId: string, dir: 'h' | 'v', colorList: string[]): CellNode => {
  if (node.id === targetId) {
    const t = Date.now();
    const idx = colorList.indexOf(node.color);
    return {
      ...node,
      split: {
        dir,
        pos: 50,
        a: { id: `${targetId}-a-${t}`, label: node.label + '-A', color: colorList[(idx + 1) % colorList.length] },
        b: { id: `${targetId}-b-${t + 1}`, label: node.label + '-B', color: colorList[(idx + 2) % colorList.length] },
      },
    };
  }
  if (!node.split) return node;
  return { ...node, split: { ...node.split, a: splitCellNode(node.split.a, targetId, dir, colorList), b: splitCellNode(node.split.b, targetId, dir, colorList) } };
};

const removeSplitNode = (node: CellNode, targetNodeId: string): CellNode => {
  if (node.id === targetNodeId && node.split) return { id: node.id, label: node.label, color: node.color };
  if (!node.split) return node;
  return { ...node, split: { ...node.split, a: removeSplitNode(node.split.a, targetNodeId), b: removeSplitNode(node.split.b, targetNodeId) } };
};

const updateDividerPos = (node: CellNode, targetNodeId: string, newPos: number): CellNode => {
  if (node.id === targetNodeId && node.split) return { ...node, split: { ...node.split, pos: Math.max(5, Math.min(95, newPos)) } };
  if (!node.split) return node;
  return { ...node, split: { ...node.split, a: updateDividerPos(node.split.a, targetNodeId, newPos), b: updateDividerPos(node.split.b, targetNodeId, newPos) } };
};

const renameCellNode = (node: CellNode, targetId: string, label: string): CellNode => {
  if (node.id === targetId) return { ...node, label };
  if (!node.split) return node;
  return { ...node, split: { ...node.split, a: renameCellNode(node.split.a, targetId, label), b: renameCellNode(node.split.b, targetId, label) } };
};

const breadcrumb = [{ title: '전광판 관리' }, { title: '배경 관리', path: '/taskboard/board/task-bg' }];

export default function TaskBg() {
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<ResolutionKey>('FHD');
  const [, setUploadedFile] = useState<File | null>(null);
  const [originalImgUrl, setOriginalImgUrl] = useState('');
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedLayout, setSelectedLayout] = useState<LayoutTemplate>(PRESET_LAYOUT_TEMPLATES[0]);
  const { guardWrite } = useTaskboardWriteGuard();
  const { data: tasBoardList = [], isLoading } = useGetTaskboardBg();
  const { mutateAsync: createBgMutate } = useCreateTaskboardBg();
  const { mutateAsync: deleteBgMutate } = useDeleteTaskboardBg();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ciPos, setCiPos] = useState<CiPos>({ xPct: 80, yPct: 80, sizePct: 12, opacity: 0.8 });

  // CI 미리보기 드래그
  const ciPreviewRef = useRef<HTMLDivElement>(null);
  const ciDragRef = useRef<{ startX: number; startY: number; startXPct: number; startYPct: number } | null>(null);

  const handleCiPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = ciPreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    ciDragRef.current = { startX: e.clientX, startY: e.clientY, startXPct: ciPos.xPct, startYPct: ciPos.yPct };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCiPointerMove = (e: React.PointerEvent) => {
    const drag = ciDragRef.current;
    if (!drag) return;
    const rect = ciPreviewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    setCiPos((p) => ({ ...p, xPct: Math.max(0, Math.min(90, drag.startXPct + dx)), yPct: Math.max(0, Math.min(90, drag.startYPct + dy)) }));
  };

  const handleCiPointerUp = () => {
    ciDragRef.current = null;
  };

  // ── 커스텀 레이아웃 빌더 상태 (셀 트리 방식 — 비대칭 분할 지원) ──────────
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [rootCell, setRootCell] = useState<CellNode>({ id: 'root', label: '전체', color: ZONE_COLORS[0] });
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [customLayouts, setCustomLayouts] = useState<LayoutTemplate[]>([]);
  const [customLayoutName, setCustomLayoutName] = useState('커스텀 레이아웃');
  const customCanvasRef = useRef<HTMLDivElement>(null);
  const dividerDragRef = useRef<{ nodeId: string; dir: 'h' | 'v'; cellX: number; cellY: number; cellW: number; cellH: number; startClient: number; startPos: number } | null>(null);

  const directUploadInputRef = useRef<HTMLInputElement>(null);
  const allLayoutTemplates = [...PRESET_LAYOUT_TEMPLATES, ...customLayouts];

  // 선택 해상도 ref (stale closure 방지)
  const selectedResRef = useRef(selectedRes);
  useEffect(() => {
    selectedResRef.current = selectedRes;
  }, [selectedRes]);

  // ── 셀 분할 / 제거 ─────────────────────────────────────────────────────────
  const handleSplitCell = (cellId: string, dir: 'h' | 'v') => {
    setRootCell((prev) => splitCellNode(prev, cellId, dir, ZONE_COLORS));
    setSelectedCellId(null);
  };

  const handleRemoveSplit = (nodeId: string) => {
    setRootCell((prev) => removeSplitNode(prev, nodeId));
  };

  // ── 분할선 드래그 ──────────────────────────────────────────────────────────
  const handleDividerDragStart = (div: DividerInfo, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = customCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cellPxStart = div.dir === 'h' ? rect.top + (div.cellY / 100) * rect.height : rect.left + (div.cellX / 100) * rect.width;
    const cellPxSize = div.dir === 'h' ? (div.cellH / 100) * rect.height : (div.cellW / 100) * rect.width;
    const currentClientPos = div.dir === 'h' ? e.clientY : e.clientX;
    const startPos = ((currentClientPos - cellPxStart) / cellPxSize) * 100;
    dividerDragRef.current = { nodeId: div.nodeId, dir: div.dir, cellX: div.cellX, cellY: div.cellY, cellW: div.cellW, cellH: div.cellH, startClient: currentClientPos, startPos };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDividerDragMove = (e: React.PointerEvent) => {
    const drag = dividerDragRef.current;
    if (!drag) return;
    const el = customCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cellPxStart = drag.dir === 'h' ? rect.top + (drag.cellY / 100) * rect.height : rect.left + (drag.cellX / 100) * rect.width;
    const cellPxSize = drag.dir === 'h' ? (drag.cellH / 100) * rect.height : (drag.cellW / 100) * rect.width;
    const newPos = (((drag.dir === 'h' ? e.clientY : e.clientX) - cellPxStart) / cellPxSize) * 100;
    setRootCell((prev) => updateDividerPos(prev, drag.nodeId, newPos));
  };

  const handleDividerDragEnd = () => {
    dividerDragRef.current = null;
  };

  const saveCustomLayout = () => {
    const cells = getLeafCells(rootCell, 0, 0, 100, 100);
    if (cells.length <= 1) {
      toast.error('셀을 2개 이상 분할하세요.');
      return;
    }
    const name = customLayoutName.trim() || `커스텀 ${customLayouts.length + 1}`;
    const newLayout: LayoutTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description: `직접 만든 레이아웃 (${cells.length}개 영역)`,
      zones: cells.map(({ nodeId: _n, ...zone }) => zone),
    };
    setCustomLayouts((prev) => [...prev, newLayout]);
    setSelectedLayout(newLayout);
    setIsCustomBuilderOpen(false);
    setRootCell({ id: 'root', label: '전체', color: ZONE_COLORS[0] });
    setSelectedCellId(null);
    setCustomLayoutName('커스텀 레이아웃');
    toast.success(`"${name}" 레이아웃이 추가되었습니다.`);
  };

  // ── 직접 업로드 ────────────────────────────────────────────────────────────
  const handleDirectUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!guardWrite()) return; // 다중 테넌트 View 중엔 배경 등록(생성) 차단
    try {
      const requestData: TaskboardBg = {
        tenantId: '2000000001',
        pageId: 0,
        pageName: `직접 업로드 ${Date.now().toString().slice(-4)}`,
        genType: 'DIRECT',
        useYn: 'Y',
        regDt: new Date().toISOString(),
        fileName: '',
      };
      await createBgMutate({ params: { data: JSON.stringify(requestData) }, data: file });
      toast.success('정상적으로 저장되었습니다!');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList._def });
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.');
    } finally {
      if (directUploadInputRef.current) directUploadInputRef.current.value = '';
    }
  };

  const handleAutoFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewImages([]);
      setProgress(0);
      const reader = new FileReader();
      reader.onload = (evt) => setOriginalImgUrl(evt.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    try {
      await deleteBgMutate(deleteTargetId);
      toast.success('성공적으로 삭제되었습니다.');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList._def });
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteTargetId(null);
    }
  };

  // ── CI 색상 추출 ──────────────────────────────────────────────────────────
  const extractDominantColor = (img: HTMLImageElement): [number, number, number] => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [15, 91, 158];
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let maxSat = -1,
      bR = 15,
      bG = 91,
      bB = 158;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (max - min >= 20 && sat > maxSat && max > 50 && max < 240) {
        maxSat = sat;
        bR = r;
        bG = g;
        bB = b;
      }
    }
    return [bR, bG, bB];
  };

  const drawRoundedZone = (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, r = 8) => {
    ctx.beginPath();
    ctx.moveTo(zx + r, zy);
    ctx.lineTo(zx + zw - r, zy);
    ctx.quadraticCurveTo(zx + zw, zy, zx + zw, zy + r);
    ctx.lineTo(zx + zw, zy + zh - r);
    ctx.quadraticCurveTo(zx + zw, zy + zh, zx + zw - r, zy + zh);
    ctx.lineTo(zx + r, zy + zh);
    ctx.quadraticCurveTo(zx, zy + zh, zx, zy + zh - r);
    ctx.lineTo(zx, zy + r);
    ctx.quadraticCurveTo(zx, zy, zx + r, zy);
    ctx.closePath();
  };

  // ── 자동생성 (20종 완전 다른 시각 테마) ───────────────────────────────────
  const handleAnalyze = () => {
    if (!originalImgUrl) {
      alert('CI 이미지를 먼저 업로드해주세요.');
      return;
    }
    setIsAnalyzing(true);
    setProgress(0);
    setPreviewImages([]);

    const img = new Image();
    img.onload = async () => {
      const [r, g, b] = extractDominantColor(img);
      const resKey = selectedResRef.current;
      const { width: w, height: h } = RESOLUTIONS[resKey];
      const newPreviews: PreviewImage[] = [];

      // CI 색상 HSL 분석 — 배경 테마 색조를 CI에 맞게 조정
      const [hue, ciSat] = rgbToHsl(r, g, b);
      const themeSat = Math.max(0.35, Math.min(0.75, ciSat));

      // ── 방송 전광판 스타일 공통 헬퍼 — 해상도 무관 두께/반경 스케일(FHD 기준 1.0, 4K 2.0)
      const scale = w / 1920;
      const zoneRadius = Math.max(8, 12 * scale);

      /** 모서리를 어둡게(비네트) — 화면 중앙으로 시선을 모아 깊이감을 만든다 */
      const vignette = (ctx: CanvasRenderingContext2D, strength: number) => {
        const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.78);
        grd.addColorStop(0, 'rgba(0,0,0,0)');
        grd.addColorStop(1, `rgba(0,0,0,${strength})`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      };

      /** 색이 번지는 원형 글로우(스튜디오 조명 느낌) — 배경에 여러 개 겹쳐 오로라 효과 */
      const glow = (ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, rgb: [number, number, number], alpha: number) => {
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
        grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      };

      /** 미세 도트 그리드 — 방송 세트 배경의 LED 질감 */
      const dotGrid = (ctx: CanvasRenderingContext2D, color: string, step: number) => {
        ctx.fillStyle = color;
        const s = step * scale;
        const dotR = Math.max(1, 1.2 * scale);
        for (let py = s / 2; py < h; py += s) {
          for (let px = s / 2; px < w; px += s) {
            ctx.beginPath();
            ctx.arc(px, py, dotR, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };

      /** 대각선 라이트 스윕 — 화면을 가로지르는 은은한 빛줄기(생동감 포인트) */
      const lightSweep = (ctx: CanvasRenderingContext2D, alpha: number) => {
        const grd = ctx.createLinearGradient(0, h, w, 0);
        grd.addColorStop(0.35, 'rgba(255,255,255,0)');
        grd.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
        grd.addColorStop(0.65, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, w, h);
      };

      // 5가지 배경 테마 × 4가지 존 스타일 = 20종 (CI 색조 기반, 조명/깊이감 포함)
      const bgThemes = [
        // 0: 오로라 글로우 다크 — CI 색조 + 인접 색조 조명 2~3개를 겹쳐 스튜디오 배경처럼
        (ctx: CanvasRenderingContext2D) => {
          const [dr, dg, db] = hslToRgb(hue, themeSat * 0.5, 0.06);
          ctx.fillStyle = `rgb(${dr},${dg},${db})`;
          ctx.fillRect(0, 0, w, h);
          glow(ctx, w * 0.18, h * 0.08, w * 0.5, hslToRgb(hue, themeSat, 0.42), 0.22);
          glow(ctx, w * 0.88, h * 0.95, w * 0.55, hslToRgb((hue + 40) % 360, themeSat, 0.38), 0.18);
          glow(ctx, w * 0.72, h * 0.12, w * 0.28, hslToRgb((hue + 320) % 360, themeSat * 0.8, 0.5), 0.09);
          vignette(ctx, 0.38);
        },
        // 1: 스포트라이트 딥 블랙 — 상단 중앙에서 CI 색 조명이 내려오는 무대 느낌 + LED 도트 질감
        (ctx: CanvasRenderingContext2D) => {
          const [dr, dg, db] = hslToRgb(hue, themeSat * 0.2, 0.035);
          ctx.fillStyle = `rgb(${dr},${dg},${db})`;
          ctx.fillRect(0, 0, w, h);
          glow(ctx, w * 0.5, -h * 0.18, w * 0.65, hslToRgb(hue, themeSat * 0.9, 0.5), 0.26);
          dotGrid(ctx, 'rgba(255,255,255,0.022)', 26);
          vignette(ctx, 0.42);
        },
        // 2: 라이트 스튜디오 — 밝은 베이스에 CI 틴트 조명을 은은하게(라이트 모드 전광판)
        (ctx: CanvasRenderingContext2D) => {
          const [lr, lg, lb] = hslToRgb(hue, 0.12, 0.97);
          ctx.fillStyle = `rgb(${lr},${lg},${lb})`;
          ctx.fillRect(0, 0, w, h);
          glow(ctx, w * 0.15, h * 0.05, w * 0.55, hslToRgb(hue, themeSat, 0.55), 0.13);
          glow(ctx, w * 0.9, h * 0.95, w * 0.5, hslToRgb((hue + 30) % 360, themeSat * 0.7, 0.6), 0.09);
          dotGrid(ctx, `rgba(${r},${g},${b},0.03)`, 30);
        },
        // 3: 브랜드 그라디언트 + 라이트 스윕 — CI 컬러 전면 + 대각선 빛줄기
        (ctx: CanvasRenderingContext2D) => {
          const grd = ctx.createLinearGradient(0, 0, w, h);
          grd.addColorStop(0, `rgb(${r},${g},${b})`);
          grd.addColorStop(1, `rgb(${Math.max(0, r - 70)},${Math.max(0, g - 70)},${Math.max(0, b - 70)})`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, w, h);
          lightSweep(ctx, 0.08);
          glow(ctx, w * 0.85, h * 0.05, w * 0.4, [255, 255, 255], 0.08);
          vignette(ctx, 0.3);
        },
        // 4: 딥 듀얼톤 — CI 색조 + 40° 인접 색조 대각 그라디언트, 하단 글로우
        (ctx: CanvasRenderingContext2D) => {
          const deepHue = (hue + 40) % 360;
          const [d1r, d1g, d1b] = hslToRgb(deepHue, themeSat * 0.8, 0.08);
          const [d2r, d2g, d2b] = hslToRgb(hue, themeSat * 0.5, 0.04);
          const grd = ctx.createLinearGradient(0, 0, w, h);
          grd.addColorStop(0, `rgb(${d1r},${d1g},${d1b})`);
          grd.addColorStop(1, `rgb(${d2r},${d2g},${d2b})`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, w, h);
          glow(ctx, w * 0.5, h * 1.05, w * 0.6, hslToRgb(hue, themeSat, 0.4), 0.16);
          lightSweep(ctx, 0.045);
          vignette(ctx, 0.34);
        },
      ];

      /** 헤더 역할 존 판정 — 프리셋 id가 header거나, 최상단 전폭(y=0·너비 90%+·높이 25% 이하) 존 */
      const isHeaderZone = (zone: LayoutZone) => zone.id.toLowerCase().includes('header') || (zone.y <= 2 && zone.width >= 90 && zone.height <= 25);

      /** 헤더 존 공통 마감 — CI 컬러 수평 스윕 + 하단 발광 언더라인(방송 타이틀바 느낌) */
      const finishHeaderZone = (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number) => {
        drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
        const sweep = ctx.createLinearGradient(zx, zy, zx + zw, zy);
        if (bgIdx === 3) {
          // 브랜드 그라디언트 배경 위에서는 흰색 스윕이 더 살아남
          sweep.addColorStop(0, 'rgba(255,255,255,0.28)');
          sweep.addColorStop(1, 'rgba(255,255,255,0.02)');
        } else {
          sweep.addColorStop(0, `rgba(${r},${g},${b},0.85)`);
          sweep.addColorStop(0.55, `rgba(${r},${g},${b},0.45)`);
          sweep.addColorStop(1, `rgba(${r},${g},${b},0.1)`);
        }
        ctx.fillStyle = sweep;
        ctx.fill();
        // 하단 발광 언더라인 — 헤더와 본문 영역을 확실히 구분해주는 포인트
        ctx.save();
        ctx.shadowColor = bgIdx === 3 ? 'rgba(255,255,255,0.9)' : `rgb(${r},${g},${b})`;
        ctx.shadowBlur = 12 * scale;
        ctx.fillStyle = bgIdx === 3 ? 'rgba(255,255,255,0.95)' : `rgba(${Math.min(255, r + 70)},${Math.min(255, g + 70)},${Math.min(255, b + 70)},0.95)`;
        ctx.fillRect(zx, zy + zh - Math.max(3, 3 * scale), zw * 0.42, Math.max(3, 3 * scale));
        ctx.restore();
      };

      const zoneFills = [
        // A: 글래스 패널 — 반투명 + 그림자 + 상단 하이라이트(유리 질감)
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number, header: boolean) => {
          if (header) return finishHeaderZone(ctx, zx, zy, zw, zh, bgIdx);
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.35)';
          ctx.shadowBlur = 20 * scale;
          ctx.shadowOffsetY = 6 * scale;
          drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
          ctx.fillStyle = bgIdx === 2 ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.07)';
          ctx.fill();
          ctx.restore();
          // 상단에서 비치는 빛(하이라이트) — 유리 패널의 핵심 디테일
          drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
          const hl = ctx.createLinearGradient(zx, zy, zx, zy + zh * 0.4);
          hl.addColorStop(0, bgIdx === 2 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.09)');
          hl.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = hl;
          ctx.fill();
          ctx.strokeStyle = bgIdx === 2 ? `rgba(${r},${g},${b},0.28)` : 'rgba(255,255,255,0.14)';
          ctx.lineWidth = Math.max(1, 1.2 * scale);
          ctx.stroke();
        },
        // B: 엘리베이티드 카드 — 위가 살짝 밝은 수직 그라디언트 + 그림자(떠 있는 카드)
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number, header: boolean) => {
          if (header) return finishHeaderZone(ctx, zx, zy, zw, zh, bgIdx);
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 24 * scale;
          ctx.shadowOffsetY = 8 * scale;
          drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
          const grd = ctx.createLinearGradient(zx, zy, zx, zy + zh);
          if (bgIdx === 2) {
            grd.addColorStop(0, 'rgba(255,255,255,0.95)');
            grd.addColorStop(1, `rgba(${r},${g},${b},0.1)`);
          } else {
            const [t1r, t1g, t1b] = hslToRgb(hue, themeSat * 0.45, 0.17);
            const [t2r, t2g, t2b] = hslToRgb(hue, themeSat * 0.5, 0.1);
            grd.addColorStop(0, `rgba(${t1r},${t1g},${t1b},0.92)`);
            grd.addColorStop(1, `rgba(${t2r},${t2g},${t2b},0.92)`);
          }
          ctx.fillStyle = grd;
          ctx.fill();
          ctx.restore();
          drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
          ctx.strokeStyle = bgIdx === 2 ? `rgba(${r},${g},${b},0.2)` : 'rgba(255,255,255,0.1)';
          ctx.lineWidth = Math.max(1, 1.2 * scale);
          ctx.stroke();
        },
        // C: 네온 엣지 — CI 색 발광 테두리(shadowBlur 글로우), 어두운 배경에서 가장 화려함
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number, header: boolean) => {
          if (header) return finishHeaderZone(ctx, zx, zy, zw, zh, bgIdx);
          drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
          ctx.fillStyle = bgIdx === 2 ? `rgba(${r},${g},${b},0.06)` : 'rgba(0,0,0,0.3)';
          ctx.fill();
          ctx.save();
          const neonColor = bgIdx === 3 ? 'rgba(255,255,255,0.85)' : `rgba(${Math.min(255, r + 50)},${Math.min(255, g + 50)},${Math.min(255, b + 50)},0.9)`;
          ctx.shadowColor = neonColor;
          ctx.shadowBlur = 14 * scale;
          drawRoundedZone(ctx, zx, zy, zw, zh, zoneRadius);
          ctx.strokeStyle = neonColor;
          ctx.lineWidth = Math.max(1.5, 2 * scale);
          ctx.stroke();
          ctx.restore();
        },
        // D: 방송 HUD — 코너 브래킷 + 좌측 액센트 바(뉴스/스포츠 중계 그래픽 느낌)
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number, header: boolean) => {
          if (header) return finishHeaderZone(ctx, zx, zy, zw, zh, bgIdx);
          drawRoundedZone(ctx, zx, zy, zw, zh, Math.max(4, 4 * scale));
          ctx.fillStyle = bgIdx === 2 ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.32)';
          ctx.fill();
          const accent = bgIdx === 3 ? 'rgba(255,255,255,0.9)' : `rgb(${r},${g},${b})`;
          // 좌측 액센트 바
          ctx.fillStyle = accent;
          ctx.fillRect(zx, zy + zh * 0.08, Math.max(3, 4 * scale), zh * 0.84);
          // 코너 브래킷(4개 모서리 ㄱ자) — HUD 그래픽의 시그니처
          const bl = Math.min(zw, zh) * 0.12;
          const lw = Math.max(1.5, 2 * scale);
          ctx.strokeStyle = accent;
          ctx.lineWidth = lw;
          const corners: [number, number, number, number][] = [
            [zx + bl, zy, zx, zy], // 좌상
            [zx + zw - bl, zy, zx + zw, zy], // 우상
            [zx + bl, zy + zh, zx, zy + zh], // 좌하
            [zx + zw - bl, zy + zh, zx + zw, zy + zh], // 우하
          ];
          for (const [hx, hy, cx2, cy2] of corners) {
            ctx.beginPath();
            ctx.moveTo(hx, hy);
            ctx.lineTo(cx2, cy2);
            ctx.lineTo(cx2, cy2 + (hy === zy ? bl : -bl));
            ctx.stroke();
          }
        },
      ];

      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = w;
        bgCanvas.height = h;
        const ctx = bgCanvas.getContext('2d');
        if (!ctx) continue;

        const bgIdx = i % 5;
        const styleIdx = Math.floor(i / 5);

        bgThemes[bgIdx](ctx);

        for (const zone of selectedLayout.zones) {
          const zx = (zone.x / 100) * w,
            zy = (zone.y / 100) * h;
          const zw = (zone.width / 100) * w,
            zh = (zone.height / 100) * h;
          zoneFills[styleIdx](ctx, zx, zy, zw, zh, bgIdx, isHeaderZone(zone));
        }

        // CI 로고
        const logoW = w * (ciPos.sizePct / 100);
        const logoH = logoW * (img.height / img.width);
        ctx.globalAlpha = ciPos.opacity;
        ctx.drawImage(img, w * (ciPos.xPct / 100), h * (ciPos.yPct / 100), logoW, logoH);
        ctx.globalAlpha = 1.0;

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = 480;
        thumbCanvas.height = 270;
        const thumbCtx = thumbCanvas.getContext('2d');
        if (thumbCtx) thumbCtx.drawImage(bgCanvas, 0, 0, 480, 270);

        newPreviews.push({ id: Date.now() + i, url: bgCanvas.toDataURL('image/jpeg', 0.9), previewUrl: thumbCanvas.toDataURL('image/jpeg', 0.7), res: resKey });
        setProgress(Math.floor(((i + 1) / 20) * 100));
      }
      setPreviewImages(newPreviews);
      setIsAnalyzing(false);
    };
    img.src = originalImgUrl;
  };

  const closeAndResetModal = () => {
    setIsModalOpen(false);
    setModalStep(1);
    setSelectedLayout(PRESET_LAYOUT_TEMPLATES[0]);
    setUploadedFile(null);
    setOriginalImgUrl('');
    setPreviewImages([]);
    setProgress(0);
  };

  // 포인터 캡처 방식으로 drag 처리 → window 이벤트는 fallback용
  useEffect(() => {
    const up = () => {
      dividerDragRef.current = null;
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  const cells = getLeafCells(rootCell, 0, 0, 100, 100);
  const cellDividers = getNodeDividers(rootCell, 0, 0, 100, 100);

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">
      <TaskboardTenantBar />
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">전광판 배경 관리</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => directUploadInputRef.current?.click()}
            className="px-4 py-2 bg-white border border-[#0f5b9e] text-[#0f5b9e] rounded-md text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            완성이미지 직접 업로드
          </button>
          <input type="file" ref={directUploadInputRef} onChange={handleDirectUpload} accept="image/png, image/jpeg" className="hidden" />
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#0f5b9e] text-white rounded-md text-sm font-semibold hover:bg-[#0c4a82] transition-colors shadow-sm"
          >
            png 자동생성
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <FallbackSpinner />
        </div>
      ) : !tasBoardList || tasBoardList.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl bg-white shadow-sm">
          <span className="text-lg font-medium">등록된 배경 이미지가 없습니다.</span>
          <span className="text-sm mt-2">상단 버튼을 이용해 전광판 배경을 등록해보세요.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasBoardList.map((item) => (
            <div
              key={item.pageId}
              className={`relative bg-white rounded-xl shadow-md border overflow-hidden transition-all ${item.useYn === 'N' ? 'border-slate-200 opacity-80' : 'border-[#0f5b9e]/20 hover:shadow-lg'}`}
            >
              <div className="aspect-video bg-slate-100 relative overflow-hidden group">
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/taskboard/board/task-create', { state: { bg: item } });
                    }}
                    className="bg-white/90 hover:bg-blue-50 text-slate-400 hover:text-[#0f5b9e] p-1.5 rounded-md shadow-sm"
                    title="새 전광판 만들기"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(item.pageId);
                    }}
                    className="bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-md shadow-sm"
                    title="삭제"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
                <img
                  src={item.fileName}
                  alt={item.pageName}
                  className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${item.useYn === 'N' ? 'grayscale opacity-60' : ''}`}
                />
                <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-[10px] rounded backdrop-blur-sm uppercase font-bold tracking-wider shadow-sm">
                  {item.genType === 'AI' ? '자동생성' : '직접 업로드'}
                </div>
                {item.useYn === 'N' && (
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded">미사용</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 pr-2">
                    <h3 className={`text-[15px] font-bold truncate ${item.useYn === 'N' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.pageName}</h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {item.pageId}</p>
                    <div className="mt-1">
                      <TenantBadge tenantId={item.tenantId} />
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[10px] px-2 py-1 rounded font-bold border ${item.useYn === 'Y' ? 'bg-blue-50 text-[#0f5b9e] border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    {item.useYn === 'Y' ? '사용중' : '미사용'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span className="font-medium">{item.createUserId ?? '시스템'}</span>
                  <span>{dayjs(item.regDt).format('YYYY.MM.DD HH:mm')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 자동생성 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-[960px] max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-800">CI 기반 배경 자동생성</h2>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${modalStep === 1 ? 'bg-[#0f5b9e] text-white' : 'bg-slate-100 text-slate-400'}`}>1단계: 레이아웃</span>
                  <span>→</span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${modalStep === 2 ? 'bg-[#0f5b9e] text-white' : 'bg-slate-100 text-slate-400'}`}>2단계: 자동생성</span>
                </div>
              </div>
              <button onClick={closeAndResetModal} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {modalStep === 1 && (
                <div>
                  <p className="text-sm text-slate-500 mb-4">레이아웃 템플릿을 선택하세요. 선택한 구조 기반으로 AI가 배경을 생성합니다.</p>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {allLayoutTemplates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedLayout(tpl)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${selectedLayout.id === tpl.id ? 'border-[#0f5b9e] bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="w-full aspect-video bg-slate-800 rounded-sm mb-2 relative overflow-hidden">
                          {tpl.zones.map((z) => (
                            <div
                              key={z.id}
                              style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%`, backgroundColor: z.color }}
                              className="absolute"
                            />
                          ))}
                        </div>
                        <div className="font-bold text-slate-800 text-[11px] leading-tight truncate">{tpl.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">{tpl.description}</div>
                      </button>
                    ))}
                    <button
                      onClick={() => setIsCustomBuilderOpen(true)}
                      className="text-left p-3 rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-[#0f5b9e] hover:bg-blue-50 transition-all"
                    >
                      <div className="w-full aspect-video bg-slate-100 rounded-sm mb-2 flex items-center justify-center">
                        <span className="text-3xl text-slate-300">+</span>
                      </div>
                      <div className="font-bold text-slate-500 text-[11px] leading-tight">커스텀 만들기</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">분할선으로 영역 나누기</div>
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setModalStep(2)}
                      className="px-6 py-2.5 bg-[#0f5b9e] text-white text-sm font-bold rounded-lg hover:bg-[#0c4a82] transition-colors shadow-sm"
                    >
                      다음 단계: 자동생성 →
                    </button>
                  </div>
                </div>
              )}

              {modalStep === 2 && (
                <>
                  <button onClick={() => setModalStep(1)} className="mb-4 text-xs text-[#0f5b9e] hover:underline font-semibold">
                    ← 레이아웃 다시 선택 ({selectedLayout.name})
                  </button>
                  <div className="flex flex-col gap-5">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="grid grid-cols-2 gap-5">
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">출력 해상도</label>
                            <select
                              value={selectedRes}
                              onChange={(e) => setSelectedRes(e.target.value as ResolutionKey)}
                              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0f5b9e] bg-white"
                            >
                              {Object.entries(RESOLUTIONS).map(([key, { label }]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">CI 로고 이미지 업로드</label>
                            <input
                              type="file"
                              onChange={handleAutoFileChange}
                              accept="image/png, image/jpeg"
                              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-[#0f5b9e] hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-md"
                            />
                          </div>
                          <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !originalImgUrl}
                            className={`py-3 w-full rounded-md text-sm font-bold shadow-sm transition-all ${isAnalyzing || !originalImgUrl ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#0f5b9e] text-white hover:bg-[#0c4a82]'}`}
                          >
                            {isAnalyzing ? '렌더링 중...' : '20종 배경 생성 (5테마 × 4스타일)'}
                          </button>
                        </div>
                        <div className="flex flex-col gap-3">
                          <label className="block text-sm font-semibold text-slate-700">CI 로고 위치 조정</label>
                          {originalImgUrl ? (
                            <div ref={ciPreviewRef} className="relative w-full aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-300">
                              <span className="absolute top-1 left-2 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded z-10">미리보기 · CI를 드래그해서 위치 조정</span>
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${ciPos.xPct}%`,
                                  top: `${ciPos.yPct}%`,
                                  width: `${ciPos.sizePct}%`,
                                  opacity: ciPos.opacity,
                                  cursor: 'move',
                                  touchAction: 'none',
                                }}
                                onPointerDown={handleCiPointerDown}
                                onPointerMove={handleCiPointerMove}
                                onPointerUp={handleCiPointerUp}
                              >
                                <img src={originalImgUrl} className="w-full h-auto object-contain pointer-events-none select-none" alt="CI" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full aspect-video bg-slate-100 rounded-lg border flex items-center justify-center text-slate-400 text-sm">CI 업로드 후 표시</div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              { label: '가로 위치', key: 'xPct', min: 0, max: 90 },
                              { label: '세로 위치', key: 'yPct', min: 0, max: 90 },
                              { label: '크기 (%)', key: 'sizePct', min: 3, max: 40 },
                              { label: '불투명도', key: 'opacity', min: 0.1, max: 1, step: 0.05 },
                            ].map(({ label, key, min, max, step }) => (
                              <div key={key}>
                                <div className="flex justify-between text-slate-500 mb-0.5">
                                  <span>{label}</span>
                                  <span className="font-mono">
                                    {key === 'xPct' || key === 'yPct' ? Number(ciPos[key as keyof CiPos]).toFixed(2) : ciPos[key as keyof CiPos]}
                                    {key === 'opacity' ? '' : '%'}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min={min}
                                  max={max}
                                  step={step ?? 1}
                                  value={ciPos[key as keyof CiPos]}
                                  onChange={(e) => setCiPos((p) => ({ ...p, [key]: Number(e.target.value) }))}
                                  className="w-full h-1.5 accent-[#0f5b9e]"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isAnalyzing && (
                      <div>
                        <div className="flex justify-between text-sm font-bold text-[#0f5b9e] mb-2">
                          <span>배경 생성 중...</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div className="bg-[#0f5b9e] h-2.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">5가지 배경 테마 (CI 다크/딥블랙/라이트/브랜드/딥계열) × 4가지 스타일 (솔리드/그라디언트/아웃라인/카드)</p>
                      </div>
                    )}

                    {previewImages.length > 0 && !isAnalyzing && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#0f5b9e]" />
                          추천 배경 패턴 (20종 · 5테마 × 4스타일)
                        </h3>
                        {/* 5열 컬럼 헤더 */}
                        <div className="grid grid-cols-5 gap-2 mb-1 px-px">
                          {['CI 다크', 'CI 딥블랙', 'CI 라이트', 'CI 브랜드', 'CI 딥계열'].map((t) => (
                            <div key={t} className="text-[9px] text-slate-400 font-bold text-center uppercase tracking-wide">
                              {t}
                            </div>
                          ))}
                        </div>
                        {/* 4행 = 4가지 스타일 */}
                        {['솔리드', '그라디언트', '아웃라인', '카드'].map((styleLabel, r) => (
                          <div key={styleLabel} className="mb-2">
                            <div className="text-[8px] text-slate-400 font-semibold mb-1 pl-px">스타일: {styleLabel}</div>
                            <div className="grid grid-cols-5 gap-2">
                              {[0, 1, 2, 3, 4].map((c) => {
                                const preview = previewImages[r * 5 + c];
                                return preview ? (
                                  <div key={preview.id} className="group relative">
                                    <div className="aspect-video bg-slate-100 relative rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0f5b9e] shadow-sm cursor-pointer">
                                      <img src={preview.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                          onClick={async () => {
                                            if (!guardWrite()) return; // 다중 테넌트 View 중엔 배경 등록 차단
                                            try {
                                              const imageFile = dataURLtoFile(preview.url, `bg_${Date.now()}.jpg`);
                                              const requestData: TaskboardBg = {
                                                tenantId: '2000000001',
                                                pageId: 0,
                                                pageName: `자동생성_${selectedLayout.name}_${preview.res}_${Date.now().toString().slice(-4)}`,
                                                genType: 'AI',
                                                useYn: 'Y',
                                                regDt: new Date().toISOString(),
                                                fileName: '',
                                              };
                                              await createBgMutate({ params: { data: JSON.stringify(requestData) }, data: imageFile });
                                              toast.success('저장되었습니다!');
                                              await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList._def });
                                            } catch {
                                              toast.error('저장 중 오류가 발생했습니다.');
                                            }
                                          }}
                                          className="px-2 py-1 bg-white text-[#0f5b9e] text-[10px] font-bold rounded-md shadow-lg"
                                        >
                                          저장하기
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[320px] overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <IconTrash className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">배경 이미지 삭제</h3>
              <p className="text-sm text-slate-500">
                선택하신 배경을 삭제하시겠습니까?
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 border-r border-slate-100">
                취소
              </button>
              <button onClick={handleDeleteConfirm} className="flex-1 py-3 text-sm font-bold text-red-500 hover:bg-red-50">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 레이아웃 빌더 모달 (셀 트리 방식 — 비대칭 분할 지원) */}
      {isCustomBuilderOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[760px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">커스텀 레이아웃 만들기</h3>
                <p className="text-xs text-slate-500 mt-0.5">셀을 클릭하면 분할 버튼이 나타납니다. 분할선의 ×를 클릭하면 해당 선만 제거(셀 병합)됩니다.</p>
              </div>
              <button
                onClick={() => {
                  setIsCustomBuilderOpen(false);
                  setRootCell({ id: 'root', label: '전체', color: ZONE_COLORS[0] });
                  setSelectedCellId(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto">
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                <span className="px-2 py-0.5 bg-blue-50 text-[#0f5b9e] rounded font-semibold">셀 클릭 → [H분할]/[V분할]</span>
                <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded font-semibold">분할선 × → 병합</span>
                <span className="ml-auto font-semibold">분할된 셀: {cells.length}개</span>
              </div>

              {/* 캔버스 */}
              <div
                ref={customCanvasRef}
                className="w-full bg-slate-900 rounded-xl relative overflow-hidden select-none border border-slate-600"
                style={{ aspectRatio: '16/9' }}
                onPointerMove={handleDividerDragMove}
                onPointerUp={handleDividerDragEnd}
              >
                {/* 셀 영역 */}
                {cells.map((zone) => {
                  const isSelected = selectedCellId === zone.nodeId;
                  return (
                    <div
                      key={zone.nodeId}
                      style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%`, backgroundColor: `${zone.color}44` }}
                      className={`absolute border transition-colors flex flex-col items-center justify-center cursor-pointer ${isSelected ? 'border-white bg-white/15 z-10' : 'border-white/20 hover:bg-white/10'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCellId(isSelected ? null : zone.nodeId);
                        setEditingCellId(null);
                      }}
                    >
                      {editingCellId === zone.nodeId ? (
                        <input
                          autoFocus
                          defaultValue={zone.label}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setRootCell((prev) => renameCellNode(prev, zone.nodeId, e.currentTarget.value || zone.label));
                              setEditingCellId(null);
                            }
                            if (e.key === 'Escape') setEditingCellId(null);
                          }}
                          onBlur={(e) => {
                            setRootCell((prev) => renameCellNode(prev, zone.nodeId, e.target.value || zone.label));
                            setEditingCellId(null);
                          }}
                          className="w-4/5 text-center text-xs bg-black/70 text-white border border-white/50 rounded px-2 py-1 focus:outline-none"
                        />
                      ) : (
                        <span
                          className="text-white/60 text-xs select-none"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setEditingCellId(zone.nodeId);
                            setSelectedCellId(null);
                          }}
                        >
                          {zone.label}
                        </span>
                      )}

                      {/* 셀 선택 시 분할 버튼 */}
                      {isSelected && !editingCellId && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSplitCell(zone.nodeId, 'h');
                            }}
                            className="px-2 py-0.5 bg-[#0f5b9e] text-white text-[10px] font-bold rounded hover:bg-[#0c4a82] transition-colors"
                          >
                            — H분할
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSplitCell(zone.nodeId, 'v');
                            }}
                            className="px-2 py-0.5 bg-[#0f5b9e] text-white text-[10px] font-bold rounded hover:bg-[#0c4a82] transition-colors"
                          >
                            | V분할
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 분할선 */}
                {cellDividers.map((div) => (
                  <div
                    key={`${div.nodeId}-${div.dir}`}
                    style={
                      div.dir === 'h'
                        ? {
                            top: `calc(${div.absPos}% - 4px)`,
                            left: `${div.lineStart}%`,
                            width: `${div.lineEnd - div.lineStart}%`,
                            height: '8px',
                            cursor: 'row-resize',
                            touchAction: 'none',
                          }
                        : {
                            left: `calc(${div.absPos}% - 4px)`,
                            top: `${div.lineStart}%`,
                            height: `${div.lineEnd - div.lineStart}%`,
                            width: '8px',
                            cursor: 'col-resize',
                            touchAction: 'none',
                          }
                    }
                    className={`absolute z-20 flex ${div.dir === 'h' ? 'items-center justify-center' : 'flex-col items-center justify-center'} group`}
                    onPointerDown={(e) => handleDividerDragStart(div, e)}
                  >
                    <div className={`absolute ${div.dir === 'h' ? 'inset-x-0 top-1/2 h-0.5' : 'inset-y-0 left-1/2 w-0.5'} bg-white/60 group-hover:bg-white transition-colors`} />
                    <div
                      className={`relative bg-black/40 group-hover:bg-black/70 rounded flex ${div.dir === 'h' ? 'items-center gap-1 px-1.5 py-0.5' : 'flex-col items-center gap-0.5 px-0.5 py-1'} transition-colors z-10`}
                    >
                      {div.dir === 'h' ? (
                        <span className="text-[8px] text-white/80 font-mono">{div.absPos.toFixed(0)}%</span>
                      ) : (
                        <span className="text-[7px] text-white/80 font-mono" style={{ writingMode: 'vertical-rl' }}>
                          {div.absPos.toFixed(0)}%
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSplit(div.nodeId);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="text-white/60 hover:text-red-400 text-[10px] leading-none font-bold"
                        title="이 분할선 제거 (셀 병합)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {cells.length <= 1 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                    <span className="text-slate-400 text-sm font-semibold">셀을 클릭하면 분할 버튼이 나타납니다</span>
                    <span className="text-slate-600 text-xs">H분할: 가로로 나누기 / V분할: 세로로 나누기</span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs text-slate-600 font-semibold flex-shrink-0">레이아웃 이름</label>
                <input
                  value={customLayoutName}
                  onChange={(e) => setCustomLayoutName(e.target.value)}
                  className="flex-1 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-[#0f5b9e]"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t flex justify-between items-center flex-shrink-0 bg-slate-50">
              <button
                onClick={() => {
                  setRootCell({ id: 'root', label: '전체', color: ZONE_COLORS[0] });
                  setSelectedCellId(null);
                }}
                className="text-sm text-red-400 hover:text-red-600"
              >
                전체 초기화
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCustomBuilderOpen(false);
                    setRootCell({ id: 'root', label: '전체', color: ZONE_COLORS[0] });
                    setSelectedCellId(null);
                  }}
                  className="px-4 py-1.5 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  onClick={saveCustomLayout}
                  disabled={cells.length <= 1}
                  className="px-4 py-1.5 bg-[#0f5b9e] text-white text-sm font-bold rounded-md hover:bg-[#0c4a82] disabled:opacity-50"
                >
                  레이아웃 저장 ({cells.length}개 영역)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
