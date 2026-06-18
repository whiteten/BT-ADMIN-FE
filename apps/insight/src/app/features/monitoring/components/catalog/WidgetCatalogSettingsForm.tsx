import { InputNumber, Radio } from 'antd';

/**
 * 위젯 카탈로그 관리 — 위젯 타입별 "기본 설정(DEFAULT_SETTINGS_JSON)" 구조화 폼.
 *
 * 각 위젯의 실제 설정 드로어(위젯별 settings)와 동일한 키/의미를 사용하되,
 * 여기서 편집하는 값은 "사용자가 개인 설정을 저장하지 않았을 때" 적용되는 기본값이다.
 * 구조가 없는 위젯(노드 상세·알람센터 등)은 빈 안내만 표시한다.
 */

interface Props {
  widgetTypeId: string;
  /** 현재 settings 값(평면 객체). */
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

/** warn/danger 2단 임계 한 줄. */
interface ThresholdPair {
  warn: number;
  danger: number;
}

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** 상태별 임계(초) — agent-status. statusMap.ts 의 라벨/순서와 일치. */
const AGENT_STATUS_ROWS: { key: string; label: string }[] = [
  { key: '5010', label: '통화 IB' },
  { key: '5020', label: '통화 OB' },
  { key: '53', label: '보류' },
  { key: '51', label: '벨울림' },
  { key: '52', label: '다이얼링' },
  { key: '60', label: '후처리' },
  { key: '30', label: '이석(공통)' },
];

/** 지표별 임계 — ctiq. helpers.ts 의 방향(초과/미달)과 일치. */
const CTIQ_METRIC_ROWS: { key: string; label: string; unit: string; hint: string }[] = [
  { key: 'waitCnt', label: '대기 콜수', unit: '콜', hint: '초과할수록 나쁨' },
  { key: 'maxWaitSec', label: '최장 대기시간', unit: '초', hint: '초과할수록 나쁨' },
  { key: 'slaPct', label: '서비스레벨(SLA)', unit: '%', hint: '미달할수록 나쁨' },
  { key: 'abandonRatioPct', label: '포기율', unit: '%', hint: '초과할수록 나쁨' },
];

/** 지표별 임계 — health-board. */
const HEALTH_METRIC_ROWS: { key: string; label: string; unit: string }[] = [
  { key: 'answerRate', label: '응대율', unit: '%' },
  { key: 'serviceLevel', label: '서비스레벨', unit: '%' },
  { key: 'abandonRate', label: '포기율', unit: '%' },
  { key: 'waiting', label: '현재 대기', unit: '콜' },
];

const labelCls = 'text-[13px] font-medium text-[#495057]';
const sectionTitleCls = 'text-[12px] font-semibold text-[#868e96] uppercase tracking-wide';
const hintCls = 'text-[11px] text-[var(--color-bt-fg-muted)]';

export default function WidgetCatalogSettingsForm({ widgetTypeId, value, onChange }: Props) {
  // ── 중첩 thresholds 의 한 항목(warn/danger) 갱신 ──
  const setNestedThreshold = (statusKey: string, field: keyof ThresholdPair, v: number | null) => {
    const thresholds = { ...((value.thresholds as Record<string, ThresholdPair>) ?? {}) };
    const cur = thresholds[statusKey] ?? { warn: 0, danger: 0 };
    thresholds[statusKey] = { ...cur, [field]: v ?? 0 };
    onChange({ ...value, thresholds });
  };

  // ── 평면 thresholds(채널 상세: warn/danger 단일) 갱신 ──
  const setFlatThreshold = (field: keyof ThresholdPair, v: number | null) => {
    const thresholds = { ...((value.thresholds as ThresholdPair) ?? { warn: 0, danger: 0 }) };
    thresholds[field] = v ?? 0;
    onChange({ ...value, thresholds });
  };

  const setField = (key: string, v: unknown) => onChange({ ...value, [key]: v });

  const renderNestedThresholdRow = (key: string, label: string, unit: string, hint?: string) => {
    const th = ((value.thresholds as Record<string, ThresholdPair>) ?? {})[key] ?? { warn: 0, danger: 0 };
    return (
      <div key={key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-1.5">
        <div className="flex flex-col">
          <span className={labelCls}>{label}</span>
          {hint && <span className={hintCls}>{hint}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--color-bt-warn)]">주의</span>
          <InputNumber size="small" min={0} value={num(th.warn)} onChange={(v) => setNestedThreshold(key, 'warn', v)} addonAfter={unit} className="!w-[110px]" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--color-bt-danger)]">위험</span>
          <InputNumber size="small" min={0} value={num(th.danger)} onChange={(v) => setNestedThreshold(key, 'danger', v)} addonAfter={unit} className="!w-[110px]" />
        </div>
      </div>
    );
  };

  // ── 미디어 타입 (agent-status·ctiq·time-trend 공통) ──
  const mediaTypeBlock = (
    <div className="flex flex-col gap-1.5">
      <span className={sectionTitleCls}>미디어 타입</span>
      <div className="flex items-center gap-2">
        <InputNumber min={0} value={num(value.mediaType)} onChange={(v) => setField('mediaType', v ?? 0)} className="!w-[120px]" />
        <span className={hintCls}>Redis 키 조회용 미디어 타입 (0 = 음성/VOIP)</span>
      </div>
    </div>
  );

  switch (widgetTypeId) {
    case 'agent-status-matrix':
      return (
        <div className="flex flex-col gap-5">
          {mediaTypeBlock}

          <div className="flex flex-col gap-1.5">
            <span className={sectionTitleCls}>대기 표시 방식</span>
            <Radio.Group value={num(value.standbyType, 1)} onChange={(e) => setField('standbyType', e.target.value)}>
              <Radio value={1}>대기 통합</Radio>
              <Radio value={2}>대기 IB / OB 분리</Radio>
            </Radio.Group>
            <span className={hintCls}>상태 요약·그룹 상태·통화 임계(통화 IB/OB)에 함께 적용됩니다.</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className={sectionTitleCls}>상담사 상태 임계 (초)</span>
            <span className={hintCls}>각 상태가 주의/위험 시간을 초과하면 카드를 강조합니다. 테넌트별 이석 임계는 사용자 설정에만 저장됩니다.</span>
            <div className="mt-1.5 divide-y divide-[var(--color-bt-border)]">{AGENT_STATUS_ROWS.map((r) => renderNestedThresholdRow(r.key, r.label, '초'))}</div>
          </div>
        </div>
      );

    case 'ctiq-status-matrix':
      return (
        <div className="flex flex-col gap-5">
          {mediaTypeBlock}
          <div className="flex flex-col gap-1">
            <span className={sectionTitleCls}>상태 판정 기준</span>
            <span className={hintCls}>지표별 주의/위험 2단 — 가장 나쁜 등급을 큐 상태로 채택합니다.</span>
            <div className="mt-1.5 divide-y divide-[var(--color-bt-border)]">{CTIQ_METRIC_ROWS.map((r) => renderNestedThresholdRow(r.key, r.label, r.unit, r.hint))}</div>
          </div>
        </div>
      );

    case 'health-board':
      return (
        <div className="flex flex-col gap-1">
          <span className={sectionTitleCls}>응대 지표 임계</span>
          <span className={hintCls}>주의(주황)·위험(빨강) 경계값입니다.</span>
          <div className="mt-1.5 divide-y divide-[var(--color-bt-border)]">{HEALTH_METRIC_ROWS.map((r) => renderNestedThresholdRow(r.key, r.label, r.unit))}</div>
        </div>
      );

    case 'channel-detail': {
      const th = (value.thresholds as ThresholdPair) ?? { warn: 70, danger: 85 };
      return (
        <div className="flex flex-col gap-1.5">
          <span className={sectionTitleCls}>점유율 임계 (%)</span>
          <span className={hintCls}>채널 점유율이 주의/위험 경계를 넘으면 강조합니다.</span>
          <div className="mt-1.5 flex items-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--color-bt-warn)]">주의</span>
              <InputNumber size="small" min={0} max={100} value={num(th.warn, 70)} onChange={(v) => setFlatThreshold('warn', v)} addonAfter="%" className="!w-[110px]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--color-bt-danger)]">위험</span>
              <InputNumber size="small" min={0} max={100} value={num(th.danger, 85)} onChange={(v) => setFlatThreshold('danger', v)} addonAfter="%" className="!w-[110px]" />
            </div>
          </div>
        </div>
      );
    }

    case 'time-trend-board':
      return (
        <div className="flex flex-col gap-5">
          {mediaTypeBlock}
          <div className="flex flex-col gap-1.5">
            <span className={sectionTitleCls}>타임라인 표시 시간대</span>
            <div className="flex items-center gap-2">
              <InputNumber min={0} max={23} value={num(value.fromHour, 9)} onChange={(v) => setField('fromHour', v ?? 0)} addonAfter="시" className="!w-[100px]" />
              <span className="text-[#868e96]">~</span>
              <InputNumber min={0} max={23} value={num(value.toHour, 18)} onChange={(v) => setField('toHour', v ?? 0)} addonAfter="시" className="!w-[100px]" />
            </div>
            <span className={hintCls}>차트 X축에 표시할 시간 범위입니다 (0~23시).</span>
          </div>
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center py-6 px-4 rounded-md bg-[var(--color-bt-bg-muted)]">
          <span className="text-[13px] text-[var(--color-bt-fg-muted)]">이 위젯은 변경 가능한 기본 설정값이 없습니다.</span>
        </div>
      );
  }
}
