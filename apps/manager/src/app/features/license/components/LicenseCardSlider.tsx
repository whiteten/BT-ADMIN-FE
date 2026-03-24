import { useRef } from 'react';
import { Button } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import LicenseCard from './LicenseCard';
import type { License } from '../types/license.types';

interface LicenseCardSliderProps {
  licenses: License[];
  selectedId: number | null;
  onSelect: (licenseId: number) => void;
  onDelete: (licenseId: number) => void;
}

const SCROLL_AMOUNT = 260;

const LicenseCardSlider = ({ licenses, selectedId, onSelect, onDelete }: LicenseCardSliderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  };

  if (licenses.length === 0) return null;

  return (
    <div className="relative flex items-center gap-2">
      {/* 좌측 버튼 */}
      <Button type="text" icon={<ChevronLeft className="size-5" />} onClick={handleScrollLeft} className="!flex-shrink-0 !w-8 !h-8 !p-0" />

      {/* 카드 영역 */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide py-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {licenses.map((license) => (
          <LicenseCard key={license.licenseId} license={license} isSelected={selectedId === license.licenseId} onSelect={onSelect} onDelete={onDelete} />
        ))}
      </div>

      {/* 우측 버튼 */}
      <Button type="text" icon={<ChevronRight className="size-5" />} onClick={handleScrollRight} className="!flex-shrink-0 !w-8 !h-8 !p-0" />
    </div>
  );
};

export default LicenseCardSlider;
