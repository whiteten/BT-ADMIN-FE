import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { toast } from '@/shared-util';
import { taskboardQueryKeys, useCreateTaskboardBg, useDeleteTaskboardBg, useGetTaskboardBg } from '../../features/board/hooks/useTaskboardQueries';
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

const dataURLtoFile = (dataurl: string, filename: string) => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};

// 분할선 타입
interface HLine {
  id: string;
  yPct: number;
}
interface VLine {
  id: string;
  xPct: number;
}

export default function TaskBg() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<ResolutionKey>('FHD');
  const [, setUploadedFile] = useState<File | null>(null);
  const [originalImgUrl, setOriginalImgUrl] = useState('');
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedLayout, setSelectedLayout] = useState<LayoutTemplate>(PRESET_LAYOUT_TEMPLATES[0]);
  const { data: tasBoardList = [], isLoading } = useGetTaskboardBg();
  const { mutateAsync: createBgMutate } = useCreateTaskboardBg();
  const { mutateAsync: deleteBgMutate } = useDeleteTaskboardBg();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ciPos, setCiPos] = useState<CiPos>({ xPct: 80, yPct: 80, sizePct: 12, opacity: 0.8 });

  // ── 커스텀 레이아웃 빌더 상태 (분할선 방식) ───────────────────────────────
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const [hLines, setHLines] = useState<HLine[]>([]);
  const [vLines, setVLines] = useState<VLine[]>([]);
  const [cellNames, setCellNames] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [customLayouts, setCustomLayouts] = useState<LayoutTemplate[]>([]);
  const [customLayoutName, setCustomLayoutName] = useState('커스텀 레이아웃');
  const customCanvasRef = useRef<HTMLDivElement>(null);
  const dividerDragRef = useRef<{ type: 'h' | 'v'; id: string; startPct: number; startClient: number; containerSize: number } | null>(null);

  const directUploadInputRef = useRef<HTMLInputElement>(null);
  const allLayoutTemplates = [...PRESET_LAYOUT_TEMPLATES, ...customLayouts];

  // ── 분할선에서 셀 계산 ────────────────────────────────────────────────────
  const getCells = useCallback((): Array<LayoutZone & { rowIdx: number; colIdx: number }> => {
    const rowBreaks = [0, ...hLines.map((l) => l.yPct).sort((a, b) => a - b), 100];
    const colBreaks = [0, ...vLines.map((l) => l.xPct).sort((a, b) => a - b), 100];
    const cells: Array<LayoutZone & { rowIdx: number; colIdx: number }> = [];
    for (let r = 0; r < rowBreaks.length - 1; r++) {
      for (let c = 0; c < colBreaks.length - 1; c++) {
        const key = `${r}-${c}`;
        cells.push({
          id: `zone-${key}`,
          label: cellNames[key] || `영역${cells.length + 1}`,
          x: colBreaks[c],
          y: rowBreaks[r],
          width: colBreaks[c + 1] - colBreaks[c],
          height: rowBreaks[r + 1] - rowBreaks[r],
          color: ZONE_COLORS[cells.length % ZONE_COLORS.length],
          rowIdx: r,
          colIdx: c,
        });
      }
    }
    return cells;
  }, [hLines, vLines, cellNames]);

  // ── 분할선 드래그 ──────────────────────────────────────────────────────────
  const handleLineDragStart = (type: 'h' | 'v', id: string, e: React.PointerEvent) => {
    e.preventDefault();
    const el = customCanvasRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const currentPct = type === 'h' ? (hLines.find((l) => l.id === id)?.yPct ?? 50) : (vLines.find((l) => l.id === id)?.xPct ?? 50);
    dividerDragRef.current = { type, id, startPct: currentPct, startClient: type === 'h' ? e.clientY : e.clientX, containerSize: type === 'h' ? rect.height : rect.width };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleLineDragMove = (e: React.PointerEvent) => {
    const drag = dividerDragRef.current;
    if (!drag) return;
    const delta = (((drag.type === 'h' ? e.clientY : e.clientX) - drag.startClient) / drag.containerSize) * 100;
    const newPct = Math.max(2, Math.min(98, drag.startPct + delta));
    if (drag.type === 'h') setHLines((prev) => prev.map((l) => (l.id === drag.id ? { ...l, yPct: newPct } : l)));
    else setVLines((prev) => prev.map((l) => (l.id === drag.id ? { ...l, xPct: newPct } : l)));
    dividerDragRef.current = { ...drag, startPct: newPct, startClient: drag.type === 'h' ? e.clientY : e.clientX };
  };

  const handleLineDragEnd = () => {
    dividerDragRef.current = null;
  };

  const addHLine = () => {
    const existing = hLines.map((l) => l.yPct).sort((a, b) => a - b);
    const breaks = [0, ...existing, 100];
    let best = 50,
      bestGap = 0;
    for (let i = 0; i < breaks.length - 1; i++) {
      const gap = breaks[i + 1] - breaks[i];
      if (gap > bestGap) {
        bestGap = gap;
        best = (breaks[i] + breaks[i + 1]) / 2;
      }
    }
    setHLines((prev) => [...prev, { id: `h-${Date.now()}`, yPct: best }]);
  };

  const addVLine = () => {
    const existing = vLines.map((l) => l.xPct).sort((a, b) => a - b);
    const breaks = [0, ...existing, 100];
    let best = 50,
      bestGap = 0;
    for (let i = 0; i < breaks.length - 1; i++) {
      const gap = breaks[i + 1] - breaks[i];
      if (gap > bestGap) {
        bestGap = gap;
        best = (breaks[i] + breaks[i + 1]) / 2;
      }
    }
    setVLines((prev) => [...prev, { id: `v-${Date.now()}`, xPct: best }]);
  };

  const saveCustomLayout = () => {
    const cells = getCells();
    if (cells.length === 0) {
      toast.error('레이아웃이 비어있습니다.');
      return;
    }
    const name = customLayoutName.trim() || `커스텀 ${customLayouts.length + 1}`;
    const newLayout: LayoutTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description: `직접 만든 레이아웃 (${cells.length}개 영역)`,
      zones: cells.map(({ rowIdx: _r, colIdx: _c, ...zone }) => zone),
    };
    setCustomLayouts((prev) => [...prev, newLayout]);
    setSelectedLayout(newLayout);
    setIsCustomBuilderOpen(false);
    setHLines([]);
    setVLines([]);
    setCellNames({});
    setCustomLayoutName('커스텀 레이아웃');
    toast.success(`"${name}" 레이아웃이 추가되었습니다.`);
  };

  // ── 직접 업로드 ────────────────────────────────────────────────────────────
  const handleDirectUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const requestData: TaskboardBg = {
        tenantId: '2000000001',
        pageId: 0,
        pageName: `직접 업로드 ${Date.now().toString().slice(-4)}`,
        authorName: 'admin',
        authRole: 'MASTER',
        genType: 'DIRECT',
        useYn: 'Y',
        regDt: new Date().toISOString(),
        fileName: '',
      };
      await createBgMutate({ params: { data: JSON.stringify(requestData) }, data: file });
      toast.success('정상적으로 저장되었습니다!');
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList().queryKey });
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
      await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList().queryKey });
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

  // ── AI 생성 (20종 완전 다른 시각 테마) ───────────────────────────────────
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
      const { width: w, height: h } = RESOLUTIONS[selectedRes];
      const newPreviews: PreviewImage[] = [];

      // 5가지 배경 테마 × 4가지 존 스타일 = 20종
      const bgThemes = [
        (ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = '#0a1628';
          ctx.fillRect(0, 0, w, h);
        },
        (ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = '#111827';
          ctx.fillRect(0, 0, w, h);
        },
        (ctx: CanvasRenderingContext2D) => {
          ctx.fillStyle = '#f1f5f9';
          ctx.fillRect(0, 0, w, h);
        },
        (ctx: CanvasRenderingContext2D) => {
          const grd = ctx.createLinearGradient(0, 0, w, h);
          grd.addColorStop(0, `rgb(${r},${g},${b})`);
          grd.addColorStop(1, `rgb(${Math.max(0, r - 60)},${Math.max(0, g - 60)},${Math.max(0, b - 60)})`);
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, w, h);
        },
        (ctx: CanvasRenderingContext2D) => {
          const grd = ctx.createLinearGradient(0, 0, w, h);
          grd.addColorStop(0, '#1a0a2e');
          grd.addColorStop(1, '#0a1628');
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, w, h);
        },
      ];

      const zoneFills = [
        // A: 솔리드 CI 색상
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number) => {
          const zoneColor = bgIdx === 2 ? `rgb(${Math.max(0, r - 20)},${Math.max(0, g - 20)},${Math.max(0, b - 20)})` : `rgb(${r},${g},${b})`;
          drawRoundedZone(ctx, zx, zy, zw, zh);
          ctx.fillStyle = zoneColor;
          ctx.fill();
        },
        // B: 그라디언트 fill
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number) => {
          drawRoundedZone(ctx, zx, zy, zw, zh);
          const grd = ctx.createLinearGradient(zx, zy, zx + zw, zy + zh);
          if (bgIdx === 2) {
            grd.addColorStop(0, `rgb(${r},${g},${b})`);
            grd.addColorStop(1, `rgb(${Math.max(0, r - 50)},${Math.max(0, g - 50)},${Math.max(0, b - 50)})`);
          } else if (bgIdx === 3) {
            grd.addColorStop(0, 'rgba(255,255,255,0.9)');
            grd.addColorStop(1, 'rgba(255,255,255,0.4)');
          } else {
            grd.addColorStop(0, `rgb(${r},${g},${b})`);
            grd.addColorStop(1, `rgba(${r},${g},${b},0.4)`);
          }
          ctx.fillStyle = grd;
          ctx.fill();
        },
        // C: 아웃라인 (얇은 테두리만)
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number) => {
          drawRoundedZone(ctx, zx, zy, zw, zh);
          const fillAlpha = bgIdx === 2 ? 'rgba(15,91,158,0.08)' : 'rgba(255,255,255,0.06)';
          ctx.fillStyle = fillAlpha;
          ctx.fill();
          const strokeColor = bgIdx === 2 ? `rgb(${r},${g},${b})` : `rgba(255,255,255,0.6)`;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        },
        // D: 카드 + 상단 컬러 바
        (ctx: CanvasRenderingContext2D, zx: number, zy: number, zw: number, zh: number, bgIdx: number) => {
          drawRoundedZone(ctx, zx, zy, zw, zh);
          const cardBg = bgIdx === 2 ? 'rgba(15,91,158,0.1)' : 'rgba(0,0,0,0.35)';
          ctx.fillStyle = cardBg;
          ctx.fill();
          const barColor = bgIdx === 3 ? 'rgba(255,255,255,0.85)' : `rgb(${r},${g},${b})`;
          ctx.fillStyle = barColor;
          ctx.fillRect(zx, zy, zw, Math.max(4, zh * 0.045));
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

        // 미묘한 노이즈/패턴 추가로 배경 질감 차별화
        if (bgIdx === 0 || bgIdx === 1 || bgIdx === 4) {
          ctx.fillStyle = 'rgba(255,255,255,0.015)';
          for (let py = 0; py < h; py += 4) {
            ctx.fillRect(0, py, w, 1);
          }
        }

        for (const zone of selectedLayout.zones) {
          const zx = (zone.x / 100) * w,
            zy = (zone.y / 100) * h;
          const zw = (zone.width / 100) * w,
            zh = (zone.height / 100) * h;
          zoneFills[styleIdx](ctx, zx, zy, zw, zh, bgIdx);
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

        newPreviews.push({ id: Date.now() + i, url: bgCanvas.toDataURL('image/jpeg', 0.9), previewUrl: thumbCanvas.toDataURL('image/jpeg', 0.7), res: selectedRes });
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

  // pointermove/pointerup 는 포인터 캡처로 처리 (useEffect 불필요)
  useEffect(() => {
    const up = () => {
      dividerDragRef.current = null;
    };
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, []);

  const cells = getCells();

  return (
    <div className="p-6 bg-slate-50 min-h-screen w-full font-sans">
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
            png 자동생성 (AI)
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
                  {item.genType === 'AI' ? 'AI 생성' : '직접 업로드'}
                </div>
                {item.useYn === 'N' && (
                  <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                    <span className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded">미사용</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className={`text-[15px] font-bold truncate ${item.useYn === 'N' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{item.pageName}</h3>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {item.pageId}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded font-bold border ${item.useYn === 'Y' ? 'bg-blue-50 text-[#0f5b9e] border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    {item.useYn === 'Y' ? '사용중' : '미사용'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                  <span className="font-medium">{item.authorName ?? '시스템'}</span>
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
                  <span className={`px-2 py-0.5 rounded-full font-semibold ${modalStep === 2 ? 'bg-[#0f5b9e] text-white' : 'bg-slate-100 text-slate-400'}`}>2단계: AI 생성</span>
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
                      다음 단계: AI 생성 →
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
                            <div className="relative w-full aspect-video bg-slate-800 rounded-lg overflow-hidden border border-slate-300">
                              <span className="absolute top-1 left-2 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded z-10">미리보기</span>
                              <div style={{ position: 'absolute', left: `${ciPos.xPct}%`, top: `${ciPos.yPct}%`, width: `${ciPos.sizePct}%`, opacity: ciPos.opacity }}>
                                <img src={originalImgUrl} className="w-full h-auto object-contain" alt="CI" />
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
                                    {ciPos[key as keyof CiPos]}
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
                        <p className="text-xs text-slate-400 mt-1">5가지 배경 테마 (다크/블랙/라이트/브랜드컬러/딥퍼플) × 4가지 스타일 (솔리드/그라디언트/아웃라인/카드)</p>
                      </div>
                    )}

                    {previewImages.length > 0 && !isAnalyzing && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#0f5b9e]" />
                          추천 배경 패턴 (20종 · 행별로 테마 그룹 구분)
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          {previewImages.map((preview, idx) => (
                            <div key={preview.id} className="group relative">
                              {idx % 4 === 0 && (
                                <div className="text-[9px] text-slate-400 font-bold mb-1 uppercase tracking-wide">
                                  {['다크 네이비', '블랙', '라이트', 'CI 브랜드', '딥 퍼플'][Math.floor(idx / 4)]}
                                </div>
                              )}
                              <div className="aspect-video bg-slate-100 relative rounded-lg overflow-hidden border-2 border-transparent hover:border-[#0f5b9e] shadow-sm cursor-pointer">
                                <img src={preview.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const imageFile = dataURLtoFile(preview.url, `bg_${Date.now()}.jpg`);
                                        const requestData: TaskboardBg = {
                                          tenantId: '2000000001',
                                          pageId: 0,
                                          pageName: `AI생성 ${selectedLayout.name} ${Date.now().toString().slice(-4)}`,
                                          authorName: 'admin',
                                          authRole: 'MASTER',
                                          genType: 'AI',
                                          useYn: 'Y',
                                          regDt: new Date().toISOString(),
                                          fileName: '',
                                        };
                                        await createBgMutate({ params: { data: JSON.stringify(requestData) }, data: imageFile });
                                        toast.success('저장되었습니다!');
                                        await queryClient.invalidateQueries({ queryKey: taskboardQueryKeys.getBgList().queryKey });
                                      } catch {
                                        toast.error('저장 중 오류가 발생했습니다.');
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-white text-[#0f5b9e] text-xs font-bold rounded-md shadow-lg"
                                  >
                                    저장하기
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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

      {/* 커스텀 레이아웃 빌더 모달 (분할선 방식) */}
      {isCustomBuilderOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[760px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800">커스텀 레이아웃 만들기</h3>
                <p className="text-xs text-slate-500 mt-0.5">가로선/세로선을 추가하고 드래그하여 영역을 나누세요. 셀을 클릭하면 이름을 변경할 수 있습니다.</p>
              </div>
              <button
                onClick={() => {
                  setIsCustomBuilderOpen(false);
                  setHLines([]);
                  setVLines([]);
                  setCellNames({});
                }}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex-1 overflow-auto">
              {/* 컨트롤 버튼 */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={addHLine}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#0f5b9e] border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <span className="text-base leading-none">—</span> 가로선 추가
                </button>
                <button
                  onClick={addVLine}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#0f5b9e] border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <span className="text-base leading-none font-bold">|</span> 세로선 추가
                </button>
                <span className="ml-auto text-xs text-slate-400">분할된 셀: {cells.length}개</span>
              </div>

              {/* 캔버스 */}
              <div
                ref={customCanvasRef}
                className="w-full bg-slate-900 rounded-xl relative overflow-hidden select-none border border-slate-600"
                style={{ aspectRatio: '16/9' }}
                onPointerMove={handleLineDragMove}
                onPointerUp={handleLineDragEnd}
              >
                {/* 셀 영역 */}
                {cells.map((zone) => {
                  const cellKey = `${zone.rowIdx}-${zone.colIdx}`;
                  return (
                    <div
                      key={zone.id}
                      style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%`, backgroundColor: `${zone.color}55` }}
                      className="absolute border border-white/25 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => setEditingCell(editingCell === cellKey ? null : cellKey)}
                    >
                      {editingCell === cellKey ? (
                        <input
                          autoFocus
                          defaultValue={zone.label}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setCellNames((prev) => ({ ...prev, [cellKey]: e.currentTarget.value || zone.label }));
                              setEditingCell(null);
                            }
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          onBlur={(e) => {
                            setCellNames((prev) => ({ ...prev, [cellKey]: e.target.value || zone.label }));
                            setEditingCell(null);
                          }}
                          className="w-4/5 text-center text-xs bg-black/70 text-white border border-white/50 rounded px-2 py-1 focus:outline-none"
                        />
                      ) : (
                        <span className="text-white/60 text-xs pointer-events-none select-none">{zone.label}</span>
                      )}
                    </div>
                  );
                })}

                {/* 가로 분할선 */}
                {hLines.map((line) => (
                  <div
                    key={line.id}
                    style={{ top: `calc(${line.yPct}% - 4px)`, left: 0, right: 0, height: '8px', cursor: 'row-resize', touchAction: 'none' }}
                    className="absolute z-20 flex items-center justify-center group"
                    onPointerDown={(e) => handleLineDragStart('h', line.id, e)}
                  >
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-white/50 group-hover:bg-white transition-colors" />
                    <div className="relative bg-white/20 group-hover:bg-white/40 rounded px-2 py-0.5 flex items-center gap-1 transition-colors">
                      <span className="text-[8px] text-white/70 font-mono">{line.yPct.toFixed(0)}%</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHLines((prev) => prev.filter((l) => l.id !== line.id));
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="text-white/50 hover:text-red-400 text-[10px] leading-none font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {/* 세로 분할선 */}
                {vLines.map((line) => (
                  <div
                    key={line.id}
                    style={{ left: `calc(${line.xPct}% - 4px)`, top: 0, bottom: 0, width: '8px', cursor: 'col-resize', touchAction: 'none' }}
                    className="absolute z-20 flex flex-col items-center justify-center group"
                    onPointerDown={(e) => handleLineDragStart('v', line.id, e)}
                  >
                    <div className="absolute inset-y-0 left-1/2 w-0.5 bg-white/50 group-hover:bg-white transition-colors" />
                    <div className="relative bg-white/20 group-hover:bg-white/40 rounded px-0.5 py-1 flex flex-col items-center gap-0.5 transition-colors">
                      <span className="text-[7px] text-white/70 font-mono" style={{ writingMode: 'vertical-rl' }}>
                        {line.xPct.toFixed(0)}%
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVLines((prev) => prev.filter((l) => l.id !== line.id));
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="text-white/50 hover:text-red-400 text-[10px] leading-none font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {cells.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
                    <span className="text-slate-500 text-sm">가로선/세로선을 추가하여 영역을 나누세요</span>
                    <span className="text-slate-600 text-xs">선을 드래그하여 위치를 조정할 수 있습니다</span>
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
                  setHLines([]);
                  setVLines([]);
                  setCellNames({});
                }}
                className="text-sm text-red-400 hover:text-red-600"
              >
                전체 초기화
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCustomBuilderOpen(false);
                    setHLines([]);
                    setVLines([]);
                    setCellNames({});
                  }}
                  className="px-4 py-1.5 border border-slate-200 rounded-md text-sm text-slate-600 hover:bg-slate-100"
                >
                  취소
                </button>
                <button
                  onClick={saveCustomLayout}
                  disabled={cells.length === 0}
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
