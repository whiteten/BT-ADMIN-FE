import { Button, Dropdown, type MenuProps } from 'antd';
import { MoreVertical } from 'lucide-react';
import LicenseStatusBadge from './LicenseStatusBadge';
import { LICENSE_TYPE_LABELS, type License } from '../types';
import { cn } from '@/lib/utils';

interface LicenseCardProps {
  license: License;
  isSelected: boolean;
  onSelect: (licenseId: number) => void;
  onDelete: (licenseId: number) => void;
}

const LicenseCard = ({ license, isSelected, onSelect, onDelete }: LicenseCardProps) => {
  const typeLabel = LICENSE_TYPE_LABELS[license.licenseType] ? `${LICENSE_TYPE_LABELS[license.licenseType]}라이선스` : '라이선스';

  const menuItems: MenuProps['items'] = [
    {
      key: 'delete',
      label: '삭제',
      danger: true,
      onClick: (e) => {
        e.domEvent.stopPropagation();
        onDelete(license.licenseId);
      },
    },
  ];

  const handleCardClick = () => {
    onSelect(license.licenseId);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={cn(
        'license-card relative flex flex-col w-[240px] min-w-[240px] p-4 rounded-xl border bg-white cursor-pointer transition-all hover:shadow-md hover:border-slate-300',
        isSelected ? 'border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.15)]' : 'border-slate-200',
      )}
      onClick={handleCardClick}
    >
      {/* 상단: 상태 뱃지 + 메뉴 */}
      <div className="flex items-center justify-between mb-2">
        <LicenseStatusBadge status={license.status} />
        <div onClick={handleMenuClick}>
          <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" size="small" icon={<MoreVertical className="size-3.5 text-slate-400" />} className="!p-0 !h-6 !w-6 !rounded-md hover:!bg-slate-100" />
          </Dropdown>
        </div>
      </div>

      {/* 라이선스 유형 */}
      <div className="text-[11px] text-slate-400 mb-0.5">{typeLabel}</div>

      {/* 라이선스명 */}
      <h4 className="text-sm font-semibold text-slate-800 truncate mb-2" title={license.licenseName}>
        {license.licenseName}
      </h4>

      {/* 날짜 + 유효기간 */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2.5">
        <span>{license.startDate}</span>
        <span className="text-slate-300">|</span>
        <span>{license.validMonth}개월</span>
      </div>

      {/* 항목 수 */}
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px] text-slate-400">항목 수</span>
        <span className="text-xs font-medium text-slate-600">{license.itemCount}개</span>
      </div>
    </div>
  );
};

export default LicenseCard;
