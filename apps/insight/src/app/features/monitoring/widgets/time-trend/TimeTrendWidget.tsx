import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Drawer, InputNumber, Tooltip } from 'antd';
import { Settings } from 'lucide-react';
import { toast } from '@/shared-util';
import { DEFAULT_HOUR_RANGE } from './constants';
import { genTimeTrendDemo, isTimeTrendDemoMode } from './demoData';
import KpiStrip from './parts/KpiStrip';
import TrendChart from './parts/TrendChart';
import type { TimeTrendData } from './types';
import { widgetToolbarSlotId } from '../../components/canvas/WidgetCardHeader';
import { useGetWidgetUserSetting, useUpdateWidgetUserSetting, widgetSettingKeys } from '../../hooks/useWidgetSettingQueries';
import type { CustomWidgetComponentProps } from '../registry';
import NoData from '@/components/custom/NoData';

function isTimeTrendData(v: unknown): v is TimeTrendData {
  return !!v && typeof v === 'object' && 'series' in v && 'current' in v;
}

/** "HH:00"·"HH:mm" 라벨에서 앞자리 시(hour) 정수만 추출. */
function hourOf(time: string): number {
  return parseInt(time, 10);
}

/**
 * 타임트렌드 종합판 위젯 — "들어온 콜을 받아내고 있나, 못 따라가기 시작했나?"(시간축).
 *
 * BE `timeTrendWidget` 와 1:1. 현재 KPI 4타일 + 인입·응대·미처리·포기율을 한 듀얼축
 * 라인차트로 합쳐 보여준다. 타임라인 표시 시간대(기본 09~18시)는 카탈로그 기본값 위에
 * 사용자별 설정(TB_BT_IS_MON_WIDGET_USER_SETTING)으로 덮어쓸 수 있다.
 */
export default function TimeTrendWidget({ data, widgetId, onRequestPause }: CustomWidgetComponentProps) {
  // 데모 모드(?timeTrendDemo=1): 라이브 PSR 대신 점심 과부하 시나리오 더미로 렌더.
  const source = useMemo(() => (isTimeTrendDemoMode() ? genTimeTrendDemo() : data), [data]);

  const numericWidgetId = typeof widgetId === 'number' ? widgetId : Number(widgetId);
  const hasWidgetId = Number.isFinite(numericWidgetId) && numericWidgetId > 0;
  const queryClient = useQueryClient();

  // BE(MonWidgetUserSettingService.get)가 카탈로그 DEFAULT_SETTINGS_JSON 위에 사용자 저장값을
  // 덮어 병합해 내려준다 → settings.fromHour/toHour 가 "사용자값 우선, 없으면 카탈로그 기본값(09~18)".
  const { data: userSetting } = useGetWidgetUserSetting({
    params: { widgetId: hasWidgetId ? numericWidgetId : 0 },
    queryOptions: { enabled: hasWidgetId },
  });
  const hourRange = useMemo(() => {
    const s = (userSetting?.settings ?? {}) as { fromHour?: number; toHour?: number };
    return {
      fromHour: s.fromHour ?? DEFAULT_HOUR_RANGE.fromHour,
      toHour: s.toHour ?? DEFAULT_HOUR_RANGE.toHour,
    };
  }, [userSetting]);

  // ─── 설정 드로어 ──────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const handleOpenSettings = useCallback(() => {
    onRequestPause?.();
    setSettingsOpen(true);
  }, [onRequestPause]);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);

  const { mutate: saveUserSetting, isPending: isSaving } = useUpdateWidgetUserSetting({
    mutationOptions: {
      onSuccess: () => {
        if (hasWidgetId) queryClient.invalidateQueries({ queryKey: widgetSettingKeys.userSetting(numericWidgetId).queryKey });
        toast.success('표시 시간대가 저장되었습니다.');
        setSettingsOpen(false);
      },
    },
  });

  // 폼 로컬 상태 — 드로어가 열릴 때 현재 적용값에서 초기화.
  const [form, setForm] = useState(hourRange);
  useEffect(() => {
    if (settingsOpen) setForm(hourRange);
  }, [settingsOpen, hourRange]);

  const invalidRange = form.fromHour > form.toHour;
  const handleSaveSettings = useCallback(() => {
    if (!hasWidgetId) {
      toast.error('위젯 식별자가 없어 저장할 수 없습니다.');
      return;
    }
    saveUserSetting({ widgetId: numericWidgetId, settings: { fromHour: form.fromHour, toHour: form.toHour } });
  }, [hasWidgetId, numericWidgetId, form, saveUserSetting]);

  // ─── 헤더 슬롯 (포털) ─────────────────────────────────────────
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (widgetId == null) return;
    setToolbarSlot(document.getElementById(widgetToolbarSlotId(widgetId)));
  }, [widgetId]);

  const toolbar = (
    <div className="flex flex-nowrap items-center gap-2">
      <Tooltip title="표시 시간대 설정" placement="top">
        <span
          onClick={handleOpenSettings}
          role="button"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border border-gray-300 text-gray-400 transition-colors hover:bg-gray-100"
        >
          <Settings size={16} />
        </span>
      </Tooltip>
    </div>
  );

  // ─── 타임라인 (시간 단위, 표시 시간대로 필터) ────────────────────
  const points = useMemo(() => {
    if (!isTimeTrendData(source)) return [];
    return (source.series.hour ?? []).filter((p) => {
      const h = hourOf(p.time);
      return !Number.isNaN(h) ? h >= hourRange.fromHour && h <= hourRange.toHour : true;
    });
  }, [source, hourRange]);

  const settingsDrawer = (
    <Drawer
      title="타임라인 표시 시간대 설정"
      closable={{ placement: 'end' }}
      placement="right"
      width={420}
      open={settingsOpen}
      onClose={handleCloseSettings}
      destroyOnClose
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={handleCloseSettings} disabled={isSaving}>
            취소
          </Button>
          <Button type="primary" onClick={handleSaveSettings} loading={isSaving} disabled={!hasWidgetId || invalidRange}>
            저장
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-[12px] leading-relaxed text-gray-500">
          타임라인 차트에 표시할 시간 범위를 지정합니다. 지정한 <b>시작 시</b>부터 <b>종료 시</b>까지의 시간대만 추세에 노출됩니다(기본 09~18시).
        </p>
        <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3">
          <span className="text-sm font-semibold text-gray-800">표시 시간대</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-gray-600">시작 시</span>
              <InputNumber
                value={form.fromHour}
                min={0}
                max={23}
                onChange={(v) => setForm((p) => ({ ...p, fromHour: v ?? 0 }))}
                addonAfter="시"
                style={{ width: '100%' }}
                disabled={isSaving}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[12px] font-medium text-gray-600">종료 시</span>
              <InputNumber
                value={form.toHour}
                min={0}
                max={23}
                onChange={(v) => setForm((p) => ({ ...p, toHour: v ?? 0 }))}
                addonAfter="시"
                style={{ width: '100%' }}
                disabled={isSaving}
              />
            </label>
          </div>
          {invalidRange && <span className="text-[11px] text-red-500">종료 시는 시작 시 이상이어야 합니다.</span>}
        </section>
        {!hasWidgetId && <p className="text-[12px] text-red-500">대시보드에 추가된 위젯에서만 저장할 수 있습니다.</p>}
      </div>
    </Drawer>
  );

  if (!isTimeTrendData(source)) {
    return (
      <div className="flex flex-col h-full p-3">
        {toolbarSlot ? createPortal(toolbar, toolbarSlot) : null}
        <NoData message="추세 데이터를 불러오는 중입니다." />
        {settingsDrawer}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3 p-3 overflow-auto">
      {toolbarSlot ? createPortal(toolbar, toolbarSlot) : null}

      {/* KPI 4타일 */}
      <KpiStrip current={source.current} peak={source.peak} />

      {points.length === 0 ? (
        <div className="flex-1 min-h-[160px]">
          <NoData message="해당 시간대 추세 데이터가 없습니다." />
        </div>
      ) : (
        <section className="flex flex-col bg-white">
          <h3 className="text-[13px] font-bold mb-1">
            센터 종합 추이{' '}
            <span className="font-normal text-[12px] text-[var(--color-bt-fg-muted)]">
              · 인입콜 vs 응대(처리) · 미처리 · 포기율(우축) · {String(hourRange.fromHour).padStart(2, '0')}~{String(hourRange.toHour).padStart(2, '0')}시
            </span>
          </h3>
          <div className="h-[300px]">
            <TrendChart points={points} />
          </div>
        </section>
      )}

      {settingsDrawer}
    </div>
  );
}
