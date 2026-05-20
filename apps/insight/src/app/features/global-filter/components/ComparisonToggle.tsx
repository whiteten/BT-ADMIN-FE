import { COMPARISON_AVAILABILITY, COMPARISON_LABELS, type ComparisonType, type TimeUnit } from '../types';

interface ComparisonToggleProps {
  value: ComparisonType | null;
  timeUnit: TimeUnit;
  onChange(comparison: ComparisonType | null): void;
}

const COMPARISON_TYPES: ComparisonType[] = ['PREV_DAY', 'PREV_WEEK', 'PREV_MONTH', 'PREV_YEAR'];

export default function ComparisonToggle({ value, timeUnit, onChange }: ComparisonToggleProps) {
  return (
    <div className="flex rounded border border-bt-border overflow-hidden">
      {/* OFF 버튼 */}
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 text-[11px] font-medium transition-colors border-r border-bt-border ${
          value === null ? 'bg-bt-primary text-white' : 'bg-white text-bt-fg-muted hover:bg-bt-bg-muted'
        }`}
      >
        OFF
      </button>

      {COMPARISON_TYPES.map((type) => {
        const available = COMPARISON_AVAILABILITY[timeUnit][type];
        const isActive = value === type;
        return (
          <button
            key={type}
            onClick={() => available && onChange(type)}
            disabled={!available}
            title={!available ? '현재 단위에서는 사용할 수 없음' : undefined}
            className={`px-2.5 py-1 text-[11px] font-medium transition-colors border-r border-bt-border last:border-r-0 ${
              isActive ? 'bg-bt-primary text-white' : available ? 'bg-white text-bt-fg-muted hover:bg-bt-bg-muted' : 'bg-bt-bg-muted text-bt-border cursor-not-allowed'
            }`}
          >
            {COMPARISON_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
