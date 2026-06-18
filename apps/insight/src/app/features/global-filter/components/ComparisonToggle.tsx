import { Segmented } from 'antd';
import { QUICK_PRESETS_BY_UNIT, QUICK_PRESET_LABELS, type QuickPreset, type TimeUnit } from '../types';

interface QuickSearchToggleProps {
  value: QuickPreset | null;
  timeUnit: TimeUnit;
  onChange(preset: QuickPreset | null): void;
}

/**
 * 빠른검색 토글 — 단위별로 프리셋(오늘/전일/최근1주일/당월/…)이 달라진다 (레거시 동일).
 * OFF는 수동 기간(프리셋 미적용).
 */
export default function ComparisonToggle({ value, timeUnit, onChange }: QuickSearchToggleProps) {
  const presets = QUICK_PRESETS_BY_UNIT[timeUnit] ?? [];
  const options = [{ value: 'OFF', label: 'OFF' }, ...presets.map((p) => ({ value: p, label: QUICK_PRESET_LABELS[p] }))];

  const segValue = value ?? 'OFF';

  const handleChange = (v: string | number) => {
    onChange(v === 'OFF' ? null : (v as QuickPreset));
  };

  return <Segmented options={options} value={segValue} onChange={handleChange} />;
}
