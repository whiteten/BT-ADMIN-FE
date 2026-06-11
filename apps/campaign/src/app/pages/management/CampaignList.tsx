import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { type BreadcrumbProps, Button, Input, Select } from 'antd';
import { useBreadcrumbStore } from '@/shared-store';
import { toast } from '@/shared-util';
import CampaignCard from '../../features/management/components/CampaignCard';
import { MOCK_CAMPAIGN_LIST } from '../../features/management/constants/campaignManagementMockData';
import type { CampaignListItem } from '../../features/management/types/campaign';
import NoData from '@/components/custom/NoData';
import { useModal } from '@/libs/shared-ui/src/hooks/useModal';

const breadcrumb: BreadcrumbProps['items'] = [
  { title: '관리', path: '/campaign/management' },
  { title: '캠페인', path: '/campaign/management/campaign' },
  { title: '캠페인 목록', path: '/campaign/management/campaign/list' },
];

export default function CampaignList() {
  const navigate = useNavigate();
  const modal = useModal();
  const setBreadcrumb = useBreadcrumbStore((s) => s.setBreadcrumb);
  const clearBreadcrumb = useBreadcrumbStore((s) => s.clearBreadcrumb);
  const [filterColumn, setFilterColumn] = useState('campaignName');
  const [searchValue, setSearchValue] = useState('');
  const [campaignList, setCampaignList] = useState<CampaignListItem[]>(MOCK_CAMPAIGN_LIST);

  useEffect(() => {
    setBreadcrumb(breadcrumb);
    return () => clearBreadcrumb();
  }, [setBreadcrumb, clearBreadcrumb]);

  const filteredList = useMemo(() => {
    if (!searchValue.trim()) return campaignList;
    const keyword = searchValue.toLowerCase();
    return campaignList.filter((campaign) => {
      const value = campaign[filterColumn as keyof CampaignListItem];
      if (value == null) return false;
      if (typeof value === 'boolean') {
        const label = value ? '사용' : '미사용';
        return label.includes(keyword);
      }
      return String(value).toLowerCase().includes(keyword);
    });
  }, [campaignList, filterColumn, searchValue]);

  const handleColumnChange = (value: string) => {
    setFilterColumn(value);
    setSearchValue('');
  };

  const handleClickCreateBtn = () => {
    navigate('../create');
  };

  const handleDetail = (campaignId: string) => {
    navigate(`../${campaignId}`);
  };

  const handleDelete = (campaignId: string) => {
    modal.confirm.delete({
      onOk: () => {
        setCampaignList((prev) => prev.filter((item) => item.campaignId !== campaignId));
        toast.success('캠페인이 삭제되었습니다.');
      },
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div className="flex items-center justify-between gap-2 w-full h-[76px] bg-white bt-shadow px-7 py-5">
        <div className="flex gap-2 w-full items-center">
          <Select
            value={filterColumn}
            onChange={handleColumnChange}
            options={[
              { label: '캠페인id', value: 'campaignId' },
              { label: '캠페인', value: 'campaignName' },
              { label: '우선순위', value: 'priority' },
            ]}
            className="!max-w-[150px] !min-w-[120px]"
            popupMatchSelectWidth={false}
          />
          <Input value={searchValue} onChange={(e) => setSearchValue(e.target.value)} className="w-full max-w-[400px]" placeholder="검색어를 입력하세요." />
        </div>
        <div>
          <Button type="primary" onClick={handleClickCreateBtn}>
            추가
          </Button>
        </div>
      </div>
      {filteredList.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-4 w-full overflow-y-auto">
          {filteredList.map((campaign) => (
            <CampaignCard key={campaign.campaignId} {...campaign} onDetail={handleDetail} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white bt-shadow">
          <NoData message="조회된 데이터가 없습니다." iconSize={50} fontSize="text-lg" gap={2} />
        </div>
      )}
    </div>
  );
}
