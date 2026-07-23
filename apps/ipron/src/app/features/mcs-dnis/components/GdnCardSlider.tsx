/**
 * GDN 카드 슬라이더 (Body only, no header)
 * - 부모로부터 이미 필터링된 gdnList를 받음
 * - 좌우 스크롤 화살표
 */
import { useRef } from 'react';
import { Button, Dropdown, Empty, type MenuProps } from 'antd';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { type McsdGdn, NETWORK_OPERATOR_LABELS, type NetworkOperator } from '../types';

interface Props {
  gdnList: McsdGdn[];
  isLoading?: boolean;
  selectedGdnNo: string | null;
  onSelect: (gdnNo: string) => void;
  onEdit: (gdn: McsdGdn) => void;
  onDelete: (gdn: McsdGdn) => void;
}

const CARRIER_BADGE: Record<NetworkOperator, string> = {
  '0': 'bg-blue-50 text-blue-700 border-blue-200',
  '1': 'bg-orange-50 text-orange-700 border-orange-200',
  '2': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '3': 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function GdnCardSlider({ gdnList, isLoading, selectedGdnNo, onSelect, onEdit, onDelete }: Props) {
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const getCardMenuItems = (gdn: McsdGdn): MenuProps['items'] => [
    { key: 'edit', label: '수정', onClick: () => onEdit(gdn) },
    { key: 'delete', label: '삭제', danger: true, onClick: () => onDelete(gdn) },
  ];

  return (
    <div className="flex items-center px-4 py-3 h-[170px]">
      {isLoading ? (
        <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">불러오는 중...</div>
      ) : gdnList.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full h-full text-gray-400 gap-2">
          <Empty description={false} styles={{ image: { height: 40 } }} />
          <span className="text-sm">대표번호가 없습니다</span>
        </div>
      ) : (
        <div className="relative flex items-center gap-2 w-full">
          <Button
            type="text"
            icon={<ChevronLeft className="size-5" />}
            onClick={() => cardScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
            className="!flex-shrink-0 !w-8 !h-8 !p-0"
          />
          <div ref={cardScrollRef} className="flex gap-3 overflow-x-auto py-2 px-1 flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {gdnList.map((gdn) => {
              const isCardSelected = gdn.mcsdGdnNo === selectedGdnNo;
              return (
                <div
                  key={gdn.mcsdGdnNo}
                  className={`bg-white border rounded-lg p-3.5 cursor-pointer transition-all w-[220px] h-[130px] flex-shrink-0 flex flex-col ${
                    isCardSelected ? 'border-[#405189] shadow-[0_0_0_2px_rgba(64,81,137,0.15)]' : 'border-gray-200 hover:border-[#c5cbe0] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  }`}
                  onClick={() => onSelect(gdn.mcsdGdnNo)}
                  onDoubleClick={() => onEdit(gdn)}
                >
                  {/* Card header: 대표번호 + 메뉴 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-800 truncate">{gdn.mcsdGdnNo}</span>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Dropdown menu={{ items: getCardMenuItems(gdn) }} trigger={['click']} placement="bottomRight">
                        <button type="button" className="p-1 rounded hover:bg-gray-100 transition-colors">
                          <MoreVertical className="size-4 text-gray-400" />
                        </button>
                      </Dropdown>
                    </div>
                  </div>

                  {/* Card info: 설명 */}
                  <div className="text-xs text-gray-500 space-y-0.5 truncate" title={gdn.description ?? ''}>
                    <div className="truncate">{gdn.description || '-'}</div>
                  </div>

                  {/* 하단 태그: 통신사 + DNIS 등록건수 */}
                  <div className="flex flex-wrap gap-1 mt-auto pt-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${CARRIER_BADGE[gdn.networkOp]}`}>
                      {NETWORK_OPERATOR_LABELS[gdn.networkOp]}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        (gdn.dnisCount ?? 0) > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
                      }`}
                    >
                      {(gdn.dnisCount ?? 0) > 0 ? `DNIS ${gdn.dnisCount}건` : 'DNIS 미등록'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            type="text"
            icon={<ChevronRight className="size-5" />}
            onClick={() => cardScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
            className="!flex-shrink-0 !w-8 !h-8 !p-0"
          />
        </div>
      )}
    </div>
  );
}
