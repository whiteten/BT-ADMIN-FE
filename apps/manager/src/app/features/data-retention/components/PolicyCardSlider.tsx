import { useRef } from 'react';
import { Button } from 'antd';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useBreadcrumbStore } from '@/shared-store';
import PolicyCard from './PolicyCard';
import type { RetentionPolicyListItem } from '../types/dataRetention.types';

interface PolicyCardSliderProps {
  policies: RetentionPolicyListItem[];
  selectedId: number | null;
  onSelect: (policy: RetentionPolicyListItem) => void;
  onEdit: (policy: RetentionPolicyListItem) => void;
}

const SCROLL_AMOUNT = 240;

const PolicyCardSlider = ({ policies, selectedId, onSelect, onEdit }: PolicyCardSliderProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  };

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  };

  if (policies.length === 0) return null;

  return (
    <div className="relative flex items-stretch gap-2">
      {/* 좌측 화살표 */}
      <Button type="text" icon={<ChevronLeft className="size-5" />} onClick={handleScrollLeft} className="!flex-shrink-0 !self-center !w-8 !h-8 !p-0" />

      {/* 카드 스크롤 영역 */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto py-2 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {policies.map((policy) => (
          <PolicyCard key={policy.policyId} policy={policy} selected={selectedId === policy.policyId} onSelect={onSelect} onEdit={onEdit} />
        ))}
      </div>

      {/* 우측 화살표 */}
      <Button type="text" icon={<ChevronRight className="size-5" />} onClick={handleScrollRight} className="!flex-shrink-0 !self-center !w-8 !h-8 !p-0" />
    </div>
  );
};

export default PolicyCardSlider;
