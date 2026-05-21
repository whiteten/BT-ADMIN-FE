import { TIME_UNIT_LABELS, type TimeUnit } from '../types';

interface TimeUnitToggleProps {
  value: TimeUnit;
  onChange(unit: TimeUnit): void;
}

const TIME_UNITS: TimeUnit[] = ['10MIN', 'HOURLY', 'DAILY', 'MONTHLY', 'YEARLY'];

export default function TimeUnitToggle({ value, onChange }: TimeUnitToggleProps) {
  return (
    <div className="flex rounded border border-bt-border overflow-hidden">
      {TIME_UNITS.map((unit) => (
        <button
          key={unit}
          onClick={() => onChange(unit)}
          className={`px-2.5 py-1 text-[11px] font-medium transition-colors border-r border-bt-border last:border-r-0 ${
            value === unit ? 'bg-bt-primary text-white' : 'bg-white text-bt-fg-muted hover:bg-bt-bg-muted'
          }`}
        >
          {TIME_UNIT_LABELS[unit]}
        </button>
      ))}
    </div>
  );
}
