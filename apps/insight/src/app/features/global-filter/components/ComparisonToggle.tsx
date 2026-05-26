import { Segmented } from 'antd';
import { COMPARISON_AVAILABILITY, COMPARISON_LABELS, type ComparisonType, type TimeUnit } from '../types';

interface ComparisonToggleProps {
  value: ComparisonType | null;
  timeUnit: TimeUnit;
  onChange(comparison: ComparisonType | null): void;
}

const COMPARISON_TYPES: ComparisonType[] = ['PREV_DAY', 'PREV_WEEK', 'PREV_MONTH', 'PREV_YEAR'];

export default function ComparisonToggle({ value, timeUnit, onChange }: ComparisonToggleProps) {
  const options = [
    { value: 'OFF', label: 'OFF' },
    ...COMPARISON_TYPES.map((type) => ({
      value: type,
      label: COMPARISON_LABELS[type],
      disabled: !COMPARISON_AVAILABILITY[timeUnit][type],
    })),
  ];

  const segValue = value ?? 'OFF';

  const handleChange = (v: string | number) => {
    onChange(v === 'OFF' ? null : (v as ComparisonType));
  };

  return <Segmented options={options} value={segValue} onChange={handleChange} />;
}
