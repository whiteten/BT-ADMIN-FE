import { Segmented } from 'antd';
import { TIME_UNIT_LABELS, type TimeUnit } from '../types';

interface TimeUnitToggleProps {
  value: TimeUnit;
  onChange(unit: TimeUnit): void;
}

const TIME_UNITS: TimeUnit[] = ['10MIN', 'HOURLY', 'DAILY', 'MONTHLY', 'YEARLY'];

export default function TimeUnitToggle({ value, onChange }: TimeUnitToggleProps) {
  const options = TIME_UNITS.map((unit) => ({ value: unit, label: TIME_UNIT_LABELS[unit] }));
  return <Segmented options={options} value={value} onChange={(v) => onChange(v as TimeUnit)} />;
}
