import { Tag } from 'antd';
import { Hash } from 'lucide-react';

/** 기초데이터로 주입되는 도메인 태그 (DOMAIN_CODE 변환: IE→PBX, IC→CTI, IR→IVR). */
export const BASE_TAGS = new Set(['PBX', 'CTI', 'IVR']);

/** 기초 도메인 태그 여부. */
export const isBaseTag = (tag: string) => BASE_TAGS.has(tag);

/** 기초 도메인 태그 강조 칩 — '#' 아이콘 pill. 목록/상세에서 사용자 태그와 시각적으로 구분. */
export function BaseTagChip({ tag, className }: { tag: string; className?: string }) {
  return (
    <Tag color="geekblue" className={`!m-0 !inline-flex !items-center !gap-0.5 !rounded-full !px-2 !font-semibold ${className ?? ''}`}>
      <Hash size={10} strokeWidth={2.75} />
      {tag}
    </Tag>
  );
}
