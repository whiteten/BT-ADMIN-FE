import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DateRangeSelectorProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onSearch: () => void;
  isLoading?: boolean;
}

export default function DateRangeSelector({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onSearch,
  isLoading = false,
}: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Input type="date" value={fromDate} onChange={(e) => onFromDateChange(e.target.value)} className="h-8 w-36 text-xs" />
      <span className="text-xs text-muted-foreground">~</span>
      <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="h-8 w-36 text-xs" />
      <Button variant="outline" size="sm" className="h-8" onClick={onSearch} disabled={isLoading}>
        <Search className="mr-1 h-3 w-3" /> 조회
      </Button>
    </div>
  );
}
