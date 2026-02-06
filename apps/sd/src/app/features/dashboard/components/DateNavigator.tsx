import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getToday, shiftDate } from '../hooks/useSdHelpers';

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => onDateChange(shiftDate(selectedDate, -1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Input
        type="date"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="h-7 w-36 text-xs"
      />
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={() => onDateChange(shiftDate(selectedDate, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onDateChange(getToday())}>
        오늘
      </Button>
    </div>
  );
}
