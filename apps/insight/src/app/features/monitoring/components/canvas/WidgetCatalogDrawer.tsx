import { type ReactNode, useMemo, useState } from 'react';
import { Button, Drawer, Input } from 'antd';
import { LayoutTemplate, Plus, Search } from 'lucide-react';
import { DOMAIN_COLOR_CLASS, DOMAIN_LABELS } from '../../constants/monitoringConstants';
import { useGetCustomWidgetCatalog } from '../../hooks/useDashboardQueries';
import type { CustomWidgetCatalogItem, DomainCode } from '../../types';

interface WidgetCatalogDrawerProps {
  open: boolean;
  onClose: () => void;
  onAddTemplate: () => void;
  onAddCustom: (widget: CustomWidgetCatalogItem) => void;
}

// 위젯 종류별 아이콘
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

/**
 * 대시보드 위젯 추가 Drawer.
 */
export default function WidgetCatalogDrawer({ open, onClose, onAddTemplate, onAddCustom }: WidgetCatalogDrawerProps) {
  const [searchValue, setSearchValue] = useState('');
  const { data: allWidgets = [] } = useGetCustomWidgetCatalog();

  // 검색 및 도메인별 그룹화
  const groupedWidgets = useMemo(() => {
    const kw = searchValue.trim().toLowerCase();
    const filtered = kw
      ? allWidgets.filter((w) => w.widgetName.toLowerCase().includes(kw) || w.widgetTypeId.toLowerCase().includes(kw) || w.description?.toLowerCase().includes(kw))
      : allWidgets;

    const groups: Record<DomainCode, CustomWidgetCatalogItem[]> = { IE: [], IC: [], IR: [] };
    filtered.forEach((w) => {
      if (groups[w.domainCode]) groups[w.domainCode].push(w);
    });
    return groups;
  }, [allWidgets, searchValue]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[var(--color-bt-primary)]" />
          <span>위젯 추가</span>
        </div>
      }
      width={420}
      styles={{ body: { padding: 0 } }}
      destroyOnClose
    >
      <div className="flex flex-col h-full bg-[var(--color-bt-bg-muted)]/30">
        <div className="bg-white px-5 py-4 border-b border-[var(--color-bt-border)]">
          <Input
            prefix={<Search className="w-3.5 h-3.5 text-[var(--color-bt-fg-muted)]" />}
            placeholder="위젯 이름 또는 설명 검색..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
          {!searchValue && (
            <section>
              <h3 className="text-[11px] font-bold text-[var(--color-bt-fg-muted)] uppercase tracking-wider mb-3 px-1">표준 위젯</h3>
              <div
                onClick={onAddTemplate}
                className="group flex items-center gap-4 bg-white border border-[var(--color-bt-border)] rounded-xl p-4 cursor-pointer hover:border-[var(--color-bt-primary)] hover:shadow-md transition-all"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <LayoutTemplate className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-[var(--color-bt-fg)] mb-0.5">데이터셋 위젯</div>
                  <p className="text-[11.5px] text-[var(--color-bt-fg-muted)] leading-snug">차트, 그리드 등 표준 시각화 도구를 사용하여 위젯을 직접 구성합니다.</p>
                </div>
              </div>
            </section>
          )}

          {(['IE', 'IC', 'IR'] as DomainCode[]).map((domain) => {
            const widgets = groupedWidgets[domain];
            if (widgets.length === 0) return null;

            return (
              <section key={domain}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <h3 className="text-[11px] font-bold text-[var(--color-bt-fg-muted)] uppercase tracking-wider">{DOMAIN_LABELS[domain]} 특화 위젯</h3>
                  <div className="flex-1 h-[1px] bg-[var(--color-bt-border)]" />
                </div>

                <div className="space-y-3">
                  {widgets.map((widget) => {
                    const icon = WIDGET_ICON[widget.widgetTypeId] ?? DEFAULT_ICON;
                    return (
                      <div
                        key={widget.widgetTypeId}
                        onClick={() => onAddCustom(widget)}
                        className="group flex items-start gap-3 bg-white border border-[var(--color-bt-border)] rounded-xl p-3 cursor-pointer hover:border-[var(--color-bt-primary)] hover:shadow-sm transition-all"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${icon.bg}`}>{icon.svg}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[13px] font-semibold text-[var(--color-bt-fg)] truncate">{widget.widgetName}</span>
                            <span className={`text-[9px] font-bold px-1 rounded ${DOMAIN_COLOR_CLASS[domain]}`}>{domain}</span>
                          </div>
                          <p className="text-[11px] text-[var(--color-bt-fg-muted)] leading-snug line-clamp-2">{widget.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <div className="bg-white border-t border-[var(--color-bt-border)] px-5 py-4">
          <p className="text-[10.5px] text-[var(--color-bt-fg-muted)] leading-relaxed">
            위젯을 클릭하면 대시보드에 즉시 추가됩니다. <br />
            추가된 위젯은 편집 모드에서 위치와 크기를 조절할 수 있습니다.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
