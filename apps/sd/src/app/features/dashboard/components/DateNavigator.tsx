import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getToday, shiftDate } from '../utils';

interface DateNavigatorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

/**
 * 날짜 네비게이터
 * - 이전/다음 날짜 이동 버튼
 * - 날짜 직접 선택 input
 * - 오늘 버튼
 */
export default function DateNavigator({ selectedDate, onDateChange }: DateNavigatorProps) {
  const handlePrevDay = () => onDateChange(shiftDate(selectedDate, -1));
  const handleNextDay = () => onDateChange(shiftDate(selectedDate, 1));
  const handleToday = () => onDateChange(getToday());

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onClick={handlePrevDay}
        aria-label="이전 날짜"
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
        onClick={handleNextDay}
        aria-label="다음 날짜"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={handleToday}
      >
        오늘
      </Button>
    </div>
  );
}
