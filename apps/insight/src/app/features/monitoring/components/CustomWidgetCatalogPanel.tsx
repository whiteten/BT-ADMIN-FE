import { type ReactNode, useMemo, useState } from 'react';
import { Input } from 'antd';
import { Tags, X } from 'lucide-react';
import { toast } from '@/shared-util';
import WidgetSizePicker from './WidgetSizePicker';
import { useGetCustomWidgetCatalog } from '../hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem } from '../types';
import { resolveSize } from '../utils/autoPackPosition';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

interface CustomWidgetCatalogPanelProps {
  /** 위젯 추가 핸들러 — size 미지정 시 추천 크기로 배치. */
  onAdd: (widget: CustomWidgetCatalogItem, size?: { w: number; h: number }) => void;
  /** 닫기 (× 또는 ESC) */
  onClose: () => void;
}

// 위젯 종류별 아이콘 (텍스트 placeholder)
const WIDGET_ICON: Record<string, { svg: ReactNode; bg: string }> = {
  'extension-status-grid': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <rect x="3" y="3" width="4" height="4" fill="currentColor" rx="0.5" />
        <rect x="9" y="3" width="4" height="4" fill="currentColor" opacity="0.6" rx="0.5" />
        <rect x="15" y="3" width="4" height="4" fill="currentColor" opacity="0.4" rx="0.5" />
        <rect x="3" y="9" width="4" height="4" fill="currentColor" opacity="0.4" rx="0.5" />
        <rect x="9" y="9" width="4" height="4" fill="currentColor" rx="0.5" />
        <rect x="15" y="9" width="4" height="4" fill="currentColor" opacity="0.6" rx="0.5" />
        <rect x="3" y="15" width="4" height="4" fill="currentColor" opacity="0.6" rx="0.5" />
        <rect x="9" y="15" width="4" height="4" fill="currentColor" opacity="0.4" rx="0.5" />
        <rect x="15" y="15" width="4" height="4" fill="currentColor" rx="0.5" />
      </svg>
    ),
    bg: 'bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]',
  },
  'call-flow-diagram': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <circle cx="5" cy="6" r="2" />
        <circle cx="5" cy="18" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M7 6 L10 11 M7 18 L10 13 M14 11 L17 6 M14 13 L17 18" />
      </svg>
    ),
    bg: 'bg-[var(--color-bt-primary-soft)] text-[var(--color-bt-primary)]',
  },
  'trunk-utilization-meter': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M3 18 A10 10 0 0 1 21 18" />
        <line x1="12" y1="18" x2="17" y2="11" strokeWidth="2" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" />
      </svg>
    ),
    bg: 'bg-[var(--color-bt-warn-soft)] text-[var(--color-bt-warn)]',
  },
  'agent-status-matrix': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
        <rect x="3" y="4" width="5" height="5" fill="currentColor" rx="0.5" />
        <rect x="10" y="4" width="5" height="5" fill="currentColor" opacity="0.5" rx="0.5" />
        <rect x="17" y="4" width="4" height="5" fill="currentColor" opacity="0.3" rx="0.5" />
        <rect x="3" y="11" width="5" height="5" fill="currentColor" opacity="0.5" rx="0.5" />
        <rect x="10" y="11" width="5" height="5" fill="currentColor" rx="0.5" />
        <rect x="17" y="11" width="4" height="5" fill="currentColor" opacity="0.5" rx="0.5" />
      </svg>
    ),
    bg: 'bg-[var(--color-bt-success-soft)] text-[var(--color-bt-success)]',
  },
  'waiting-queue-list': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="14" y2="18" />
        <circle cx="18" cy="18" r="2" fill="currentColor" />
      </svg>
    ),
    bg: 'bg-[var(--color-bt-success-soft)] text-[var(--color-bt-success)]',
  },
  'service-level-gauge': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <path d="M3 18 A10 10 0 0 1 21 18" />
        <path d="M5.5 14.5 A8 8 0 0 1 18.5 14.5" strokeWidth="2.5" />
        <text x="12" y="17" textAnchor="middle" fontSize="6" fontWeight="bold" fill="currentColor" stroke="none">
          80%
        </text>
      </svg>
    ),
    bg: 'bg-[var(--color-bt-warn-soft)] text-[var(--color-bt-warn)]',
  },
  'ivr-scenario-flow': {
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
        <rect x="3" y="3" width="4" height="6" rx="0.5" />
        <rect x="3" y="15" width="4" height="6" rx="0.5" />
        <rect x="17" y="6" width="4" height="5" rx="0.5" />
        <rect x="17" y="13" width="4" height="5" rx="0.5" />
        <path d="M7 6 C 11 6 13 8 17 8" />
        <path d="M7 18 C 11 18 13 16 17 16" />
      </svg>
    ),
    bg: 'bg-[var(--color-bt-warn-soft)] text-[var(--color-bt-warn)]',
  },
};

const DEFAULT_ICON = {
  svg: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="8" />
      <rect x="3" y="13" width="8" height="8" />
      <rect x="13" y="13" width="8" height="8" />
    </svg>
  ),
  bg: 'bg-[var(--color-bt-bg-muted)] text-[var(--color-bt-fg)]',
};

export default function CustomWidgetCatalogPanel({ onAdd, onClose }: CustomWidgetCatalogPanelProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchValue, setSearchValue] = useState('');

  const { data: allWidgets = [] } = useGetCustomWidgetCatalog();

  // 전체 위젯 태그(빈도 내림차순) — 칩 필터 소스
  const sortedTags = useMemo(() => {
    const counts: Record<string, number> = {};
    allWidgets.forEach((w) => (w.tags ?? []).forEach((t) => (counts[t] = (counts[t] ?? 0) + 1)));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
  }, [allWidgets]);

  const toggleTag = (t: string) =>
    setSelectedTags((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });

  const filtered = useMemo(() => {
    let result: CustomWidgetCatalogItem[] = allWidgets;
    if (selectedTags.size > 0) {
      result = result.filter((w) => {
        const tags = w.tags ?? [];
        return [...selectedTags].every((t) => tags.includes(t));
      });
    }
    if (searchValue.trim()) {
      const kw = searchValue.toLowerCase();
      result = result.filter((w) => w.widgetName.toLowerCase().includes(kw) || w.widgetTypeId.toLowerCase().includes(kw) || w.description?.toLowerCase().includes(kw));
    }
    return result;
  }, [allWidgets, selectedTags, searchValue]);

  const handleAdd = (widget: CustomWidgetCatalogItem, size: { w: number; h: number }) => {
    onAdd(widget, size);
    toast.success(`"${widget.widgetName}"이(가) ${size.w}×${size.h} 크기로 추가되었습니다.`);
  };

  return (
    <aside className="w-[480px] shrink-0 border-l border-[var(--color-bt-border)] bg-white flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">커스텀 위젯 카탈로그</div>
          <div className="text-[10.5px] text-[var(--color-bt-fg-muted)] mt-0.5">{filtered.length}종 (FE 파일로 직접 구현)</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="닫기 (ESC)"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-[var(--color-bt-fg-muted)] hover:bg-[var(--color-bt-bg-muted)] hover:text-[var(--color-bt-fg)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-col gap-2 px-5 py-3">
        <Input size="small" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="위젯 이름·설명 검색…" allowClear />
        {sortedTags.length > 0 && (
          <div className="flex items-start gap-1.5">
            <span className="mt-0.5 flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">
              <Tags className="size-3" />
              태그
            </span>
            <div className="flex flex-wrap gap-1">
              {sortedTags.map((t) => {
                const on = selectedTags.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTag(t)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                      on
                        ? 'border-transparent bg-[var(--color-bt-primary)] text-white'
                        : 'border-[var(--color-bt-border)] bg-white text-[var(--color-bt-fg-muted)] hover:border-[var(--color-bt-primary)]'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
              {selectedTags.size > 0 && (
                <button type="button" onClick={() => setSelectedTags(new Set())} className="px-1.5 py-0.5 text-[11px] text-[var(--color-bt-primary)] hover:underline">
                  초기화
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 위젯 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[12px] text-[var(--color-bt-fg-muted)] py-8">검색 결과 없음</p>
        ) : (
          filtered.map((widget) => {
            const icon = WIDGET_ICON[widget.widgetTypeId] ?? DEFAULT_ICON;
            const rec = resolveSize(widget);
            return (
              <HoverCard key={widget.widgetTypeId} openDelay={120} closeDelay={120}>
                <HoverCardTrigger asChild>
                  <div className="group flex cursor-pointer items-start gap-3 rounded border border-[var(--color-bt-border)] bg-white p-3 hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/20 transition-colors">
                    {/* 아이콘 */}
                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded ${icon.bg}`}>{icon.svg}</div>

                    {/* 본문 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[12.5px] font-semibold truncate">{widget.widgetName}</span>
                      </div>
                      <div className="mono text-[10px] text-[var(--color-bt-fg-muted)] mb-1 truncate" title={widget.widgetTypeId}>
                        {widget.widgetTypeId}
                      </div>
                      <p className="text-[10.5px] text-[var(--color-bt-fg-muted)] leading-snug line-clamp-2">{widget.description}</p>
                      {(widget.tags ?? []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(widget.tags ?? []).map((t) => (
                            <span key={t} className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5 text-[9.5px] text-[var(--color-bt-fg-muted)]">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 text-[9.5px] text-[var(--color-bt-fg-muted)]">
                        <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5">
                          최소 {widget.minW}×{widget.minH}
                        </span>
                        <span className="rounded bg-[var(--color-bt-primary-soft)] px-1.5 py-0.5 font-semibold text-[var(--color-bt-primary)]">
                          추천 {rec.w}×{rec.h}
                        </span>
                      </div>
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="left" align="start" sideOffset={8} className="w-auto rounded-md border-[var(--color-bt-border)] p-0">
                  {/* 헤더 — 앱 패널 컨벤션 (타이틀 + uppercase 라벨 + 도메인 칩) */}
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--color-bt-border)] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[12.5px] font-semibold text-[var(--color-bt-fg)]">{widget.widgetName}</div>
                      <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[var(--color-bt-fg-muted)]">크기 선택</div>
                    </div>
                  </div>
                  {/* 본문 */}
                  <div className="px-3.5 py-3">
                    <WidgetSizePicker minW={widget.minW} minH={widget.minH} recommendedW={rec.w} recommendedH={rec.h} onPick={(w, h) => handleAdd(widget, { w, h })} />
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          })
        )}
      </div>

      {/* 권한 안내 */}
      <div className="bg-[var(--color-bt-bg-canvas)] px-5 py-3">
        <p className="text-[10px] text-[var(--color-bt-fg-muted)] leading-relaxed">
          <strong>새 커스텀 위젯 추가는 개발자 작업 필요</strong> — BE 위젯 구현체(<span className="mono">MonitoringWidget</span> Bean) + FE 컴포넌트 + 카탈로그 등록. 데이터셋 매핑
          없이 자체 메트릭 조회 (M8).
        </p>
      </div>
    </aside>
  );
}
