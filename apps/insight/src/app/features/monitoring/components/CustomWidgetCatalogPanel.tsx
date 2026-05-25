import { type ReactNode, useMemo, useState } from 'react';
import { Input, Segmented } from 'antd';
import { Plus, X } from 'lucide-react';
import { toast } from '@/shared-util';
import { DOMAIN_COLOR_CLASS, DOMAIN_LABELS } from '../constants/monitoringConstants';
import { useGetCustomWidgetCatalog } from '../hooks/useDashboardQueries';
import { MOCK_CUSTOM_WIDGETS } from '../mocks/mockCustomWidgetCatalog';
import type { CustomWidgetCatalogItem, DomainCode } from '../types';

interface CustomWidgetCatalogPanelProps {
  /** 현재 대시보드의 도메인 (기본 필터) */
  domainCode: DomainCode;
  /** 위젯 추가 핸들러 */
  onAdd: (widget: CustomWidgetCatalogItem) => void;
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

export default function CustomWidgetCatalogPanel({ domainCode, onAdd, onClose }: CustomWidgetCatalogPanelProps) {
  const [filterDomain, setFilterDomain] = useState<DomainCode | 'ALL'>(domainCode);
  const [searchValue, setSearchValue] = useState('');

  const { data: fetched = [] } = useGetCustomWidgetCatalog();
  const allWidgets = fetched.length > 0 ? fetched : MOCK_CUSTOM_WIDGETS;

  const filtered = useMemo(() => {
    let result: CustomWidgetCatalogItem[] = allWidgets;
    if (filterDomain !== 'ALL') {
      result = result.filter((w) => w.domainCode === filterDomain);
    }
    if (searchValue.trim()) {
      const kw = searchValue.toLowerCase();
      result = result.filter((w) => w.widgetName.toLowerCase().includes(kw) || w.widgetTypeId.toLowerCase().includes(kw) || w.description?.toLowerCase().includes(kw));
    }
    return result;
  }, [allWidgets, filterDomain, searchValue]);

  const handleAdd = (widget: CustomWidgetCatalogItem) => {
    onAdd(widget);
    toast.success(`"${widget.widgetName}"이(가) 캔버스에 추가되었습니다.`);
  };

  return (
    <aside className="w-[480px] shrink-0 border-l border-[var(--color-bt-border)] bg-white flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-bt-border)]">
        <div className="min-w-0">
          <div className="text-[13px] font-semibold">커스텀 위젯 카탈로그</div>
          <div className="text-[10.5px] text-[var(--color-bt-fg-muted)] mt-0.5">
            <span className={`shrink-0 rounded px-1 py-0.5 mono text-[9px] font-bold ${DOMAIN_COLOR_CLASS[domainCode]}`}>{domainCode}</span> 도메인 · {filtered.length}종 (FE 파일로
            직접 구현)
          </div>
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
      <div className="flex flex-col gap-2 px-5 py-3 border-b border-[var(--color-bt-border)]">
        <Segmented
          value={filterDomain}
          onChange={(v) => setFilterDomain(v as DomainCode | 'ALL')}
          options={[
            { value: 'ALL', label: '전체' },
            { value: 'IE', label: `IE · ${DOMAIN_LABELS.IE}` },
            { value: 'IC', label: `IC · ${DOMAIN_LABELS.IC}` },
            { value: 'IR', label: `IR · ${DOMAIN_LABELS.IR}` },
          ]}
          size="small"
          block
        />
        <Input size="small" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} placeholder="위젯 이름·설명 검색…" allowClear />
      </div>

      {/* 위젯 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-[12px] text-[var(--color-bt-fg-muted)] py-8">검색 결과 없음</p>
        ) : (
          filtered.map((widget) => {
            const icon = WIDGET_ICON[widget.widgetTypeId] ?? DEFAULT_ICON;
            return (
              <div
                key={widget.widgetTypeId}
                className="group flex items-start gap-3 rounded border border-[var(--color-bt-border)] bg-white p-3 hover:border-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-soft)]/20 transition-colors"
              >
                {/* 아이콘 */}
                <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded ${icon.bg}`}>{icon.svg}</div>

                {/* 본문 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[12.5px] font-semibold truncate">{widget.widgetName}</span>
                    <span className={`shrink-0 rounded px-1 py-0.5 mono text-[9px] font-bold ${DOMAIN_COLOR_CLASS[widget.domainCode]}`}>{widget.domainCode}</span>
                  </div>
                  <div className="mono text-[10px] text-[var(--color-bt-fg-muted)] mb-1 truncate" title={widget.widgetTypeId}>
                    {widget.widgetTypeId}
                  </div>
                  <p className="text-[10.5px] text-[var(--color-bt-fg-muted)] leading-snug line-clamp-2">{widget.description}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[9.5px] text-[var(--color-bt-fg-muted)]">
                    <span className="rounded bg-[var(--color-bt-bg-muted)] px-1.5 py-0.5">
                      최소 {widget.minW}×{widget.minH}
                    </span>
                  </div>
                </div>

                {/* 추가 버튼 */}
                <button
                  type="button"
                  onClick={() => handleAdd(widget)}
                  className="shrink-0 inline-flex items-center gap-1 rounded bg-[var(--color-bt-primary)] hover:bg-[var(--color-bt-primary-hover)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                >
                  <Plus className="w-3 h-3" />
                  추가
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* 권한 안내 */}
      <div className="border-t border-[var(--color-bt-border)] bg-[var(--color-bt-bg-canvas)] px-5 py-3">
        <p className="text-[10px] text-[var(--color-bt-fg-muted)] leading-relaxed">
          <strong>새 커스텀 위젯 추가는 개발자 작업 필요</strong> — BE 위젯 구현체(<span className="mono">MonitoringWidget</span> Bean) + FE 컴포넌트 + 카탈로그 등록. 데이터셋 매핑
          없이 자체 메트릭 조회 (M8).
        </p>
      </div>
    </aside>
  );
}
