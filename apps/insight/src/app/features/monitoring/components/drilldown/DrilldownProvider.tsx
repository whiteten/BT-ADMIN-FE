import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { getCustomWidgetComponent } from '../../widgets/registry';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/libs/shared-ui/src/components/shadcn/dialog';

/**
 * 헬스보드 드릴다운 — "B안: 위젯 타입 즉석 구독".
 *
 * 시안: docs/insight/monitoring/mvp-design/wireframes/10-healthboard-drilldown.html
 * 헬스보드 카드의 링크를 누르면 대상 위젯이 풀스크린 오버레이 모달로 열린다(새 탭·이동 아님).
 *
 * 두 가지 모드:
 * - 구독 모드(widgetType): 대시보드에 그 위젯이 없어도 `registry` 에서 컴포넌트를 꺼내 마운트하고,
 *   임시 widgetId(`drill:<type>:<ts>`)로 즉석 SUBSCRIBE 해 라이브로 채운다(닫으면 UNSUBSCRIBE).
 *   전용 위젯이 있는 드릴다운(알람·노드·큐·상담사)에 사용.
 * - 인라인 모드(inlineNode): 전용 위젯이 없는 드릴다운(회선·채널·품질)에서 헬스보드가 이미 가진
 *   data 로 상세를 그릴 때 사용(여는 시점 스냅샷).
 */

export interface DrilldownConfig {
  /** 모달 헤더 제목. */
  title: string;
  /** 헤더 보조 설명(데이터 출처 등). */
  sub?: string;
  /** 구독 모드 — registry 의 widgetType. 지정 시 즉석 구독해 해당 컴포넌트를 라이브 렌더. */
  widgetType?: string;
  /** 구독 시 BE 에 전달할 옵션 (헬스보드 컨텍스트 상속 — mediaType 등). */
  options?: Record<string, unknown>;
  /** 인라인 모드 — 구독 없이 직접 렌더할 노드. */
  inlineNode?: ReactNode;
}

interface DrilldownContextValue {
  open: (config: DrilldownConfig) => void;
  close: () => void;
}

const DrilldownContext = createContext<DrilldownContextValue | null>(null);

export function useDrilldown(): DrilldownContextValue {
  const ctx = useContext(DrilldownContext);
  if (!ctx) throw new Error('useDrilldown 은 DrilldownProvider 내부에서만 사용할 수 있습니다.');
  return ctx;
}

interface WidgetDataEntry {
  rows: unknown;
  serverTs: number;
}

interface DrilldownProviderProps {
  subscribeAdhoc: (widgetId: string, widgetType: string, options?: Record<string, unknown>) => void;
  unsubscribeAdhoc: (widgetId: string) => void;
  widgetData: Record<string, WidgetDataEntry>;
  children: ReactNode;
}

export function DrilldownProvider({ subscribeAdhoc, unsubscribeAdhoc, widgetData, children }: DrilldownProviderProps) {
  const [config, setConfig] = useState<DrilldownConfig | null>(null);
  const [adhocId, setAdhocId] = useState<string | null>(null);

  const open = useCallback(
    (cfg: DrilldownConfig) => {
      setConfig(cfg);
      if (cfg.widgetType) {
        const id = `drill:${cfg.widgetType}:${Date.now()}`;
        setAdhocId(id);
        subscribeAdhoc(id, cfg.widgetType, cfg.options);
      } else {
        setAdhocId(null);
      }
    },
    [subscribeAdhoc],
  );

  const close = useCallback(() => {
    setAdhocId((prev) => {
      if (prev) unsubscribeAdhoc(prev);
      return null;
    });
    setConfig(null);
  }, [unsubscribeAdhoc]);

  const value = useMemo<DrilldownContextValue>(() => ({ open, close }), [open, close]);

  const data = adhocId ? widgetData[adhocId]?.rows : undefined;
  const hasData = adhocId != null && widgetData[adhocId] != null;

  return (
    <DrilldownContext.Provider value={value}>
      {children}
      <DrilldownModal config={config} data={data} hasData={hasData} onClose={close} />
    </DrilldownContext.Provider>
  );
}

// ─── 풀스크린 오버레이 모달 ────────────────────────────────────────────

function DrilldownModal({ config, data, hasData, onClose }: { config: DrilldownConfig | null; data: unknown; hasData: boolean; onClose: () => void }) {
  const Comp = config?.widgetType ? getCustomWidgetComponent(config.widgetType) : null;
  const isSubscribe = config?.widgetType != null;

  return (
    <Dialog
      open={config != null}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        // shadcn DialogContent 기본 className 에 `sm:max-w-lg`(512px)가 있어, base `max-w-*` 만 주면
        // 데스크탑에서 512px 로 짜부된다. `sm:max-w-none` 으로 명시적으로 덮어 폭 제한을 푼다.
        className="flex h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden rounded-xl border-bt-border bg-bt-bg-canvas p-0 sm:h-[calc(100vh-3rem)] sm:w-[calc(100vw-3rem)] sm:max-w-none"
      >
        {/* 헤더 — 대시보드 위젯 카드 헤더(WidgetCardHeader)와 동일 톤: 아이콘·부가설명 없이 타이틀만.
            LIVE/연결중 상태칩은 우측이 아니라 타이틀 바로 옆에 둔다. */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-bt-border bg-bt-bg px-5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <DialogTitle className="truncate text-base font-semibold text-[#495057]" title={config?.title}>
              {config?.title ?? '위젯'}
            </DialogTitle>
            {isSubscribe && (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  hasData ? 'bg-bt-success-soft text-bt-success' : 'bg-bt-bg-muted text-bt-fg-muted'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${hasData ? 'bg-bt-success bt-pulse' : 'bg-bt-fg-muted'}`} />
                {hasData ? 'LIVE' : 'CONNECTING…'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="닫기 (ESC)"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-bt-fg-muted transition-colors hover:bg-bt-bg-muted hover:text-bt-fg"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
          {/* a11y — DialogContent 가 aria-describedby 를 요구하므로 시각 비표시 설명만 유지 */}
          <DialogDescription className="sr-only">{config?.sub ?? config?.title ?? '드릴다운'}</DialogDescription>
        </header>
        {/* 본문 — 인라인 노드 우선, 없으면 registry 컴포넌트.
            대시보드 카드(CustomWidgetCard)와 동일하게 overflow-hidden 으로 감싼다.
            위젯 루트는 h-full + 내부 자체 스크롤(ag-Grid 가상 렌더 등)을 전제로 하므로,
            여기서 overflow-y-auto 를 주면 h-full 높이 계산이 깨져 그리드가 찌그러진다. */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {config?.inlineNode ?? (Comp ? <Comp data={data} options={config?.options} /> : <DrilldownUnavailable type={config?.widgetType} />)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DrilldownUnavailable({ type }: { type?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
      <div className="text-[13px] font-semibold text-bt-fg-muted">표시할 위젯이 없습니다</div>
      {type && <div className="text-[11px] text-bt-fg-muted">{type}</div>}
    </div>
  );
}
